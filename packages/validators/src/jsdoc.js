/**
 * JSDoc Validation Logic
 * Shared validation logic for JSDoc documentation requirements
 */

const fs = require('node:fs')
const path = require('node:path')

// Documentation requirements configuration
const DOCUMENTATION_REQUIREMENTS = {
  functions: true,
  components: true,
  classes: true,
  hooks: true
}

// TypeScript integration settings
const TYPESCRIPT_SETTINGS = {
  inferTypes: true,
  requireTypedReturns: false,
  allowTypeScriptTypes: true
}

// Files to exclude from JSDoc checking
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /packages\/validators/,
  /\.d\.ts$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /__tests__/
]

/**
 * JSDoc Validator class
 */
class JSDocValidator {
  constructor() {
    this.violations = []
    this.stats = {
      filesChecked: 0,
      functionsChecked: 0,
      componentsChecked: 0,
      violationsFound: 0
    }
  }

  /**
   * Check if a file should be excluded from validation
   */
  shouldExcludeFile(fileName) {
    return EXCLUDE_PATTERNS.some(pattern => pattern.test(fileName))
  }

  /**
   * Check if a directory should be excluded from validation
   */
  shouldExcludeDirectory(dirPath) {
    const excludeDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      'packages/validators'
    ]
    return excludeDirs.some(dir => dirPath.includes(dir))
  }

  /**
   * Extract JSDoc comment for a function at a specific line
   */
  extractJSDoc(content, lineNumber) {
    const lines = content.split('\n')
    let currentLine = lineNumber - 2 // Start from the line before the function
    let jsDocLines = []
    let foundStart = false

    // Look backwards for JSDoc start
    while (currentLine >= 0) {
      const line = lines[currentLine].trim()

      if (line.endsWith('*/')) {
        foundStart = true
        jsDocLines.unshift(line)
      } else if (foundStart && line.startsWith('/**')) {
        jsDocLines.unshift(line)
        break
      } else if (foundStart && (line.startsWith('*') || line === '')) {
        jsDocLines.unshift(line)
      } else if (foundStart) {
        // Hit non-JSDoc content, stop
        break
      }

      currentLine--
    }

    return foundStart ? jsDocLines.join('\n') : null
  }

  /**
   * Validate JSDoc content
   */
  validateJSDocContent(jsDoc, type, context) {
    const errors = []

    if (!jsDoc) {
      errors.push(`Missing JSDoc comment for ${type} "${context.name}"`)
      return errors
    }

    // Check for basic description
    if (!jsDoc.includes('*') || jsDoc.trim() === '/**\n */') {
      errors.push(`JSDoc comment is empty or missing description for ${context.name}`)
    }

    // Check for @param tags if function has parameters (TypeScript types can be inferred)
    if (context.params && context.params.length > 0) {
      context.params.forEach(param => {
        if (!jsDoc.includes(`@param ${param.name}`)) {
          errors.push(`Missing @param ${param.name} - description (TypeScript types are inferred)`)
        }
      })
    }

    // Check for @returns tag if function has return statement (TypeScript types can be inferred)
    if (context.hasReturn && !jsDoc.includes('@returns') && !jsDoc.includes('@return')) {
      errors.push('Missing @returns - description (TypeScript types are inferred)')
    }

    return errors
  }

  /**
   * Parse function parameters from function signature
   */
  parseFunctionParams(signature) {
    const paramMatch = signature.match(/\(([^)]*)\)/)
    if (!paramMatch || !paramMatch[1].trim()) return []

    return paramMatch[1]
      .split(',')
      .map(param => {
        const trimmed = param.trim()
        if (!trimmed || trimmed === '...') return null

        // Extract parameter name and type from TypeScript signature
        const parts = trimmed.split(':')
        const name = parts[0].trim().split(/[=]/)[0].trim()
        const type = parts.length > 1 ? parts[1].trim().split('=')[0].trim() : 'any'

        return { name, type, optional: trimmed.includes('?') }
      })
      .filter(Boolean)
  }

  /**
   * Check if function has explicit return statement
   */
  hasReturnStatement(content) {
    // Simple check for return statements (not perfect but good enough)
    return /return\s+(?!;|$)/.test(content)
  }

  /**
   * Check if element type should be validated
   */
  shouldValidateElement(type) {
    let requirementKey = type
    if (type === 'component') requirementKey = 'components'
    if (type === 'function') requirementKey = 'functions'
    if (type === 'class') requirementKey = 'classes'
    if (type === 'hook') requirementKey = 'hooks'

    return DOCUMENTATION_REQUIREMENTS[requirementKey] === true
  }

  /**
   * Validate a single file
   */
  validateFile(filePath) {
    this.stats.filesChecked++

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // Patterns to match functions and components
    const patterns = [
      // Function declarations
      {
        regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
        type: 'function',
        extract: (match, lineNum) => ({
          name: match[1],
          signature: lines[lineNum],
          lineNumber: lineNum + 1
        })
      },
      // Arrow functions (const/let/var)
      {
        regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|async\s*\([^)]*\)\s*=>)/,
        type: 'function',
        extract: (match, lineNum) => ({
          name: match[1],
          signature: lines[lineNum],
          lineNumber: lineNum + 1
        })
      },
      // React components (function)
      {
        regex:
          /^(?:export\s+)?(?:function\s+)?(\w+)\s*\([^)]*\):\s*JSX\.Element|^(?:export\s+)?function\s+(\w+).*\{[\s\S]*?return\s*\(/,
        type: 'component',
        extract: (match, lineNum) => ({
          name: match[1] || match[2],
          signature: lines[lineNum],
          lineNumber: lineNum + 1
        })
      },
      // Class declarations
      {
        regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
        type: 'class',
        extract: (match, lineNum) => ({
          name: match[1],
          signature: lines[lineNum],
          lineNumber: lineNum + 1
        })
      }
    ]

    // Check each line for patterns
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      patterns.forEach(pattern => {
        const match = trimmedLine.match(pattern.regex)
        if (!match) return

        const element = pattern.extract(match, index)
        if (!element) return

        this.updateElementStats(pattern.type)

        if (!this.shouldValidateElement(pattern.type)) {
          return
        }

        const jsDoc = this.extractJSDoc(content, element.lineNumber)
        const context = this.buildValidationContext(element, pattern.type)
        const errors = this.validateJSDocContent(jsDoc, pattern.type, context)

        if (errors.length > 0) {
          this.recordViolation(filePath, element, pattern.type, errors)
        }
      })
    })
  }

  /**
   * Update element statistics
   */
  updateElementStats(type) {
    if (type === 'function') this.stats.functionsChecked++
    if (type === 'component') this.stats.componentsChecked++
  }

  /**
   * Build validation context for element
   */
  buildValidationContext(element, type) {
    const params = this.parseFunctionParams(element.signature)
    const hasReturn = this.hasReturnStatement(element.signature)

    return {
      params,
      hasReturn,
      name: element.name,
      type,
      signature: element.signature
    }
  }

  /**
   * Record a JSDoc violation
   */
  recordViolation(filePath, element, type, errors) {
    this.violations.push({
      file: filePath,
      element: element.name,
      type,
      line: element.lineNumber,
      errors
    })
    this.stats.violationsFound += errors.length
  }

  /**
   * Generate a report of JSDoc violations
   */
  generateReport() {
    return {
      violations: this.violations,
      stats: this.stats,
      summary: {
        hasViolations: this.violations.length > 0,
        violationCount: this.violations.length,
        coverage: {
          functions:
            this.stats.functionsChecked > 0
              ? Math.round(
                  ((this.stats.functionsChecked -
                    this.violations.filter(v => v.type === 'function').length) /
                    this.stats.functionsChecked) *
                    100
                )
              : 100,
          components:
            this.stats.componentsChecked > 0
              ? Math.round(
                  ((this.stats.componentsChecked -
                    this.violations.filter(v => v.type === 'component').length) /
                    this.stats.componentsChecked) *
                    100
                )
              : 100
        }
      }
    }
  }
}

module.exports = {
  JSDocValidator,
  DOCUMENTATION_REQUIREMENTS,
  TYPESCRIPT_SETTINGS,
  EXCLUDE_PATTERNS
}
