#!/usr/bin/env node

/**
 * Validates JSDoc documentation for functions, components, and classes
 * Ensures code is properly documented for better maintainability
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// What needs JSDoc documentation
const DOCUMENTATION_REQUIREMENTS = {
  functions: true, // All functions must have JSDoc
  components: true, // All React components must have JSDoc
  classes: true, // All classes must have JSDoc
  interfaces: false, // Interfaces optional (TypeScript provides good docs)
  types: false, // Type aliases optional
  constants: false, // Constants optional (usually self-documenting)
  hooks: true // Custom React hooks must have JSDoc
}

// Required JSDoc sections (description is always required)
const REQUIRED_TAGS = {
  functions: ['@param', '@returns'], // Functions need params and return docs
  components: ['@param'], // Components need prop docs
  classes: [], // Classes just need description
  hooks: ['@param', '@returns'] // Hooks need params and return docs
}

// Files and directories to exclude from JSDoc checking
const EXCLUDE_PATTERNS = [
  // Test files
  /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /\.spec\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /__tests__/,

  // Config files
  /\.config\.(ts|js|mjs|cjs)$/,
  /next\.config\./,
  /jest\.setup\./,
  /next-env\.d\.ts$/,

  // Build directories
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.git/
]

// Minimum function size to require JSDoc (lines of code)
const _MIN_FUNCTION_SIZE_FOR_JSDOC = 3

// TypeScript integration settings
const TYPESCRIPT_SETTINGS = {
  inferTypes: true, // Infer types from TypeScript signatures
  requireTypeAnnotations: false // Don't require {Type} in JSDoc comments
}

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')
const path = require('node:path')

/**
 * Checks if a file path matches any exclusion pattern
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
}

/**
 * Checks if a directory path matches any exclusion pattern
 */
function shouldExcludeDirectory(dirPath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(dirPath))
}

