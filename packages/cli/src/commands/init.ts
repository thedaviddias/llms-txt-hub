import * as p from '@clack/prompts'
import pc from 'picocolors'
import {
  type AgentConfig,
  agents as allAgentConfigs,
  detectInstalledAgents
} from '../lib/agents.js'
import { printBanner } from '../lib/banner.js'
import { syncClaudeMd } from '../lib/context.js'
import { detectFromPackageJson, filterMatchesByCategories } from '../lib/detector.js'
import { fetchLlmsTxt } from '../lib/fetcher.js'
import { addEntry } from '../lib/lockfile.js'
import * as logger from '../lib/logger.js'
import { getAllEntries, loadRegistry, searchRegistry } from '../lib/registry.js'
import { addToGitignore, installToAgents, isInstalled } from '../lib/storage.js'
import { track } from '../lib/telemetry.js'
import type { DetectedMatch, RegistryEntry } from '../types/index.js'
import { PRIMARY_CATEGORIES } from '../types/index.js'

interface InitOptions {
  category?: string
  allCategories?: boolean
  dryRun?: boolean
  full?: boolean
  yes?: boolean
}

/**
 * Interactive wizard to browse, search, and install llms.txt skills.
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

  const agents = detectInstalledAgents()

  // Determine active categories
  let activeCategories: string[]
  if (options.allCategories) {
    activeCategories = []
  } else if (options.category) {
    activeCategories = options.category.split(',').map(c => c.trim())
  } else {
    activeCategories = [...PRIMARY_CATEGORIES]
  }

  // Detect dependency matches for pre-suggestions
  let depMatches = detectFromPackageJson(projectDir)
  if (activeCategories.length > 0) {
    depMatches = filterMatchesByCategories(depMatches, activeCategories)
  }
  const depSlugs = new Set(depMatches.map(m => m.slug))

  if (depMatches.length > 0) {
    p.log.info(
      `Found ${depMatches.length} matching your dependencies: ${depMatches.map(m => pc.cyan(m.registryEntry.name)).join(', ')}`
    )
  }

  if (!isInteractive) {
    // Non-interactive: install dep matches to all detected agents
    return installEntries({
      projectDir,
      entries: depMatches.map(m => m.registryEntry),
      options,
      agents,
      targetAgents: agents
    })
  }

  // Interactive: let user choose how to find entries
  const selectedEntries = await browseAndSelect({ projectDir, depMatches, depSlugs })

  if (selectedEntries.length === 0) {
    p.outro('No skills selected.')
    return
  }

  // Let user choose which agents to install to
  const targetAgents = await pickAgents(agents)
  if (!targetAgents) {
    p.cancel('Installation cancelled.')
    return
  }

  return installEntries({ projectDir, entries: selectedEntries, options, agents, targetAgents })
}

interface BrowseContext {
  projectDir: string
  depMatches: DetectedMatch[]
  depSlugs: Set<string>
}

/**
 * Interactive loop: browse, search, pick entries. Returns selected entries or null if cancelled.
 */
async function browseAndSelect({
  projectDir,
  depMatches,
  depSlugs
}: BrowseContext): Promise<RegistryEntry[]> {
  const selectedEntries: RegistryEntry[] = []

  while (true) {
    const action = await p.select({
      message:
        selectedEntries.length === 0
          ? 'How would you like to find llms.txt documentation?'
          : `${selectedEntries.length} selected. Add more or install?`,
      options: [
        ...(depMatches.length > 0 && selectedEntries.length === 0
          ? [
              {
                value: 'suggestions' as const,
                label: `Suggested from dependencies (${depMatches.length} found)`,
                hint: depMatches.map(m => m.registryEntry.name).join(', ')
              }
            ]
          : []),
        { value: 'browse' as const, label: 'Browse by category' },
        { value: 'search' as const, label: 'Search by name' },
        ...(selectedEntries.length > 0
          ? [{ value: 'install' as const, label: `Install ${selectedEntries.length} selected` }]
          : []),
        { value: 'done' as const, label: selectedEntries.length > 0 ? 'Cancel' : 'Exit' }
      ]
    })

    if (p.isCancel(action) || action === 'done') {
      if (selectedEntries.length > 0) p.cancel('Installation cancelled.')
      else p.outro('No skills selected.')
      return []
    }

    if (action === 'install') break

    let picked: RegistryEntry[] = []
    if (action === 'suggestions') {
      picked = await pickFromList(
        depMatches.map(m => m.registryEntry),
        projectDir,
        depSlugs
      )
    } else if (action === 'browse') {
      picked = await browseByCategory(projectDir, depSlugs)
    } else if (action === 'search') {
      picked = await searchByName(projectDir, depSlugs)
    }

    for (const entry of picked) {
      if (!selectedEntries.some(e => e.slug === entry.slug)) {
        selectedEntries.push(entry)
      }
    }
  }

  return selectedEntries
}

/**
 * Browse entries by category and pick from the list.
 */
