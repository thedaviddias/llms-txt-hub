import * as p from '@clack/prompts'
import { syncClaudeMd } from '../lib/context.js'
import { readLockfile, removeEntry } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { removeFromAgents } from '../lib/storage.js'
import { track } from '../lib/telemetry.js'

/**
 * Remove an installed llms.txt skill from all agent directories.
 */
export async function remove(name: string): Promise<void> {
  if (!name) {
    logger.error('Please specify a name to remove')
    p.log.message('Usage: llmstxt remove <name>')
    process.exitCode = 1
    return
  }

  const projectDir = process.cwd()
  const lockfile = readLockfile(projectDir)

  // Find by slug or name
  const entry = Object.values(lockfile.entries).find(
    e => e.slug === name || e.name.toLowerCase() === name.toLowerCase()
  )

  if (!entry) {
    logger.error(`"${name}" is not installed`)
    p.log.message('Run `llmstxt list` to see installed files')
    process.exitCode = 1
    return
  }

  // Confirmation prompt (skip in non-TTY)
  if (process.stdin.isTTY) {
    const shouldRemove = await p.confirm({
      message: `Remove ${entry.name} from all agent directories?`
    })

    if (p.isCancel(shouldRemove) || !shouldRemove) {
      p.cancel('Removal cancelled.')
      return
    }
  }

  removeFromAgents(projectDir, entry.slug)
  removeEntry(projectDir, entry.slug)
  syncClaudeMd(projectDir)

  p.log.success(`Removed ${entry.name} from all agent directories`)

  track({ event: 'remove', skills: entry.slug })
}
