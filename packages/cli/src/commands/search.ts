import * as p from '@clack/prompts'
import pc from 'picocolors'
import * as logger from '../lib/logger.js'
import { loadRegistry, searchRegistry } from '../lib/registry.js'
import { track } from '../lib/telemetry.js'
import { PRIMARY_CATEGORIES } from '../types/index.js'

interface SearchOptions {
  category?: string
  allCategories?: boolean
}

/**
 * Search the registry for llms.txt entries matching a query.
 */
export async function search(query: string, options: SearchOptions): Promise<void> {
  const spin = logger.spinner('Loading registry...')
  spin.start()
  await loadRegistry()
  spin.stop()

  let activeCategories: string[] | undefined
  if (options.allCategories) {
    activeCategories = undefined
  } else if (options.category) {
    activeCategories = options.category.split(',').map(c => c.trim())
  } else {
    activeCategories = [...PRIMARY_CATEGORIES]
  }

  let results = searchRegistry(query, activeCategories)
  results = results.slice(0, 10)

  if (results.length === 0) {
    p.log.info(`No results for "${query}"`)
    if (activeCategories) {
      p.log.message(pc.dim('Try `--all-categories` to search everything'))
    }
    return
  }

  p.log.step(pc.bold(`Results for "${query}":`))

  for (const entry of results) {
    p.log.message(
      `  ${pc.cyan(pc.bold(entry.name))} ${pc.dim(`(${entry.slug})`)}\n` +
        `    ${entry.description}\n` +
        `    ${pc.dim(entry.category)} · ${pc.dim(entry.llmsTxtUrl)}` +
        (entry.llmsFullTxtUrl ? `\n    ${pc.dim('full:')} ${pc.dim(entry.llmsFullTxtUrl)}` : '')
    )
  }

  p.log.message(pc.dim(`Showing ${results.length} result(s). Install with: llmstxt install <name>`))

  track({ event: 'search', skills: query })
}
