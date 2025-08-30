/**
 * AS Casts Validation Logic
 * Shared validation logic for TypeScript 'as' casts
 */

const fs = require('node:fs')

// Patterns to detect unsafe 'as' type assertions
const AS_CAST_PATTERNS = [
  // Match 'as Type' but not 'as const'
  /\bas\s+(?!const\b)[A-Z]\w*/g,
  // Match 'as any'
  /\bas\s+any\b/g,
  // Match 'as unknown'
  /\bas\s+unknown\b/g,
  // Match generic as casts like 'as Array<T>'
  /\bas\s+[A-Z]\w*\s*</g,
  // Match parenthesized as casts
  /\)\s*as\s+[A-Z]\w*/g
]

// Exceptions where 'as' might be acceptable
const ALLOWED_PATTERNS = [
  // Allow 'as const' for const assertions
  /\bas\s+const\b/g,
  // Allow in test files for mocking
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /__tests__/,
  // Allow in migration scripts (temporary)
  /scripts\/migrate.*\.ts$/
]

// Directories to exclude from checking
const EXCLUDE_PATHS = ['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'public']

/**
 * Check if a file path should be excluded
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATHS.some(exclude => filePath.includes(exclude))
}

/**
 * Check if a file is allowed to have as casts
 */
function isAllowedFile(filePath) {
  return ALLOWED_PATTERNS.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(filePath)
    }
    return filePath.includes(pattern)
  })
}

/**
 * Find all as casts in a file content
 */
function findAsCasts(filePath, content) {
  const violations = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return
    }

    // Check each pattern
    AS_CAST_PATTERNS.forEach(pattern => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        // Check if it's not an allowed pattern
        const isAllowed = ALLOWED_PATTERNS.some(allowed => {
          if (allowed instanceof RegExp && !allowed.test(filePath)) {
            return allowed.test(match[0])
          }
          return false
        })

        if (!isAllowed) {
          violations.push({
            line: index + 1,
            column: match.index + 1,
            match: match[0],
            text: line.trim()
          })
        }
      }
    })
  })

  return violations
}

/**
 * Check a specific file for as casts
 */
function checkFileForAsCasts(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }

  if (shouldExcludeFile(filePath) || isAllowedFile(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf8')
  return findAsCasts(filePath, content)
}

module.exports = {
  AS_CAST_PATTERNS,
  ALLOWED_PATTERNS,
  EXCLUDE_PATHS,
  checkFileForAsCasts,
  findAsCasts,
  shouldExcludeFile,
  isAllowedFile
}
