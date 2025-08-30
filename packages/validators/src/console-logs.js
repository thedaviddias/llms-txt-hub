/**
 * Console Logs Validator
 *
 * Shared validation logic for detecting console.log statements
 * Used by both standalone scripts and ESLint plugin
 *
 * Automatically skips validation for Next.js projects that have
 * console removal configured in next.config.js
 */

const fs = require('node:fs')
const path = require('node:path')

const CONSOLE_PATTERNS = [
  /console\.log\s*\(/g,
  /console\.warn\s*\(/g,
  /console\.error\s*\(/g,
  /console\.info\s*\(/g,
  /console\.debug\s*\(/g,
  /console\.trace\s*\(/g
]

const ALLOWED_PATTERNS = [
  /console\.error\s*\(/, // Allow console.error for error handling
  /console\.warn\s*\(/, // Allow console.warn for warnings
  /\/\*\s*eslint-disable.*no-console.*\*\//, // ESLint disabled
  /\/\/\s*eslint-disable-line.*no-console/, // ESLint disabled for line
  /if\s*\(\s*process\.env\.NODE_ENV.*development/i, // Development-only logging
  /if\s*\(\s*__DEV__/i, // React Native __DEV__ flag
  /if\s*\(\s*DEBUG/i // Debug flag conditional
]

const EXCLUDE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'test',
  'tests',
  '__tests__',
  'spec',
  'specs',
  '.next',
  'out',
  'public',
  'static',
  'assets',
  'docs',
  'documentation',
  'examples',
  'scripts/validation',
  'scripts',
  'packages/validators',
  'packages/generator'
]

/**
 * Check if a console usage is allowed based on patterns and context
 *
 * @param line - The line containing console usage
 * @param lineNumber - Line number in the file
 * @param allLines - All lines in the file for context checking
 *
 * @returns True if console usage is allowed
 */
function isAllowedConsoleUsage(line, lineNumber, allLines) {
  // Check if this line is explicitly allowed
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(line)) {
      return true
    }
  }

  // Check for block-level ESLint disable comments
  let isInDisabledBlock = false
  for (let i = 0; i < lineNumber; i++) {
    const checkLine = allLines[i] || ''
    if (/\/\*\s*eslint-disable.*no-console.*\*\//.test(checkLine)) {
      isInDisabledBlock = true
    }
    if (
      /\/\*\s*eslint-enable.*no-console.*\*\//.test(checkLine) ||
      /\/\*\s*eslint-enable\s*\*\//.test(checkLine)
    ) {
      isInDisabledBlock = false
    }
  }

  if (isInDisabledBlock) {
    return true
  }

  // Check surrounding lines for conditional statements
  const contextStart = Math.max(0, lineNumber - 3)
  const contextEnd = Math.min(allLines.length, lineNumber + 2)
  const context = allLines.slice(contextStart, contextEnd).join('\n')

  // Allow console in development conditions
  if (/if\s*\(\s*(process\.env\.NODE_ENV|__DEV__|DEBUG)/i.test(context)) {
    return true
  }

  return false
}

/**
 * Check Next.js configuration for console removal settings
 *
 * @param projectRoot - Root directory of the project
 *
 * @returns Configuration object with Next.js and console removal status
 */
function checkNextJsConfig(projectRoot = '.') {
  const nextConfigPaths = [
    path.join(projectRoot, 'next.config.js'),
    path.join(projectRoot, 'next.config.mjs'),
    path.join(projectRoot, 'next.config.ts')
  ]

  for (const configPath of nextConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8')

        // Check for compiler.removeConsole configuration
        if (/compiler\s*:\s*\{[^}]*removeConsole\s*:\s*true/s.test(configContent)) {
          return { hasNextJs: true, hasConsoleRemoval: true, configFile: configPath }
        }

        // Check for experimental.removeConsole (older Next.js versions)
        if (/experimental\s*:\s*\{[^}]*removeConsole\s*:\s*true/s.test(configContent)) {
          return { hasNextJs: true, hasConsoleRemoval: true, configFile: configPath }
        }

        return { hasNextJs: true, hasConsoleRemoval: false, configFile: configPath }
      } catch (_error) {
        // If we can't read the config, assume Next.js without console removal
        return { hasNextJs: true, hasConsoleRemoval: false, configFile: configPath }
      }
    }
  }

  // Check if it's a Next.js project by looking for next dependency
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

      if (deps.next) {
        return { hasNextJs: true, hasConsoleRemoval: false, configFile: null }
      }
    } catch (_error) {
      // Ignore package.json parsing errors
    }
  }

  return { hasNextJs: false, hasConsoleRemoval: false, configFile: null }
}

/**
 * Find console log statements in file content
 *
 * @param content - File content to analyze
 * @param filePath - Path to the file being analyzed
 * @param projectRoot - Root directory of the project
 *
 * @returns Array of console log violations found
 */
function findConsoleLogs(content, _filePath, projectRoot = '.') {
  // Check Next.js configuration first
  const nextConfig = checkNextJsConfig(projectRoot)

  if (nextConfig.hasNextJs && nextConfig.hasConsoleRemoval) {
    // Skip validation if Next.js will handle console removal automatically
    return {
      violations: [],
      skipped: true,
      reason: `Next.js project with console removal enabled in ${nextConfig.configFile}`
    }
  }
  const lines = content.split('\n')
  const violations = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    // Skip if line is commented out
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) {
      return
    }

    // Check for console usage
    for (const pattern of CONSOLE_PATTERNS) {
      pattern.lastIndex = 0 // Reset regex state
      const matches = line.match(pattern)

      if (matches) {
        // Check if this usage is allowed
        if (!isAllowedConsoleUsage(line, index, lines)) {
          matches.forEach(match => {
            violations.push({
              line: lineNumber,
              content: line.trim(),
              match: match,
              type: match.includes('log')
                ? 'console.log'
                : match.includes('warn')
                  ? 'console.warn'
                  : match.includes('error')
                    ? 'console.error'
                    : match.includes('info')
                      ? 'console.info'
                      : match.includes('debug')
                        ? 'console.debug'
                        : 'console.trace'
            })
          })
        }
      }
    }
  })

  return { violations, skipped: false, reason: null }
}

module.exports = {
  CONSOLE_PATTERNS,
  ALLOWED_PATTERNS,
  EXCLUDE_PATHS,
  findConsoleLogs,
  isAllowedConsoleUsage,
  checkNextJsConfig
}
