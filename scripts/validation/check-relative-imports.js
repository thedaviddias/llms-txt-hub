#!/usr/bin/env node

/**
 * Validates import patterns to enforce consistent path aliases
 * Prevents deep relative imports that break on refactoring
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Maximum depth allowed for relative imports (e.g., ../../.. = depth 3)
const MAX_RELATIVE_DEPTH = 2

// Allowed relative import patterns (same directory or one level)
const ALLOWED_RELATIVE_PATTERNS = [
  /^\.\/[^/]+$/, // ./file or ./directory
  /^\.\/types\//, // ./types/something (local types)
  /^\.\/components\//, // ./components/something (local components)
  /^\.\/utils\//, // ./utils/something (local utilities)
  /^\.\/hooks\// // ./hooks/something (local hooks)
]

// Preferred path aliases (project should use these instead of deep relative)
const PREFERRED_ALIASES = {
  components: '@/components', // Use @/components instead of ../../../components
  utils: '@/utils', // Use @/utils instead of ../../utils
  hooks: '@/hooks', // Use @/hooks instead of ../hooks
  types: '@/types', // Use @/types instead of ../../types
  lib: '@/lib', // Use @/lib instead of ../lib
  styles: '@/styles' // Use @/styles instead of ../../styles
}

// Files to exclude from relative import checking
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /build\//,
  /dist\//,
  /\.next\//
]

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')

// Helper function to count relative import depth
function getRelativeDepth(importPath) {
  const parts = importPath.split('/')
  return parts.filter(part => part === '..').length
}

// Helper function to suggest preferred alias based on import path
function getSuggestedAlias(importPath) {
  for (const [key, alias] of Object.entries(PREFERRED_ALIASES)) {
    if (importPath.includes(key)) {
      return alias
    }
  }
  return null
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const violations = []

  lines.forEach((line, index) => {
    // Check for relative imports
    const importMatch = line.match(/from\s+['"](\.\.[^'"`]+)['"]/)
    if (importMatch) {
      const importPath = importMatch[1]
      const depth = getRelativeDepth(importPath)

      // Check if depth exceeds maximum allowed
      if (depth > MAX_RELATIVE_DEPTH) {
        violations.push({
          line: index + 1,
          import: importPath,
          text: line.trim(),
          reason: `Relative import depth ${depth} exceeds maximum ${MAX_RELATIVE_DEPTH}`
        })
        return
      }

      // Check if it's an allowed relative import pattern
      const isAllowed = ALLOWED_RELATIVE_PATTERNS.some(pattern => pattern.test(importPath))

      if (!isAllowed && !importPath.startsWith('./')) {
        // Suggest preferred alias if available
        const suggestedAlias = getSuggestedAlias(importPath)
        violations.push({
          line: index + 1,
          import: importPath,
          text: line.trim(),
          reason: 'Should use path alias instead of deep relative import',
          suggestion: suggestedAlias
        })
      }
    }
  })

  return violations
}

function main() {
  const files = process.argv.slice(2)

  if (files.length === 0) {
    console.log('No files to check')
    process.exit(0)
  }

  let hasViolations = false
  const allViolations = []

  files.forEach(file => {
    if (!fs.existsSync(file)) {
      return
    }

    const violations = checkFile(file)
    if (violations.length > 0) {
      hasViolations = true
      allViolations.push({ file, violations })
    }
  })

  if (hasViolations) {
    console.log('❌ Found relative import violations:')
    allViolations.forEach(({ file, violations }) => {
      console.log(`\n📁 ${file}:`)
      violations.forEach(({ line, import: importPath, reason, suggestion }) => {
        console.log(`  Line ${line}: "${importPath}"`)
        console.log(`    ${reason}`)
        if (suggestion) {
          console.log(`    💡 Suggestion: Use "${suggestion}" instead`)
        }
      })
    })
    console.log('\n💡 Use "@/" aliases instead of deep relative imports')
    process.exit(1)
  }

  console.log('✅ All imports use proper aliases')
  process.exit(0)
}

main()
