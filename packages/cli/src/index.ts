import { Command } from 'commander'
import { info } from './commands/info.js'
import { init } from './commands/init.js'
import { install } from './commands/install.js'
import { list } from './commands/list.js'
import { remove } from './commands/remove.js'
import { search } from './commands/search.js'
import { update } from './commands/update.js'
import { printBanner } from './lib/banner.js'

const program = new Command()

program
  .name('llmstxt')
  .description('Install llms.txt files from the llms-txt-hub registry into your AI coding tools')
  .version(__CLI_VERSION__)
  .action(() => {
    // Bare `llmstxt` with no command: show banner + help
    printBanner(__CLI_VERSION__)
    program.outputHelp()
  })

program
  .command('init')
  .description('Auto-detect dependencies and install matching llms.txt files')
  .option('--category <categories>', 'Filter by categories (comma-separated)')
  .option('--all-categories', 'Include all categories')
  .option('--dry-run', 'Preview without installing')
  .option('--full', 'Prefer llms-full.txt when available')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(init)

program
  .command('install')
  .description('Install llms.txt files by name')
  .argument('<names...>', 'Names or slugs to install')
  .option('--full', 'Prefer llms-full.txt when available')
  .option('--force', 'Re-download even if already installed')
  .action((names: string[], options: { full?: boolean; force?: boolean }) =>
    install({ names, options })
  )

program
  .command('search')
  .description('Search the registry for llms.txt entries')
  .argument('<query>', 'Search query')
  .option('--category <categories>', 'Filter by categories (comma-separated)')
  .option('--all-categories', 'Search all categories')
  .action(search)

program.command('list').alias('ls').description('List installed llms.txt files').action(list)

program
  .command('update')
  .description('Update installed llms.txt files')
  .argument('[name]', 'Specific entry to update (updates all if omitted)')
  .option('--force', 'Force re-download even if unchanged')
  .action(update)

program
  .command('remove')
  .alias('rm')
  .description('Remove an installed llms.txt file')
  .argument('<name>', 'Name or slug to remove')
  .action(remove)

program
  .command('info')
  .description('Show details about a registry entry')
  .argument('<name>', 'Name or slug to look up')
  .action(info)

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\nError: ${msg}`)
  process.exitCode = 1
})
