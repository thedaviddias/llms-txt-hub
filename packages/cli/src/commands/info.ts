import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getEntry as getLockfileEntry } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { loadRegistry, resolveSlug } from '../lib/registry.js'
import { isInstalled } from '../lib/storage.js'

/**
 * Show detailed information about a registry entry.
 */
export async function info(name: string): Promise<void> {
  if (!name) {
    logger.error('Please specify a name')
    p.log.message(pc.dim('Usage: llmstxt info <name>'))
    process.exitCode = 1
    return
  }

  const spin = logger.spinner('Loading registry...')
  spin.start()
  await loadRegistry()
  spin.stop()

  const entry = resolveSlug(name)
  if (!entry) {
    logger.error(`"${name}" not found in registry`)
    p.log.message(pc.dim(`Try \`llmstxt search "${name}"\` to find matching entries`))
    process.exitCode = 1
    return
  }

  const projectDir = process.cwd()
  const installed = isInstalled(projectDir, entry.slug)
  const lockEntry = getLockfileEntry(projectDir, entry.slug)

  p.log.step(pc.bold(pc.cyan(entry.name)))
  p.log.message(pc.dim(entry.slug))
  p.log.message(entry.description)
  p.log.message(
    `${pc.dim('Category:')}    ${entry.category}\n${pc.dim('Domain:')}      ${entry.domain}\n${pc.dim('llms.txt:')}    ${entry.llmsTxtUrl}${entry.llmsFullTxtUrl ? `\n${pc.dim('Full:')}        ${entry.llmsFullTxtUrl}` : ''}`
  )

  if (installed && lockEntry) {
    const ageDays = Math.floor(
      (Date.now() - new Date(lockEntry.fetchedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    p.log.success('Installed')
    p.log.message(
      `  Format:   ${lockEntry.format}\n  Size:     ${(lockEntry.size / 1024).toFixed(1)} KB\n  Fetched:  ${ageDays === 0 ? 'today' : `${ageDays} day(s) ago`}`
    )
  } else {
    p.log.message(`${pc.dim('○ Not installed')}`)
    p.log.message(`  Install with: ${pc.cyan(`llmstxt install ${entry.slug}`)}`)
  }
}
