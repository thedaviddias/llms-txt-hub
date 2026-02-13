import * as p from '@clack/prompts'
import pc from 'picocolors'
import { detectInstalledAgents } from '../lib/agents.js'
import { syncClaudeMd } from '../lib/context.js'
import { fetchLlmsTxt } from '../lib/fetcher.js'
import { addEntry } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { loadRegistry, resolveSlug, searchRegistry } from '../lib/registry.js'
import { addToGitignore, installToAgents, isInstalled } from '../lib/storage.js'
import { track } from '../lib/telemetry.js'

export interface InstallOptions {
  full?: boolean
  force?: boolean
}

export interface InstallInput {
  names: string[]
  options: InstallOptions
}

/**
 * Install llms.txt skills by name or slug.
 */
export async function install({ names, options }: InstallInput): Promise<void> {
  if (names.length === 0) {
    logger.error('Please specify one or more names to install')
    p.log.message(pc.dim('Usage: llmstxt install <name...>'))
    p.log.message(pc.dim('Example: llmstxt install astro vercel-ai-sdk'))
    process.exitCode = 1
    return
  }

  const projectDir = process.cwd()
  const spin = logger.spinner('Loading registry...')
  spin.start()
  await loadRegistry()
  spin.succeed('Registry loaded')

  // Show detected agents
  const agents = detectInstalledAgents()
  if (agents.length > 0) {
    p.log.message(pc.dim(`Detected: ${agents.map(a => a.displayName).join(', ')}`))
  }

  let installed = 0
  let failed = 0
  const installedSlugs: string[] = []

  for (const name of names) {
    let entry = resolveSlug(name)

    // Fuzzy search with interactive selection if not found by exact/close match
    if (!entry) {
      const suggestions = searchRegistry(name).slice(0, 5)

      if (suggestions.length > 0 && process.stdin.isTTY) {
        const selected = await p.select({
          message: `"${name}" not found. Did you mean one of these?`,
          options: [
            ...suggestions.map(s => ({
              value: s.slug,
              label: s.name,
              hint: s.category
            })),
            { value: '__none__', label: 'None of these' }
          ]
        })

        if (p.isCancel(selected) || selected === '__none__') {
          p.log.warn(`Skipped "${name}"`)
          failed++
          continue
        }

        entry = resolveSlug(selected as string)
      }

      if (!entry) {
        logger.error(`"${name}" not found in registry`)
        p.log.message(pc.dim(`Try \`llmstxt search "${name}"\` to find matching entries`))
        failed++
        continue
      }
    }

    if (!options.force && isInstalled({ projectDir, slug: entry.slug })) {
      p.log.info(`${entry.name} already installed (use --force to re-download)`)
      continue
    }

    const wantFull = options.full
    const url = wantFull && entry.llmsFullTxtUrl ? entry.llmsFullTxtUrl : entry.llmsTxtUrl
    const format: 'llms.txt' | 'llms-full.txt' =
      wantFull && entry.llmsFullTxtUrl ? 'llms-full.txt' : 'llms.txt'

    if (wantFull && !entry.llmsFullTxtUrl) {
      p.log.warn(`${entry.name} has no llms-full.txt — installing llms.txt instead`)
    }

    const spin2 = logger.spinner(`Fetching ${entry.name}...`)
    spin2.start()

    try {
      const result = await fetchLlmsTxt({ url })
      const {
        checksum,
        size,
        agents: installedTo
      } = installToAgents({ projectDir, slug: entry.slug, entry, content: result.content, format })
      addEntry({
        projectDir,
        entry: {
          slug: entry.slug,
          format,
          sourceUrl: url,
          etag: result.etag,
          lastModified: result.lastModified,
          fetchedAt: new Date().toISOString(),
          checksum,
          size,
          name: entry.name
        }
      })
      const agentList = installedTo.join(', ')
      spin2.succeed(`${entry.name} ${pc.dim(`→ ${agentList}`)}`)
      installed++
      installedSlugs.push(entry.slug)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      spin2.fail(`${entry.name}: ${msg}`)
      failed++
    }
  }

  // Summary
  if (installed > 0 || failed > 0) {
    const lines: string[] = []
    if (installed > 0) lines.push(`${pc.green('✓')} Installed: ${installed}`)
    if (failed > 0) lines.push(`${pc.red('✗')} Failed: ${failed}`)
    p.note(lines.join('\n'), 'Summary')
  }

  if (installed > 0) {
    addToGitignore(projectDir)
    syncClaudeMd(projectDir)
  }
  if (failed > 0) {
    process.exitCode = 1
  }

  // Telemetry
  track({
    event: 'install',
    skills: installedSlugs.join(','),
    agents: agents.map(a => a.name).join(',')
  })
}
