import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Lockfile, LockfileEntry } from '../types/index.js'
import * as logger from './logger.js'

const LOCKFILE_NAME = 'llms.lock.json'

/**
 * Type guard for Node.js errors that include a code property.
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err
}

/**
 * Return a fresh empty lockfile object.
 */
function emptyLockfile(): Lockfile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {}
  }
}

/**
 * Get the absolute path to the lockfile for a project directory.
 */
export function getLockfilePath(projectDir: string): string {
  return join(projectDir, '.llms', LOCKFILE_NAME)
}

/**
 * Read and parse the lockfile, returning an empty one on missing or corrupt file.
 */
export function readLockfile(projectDir: string): Lockfile {
  const lockfilePath = getLockfilePath(projectDir)
  try {
    const raw = readFileSync(lockfilePath, 'utf-8')
    const data: Lockfile = JSON.parse(raw)
    if (data.version !== 1 || !data.entries) {
      throw new Error('Invalid lockfile format')
    }
    return data
  } catch (err) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return emptyLockfile()
    }
    // Corrupt lockfile — back it up and recreate
    try {
      const backupPath = `${lockfilePath}.backup`
      renameSync(lockfilePath, backupPath)
      logger.warn(`Corrupt lockfile backed up to ${backupPath}`)
    } catch {
      // backup rename failed, ignore
    }
    return emptyLockfile()
  }
}

export interface WriteLockfileInput {
  projectDir: string
  lockfile: Lockfile
}

/**
 * Write the lockfile to disk atomically via a temp file.
 */
export function writeLockfile({ projectDir, lockfile }: WriteLockfileInput): void {
  const lockfilePath = getLockfilePath(projectDir)
  const dir = dirname(lockfilePath)
  mkdirSync(dir, { recursive: true })

  lockfile.updatedAt = new Date().toISOString()

  const tmpPath = `${lockfilePath}.tmp`
  writeFileSync(tmpPath, `${JSON.stringify(lockfile, null, 2)}\n`, 'utf-8')
  renameSync(tmpPath, lockfilePath)
}

export interface AddEntryInput {
  projectDir: string
  entry: LockfileEntry
}

/**
 * Add or update a single entry in the lockfile.
 */
export function addEntry({ projectDir, entry }: AddEntryInput): void {
  const lockfile = readLockfile(projectDir)
  lockfile.entries[entry.slug] = entry
  writeLockfile({ projectDir, lockfile })
}

export interface RemoveEntryInput {
  projectDir: string
  slug: string
}

/**
 * Remove an entry from the lockfile by slug.
 */
export function removeEntry({ projectDir, slug }: RemoveEntryInput): void {
  const lockfile = readLockfile(projectDir)
  delete lockfile.entries[slug]
  writeLockfile({ projectDir, lockfile })
}

export interface GetEntryInput {
  projectDir: string
  slug: string
}

/**
 * Look up a single lockfile entry by slug.
 */
export function getEntry({ projectDir, slug }: GetEntryInput): LockfileEntry | undefined {
  const lockfile = readLockfile(projectDir)
  return lockfile.entries[slug]
}
