import * as p from '@clack/prompts'
import pc from 'picocolors'
import { readLockfile } from '../lib/lockfile.js'

const STALE_DAYS = 30

/**
 * List all installed llms.txt skills with age and size info.
 */
export async function list(): Promise<void> {
  const projectDir = process.cwd()
  const lockfile = readLockfile(projectDir)
  const entries = Object.values(lockfile.entries)

  if (entries.length === 0) {
    p.log.info('No llms.txt files installed')
    p.log.message(
      pc.dim('Run `llmstxt init` to auto-detect or `llmstxt install <name>` to add entries')
    )
    return
  }

  p.log.step(pc.bold(`Installed llms.txt files (${entries.length}):`))

  const now = Date.now()

  for (const entry of entries) {
    const fetchedAt = new Date(entry.fetchedAt)
    const ageDays = Math.floor((now - fetchedAt.getTime()) / (1000 * 60 * 60 * 24))
    const isStale = ageDays > STALE_DAYS

    const ageStr = ageDays === 0 ? 'today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`

    const sizeStr =
      entry.size < 1024
        ? `${entry.size} B`
        : entry.size < 1024 * 1024
          ? `${(entry.size / 1024).toFixed(1)} KB`
          : `${(entry.size / (1024 * 1024)).toFixed(1)} MB`

    const staleWarning = isStale ? pc.yellow(' (stale)') : ''

    p.log.message(
      `  ${pc.cyan(entry.name)} ${pc.dim(`[${entry.format}]`)}\n` +
        `    ${pc.dim(sizeStr)} · fetched ${pc.dim(ageStr)}${staleWarning}\n` +
        `    ${pc.dim(entry.sourceUrl)}`
    )
  }

  const staleCount = entries.filter(e => {
    const ageDays = Math.floor((now - new Date(e.fetchedAt).getTime()) / (1000 * 60 * 60 * 24))
    return ageDays > STALE_DAYS
  }).length

  if (staleCount > 0) {
    p.log.warn(
      `${staleCount} file(s) older than ${STALE_DAYS} days. Run \`llmstxt update\` to refresh.`
    )
  }
}