async function browseByCategory(
  projectDir: string,
  depSlugs: Set<string>
): Promise<RegistryEntry[]> {
  const allEntries = getAllEntries()
  const categoryMap = new Map<string, number>()
  for (const entry of allEntries) {
    categoryMap.set(entry.category, (categoryMap.get(entry.category) || 0) + 1)
  }

  const categoryChoice = await p.select({
    message: 'Select a category:',
    options: [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        value: cat,
        label: cat,
        hint: `${count} entries`
      }))
  })

  if (p.isCancel(categoryChoice)) return []

  const categoryEntries = allEntries.filter(e => e.category === categoryChoice)
  return pickFromList(categoryEntries, projectDir, depSlugs)
}

/**
 * Search entries by name and pick from the results.
 */
async function searchByName(projectDir: string, depSlugs: Set<string>): Promise<RegistryEntry[]> {
  const query = await p.text({
    message: 'Search for:',
    placeholder: 'e.g. react, stripe, prisma...'
  })

  if (p.isCancel(query) || !query) return []

  const results = searchRegistry(query).slice(0, 20)
  if (results.length === 0) {
    p.log.warn(`No results for "${query}"`)
    return []
  }

  return pickFromList(results, projectDir, depSlugs)
}

/**
 * Show a multiselect list and return chosen entries.
 */
async function pickFromList(
  entries: RegistryEntry[],
  projectDir: string,
  depSlugs: Set<string>
): Promise<RegistryEntry[]> {
  const optionsList = entries.map(entry => {
    const already = isInstalled({ projectDir, slug: entry.slug })
    const isDep = depSlugs.has(entry.slug)
    const hints: string[] = []
    if (already) hints.push('installed')
    if (isDep) hints.push('in your deps')
    hints.push(entry.category)

    return {
      value: entry.slug,
      label: entry.name,
      hint: hints.join(' · ')
    }
  })

  const selected = await p.multiselect({
    message: `Select entries (${entries.length} available):`,
    options: optionsList,
    required: false
  })

  if (p.isCancel(selected)) return []

  const slugSet = new Set(selected)
  return entries.filter(e => slugSet.has(e.slug))
}

/**
 * Show a multiselect for choosing which agents to install to.
 * Shows ALL known agents, pre-selects detected ones.
 * Returns the selected agents, or null if cancelled.
 */
async function pickAgents(detectedAgents: AgentConfig[]): Promise<AgentConfig[] | null> {
  const detectedNames = new Set(detectedAgents.map(a => a.name))

  const selected = await p.multiselect({
    message: 'Which agents should receive the skills?',
    options: allAgentConfigs.map(a => ({
      value: a.name,
      label: a.displayName,
      hint: detectedNames.has(a.name)
        ? `${pc.green('detected')} · ${a.isUniversal ? '.agents/skills/' : a.skillsDir}`
        : a.isUniversal
          ? '.agents/skills/'
          : a.skillsDir
    })),
    initialValues: detectedAgents.map(a => a.name),
    required: false
  })

  if (p.isCancel(selected)) return null

  const nameSet = new Set(selected)
  return allAgentConfigs.filter(a => nameSet.has(a.name))
}

interface InstallEntriesInput {
  projectDir: string
  entries: RegistryEntry[]
  options: InitOptions
  agents: ReturnType<typeof detectInstalledAgents>
  targetAgents: AgentConfig[]
}

/**
 * Install the selected entries.
 */
async function installEntries({
  projectDir,
  entries,
  options,
  agents,
  targetAgents
}: InstallEntriesInput): Promise<void> {
  if (options.dryRun) {
    for (const entry of entries) {
      const already = isInstalled({ projectDir, slug: entry.slug })
      const status = already ? pc.dim(' (already installed)') : ''
      p.log.message(`  ${pc.cyan(entry.name)}${status}`)
    }
    p.outro('Dry run — no files were written')
    return
  }

  const format = options.full ? 'llms-full.txt' : ('llms.txt' as const)
  let installed = 0
  let skipped = 0
  let failed = 0
  const installedSlugs: string[] = []

  for (const entry of entries) {
    const actualFormat: 'llms.txt' | 'llms-full.txt' =
      format === 'llms-full.txt' && entry.llmsFullTxtUrl ? 'llms-full.txt' : 'llms.txt'
    const url = actualFormat === 'llms-full.txt' ? entry.llmsFullTxtUrl! : entry.llmsTxtUrl

    if (isInstalled({ projectDir, slug: entry.slug })) {
      skipped++
      continue
    }

    const spin = logger.spinner(`Fetching ${entry.name}...`)
    spin.start()

    try {
      const result = await fetchLlmsTxt({ url })
      const {
        checksum,
        size,
        agents: installedTo
      } = installToAgents({
        projectDir,
        slug: entry.slug,
        entry,
        content: result.content,
        format: actualFormat,
        targetAgents
      })
      addEntry({
        projectDir,
        entry: {
          slug: entry.slug,
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
      spin.succeed(`${entry.name} ${pc.dim(`→ ${installedTo.join(', ')}`)}`)
      installed++
      installedSlugs.push(entry.slug)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      spin.fail(`${entry.name}: ${msg}`)
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
    p.log.success('Added skill directories to .gitignore')
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
