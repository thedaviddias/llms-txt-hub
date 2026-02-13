/**
 * File Complexity Validation Logic
 * Shared validation logic for file complexity analysis
 */

const fs = require('node:fs')
const _path = require('node:path')

// Default complexity limits
const DEFAULT_LIMITS = {
  lines: 500,
  functions: 15,
  nestingDepth: 4,
  cyclomaticComplexity: 10
}

// Patterns to exclude from complexity checking
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.turbo/,
  /\.vercel/,
  /\.netlify/,
  /public/,
  /static/,
  /assets/
]

// Directories to analyze by default
const ANALYSIS_DIRECTORIES = [
  'src',
  'lib',
  'components',
  'pages',
  'app',
  'hooks',
  'utils',
  'services'
]

/**
 * Check if a file should be excluded from complexity analysis
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
}

/**
 * Get complexity limits for a specific file
 */
function getLimitsForFile(filePath) {
  const limits = { ...DEFAULT_LIMITS }

  // More lenient limits for certain file types
  if (filePath.includes('test') || filePath.includes('spec')) {
    limits.lines = 1000
    limits.functions = 25
  }

  if (filePath.includes('config') || filePath.includes('constant')) {
    limits.lines = 200
    limits.functions = 5
  }

  return limits
}

/**
 * Analyze file complexity metrics
 */
function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const limits = getLimitsForFile(filePath)

  const metrics = {
    lines: lines.length,
    functions: countFunctions(content),
    nestingDepth: getMaxNestingDepth(content),
    cyclomaticComplexity: getCyclomaticComplexity(content)
  }

  const violations = []

  // Check violations
  if (metrics.lines > limits.lines) {
    violations.push(`Too many lines: ${metrics.lines} (max: ${limits.lines})`)
  }

  if (metrics.functions > limits.functions) {
    violations.push(`Too many functions: ${metrics.functions} (max: ${limits.functions})`)
  }

  if (metrics.nestingDepth > limits.nestingDepth) {
    violations.push(
      `Nesting too deep: ${metrics.nestingDepth} levels (max: ${limits.nestingDepth})`
    )
  }

  if (metrics.cyclomaticComplexity > limits.cyclomaticComplexity) {
    violations.push(
      `Cyclomatic complexity too high: ${metrics.cyclomaticComplexity} (max: ${limits.cyclomaticComplexity})`
    )
  }

  return {
    filePath,
    metrics,
    violations,
    limits
  }
}

/**
 * Count functions in file content
 */
function countFunctions(content) {
  const functionPatterns = [
    /function\s+\w+/g,
    /const\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>/g,
    /let\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>/g,
    /var\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>/g,
    /\w+\s*:\s*(?:\([^)]*\)\s*)?=>/g,
    /class\s+\w+/g
  ]

  let count = 0
  functionPatterns.forEach(pattern => {
    const matches = content.match(pattern) || []
    count += matches.length
  })

  return count
}

/**
 * Get maximum nesting depth in file content
 */
function getMaxNestingDepth(content) {
  const lines = content.split('\n')
  let maxDepth = 0
  let currentDepth = 0

  lines.forEach(line => {
    const trimmed = line.trim()

    // Count opening braces
    const openBraces = (trimmed.match(/{/g) || []).length
    const closeBraces = (trimmed.match(/}/g) || []).length

    currentDepth += openBraces - closeBraces
    maxDepth = Math.max(maxDepth, currentDepth)

    // Prevent negative depth
    if (currentDepth < 0) currentDepth = 0
  })

  return maxDepth
}

/**
 * Calculate cyclomatic complexity
 */
function getCyclomaticComplexity(content) {
  const complexityPatterns = [
    /\bif\b/g,
    /\belse\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bswitch\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\btry\b/g,
    /\b\?\s*:/g, // ternary operator
    /\|\|/g, // logical OR
    /&&/g // logical AND
  ]

  let complexity = 1 // Base complexity
  complexityPatterns.forEach(pattern => {
    const matches = content.match(pattern) || []
    complexity += matches.length
  })

  return complexity
}

module.exports = {
  DEFAULT_LIMITS,
  ANALYSIS_DIRECTORIES,
  EXCLUDE_PATTERNS,
  analyzeFile,
  getLimitsForFile,
  shouldExcludeFile,
  countFunctions,
  getMaxNestingDepth,
  getCyclomaticComplexity
}
