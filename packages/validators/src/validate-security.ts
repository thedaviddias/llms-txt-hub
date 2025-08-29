#!/usr/bin/env tsx

/**
 * Security Validator
 *
 * Ensures:
 * - No hardcoded secrets
 * - Proper environment variable usage
 * - No unsafe operations
 * - SQL injection prevention
 * - XSS prevention
 */

import fs from 'node:fs'
import chalk from 'chalk'

interface SecurityViolation {
  file: string
  line: number
  message: string
  severity: 'error' | 'warning' | 'critical'
  type: string
}

const SECRET_PATTERNS = [
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{20,}/i, type: 'API Key' },
  { pattern: /secret[_-]?key\s*[:=]\s*['"][^'"]{20,}/i, type: 'Secret Key' },
  { pattern: /password\s*[:=]\s*['"][^'"]+/i, type: 'Password' },
  { pattern: /token\s*[:=]\s*['"][^'"]{20,}/i, type: 'Token' },
  { pattern: /private[_-]?key\s*[:=]\s*['"][^'"]+/i, type: 'Private Key' },
  { pattern: /aws[_-]?access[_-]?key/i, type: 'AWS Key' },
  { pattern: /github[_-]?token/i, type: 'GitHub Token' },
  { pattern: /stripe[_-]?key/i, type: 'Stripe Key' }
]

const UNSAFE_PATTERNS = [
  { pattern: /eval\s*\(/, message: 'Avoid using eval()', severity: 'critical' as const },
  {
    pattern: /innerHTML\s*=/,
    message: 'Use textContent instead of innerHTML',
    severity: 'warning' as const
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    message: 'Avoid dangerouslySetInnerHTML when possible',
    severity: 'warning' as const
  },
  { pattern: /document\.write/, message: 'Avoid document.write', severity: 'error' as const },
  {
    pattern: /new Function\(/,
    message: 'Avoid creating functions from strings',
    severity: 'critical' as const
  }
]

const SQL_INJECTION_PATTERNS = [
  {
    pattern: /query\s*\(\s*['"`].*\$\{/,
    message: 'Potential SQL injection - use parameterized queries'
  },
  {
    pattern: /execute\s*\(\s*['"`].*\+/,
    message: 'Potential SQL injection - avoid string concatenation in queries'
  }
]

class SecurityValidator {
  private violations: SecurityViolation[] = []

  validateFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      this.checkHardcodedSecrets(filePath, line, index + 1)
      this.checkUnsafeOperations(filePath, line, index + 1)
      this.checkSQLInjection(filePath, line, index + 1)
      this.checkXSSVulnerabilities(filePath, line, index + 1)
      this.checkEnvironmentVariables(filePath, line, index + 1)
    })
  }

  private checkHardcodedSecrets(file: string, line: string, lineNumber: number): void {
    // Skip comments and test files
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
    if (file.includes('.test.') || file.includes('.spec.')) return

    for (const { pattern, type } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        // Check if it's using environment variable
        if (!line.includes('process.env') && !line.includes('import.meta.env')) {
          this.violations.push({
            file,
            line: lineNumber,
            message: `Potential hardcoded ${type} detected`,
            severity: 'critical',
            type: 'secret'
          })
        }
      }
    }
  }

  private checkUnsafeOperations(file: string, line: string, lineNumber: number): void {
    for (const { pattern, message, severity } of UNSAFE_PATTERNS) {
      if (pattern.test(line)) {
        this.violations.push({
          file,
          line: lineNumber,
          message,
          severity,
          type: 'unsafe'
        })
      }
    }
  }

  private checkSQLInjection(file: string, line: string, lineNumber: number): void {
    for (const { pattern, message } of SQL_INJECTION_PATTERNS) {
      if (pattern.test(line)) {
        this.violations.push({
          file,
          line: lineNumber,
          message,
          severity: 'critical',
          type: 'sql-injection'
        })
      }
    }
  }

  private checkXSSVulnerabilities(file: string, line: string, lineNumber: number): void {
    // Check for unescaped user input
    if (line.includes('req.query') || line.includes('req.params') || line.includes('req.body')) {
      if (line.includes('innerHTML') || line.includes('document.write')) {
        this.violations.push({
          file,
          line: lineNumber,
          message: 'Potential XSS - user input used in unsafe context',
          severity: 'critical',
          type: 'xss'
        })
      }
    }

    // Check for missing input validation
    if (line.includes('parseInt') && !line.includes('Number.isNaN')) {
      this.violations.push({
        file,
        line: lineNumber,
        message: 'Validate parseInt results with Number.isNaN',
        severity: 'warning',
        type: 'validation'
      })
    }
  }

  private checkEnvironmentVariables(file: string, line: string, lineNumber: number): void {
    // Check for direct process.env access without validation
    const envPattern = /process\.env\.(\w+)/g
    const matches = line.matchAll(envPattern)

    for (const match of matches) {
      const envVar = match[1]
      // Check if it's validated
      if (!line.includes('||') && !line.includes('??') && !line.includes('if')) {
        this.violations.push({
          file,
          line: lineNumber,
          message: `Environment variable ${envVar} used without fallback`,
          severity: 'warning',
          type: 'env'
        })
      }
    }
  }

  report(): boolean {
    if (this.violations.length === 0) {
      console.log(chalk.green('✓ No security issues found'))
      return true
    }

    const critical = this.violations.filter(v => v.severity === 'critical')
    const errors = this.violations.filter(v => v.severity === 'error')
    const warnings = this.violations.filter(v => v.severity === 'warning')

    if (critical.length > 0) {
      console.log(chalk.red.bold(`\n🚨 Found ${critical.length} CRITICAL security issues:`))
      critical.forEach(v => {
        console.log(chalk.red.bold(`  ${v.file}:${v.line} - ${v.message}`))
      })
    }

    if (errors.length > 0) {
      console.log(chalk.red(`\n✗ Found ${errors.length} security errors:`))
      errors.forEach(v => {
        console.log(chalk.red(`  ${v.file}:${v.line} - ${v.message}`))
      })
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ Found ${warnings.length} security warnings:`))
      warnings.forEach(v => {
        console.log(chalk.yellow(`  ${v.file}:${v.line} - ${v.message}`))
      })
    }

    return critical.length === 0 && errors.length === 0
  }
}

export function validateSecurity(files: string[]): boolean {
  const validator = new SecurityValidator()

  for (const file of files) {
    if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue
    if (file.includes('node_modules')) continue

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
  const success = validateSecurity(args)
  process.exit(success ? 0 : 1)
}
