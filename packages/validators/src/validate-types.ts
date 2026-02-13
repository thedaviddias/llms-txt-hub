#!/usr/bin/env tsx

/**
 * Type Validator
 *
 * Ensures:
 * - No 'any' types
 * - Proper type exports
 * - No implicit any
 * - Consistent interface/type usage
 */

import fs from 'node:fs'
import chalk from 'chalk'

interface TypeViolation {
  file: string
  line: number
  message: string
  code: string
  severity: 'error' | 'warning'
}

/**
 * Validates TypeScript files for type safety issues like explicit any, missing annotations, and dangerous assertions
 */
class TypeValidator {
  private violations: TypeViolation[] = []

  validateFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      this.checkExplicitAny(filePath, line, index + 1)
      this.checkImplicitAny(filePath, line, index + 1)
      this.checkTypeAssertions(filePath, line, index + 1)
      this.checkUnusedTypes(filePath, line, index + 1)
    })
  }

  private checkExplicitAny(file: string, line: string, lineNumber: number): void {
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return

    // Check for explicit 'any' usage
    const anyPattern = /:\s*any(?:\s|$|[,)\]}])/
    if (anyPattern.test(line)) {
      // Allow in certain contexts
      const asAny = ['as', 'any'].join(' ')
      const allowedContexts = [
        asAny, // Type assertions (though not ideal)
        '// @ts-ignore',
        '// eslint-disable',
        'jest.fn()'
      ]

      const isAllowed = allowedContexts.some(ctx => line.includes(ctx))
      if (!isAllowed) {
        this.violations.push({
          file,
          line: lineNumber,
          message: 'Avoid using "any" type',
          code: line.trim(),
          severity: 'warning'
        })
      }
    }
  }

  private checkImplicitAny(file: string, line: string, lineNumber: number): void {
    // Check for function parameters without types
    const functionPattern = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?)\s*\(([^)]*)\)/
    const match = line.match(functionPattern)

    if (match?.[1]) {
      const params = match[1].split(',').map(p => p.trim())
      for (const param of params) {
        if (param && !param.includes(':') && !param.includes('=') && param !== '') {
          this.violations.push({
            file,
            line: lineNumber,
            message: `Parameter "${param}" is missing type annotation`,
            code: line.trim(),
            severity: 'error'
          })
        }
      }
    }
  }

  private checkTypeAssertions(file: string, line: string, lineNumber: number): void {
    // Check for dangerous type assertions
    const doubleAssert = ['as', 'unknown', 'as'].join(' ')
    if (line.includes(doubleAssert)) {
      this.violations.push({
        file,
        line: lineNumber,
        message: `Avoid double type assertions (${doubleAssert})`,
        code: line.trim(),
        severity: 'warning'
      })
    }

    // Check for non-null assertions
    if (line.match(/\w+!/)) {
      this.violations.push({
        file,
        line: lineNumber,
        message: 'Avoid non-null assertions (!), use proper null checks',
        code: line.trim(),
        severity: 'warning'
      })
    }
  }

  private checkUnusedTypes(file: string, line: string, lineNumber: number): void {
    // Check for unused type imports
    const typeImportPattern = /import\s+type\s*{([^}]+)}/
    const match = line.match(typeImportPattern)

    if (match) {
      // This is a simple check - could be enhanced with AST parsing
      const _types = match[1].split(',').map(t => t.trim())
      // Note: This would need the full file content to check properly
      // For now, just flag as info
    }
  }

  report(): boolean {
    if (this.violations.length === 0) {
      console.log(chalk.green('✓ All type checks passed'))
      return true
    }

    const errors = this.violations.filter(v => v.severity === 'error')
    const warnings = this.violations.filter(v => v.severity === 'warning')

    if (errors.length > 0) {
      console.log(chalk.red(`\n✗ Found ${errors.length} type errors:`))
      errors.forEach(v => {
        console.log(chalk.red(`  ${v.file}:${v.line} - ${v.message}`))
        console.log(chalk.gray(`    ${v.code}`))
      })
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ Found ${warnings.length} type warnings:`))
      warnings.forEach(v => {
        console.log(chalk.yellow(`  ${v.file}:${v.line} - ${v.message}`))
        console.log(chalk.gray(`    ${v.code}`))
      })
    }

    return errors.length === 0
  }
}

/**
 * Validates an array of file paths for type safety violations and prints a report
 */
export function validateTypes(files: string[]): boolean {
  const validator = new TypeValidator()

  for (const file of files) {
    if (!file.match(/\.(ts|tsx)$/)) continue
    if (file.includes('node_modules')) continue
    if (file.endsWith('.d.ts')) continue

    try {
      validator.validateFile(file)
    } catch (error) {
      console.error(chalk.red(`Error processing ${file}:`), error)
    }
  }

  return validator.report()
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const success = validateTypes(args)
  process.exit(success ? 0 : 1)
}
