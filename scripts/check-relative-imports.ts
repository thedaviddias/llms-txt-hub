#!/usr/bin/env tsx
import fs from 'node:fs'

const ALLOWED_RELATIVE_PATTERNS = [
  // Allow relative imports within the same directory
  /^\.\/[^/]+$/,
  // Allow imports from index files in same directory
  /^\.$/
]

const ALIAS_MAP = {
  '../components': '@/components',
  '../../components': '@/components',
  '../../../components': '@/components',
  '../lib': '@/lib',
  '../../lib': '@/lib',
  '../../../lib': '@/lib',
  '../hooks': '@/hooks',
  '../../hooks': '@/hooks',
  '../../../hooks': '@/hooks',
  '../contexts': '@/contexts',
  '../../contexts': '@/contexts',
  '../../../contexts': '@/contexts',
  '../utils': '@/utils',
  '../../utils': '@/utils',
  '../../../utils': '@/utils',
  '../mocks': '@/__tests__/mocks',
  '../../mocks': '@/__tests__/mocks'
}

/**
 * Check a single file for relative import violations
 *
 * @param filePath - Path to the file to check
 * @returns Array of error messages for violations found
 */
function checkFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors: string[] = []

  lines.forEach((line, index) => {
    // Check for import/export statements with relative paths
    const importMatch = line.match(/(?:import|export).*from\s+['"]([^'"]+)['"]/)
    if (!importMatch) return

    const importPath = importMatch[1]

    // Skip non-relative imports
    if (!importPath.startsWith('.')) return

    // Check if this relative import is allowed
    const isAllowed = ALLOWED_RELATIVE_PATTERNS.some(pattern => pattern.test(importPath))
    if (isAllowed) return

    // Check if we have a suggested alias
    let suggestion = ''
    for (const [relative, alias] of Object.entries(ALIAS_MAP)) {
      if (importPath.startsWith(relative)) {
        const remaining = importPath.substring(relative.length)
        suggestion = alias + remaining
        break
      }
    }

    // For deeply nested relative imports
    if (!suggestion && (importPath.startsWith('../') || importPath.startsWith('../../'))) {
      const depth = (importPath.match(/\.\.\//g) || []).length
      if (depth >= 2) {
        // Try to determine what they're importing
        const cleanPath = importPath.replace(/^(\.\.\/)+/, '')
        const firstDir = cleanPath.split('/')[0]

        if (['components', 'lib', 'hooks', 'contexts', 'utils'].includes(firstDir)) {
          suggestion = `@/${cleanPath}`
        }
      }
    }

    const errorMessage = suggestion
      ? `${filePath}:${index + 1} - Use alias instead of relative import: "${importPath}" → "${suggestion}"`
      : `${filePath}:${index + 1} - Avoid deep relative imports: "${importPath}"`

    errors.push(errorMessage)
  })

  return errors
}

/**
 * Main entry point for checking relative imports
 *
 * @returns void
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // Silent exit when no files to check
    process.exit(0)
  }

  let totalErrors: string[] = []

  for (const file of args) {
    // Only check TypeScript/JavaScript files
    if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue

    // Skip node_modules and build directories
    if (file.includes('node_modules') || file.includes('dist') || file.includes('build')) continue

    // Skip declaration files
    if (file.endsWith('.d.ts')) continue

    try {
      const errors = checkFile(file)
      totalErrors = totalErrors.concat(errors)
    } catch (error) {
      // Log errors to stderr for debugging
      process.stderr.write(`Error checking ${file}: ${error}\n`)
    }
  }

  if (totalErrors.length > 0) {
    process.stderr.write('\n❌ Relative import violations found:\n\n')
    for (const error of totalErrors) {
      process.stderr.write(`${error}\n`)
    }
    process.stderr.write(
      '\n💡 Use path aliases (@/) instead of relative imports for better maintainability\n'
    )
    process.exit(1)
  }

  // Silent success - no output when everything passes
}

main()
