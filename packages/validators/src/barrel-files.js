/**
 * Barrel Files Validation Logic
 * Shared validation logic for detecting barrel files
 */

const fs = require('node:fs')
const path = require('node:path')

// File names that are considered potential barrel files
const BARREL_FILE_PATTERNS = [
  'index.ts',
  'index.js',
  'index.mjs',
  'index.cjs',
  'index.tsx',
  'index.jsx'
]

// Directories to exclude from barrel file checking
const EXCLUDED_DIRECTORIES = [
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

// Index files that are legitimate (not barrel files)
const ALLOWED_INDEX_FILES = [
  // Next.js legitimate index files
  'app/page.tsx', // Next.js 13+ app router root page
  'pages/index.tsx', // Next.js pages router root page
  'pages/index.js',
  'pages/index.mjs',
  'src/pages/index.tsx',
  'src/pages/index.js',
  'src/pages/index.mjs',

  // Package entry points (only at specific locations)
  'src/index.ts', // Package entry point
  'src/index.js', // Package entry point
  'src/index.mjs' // ES module entry point
]

// Patterns that indicate barrel file exports
const BARREL_EXPORT_PATTERNS = [
  /export\s*\*\s*from\s*['"][^'"]+['"]/g, // export * from './module'
  /export\s*{\s*[^}]*\s*}\s*from\s*['"][^'"]+['"]/g // export { thing } from './module'
]

// Minimum number of exports to consider a file a barrel
const MIN_EXPORTS_FOR_BARREL = 3

/**
 * Check if a directory should be excluded from barrel file checking
 */
function shouldExcludeDirectory(dirPath) {
  return EXCLUDED_DIRECTORIES.some(excluded => dirPath.includes(excluded))
}

/**
 * Check if a file is an allowed index file (not a barrel)
 */
function isAllowedIndexFile(filePath) {
  // Normalize path for comparison
  const normalizedPath = filePath.replace(/\\/g, '/')

  return ALLOWED_INDEX_FILES.some(allowed => {
    // For root files (like './index.ts'), check exact match or if it's at the root
    if (allowed.startsWith('./')) {
      const rootFile = allowed.substring(2)
      return normalizedPath === rootFile || normalizedPath.endsWith(`/${rootFile}`)
    }
    // For other paths, use endsWith
    return normalizedPath.endsWith(allowed)
  })
}

/**
 * Check if a file is a barrel file
 */
function isBarrelFile(filePath) {
  const basename = path.basename(filePath)

  // Must be an index file
  if (!BARREL_FILE_PATTERNS.includes(basename)) {
    return false
  }

  // Check if it's an allowed index file
  if (isAllowedIndexFile(filePath)) {
    return false
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Count barrel exports
    let exportCount = 0
    BARREL_EXPORT_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern) || []
      exportCount += matches.length
    })

    // Consider it a barrel if it has enough re-exports
    return exportCount >= MIN_EXPORTS_FOR_BARREL
  } catch (error) {
    return false
  }
}

/**
 * Find all index files in a directory
 */
function findAllIndexFiles(startDir = '.') {
  const indexFiles = []

  function searchDirectory(dir) {
    if (shouldExcludeDirectory(dir)) return

    try {
      const items = fs.readdirSync(dir)

      items.forEach(item => {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          searchDirectory(fullPath)
        } else if (BARREL_FILE_PATTERNS.includes(item)) {
          indexFiles.push(fullPath)
        }
      })
    } catch (error) {
      // Skip directories we can't read
    }
  }

  searchDirectory(startDir)
  return indexFiles
}

/**
 * Find all barrel files in a directory
 */
function findAllBarrelFiles(startDir = '.') {
  const indexFiles = findAllIndexFiles(startDir)
  return indexFiles.filter(file => isBarrelFile(file))
}

module.exports = {
  BARREL_FILE_PATTERNS,
  EXCLUDED_DIRECTORIES,
  ALLOWED_INDEX_FILES,
  BARREL_EXPORT_PATTERNS,
  MIN_EXPORTS_FOR_BARREL,
  isBarrelFile,
  findAllBarrelFiles,
  findAllIndexFiles,
  shouldExcludeDirectory,
  isAllowedIndexFile
}
