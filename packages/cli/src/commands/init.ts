import * as p from '@clack/prompts'
import pc from 'picocolors'
import { detectInstalledAgents } from '../lib/agents.js'
import { printBanner } from '../lib/banner.js'
import { syncClaudeMd } from '../lib/context.js'
import { detectFromPackageJson, filterMatchesByCategories } from '../lib/detector.js'
import { fetchLlmsTxt } from '../lib/fetcher.js'
import { addEntry } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { loadRegistry } from '../lib/registry.js'
import { addToGitignore, installToAgents, isInstalled } from '../lib/storage.js'
import { track } from '../lib/telemetry.js'
import { PRIMARY_CATEGORIES } from '../types/index.js'

interface InitOptions {
  category?: string
  allCategories?: boolean
  dryRun?: boolean
  full?: boolean
  yes?: boolean
}

/**
 * Auto-detect project dependencies and install matching llms.txt skills.
 */
export async function init(options: InitOptions): Promise<void> {
  const projectDir = process.cwd()
  const isInteractive = process.stdin.isTTY && !options.yes

  printBanner(__CLI_VERSION__)
  p.intro('Install llms.txt documentation for your project')

  const spin = logger.spinner('Loading registry...')
  spin.start()
  await loadRegistry()
  spin.succeed('Registry loaded')

  // Show detected agents
  const agents = detectInstalledAgents()
  if (agents.length > 0) {
    p.log.info(`Detected agents: ${agents.map(a => pc.cyan(a.displayName)).join(', ')}`)
  } else {
    p.log.warn('No AI coding tools detected — files will be installed to .agents/skills/ only')
  }

  // Detect dependencies
  const spin2 = logger.spinner('Detecting project dependencies...')
  spin2.start()
  let matches = detectFromPackageJson(projectDir)

  if (matches.length === 0) {
    spin2.info('No matching llms.txt entries found for your dependencies')
    p.log.message(pc.dim('Try `llmstxt search <query>` to find entries manually'))
    p.outro('No skills to install.')
    return
  }

  // Apply category filter
  let activeCategories: string[]
  if (options.allCategories) {
    activeCategories = []
  } else if (options.category) {
    activeCategories = options.category.split(',').map(c => c.trim())
  } else {
    activeCategories = [...PRIMARY_CATEGORIES]
  }

  if (activeCategories.length > 0) {
    matches = filterMatchesByCategories(matches, activeCategories)
  }

  if (matches.length === 0) {
    spin2.info('No matching entries in selected categories')
    p.log.message(pc.dim('Try `llmstxt init --all-categories` to include all categories'))
    p.outro('No skills to install.')
    return
  }

  spin2.succeed(`Found ${matches.length} matching entries`)

  if (options.dryRun) {
    // Show what would be installed
    for (const match of matches) {
      const already = isInstalled({ projectDir, slug: match.slug })
      const status = already ? pc.dim(' (already installed)') : ''
      p.log.message(`  ${pc.cyan(match.registryEntry.name)}${status}`)
    }
    p.outro('Dry run — no files were written')
    return
  }

  // Interactive skill selection
  let selectedSlugs: Set<string>

  if (isInteractive) {
    // Group by category for display
    const byCategory = new Map<string, typeof matches>()
    for (const match of matches) {
      const cat = match.registryEntry.category
      const group = byCategory.get(cat) || []
      group.push(match)
      byCategory.set(cat, group)
    }

    const options_list: { value: string; label: string; hint?: string }[] = []
    for (const [category, group] of byCategory) {
      for (const match of group) {
        const already = isInstalled({ projectDir, slug: match.slug })
        options_list.push({
          value: match.slug,
          label: match.registryEntry.name,
          hint: already
            ? 'already installed'
            : `${category} · matched: ${match.matchedPackages.join(', ')}`
        })
      }
    }

    const selected = await p.multiselect({
      message: 'Select skills to install:',
      options: options_list,
      initialValues: matches
        .filter(m => !isInstalled({ projectDir, slug: m.slug }))
        .map(m => m.slug),
      required: false
    })

    if (p.isCancel(selected)) {
      p.cancel('Installation cancelled.')
      process.exitCode = 0
      return
    }

    selectedSlugs = new Set(selected as string[])

    if (selectedSlugs.size === 0) {
      p.outro('No skills selected.')
      return
    }

    const shouldContinue = await p.confirm({
      message: `Install ${selectedSlugs.size} skill(s)?`
    })

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel('Installation cancelled.')
      process.exitCode = 0
      return
    }
  } else {
    // Non-interactive: install all non-installed matches
    selectedSlugs = new Set(
      matches.filter(m => !isInstalled({ projectDir, slug: m.slug })).map(m => m.slug)
    )
    if (!process.stdin.isTTY) {
      p.log.message(pc.dim('Non-interactive mode. Use -y to skip prompts.'))
    }
  }

  // Install selected skills
  const format = options.full ? 'llms-full.txt' : ('llms.txt' as const)

  let installed = 0
  let skipped = 0
  let failed = 0
  const installedSlugs: string[] = []

  for (const match of matches) {
    if (!selectedSlugs.has(match.slug)) {
      continue
    }

    const entry = match.registryEntry
    const actualFormat: 'llms.txt' | 'llms-full.txt' =
      format === 'llms-full.txt' && entry.llmsFullTxtUrl ? 'llms-full.txt' : 'llms.txt'
    const url = actualFormat === 'llms-full.txt' ? entry.llmsFullTxtUrl! : entry.llmsTxtUrl

    if (isInstalled({ projectDir, slug: match.slug })) {
      skipped++
      continue
    }

    const spin3 = logger.spinner(`Fetching ${entry.name}...`)
    spin3.start()

    try {
      const result = await fetchLlmsTxt({ url })
      const {
        checksum,
        size,
        agents: installedTo
      } = installToAgents({
        projectDir,
        slug: match.slug,
        entry,
        content: result.content,
        format: actualFormat
      })
      addEntry({
        projectDir,
        entry: {
          slug: match.slug,
          format: actualFormat,
          sourceUrl: url,
          etag: result.etag,
          lastModified: result.lastModified,
          fetchedAt: new Date().toISOString(),
          checksum,
          size,
          name: entry.name
        }
      })
      spin3.succeed(`${entry.name} ${pc.dim(`→ ${installedTo.join(', ')}`)}`)
      installed++
      installedSlugs.push(match.slug)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      spin3.fail(`${entry.name}: ${msg}`)
      failed++
    }
  }

  // Summary
  const summaryLines: string[] = []
  if (installed > 0) summaryLines.push(`${pc.green('✓')} Installed: ${installed}`)
  if (skipped > 0) summaryLines.push(`${pc.dim('○')} Skipped: ${skipped}`)
  if (failed > 0) summaryLines.push(`${pc.red('✗')} Failed: ${failed}`)

  if (summaryLines.length > 0) {
    p.note(summaryLines.join('\n'), 'Summary')
  }

  if (addToGitignore(projectDir)) {
    p.log.success('Added .llms/ and .agents/skills/ to .gitignore')
  }

  if (installed > 0) {
    syncClaudeMd(projectDir)
  }

  p.outro(`Done! Your AI agents now have access to ${installed} documentation skill(s).`)

  // Telemetry
  track({
    event: 'init',
    skills: installedSlugs.join(','),
    agents: agents.map(a => a.name).join(',')
  })
}