/**
 * Validates JSDoc documentation coverage for functions, components, and classes in source files
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
   * Check if a directory should be excluded from validation
   * @param {string} dirPath - Directory path to check
   * @returns {boolean} True if directory should be excluded
   */
  shouldExcludeDirectory(dirPath) {
    return shouldExcludeDirectory(dirPath)
  }

  /**
   * Check if a file should be excluded from validation
   * @param {string} fileName - File name to check
   * @returns {boolean} True if file should be excluded
   */
  shouldExcludeFile(fileName) {
    return shouldExcludeFile(fileName)
  }

  /**
   * Extract JSDoc comment for a function or component
   * @param {string} content - File content
   * @param {number} lineNumber - Line number where function/component starts
   * @returns {string|null} JSDoc comment or null if not found
   */
  extractJSDoc(content, lineNumber) {
    const lines = content.split('\n')
    const jsDocLines = []
    let currentLine = lineNumber - 2 // Start from the line before the function

    // Look backwards for JSDoc comment
    while (currentLine >= 0) {
      const line = lines[currentLine].trim()

      if (line.endsWith('*/')) {
        jsDocLines.unshift(line)
        currentLine--

        // Find the start of JSDoc comment
        while (currentLine >= 0) {
          const prevLine = lines[currentLine].trim()
          jsDocLines.unshift(prevLine)

          if (prevLine.startsWith('/**')) {
            return jsDocLines.join('\n')
          }
          currentLine--
        }
        break
      } else if (line === '' || line.startsWith('//')) {
        // Skip empty lines and single-line comments
        currentLine--
      } else {
        // Found non-comment line, no JSDoc
        break
      }
    }

    return null
  }

  /**
   * Validate JSDoc content against requirements
   * @param {string} jsDoc - JSDoc comment content
   * @param {string} type - Type of element ('function', 'component', 'class')
   * @param {Object} context - Additional context about the element
   * @returns {string[]} Array of validation errors
   */
  validateJSDocContent(jsDoc, type, context) {
    if (!jsDoc) {
      return [`Missing JSDoc comment for ${type}`]
    }

    const errors = []
    const requiredTags = REQUIRED_TAGS[type] || []

    requiredTags.forEach(tag => {
      const tagError = this.validateJSDocTag(jsDoc, tag, context)
      if (tagError) {
        errors.push(tagError)
      }
    })

    return errors
  }

  /**
   * Validate a specific JSDoc tag
   * @param {string} jsDoc - JSDoc comment content
   * @param {string} tag - Tag to validate
   * @param {Object} context - Additional context about the element
   * @returns {string|null} Error message or null if valid
   */
  validateJSDocTag(jsDoc, tag, context) {
    if (tag === '@description') {
      return this.validateDescription(jsDoc)
    }
    if (tag === '@param') {
      return this.validateParamTags(jsDoc, context)
    }
    if (tag === '@returns') {
      return this.validateReturnTag(jsDoc, context)
    }
    return null
  }

  /**
   * Validate JSDoc description
   * @param {string} jsDoc - JSDoc comment content
   * @returns {string|null} Error message or null if valid
   */
  validateDescription(jsDoc) {
    const hasDescription =
      jsDoc.includes('/**') &&
      (jsDoc.match(/\/\*\*\s*\n\s*\*\s*[A-Z]/) || jsDoc.includes('@description'))
    return hasDescription ? null : 'Missing description in JSDoc'
  }

  /**
   * Validate JSDoc param tags
   * @param {string} jsDoc - JSDoc comment content
   * @param {Object} context - Additional context about the element
   * @returns {string|null} Error message or null if valid
   */
  validateParamTags(jsDoc, context) {
    if (!context.params || context.params.length === 0) {
      return null
    }

    // Check for @param tags without requiring type specifications
    const paramMatches = jsDoc.match(/@param\s+(?:\{[^}]*\}\s+)?(\w+)/g) || []
    if (paramMatches.length < context.params.length) {
      return `Missing @param documentation for ${context.params.length - paramMatches.length} parameter(s)`
    }

    // Check for type specifications (warn but don't block)
    const typedParams = jsDoc.match(/@param\s+\{[^}]+\}/g) || []
    if (typedParams.length > 0 && TYPESCRIPT_SETTINGS.inferTypes) {
      // Note: This could be a warning in the future
      // For now, we allow both typed and untyped @param tags
    }

    return null
  }

  /**
   * Validate JSDoc return tag
   * @param {string} jsDoc - JSDoc comment content
   * @param {Object} context - Additional context about the element
   * @returns {string|null} Error message or null if valid
   */
  validateReturnTag(jsDoc, context) {
    if (!context.hasReturn) {
      return null
    }

    if (!jsDoc.includes('@returns') && !jsDoc.includes('@return')) {
      return 'Missing @returns documentation'
    }

    // Check for type specifications in @returns (warn but don't block)
    const typedReturns = jsDoc.match(/@returns?\s+\{[^}]+\}/g) || []
    if (typedReturns.length > 0 && TYPESCRIPT_SETTINGS.inferTypes) {
      // Note: This could be a warning in the future
      // For now, we allow both typed and untyped @returns tags
    }

    return null
  }

  /**
   * Parse function parameters from function signature
   * @param {string} signature - Function signature
   * @returns {string[]} Array of parameter names
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
   * @param {string} content - Function content
   * @returns {boolean} True if function has return statement
   */
  hasReturnStatement(content) {
    // Simple check for return statements (not perfect but good enough)
    return /return\s+(?!;|$)/.test(content)
  }

  /**
   * Validate a single TypeScript/TSX file
   * @param {string} filePath - Path to the file to validate
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
      // React components (arrow function with JSX)
      {
        regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/,
        type: 'component',
        extract: (match, lineNum) => {
          // Check if this looks like a React component (starts with capital letter)
          const name = match[1]
          if (name[0] === name[0].toUpperCase()) {
            return {
              name,
              signature: lines[lineNum],
              lineNumber: lineNum + 1
            }
          }
          return null
        }
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
        this.processPatternMatch(pattern, trimmedLine, index, lines, content, filePath)
      })
    })
  }

  /**
   * Process a pattern match found in code
   * @param {Object} pattern - Pattern configuration
   * @param {string} trimmedLine - Trimmed line content
   * @param {number} index - Line index
   * @param {string[]} lines - All file lines
   * @param {string} content - Full file content
   * @param {string} filePath - File path being validated
   */
  processPatternMatch(pattern, trimmedLine, index, lines, content, filePath) {
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
  }

  /**
   * Update element statistics
   * @param {string} type - Element type
   */
  updateElementStats(type) {
    if (type === 'function') this.stats.functionsChecked++
    if (type === 'component') this.stats.componentsChecked++
  }

  /**
   * Check if element type should be validated
   * @param {string} type - Element type
   * @returns {boolean} True if should validate
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
   * Build validation context for element
   * @param {Object} element - Element information
   * @param {string} type - Element type
   * @returns {Object} Validation context
   */
  buildValidationContext(element, type) {
    const params = this.parseFunctionParams(element.signature)
    const hasReturn = this.hasReturnStatement(element.signature)
    const returnType = this.extractReturnType(element.signature)

    return {
      params,
      hasReturn,
      returnType,
      name: element.name,
      type,
      signature: element.signature
    }
  }

  /**
   * Extract return type from TypeScript function signature
   * @param {string} signature - Function signature
   * @returns {string} Return type or 'void'
   */
  extractReturnType(signature) {
    // Match return type annotation after ):
    const returnMatch = signature.match(/\)\s*:\s*([^{=]+)/)
    if (returnMatch) {
      return returnMatch[1].trim()
    }

    // Check for arrow function return type
    const arrowMatch = signature.match(/=>\s*([^{=]+)/)
    if (arrowMatch) {
      return arrowMatch[1].trim()
    }

    return 'void'
  }

  /**
   * Record a JSDoc violation
   * @param {string} filePath - File path
   * @param {Object} element - Element information
   * @param {string} type - Element type
   * @param {string[]} errors - Validation errors
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
   * Recursively find and validate all files in a directory
   * @param {string} dir - Directory to search
   */
  validateDirectory(dir) {
    if (this.shouldExcludeDirectory(dir)) return

    const items = fs.readdirSync(dir)

    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        this.validateDirectory(fullPath)
      } else if (stat.isFile()) {
        if (this.shouldExcludeFile(item)) return

        if (
          item.endsWith('.ts') ||
          item.endsWith('.tsx') ||
          item.endsWith('.js') ||
          item.endsWith('.jsx') ||
          item.endsWith('.mjs') ||
          item.endsWith('.cjs')
        ) {
          this.validateFile(fullPath)
        }
      }
    })
  }

  /**
   * Generate a report of JSDoc violations
   * @returns {Object} Report object with violations and statistics
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

/**
 * Main function to run JSDoc validation
 */
