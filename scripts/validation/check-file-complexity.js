#!/usr/bin/env node

/**
 * Validates file complexity to ensure maintainable code
 * Prevents files from becoming too large or complex
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Complexity limits for different file types
const COMPLEXITY_LIMITS = {
  lines: 500, // Max lines per file
  functions: 15, // Max functions per file
  dependencies: 20, // Max import statements
  nestingDepth: 10, // Max nesting depth (braces)
  cognitiveComplexity: 20 // Max cognitive complexity per function
}

// React-specific limits (stricter for components)
const REACT_LIMITS = {
  lines: 300, // Shorter for React components
  functions: 10, // Fewer functions per component
  dependencies: 15, // Fewer imports
  nestingDepth: 8, // Less nesting in JSX
  cognitiveComplexity: 15 // Simpler component logic
}

// File patterns that should use React limits
const REACT_FILE_PATTERNS = [
  /\.tsx$/, // TypeScript React files
  /\.jsx$/, // JavaScript React files
  /Component\.(ts|js|mjs)$/, // Component files
  /\/components\// // Files in components directory
]

// Files to exclude from complexity checking
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /build\//,
  /dist\//,
  /coverage\//,
  /\.next\//
]

// Directories to analyze when no specific files are provided
const ANALYSIS_DIRECTORIES = [
  'src', // Traditional source directory
  'app', // Next.js 13+ app directory
  'pages', // Next.js pages directory
  'components', // React components
  'features', // Feature-based modules
  'lib', // Utility libraries
  'hooks', // React hooks
  'utils', // General utilities
  'types' // TypeScript types
]

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')
const path = require('node:path')

// Helper function to determine which limits to use
function getLimitsForFile(filePath) {
  const isReactFile = REACT_FILE_PATTERNS.some(pattern => pattern.test(filePath))
  return isReactFile ? REACT_LIMITS : COMPLEXITY_LIMITS
}

// Helper function to check if file should be excluded
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
}

function calculateNestingDepth(content) {
  let maxDepth = 0
  let currentDepth = 0

  for (const char of content) {
    if (char === '{') {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
    } else if (char === '}') {
      currentDepth--
    }
  }

  return maxDepth
}

function countFunctions(content) {
  const functionPatterns = [
    /function\s+\w+/g,
    /const\s+\w+\s*=\s*\(/g,
    /const\s+\w+\s*=\s*async\s*\(/g,
    /export\s+function/g,
    /export\s+const\s+\w+\s*=.*=>/g
  ]

  let count = 0
  functionPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) count += matches.length
  })

  return count
}

function countImports(content) {
  const importPattern = /^import\s+.*from\s+['"][^'"]+['"]/gm
  const matches = content.match(importPattern)
  return matches ? matches.length : 0
}

function estimateCognitiveComplexity(content) {
  let complexity = 0

  // Count control flow statements
  const controlFlow = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /else\s*{/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /do\s*{/g,
    /switch\s*\(/g,
    /case\s+/g,
    /catch\s*\(/g,
    /\?\s*.*\s*:/g // Ternary operators
  ]

  controlFlow.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) complexity += matches.length
  })

  // Add extra complexity for nested conditions
  const nestedConditions = content.match(/if\s*\(.*\)\s*{[^}]*if\s*\(/g)
  if (nestedConditions) complexity += nestedConditions.length * 2

  return complexity
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').length

  return {
    filePath,
    metrics: {
      lines,
      functions: countFunctions(content),
      imports: countImports(content),
      nestingDepth: calculateNestingDepth(content),
      cognitiveComplexity: estimateCognitiveComplexity(content)
    },
    violations: []
  }
}

function checkViolations(analysis) {
  const { metrics, filePath } = analysis
  const limits = getLimitsForFile(filePath)
  const violations = []

  if (metrics.lines > limits.lines) {
    violations.push(`File has ${metrics.lines} lines (limit: ${limits.lines})`)
  }

  if (metrics.functions > limits.functions) {
    violations.push(`File has ${metrics.functions} functions (limit: ${limits.functions})`)
  }

  if (metrics.imports > limits.dependencies) {
    violations.push(`File has ${metrics.imports} imports (limit: ${limits.dependencies})`)
  }

  if (metrics.nestingDepth > limits.nestingDepth) {
    violations.push(`Max nesting depth is ${metrics.nestingDepth} (limit: ${limits.nestingDepth})`)
  }

  if (metrics.cognitiveComplexity > limits.cognitiveComplexity * 3) {
    violations.push(`High cognitive complexity: ${metrics.cognitiveComplexity}`)
  }

  analysis.violations = violations
  return analysis
}

function generateReport(analyses) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analyses.length,
      filesWithViolations: analyses.filter(a => a.violations.length > 0).length,
      averageLines: Math.round(
        analyses.reduce((sum, a) => sum + a.metrics.lines, 0) / analyses.length
      ),
      averageFunctions: Math.round(
        analyses.reduce((sum, a) => sum + a.metrics.functions, 0) / analyses.length
      )
    },
    files: analyses.map(({ filePath, metrics, violations }) => ({
      path: filePath,
      metrics,
      violations,
      health: violations.length === 0 ? 'good' : violations.length <= 2 ? 'warning' : 'critical'
    }))
  }

  return report
}

function provideSuggestions(analysis) {
  const suggestions = []
  const { metrics, filePath } = analysis

  if (metrics.lines > COMPLEXITY_LIMITS.lines) {
    suggestions.push(`📦 Consider splitting ${path.basename(filePath)} into smaller modules`)
  }

  if (metrics.functions > COMPLEXITY_LIMITS.functions) {
    suggestions.push('🔧 Extract related functions into separate utility files')
  }

  if (metrics.imports > COMPLEXITY_LIMITS.dependencies) {
    suggestions.push('📚 Review dependencies - consider creating a facade or barrel export')
  }

  if (metrics.nestingDepth > COMPLEXITY_LIMITS.nestingDepth) {
    suggestions.push('🎯 Refactor deeply nested code using early returns or extracting functions')
  }

  if (metrics.cognitiveComplexity > COMPLEXITY_LIMITS.cognitiveComplexity * 3) {
    suggestions.push('🧩 Simplify complex logic by breaking it into smaller, named functions')
  }

  return suggestions
}

function main() {
  const args = process.argv.slice(2)
  const isReportMode = args.includes('--report')
  const isFixMode = args.includes('--fix')

  let files = args.filter(arg => !arg.startsWith('--'))

  // If no files specified, analyze all source files
  if (files.length === 0 && (isReportMode || isFixMode)) {
    const getAllFiles = (dir, fileList = []) => {
      if (!fs.existsSync(dir)) return fileList

      const items = fs.readdirSync(dir)

      items.forEach(item => {
        const fullPath = path.join(dir, item)

        try {
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !shouldExcludeFile(fullPath)) {
            getAllFiles(fullPath, fileList)
          } else if (
            stat.isFile() &&
            (item.endsWith('.tsx') ||
              item.endsWith('.ts') ||
              item.endsWith('.js') ||
              item.endsWith('.jsx') ||
              item.endsWith('.mjs') ||
              item.endsWith('.cjs')) &&
            !shouldExcludeFile(fullPath)
          ) {
            fileList.push(fullPath)
          }
        } catch (_error) {
          // Skip files that can't be accessed
        }
      })

      return fileList
    }

    // Check configured directories that exist in the project
    const dirs = ANALYSIS_DIRECTORIES.filter(dir => fs.existsSync(dir))
    files = dirs.flatMap(dir => getAllFiles(dir))
  }

  if (files.length === 0) {
    console.log('No files to analyze')
    process.exit(0)
  }

  const analyses = files
    .filter(file => {
      try {
        return fs.existsSync(file) && fs.statSync(file).isFile()
      } catch {
        return false
      }
    })
    // Exclude scripts and generated types from complexity checks
    .filter(file => !file.startsWith('scripts/'))
    .filter(file => !file.includes('lib/types/generated'))
    .map(file => checkViolations(analyzeFile(file)))

  if (isReportMode) {
    const report = generateReport(analyses)
    console.log(JSON.stringify(report, null, 2))
    process.exit(0)
  }

  if (isFixMode) {
    console.log('🔧 Complexity Analysis & Refactoring Suggestions\n')

    analyses.forEach(analysis => {
      if (analysis.violations.length > 0) {
        console.log(`📁 ${analysis.filePath}`)
        console.log('  Issues:')
        analysis.violations.forEach(v => console.log(`    - ${v}`))

        const suggestions = provideSuggestions(analysis)
        if (suggestions.length > 0) {
          console.log('  Suggestions:')
          suggestions.forEach(s => console.log(`    ${s}`))
        }
        console.log()
      }
    })

    const problematicFiles = analyses.filter(a => a.violations.length > 0)
    if (problematicFiles.length === 0) {
      console.log('✅ All files pass complexity checks!')
    } else {
      console.log(`Found ${problematicFiles.length} files that need attention`)
    }

    process.exit(0)
  }

  // Normal validation mode
  const hasViolations = analyses.some(a => a.violations.length > 0)

  if (hasViolations) {
    console.log('❌ Complexity violations found:\n')

    analyses
      .filter(a => a.violations.length > 0)
      .forEach(({ filePath, violations }) => {
        console.log(`📁 ${filePath}:`)
        violations.forEach(v => console.log(`  - ${v}`))
        console.log()
      })

    process.exit(1)
  }

  process.exit(0)
}

// Run validation (only if called directly)
if (require.main === module) {
  main()
}

// Export for use in ESLint plugin
module.exports = {
  DEFAULT_LIMITS,
  ANALYSIS_DIRECTORIES,
  EXCLUDE_PATTERNS,
  analyzeFile,
  getLimitsForFile,
  shouldExcludeFile
}
