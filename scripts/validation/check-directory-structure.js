#!/usr/bin/env node

/**
 * Validates project directory structure for maintainability
 * Enforces consistent organization patterns
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Required top-level directories and their rules
const REQUIRED_DIRECTORIES = [
  'src', // Source code
  'components' // React components (can be in src/)
]

// Optional directories that have specific structure rules when present
const OPTIONAL_DIRECTORIES = [
  'lib', // Utility libraries
  'hooks', // Custom React hooks
  'types', // TypeScript type definitions
  'styles', // CSS/styling files
  'utils', // General utilities
  'api', // API related code
  'features' // Feature-based modules
]

// Component organization patterns (adjust for your team's preference)
const COMPONENT_STRUCTURE = {
  allowedSubdirectories: [
    'ui', // Basic UI components (Button, Input, etc.) usually for Shadcn/UI
    'layout', // Layout components (Header, Footer, etc.)
    'forms', // Form-related components
    'common', // Shared/common components
    'pages' // Page-specific components
  ],
  maxDepth: 3, // Maximum nesting depth for component directories
  enforceGrouping: true // Require components to be in subdirectories
}

// Files that are allowed in the root directory
const ALLOWED_ROOT_FILES = [
  // Configuration files
  'package.json',
  'tsconfig.json',
  'jsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'postcss.config.js',
  'postcss.config.mjs',
  'postcss.config.cjs',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.ts',
  '.eslintrc.js',
  '.eslintrc.mjs',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'prettier.config.js',
  'prettier.config.mjs',
  'prettier.config.cjs',
  '.prettierrc.js',
  '.prettierrc.mjs',
  'vite.config.js',
  'vite.config.ts',
  'vite.config.mjs',
  'vitest.config.js',
  'vitest.config.ts',
  'vitest.config.mjs',
  'webpack.config.js',
  'webpack.config.mjs',
  'rollup.config.js',
  'rollup.config.mjs',

  // Documentation
  'README.md',
  'CHANGELOG.md',
  'LICENSE',

  // Git and CI
  '.gitignore',
  '.gitattributes',
  'lefthook.yml',
  '.husky',

  // Other
  '.env.example',
  '.env.local',
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml'
]

// Directories to exclude from structure checking
const EXCLUDE_DIRECTORIES = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.turbo',
  '.vercel',
  '.netlify'
]

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')
const path = require('node:path')

// Helper function to check if directory should be excluded
function shouldExcludeDirectory(dirPath) {
  return EXCLUDE_DIRECTORIES.some(exclude => dirPath.includes(exclude))
}

// Helper function to validate component directory structure
function validateComponentStructure(componentsDir) {
  const warnings = []
  const errors = []

  try {
    // Check for loose component files
    const componentFiles = fs
      .readdirSync(componentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && /\.(tsx?|jsx?)$/.test(dirent.name))

    if (componentFiles.length > 5) {
      warnings.push(
        `Consider organizing components into subdirectories (found ${componentFiles.length} files in ${componentsDir})`
      )
    }

    // Check subdirectory organization
    const subdirs = fs
      .readdirSync(componentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    const unknownSubdirs = subdirs.filter(
      dir =>
        !COMPONENT_STRUCTURE.allowedSubdirectories.includes(dir) &&
        !shouldExcludeDirectory(path.join(componentsDir, dir))
    )

    if (unknownSubdirs.length > 0) {
      warnings.push(
        `Unexpected component subdirectories: ${unknownSubdirs.join(', ')}. Consider using: ${COMPONENT_STRUCTURE.allowedSubdirectories.join(', ')}`
      )
    }

    // Check nesting depth
    const checkDepth = (dir, currentDepth = 0) => {
      if (currentDepth > COMPONENT_STRUCTURE.maxDepth) {
        errors.push(
          `Component directory nesting too deep in ${dir} (max: ${COMPONENT_STRUCTURE.maxDepth})`
        )
        return
      }

      try {
        const items = fs.readdirSync(dir, { withFileTypes: true })
        items.forEach(item => {
          if (item.isDirectory() && !shouldExcludeDirectory(path.join(dir, item.name))) {
            checkDepth(path.join(dir, item.name), currentDepth + 1)
          }
        })
      } catch (_error) {
        // Skip directories that can't be read
      }
    }

    checkDepth(componentsDir)
  } catch (error) {
    warnings.push(`Could not validate component structure: ${error.message}`)
  }

  return { warnings, errors }
}

// Main validation function
function validateDirectoryStructure() {
  const errors = []
  const warnings = []

  try {
    // Check if required directories exist
    REQUIRED_DIRECTORIES.forEach(dir => {
      if (!fs.existsSync(dir) && !fs.existsSync(path.join('src', dir))) {
        warnings.push(`Recommended directory missing: ${dir}`)
      }
    })

    // Check for optional directories that have specific rules
    OPTIONAL_DIRECTORIES.forEach(dir => {
      const dirPath = fs.existsSync(dir)
        ? dir
        : fs.existsSync(path.join('src', dir))
          ? path.join('src', dir)
          : null
      if (dirPath && !shouldExcludeDirectory(dirPath)) {
        // Optional directories exist and can be validated for structure if needed
        // This is where you could add specific validation rules for each directory type
      }
    })

    // Check root directory for unwanted files
    const rootFiles = fs
      .readdirSync('.', { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name)

    const unwantedFiles = rootFiles.filter(file => !ALLOWED_ROOT_FILES.includes(file))
    if (unwantedFiles.length > 0) {
      warnings.push(`Consider organizing these root files: ${unwantedFiles.join(', ')}`)
    }

    // Check component structure if components directory exists
    const componentsDir = fs.existsSync('components')
      ? 'components'
      : fs.existsSync('src/components')
        ? 'src/components'
        : null

    if (componentsDir && COMPONENT_STRUCTURE.enforceGrouping) {
      const result = validateComponentStructure(componentsDir)
      warnings.push(...result.warnings)
      errors.push(...result.errors)
    }

    console.log('✅ Directory structure validation completed')

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:')
      warnings.forEach(warning => console.log(`  - ${warning}`))
    }

    if (errors.length > 0) {
      console.log('❌ Errors:')
      errors.forEach(error => console.log(`  - ${error}`))
    }

    return errors.length === 0
  } catch (error) {
    console.error('❌ Directory structure validation failed:', error.message)
    return false
  }
}

// Run validation if called directly
if (require.main === module) {
  const success = validateDirectoryStructure()
  process.exit(success ? 0 : 1)
}

module.exports = { validateDirectoryStructure }