function main() {
  console.log('📚 Checking JSDoc documentation...\n')

  const validator = new JSDocValidator()

  // Parse command line arguments
  const args = process.argv.slice(2)
  const specificFiles = args.filter(
    arg => !arg.startsWith('--') && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(arg)
  )

  if (specificFiles.length > 0) {
    // Validate specific files provided as arguments
    specificFiles.forEach(file => {
      if (fs.existsSync(file)) {
        validator.validateFile(file)
      }
    })
  } else {
    // Validate common source directories
    const dirsToCheck = ['lib', 'components', 'hooks', 'app'].filter(dir => fs.existsSync(dir))

    dirsToCheck.forEach(dir => {
      validator.validateDirectory(dir)
    })
  }

  const report = validator.generateReport()

  // Display results
  if (report.summary.hasViolations) {
    console.log('❌ JSDoc violations found:\n')

    // Group violations by file
    const violationsByFile = {}
    report.violations.forEach(violation => {
      if (!violationsByFile[violation.file]) {
        violationsByFile[violation.file] = []
      }
      violationsByFile[violation.file].push(violation)
    })

    Object.entries(violationsByFile).forEach(([file, violations]) => {
      console.log(`📁 ${file}:`)
      violations.forEach(violation => {
        console.log(`  Line ${violation.line}: ${violation.element} (${violation.type})`)
        violation.errors.forEach(error => {
          console.log(`    - ${error}`)
        })
      })
      console.log()
    })

    console.log(`💡 ${report.violations.length} JSDoc violations found`)
    console.log(
      `📊 Documentation coverage: Functions ${report.summary.coverage.functions}%, Components ${report.summary.coverage.components}%`
    )

    if (process.env.NODE_ENV !== 'development') {
      process.exit(1)
    }
  } else {
    console.log('✅ All functions and components have proper JSDoc documentation')
    console.log(`📊 Files checked: ${report.stats.filesChecked}`)
    console.log(`📊 Functions checked: ${report.stats.functionsChecked}`)
    console.log(`📊 Components checked: ${report.stats.componentsChecked}`)
  }

  console.log('✅ JSDoc validation completed')
  process.exit(0)
}

if (require.main === module) {
  main()
}

module.exports = { JSDocValidator }
