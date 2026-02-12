import * as p from '@clack/prompts'
import pc from 'picocolors'
import { fetchLlmsTxt } from '../lib/fetcher.js'
import { addEntry, readLockfile } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { getEntry as getRegistryEntry, loadRegistry } from '../lib/registry.js'
import { installToAgents } from '../lib/storage.js'
import { track } from '../lib/telemetry.js'

interface UpdateOptions {
  force?: boolean
}

/**
 * Update installed llms.txt skills to their latest versions.
 */
export async function update(name: string | undefined, options: UpdateOptions): Promise<void> {
  const projectDir = process.cwd()
  const lockfile = readLockfile(projectDir)
  const allEntries = Object.values(lockfile.entries)

  if (allEntries.length === 0) {
    p.log.info('No llms.txt files installed. Run `llmstxt init` first.')
    return
  }

  const spin = logger.spinner('Loading registry...')
  spin.start()
  await loadRegistry()
  spin.stop()

  // Filter to specific entry if name provided
  const entries = name
    ? allEntries.filter(e => e.slug === name || e.name.toLowerCase() === name.toLowerCase())
    : allEntries

  if (entries.length === 0) {
    logger.error(`"${name}" not found in installed files`)
    return
  }

  let updated = 0
  let unchanged = 0
  let failed = 0
  const updatedSlugs: string[] = []

  for (const entry of entries) {
    const spin2 = logger.spinner(`Checking ${entry.name}...`)
    spin2.start()

    try {
      const existingEtag = options.force ? null : entry.etag
      const result = await fetchLlmsTxt(entry.sourceUrl, existingEtag)

      if (result.notModified) {
        spin2.info(`${entry.name} — unchanged`)
        unchanged++
        continue
      }

      const registryEntry = getRegistryEntry(entry.slug)
      if (registryEntry) {
        const { checksum, size } = installToAgents(
          projectDir,
          entry.slug,
          registryEntry,
          result.content,
          entry.format
        )

        if (checksum === entry.checksum && !options.force) {
          spin2.info(`${entry.name} — unchanged (same content)`)
          unchanged++
        } else {
          spin2.succeed(`${entry.name} — updated`)
          updated++
          updatedSlugs.push(entry.slug)
        }

        addEntry(projectDir, {
          ...entry,
          etag: result.etag,
          lastModified: result.lastModified,
          fetchedAt: new Date().toISOString(),
          checksum,
          size
        })
      } else {
        spin2.warn(`${entry.name} — not in registry, skipping agent install`)
        unchanged++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      spin2.fail(`${entry.name}: ${msg}`)
      failed++
    }
  }

  // Summary
  const lines: string[] = []
  if (updated > 0) lines.push(`${pc.green('✓')} Updated: ${updated}`)
  if (unchanged > 0) lines.push(`${pc.dim('○')} Unchanged: ${unchanged}`)
  if (failed > 0) lines.push(`${pc.red('✗')} Failed: ${failed}`)
  p.note(lines.join('\n'), 'Summary')

  if (failed > 0) {
    process.exitCode = 1
  }

  track({
    event: 'update',
    skills: updatedSlugs.join(',')
  })
}
