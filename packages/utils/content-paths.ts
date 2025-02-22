import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the monorepo root path
function getMonorepoRoot(): string {
  // Start from the current file's directory
  let currentDir = path.dirname(fileURLToPath(import.meta.url))

  // Go up until we find the monorepo root (where package.json exists)
  while (!path.basename(currentDir).includes('llms-txt-hub')) {
    currentDir = path.dirname(currentDir)
  }

  return currentDir
}

const MONOREPO_ROOT = getMonorepoRoot()

export function getContentPath(contentType: 'blog' | 'resources' | 'websites'): string {
  return path.join(MONOREPO_ROOT, 'content', contentType)
}

export function getContentFilePath(
  contentType: 'blog' | 'resources' | 'websites',
  fileName: string
): string {
  return path.join(getContentPath(contentType), fileName)
}
