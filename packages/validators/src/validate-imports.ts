#!/usr/bin/env tsx

/**
 * Import Validator
 *
 * Ensures:
 * - No relative imports beyond current directory
 * - Proper use of path aliases
 * - No circular dependencies
 * - Correct import ordering
 */

import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'

interface ImportViolation {
  file: string
  line: number
  message: string
  suggestion?: string
  severity: 'error' | 'warning'
}

const ALIAS_MAPPINGS = {
  '@/components': 'apps/web/components',
  '@/lib': 'apps/web/lib',
  '@/hooks': 'apps/web/hooks',
  '@/contexts': 'apps/web/contexts',
  '@/utils': 'apps/web/utils',
  '@/__tests__': 'apps/web/__tests__',
  '@/app': 'apps/web/app',
  '@thedaviddias': 'packages'
}

const IMPORT_ORDER = [
  'react',
  'next',
  '@tanstack',
  '@radix-ui',
  'external',
  '@thedaviddias',
  '@/',
  'relative'
]

class ImportValidator {
  private violations: ImportViolation[] = []
  private checkedFiles = new Set<string>()
  private importGraph = new Map<string, Set<string>>()

  validateFile(filePath: string): void {
    if (this.checkedFiles.has(filePath)) return
    this.checkedFiles.add(filePath)

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    let lastImportGroup = -1
    const fileImports = new Set<string>()

    lines.forEach((line, index) => {
      // Check for import statements
      const importMatch = line.match(/^import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/)
      if (!importMatch) return

      const importPath = importMatch[1]
      fileImports.add(importPath)

      // Check relative imports
      if (importPath.startsWith('../')) {
        this.checkRelativeImport(filePath, index + 1, importPath)
      }

      // Check import ordering
      const currentGroup = this.getImportGroup(importPath)
      if (currentGroup < lastImportGroup) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          message: `Import "${importPath}" is out of order`,
          suggestion: `Move this import to the ${IMPORT_ORDER[currentGroup]} section`,
          severity: 'warning'
        })
      }
      lastImportGroup = Math.max(lastImportGroup, currentGroup)
    })

    // Store import graph for circular dependency detection
    this.importGraph.set(filePath, fileImports)
  }

  private checkRelativeImport(file: string, line: number, importPath: string): void {
    const depth = (importPath.match(/\.\.\//g) || []).length

    // Allow relative imports within the same directory
    if (importPath.startsWith('./')) return

    if (depth >= 2) {
      const suggestion = this.suggestAlias(file, importPath)
      this.violations.push({
        file,
        line,
        message: `Deep relative import: "${importPath}"`,
        suggestion,
        severity: 'error'
      })
    }
  }

  private suggestAlias(file: string, importPath: string): string {
    // Resolve the absolute path
    const dir = path.dirname(file)
    const resolved = path.resolve(dir, importPath)
    const relative = path.relative(process.cwd(), resolved)

    // Find matching alias
    for (const [alias, basePath] of Object.entries(ALIAS_MAPPINGS)) {
      if (relative.startsWith(basePath)) {
        const remaining = relative.slice(basePath.length).replace(/^\//, '')
        return `Use: "${alias}${remaining ? `/${remaining}` : ''}"`
      }
    }

    return 'Consider using a path alias'
  }

  private getImportGroup(importPath: string): number {
    if (importPath === 'react' || importPath.startsWith('react/')) return 0
    if (importPath.startsWith('next/')) return 1
    if (importPath.startsWith('@tanstack/')) return 2
    if (importPath.startsWith('@radix-ui/')) return 3
    if (importPath.startsWith('@thedaviddias/')) return 5
    if (importPath.startsWith('@/')) return 6
    if (importPath.startsWith('.')) return 7
    return 4 // external packages
  }

  checkCircularDependencies(): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (node: string, path: string[] = []): boolean => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const imports = this.importGraph.get(node) || new Set()
      for (const imported of imports) {
        if (!visited.has(imported)) {
          if (dfs(imported, [...path])) return true
        } else if (recursionStack.has(imported)) {
          this.violations.push({
            file: node,
            line: 0,
            message: `Circular dependency detected: ${path.join(' → ')} → ${imported}`,
            severity: 'error'
          })
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    for (const file of this.importGraph.keys()) {
      if (!visited.has(file)) {
        dfs(file)
      }
    }
  }

  report(): boolean {
    if (this.violations.length === 0) {
      console.log(chalk.green('✓ All imports are valid'))
      return true
    }

    const errors = this.violations.filter(v => v.severity === 'error')
    const warnings = this.violations.filter(v => v.severity === 'warning')

    if (errors.length > 0) {
      console.log(chalk.red(`\n✗ Found ${errors.length} import errors:`))
      errors.forEach(v => {
        console.log(chalk.red(`  ${v.file}:${v.line} - ${v.message}`))
        if (v.suggestion) {
          console.log(chalk.yellow(`    → ${v.suggestion}`))
        }
      })
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ Found ${warnings.length} import warnings:`))
      warnings.forEach(v => {
        console.log(chalk.yellow(`  ${v.file}:${v.line} - ${v.message}`))
        if (v.suggestion) {
          console.log(chalk.gray(`    → ${v.suggestion}`))
        }
      })
    }

    return errors.length === 0
  }
}

export function validateImports(files: string[]): boolean {
  const validator = new ImportValidator()

  for (const file of files) {
    if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue
    if (file.includes('node_modules')) continue

    try {
      validator.validateFile(file)
    } catch (error) {
      console.error(chalk.red(`Error processing ${file}:`), error)
    }
  }

  validator.checkCircularDependencies()
  return validator.report()
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const success = validateImports(args)
  process.exit(success ? 0 : 1)
}
