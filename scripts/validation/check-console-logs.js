#!/usr/bin/env node

/**
 * CodeKeeper Console Logs Validation Script
 *
 * Detects console.log, console.warn, console.error statements that should be removed
 * before production deployment.
 *
 * This script helps maintain clean production code by flagging debug statements
 * that developers often forget to remove.
 */

const fs = require('node:fs')
const path = require('node:path')

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Use shared validator
const {
  CONSOLE_PATTERNS,
  ALLOWED_PATTERNS,
  EXCLUDE_PATHS,
  findConsoleLogs,
  isAllowedConsoleUsage,
  checkNextJsConfig
} = require('../../packages/validators/src/console-logs.js')

const INCLUDE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']

function shouldExcludeFile(filePath) {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/')

  return EXCLUDE_PATHS.some(excludePath => {
    if (excludePath.startsWith('/')) {
      return normalizedPath.startsWith(excludePath.slice(1))
    }
    return (
      normalizedPath.includes(`/${excludePath}/`) ||
      normalizedPath.startsWith(`${excludePath}/`) ||
      normalizedPath.endsWith(`/${excludePath}`)
    )
  })
}

function isAllowedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return INCLUDE_EXTENSIONS.includes(ext)
}

function checkFileForConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return findConsoleLogs(content, filePath)
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message)
    return { violations: [], skipped: false, reason: null }
  }
}

function getAllFiles(dirPath, allFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach(file => {
    const fullPath = path.join(dirPath, file)

    if (shouldExcludeFile(fullPath)) {
      return
    }

    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, allFiles)
    } else if (isAllowedFile(fullPath)) {
      allFiles.push(fullPath)
    }
  })

  return allFiles
}

function main() {
  console.log('\x1b[36m🔍 Checking for console logs...\x1b[0m')

  // Check Next.js configuration first
  const nextConfig = checkNextJsConfig('.')
  if (nextConfig.hasNextJs && nextConfig.hasConsoleRemoval) {
    console.log('\x1b[32m✅ Next.js project with console removal enabled\x1b[0m')
    console.log(
      `\x1b[36mℹ️  Console logs will be automatically removed by Next.js (${nextConfig.configFile})\x1b[0m`
    )
    process.exit(0)
  }

  if (nextConfig.hasNextJs && !nextConfig.hasConsoleRemoval) {
    console.log('\x1b[33m⚠️  Next.js project detected without console removal\x1b[0m')
    console.log('\x1b[36m💡 Consider enabling console removal in next.config.js:\x1b[0m')
    console.log('   compiler: { removeConsole: true }')
    console.log()
  }

  const args = process.argv.slice(2)
  let filesToCheck = []
  let hasViolations = false

  if (args.length > 0 && !args.includes('--all')) {
    // Check specific files
    filesToCheck = args.filter(arg => !arg.startsWith('--'))
  } else {
    // Check all files in current directory
    filesToCheck = getAllFiles('.')
  }

  if (filesToCheck.length === 0) {
    console.log('\x1b[33m⚠️  No files found to check\x1b[0m')
    process.exit(0)
  }

  filesToCheck.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`\x1b[33m⚠️  File not found: ${filePath}\x1b[0m`)
      return
    }

    // Skip exclusion check if file was explicitly specified as argument
    const isExplicitFile = args.length > 0 && args.includes(filePath)
    if (!isExplicitFile && (shouldExcludeFile(filePath) || !isAllowedFile(filePath))) {
      return
    }

    const result = checkFileForConsoleLogs(filePath)

    if (result.skipped) {
      console.log(`\x1b[36m⏭️  Skipped ${filePath}: ${result.reason}\x1b[0m`)
      return
    }

    const violations = result.violations || []

    if (violations.length > 0) {
      hasViolations = true
      console.log('\x1b[31m❌ Found console log violations:\x1b[0m\n')
      console.log(`\x1b[1m📁 ${filePath}:\x1b[0m`)

      violations.forEach(violation => {
        console.log(`  Line ${violation.line}: \x1b[31m${violation.match}\x1b[0m`)
        console.log(`    \x1b[33m${violation.content}\x1b[0m`)
      })
      console.log()
    }
  })

  if (hasViolations) {
    console.log('\x1b[31m❌ COMMIT BLOCKED: Found console log statements!\x1b[0m')
    console.log(
      '\x1b[33m💡 Remove console.log statements or use proper logging alternatives\x1b[0m'
    )
    console.log('\x1b[36m📋 Better alternatives:\x1b[0m')
    console.log('  - Use a proper logging library (winston, bunyan, pino)')
    console.log('  - Use debugger statements for debugging')
    console.log(
      '  - Wrap in development-only conditions: if (process.env.NODE_ENV === "development")'
    )
    console.log('  - Use eslint-disable comments for intentional console usage')
    console.log('  - Replace with proper error handling')
    process.exit(1)
  } else {
    console.log('\x1b[32m✅ No console log violations found\x1b[0m')
    process.exit(0)
  }
}

// Export functions for testing and ESLint plugin integration
module.exports = {
  CONSOLE_PATTERNS,
  ALLOWED_PATTERNS,
  EXCLUDE_PATHS,
  checkFileForConsoleLogs,
  findConsoleLogs,
  shouldExcludeFile,
  isAllowedFile,
  isAllowedConsoleUsage,
  checkNextJsConfig
}

// Run the script if called directly
if (require.main === module) {
  main()
}
