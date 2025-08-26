#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import FirecrawlApp from '@mendable/firecrawl-js'
import chalk from 'chalk'
import { Command } from 'commander'
import { config } from 'dotenv'
import inquirer from 'inquirer'

// Load environment variables from .env file
config()

function findWorkspaceRoot(currentPath: string): string {
  // Keep going up until we find package.json with "name": "llms-txt-hub"
  const packageJsonPath = join(currentPath, 'package.json')

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      if (packageJson.name === 'llms-txt-hub') {
        return currentPath
      }
    } catch (_error) {
      // Ignore JSON parse errors
    }
  }

  const parentPath = resolve(currentPath, '..')
  if (parentPath === currentPath) {
    throw new Error('Could not find workspace root')
  }

  return findWorkspaceRoot(parentPath)
}

const program = new Command()

program
  .name('generate-llmstxt')
  .description('Generate LLMs.txt files using Firecrawl API')
  .option(
    '-k, --api-key <key>',
    'Firecrawl API key (can also be set via FIRECRAWL_API_KEY in .env)'
  )
  .option('-u, --url <url>', 'URL to analyze', 'https://example.com')
  .option('-m, --max-urls <number>', 'Maximum URLs to analyze', '50')
  .version('1.0.0')

async function getExistingFolders() {
  const workspaceRoot = findWorkspaceRoot(process.cwd())
  const basePath = resolve(workspaceRoot, 'content/unofficial')
  try {
    await mkdir(basePath, { recursive: true })
    const entries = await readdir(basePath, { withFileTypes: true })
    return entries.filter(entry => entry.isDirectory()).map(dir => dir.name)
  } catch (error) {
    console.error(chalk.red('Error reading directories:'), error)
    process.exit(1)
  }
}

async function selectFolder(folders: string[]) {
  const workspaceRoot = findWorkspaceRoot(process.cwd())
  console.log(chalk.gray('Workspace root:', workspaceRoot))
  const choices = [...folders, new inquirer.Separator(), 'Create new folder']

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select the folder to save LLMs files:',
      choices
    }
  ])

  if (choice === 'Create new folder') {
    const { folderName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'folderName',
        message: 'Enter the new folder name:',
        validate: async (input: string) => {
          if (!input.trim()) return 'Folder name cannot be empty'
          if (!/^[a-z0-9-]+$/.test(input))
            return 'Folder name can only contain lowercase letters, numbers, and hyphens'
          if (folders.includes(input)) return 'Folder already exists'
          return true
        }
      }
    ])

    const newFolderPath = resolve(workspaceRoot, 'content/unofficial', folderName)
    console.log(chalk.gray('Creating folder at:', newFolderPath))
    await mkdir(newFolderPath, { recursive: true })
    return folderName
  }

  return choice
}

async function generateLLMsText(
  apiKey: string | undefined,
  url: string,
  maxUrls: number,
  folder: string
) {
  try {
    const workspaceRoot = findWorkspaceRoot(process.cwd())
    const finalApiKey = apiKey || process.env.FIRECRAWL_API_KEY

    if (!finalApiKey) {
      throw new Error(
        'API key is required. Provide it via --api-key option or FIRECRAWL_API_KEY in .env file'
      )
    }

    const firecrawl = new FirecrawlApp({ apiKey: finalApiKey })
    const outputDir = resolve(workspaceRoot, 'content/unofficial', folder)

    console.log(chalk.blue('Generating LLMs text files...'))

    const params = {
      maxUrls,
      showFullText: true
    }

    const results = await firecrawl.generateLLMsText(url, params)

    if (!results.success) {
      throw new Error(results.error || 'Unknown error occurred')
    }

    // Create output directory if it doesn't exist
    await mkdir(outputDir, { recursive: true })

    // Write the summary file
    await writeFile(join(outputDir, 'llms.txt'), results.data.llmstxt || '', 'utf-8')

    // Write the full text file
    await writeFile(join(outputDir, 'llms-full.txt'), results.data.llmsfulltxt || '', 'utf-8')

    console.log(chalk.green('✓ Successfully generated LLMs text files'))
    console.log(chalk.gray('Files created:'))
    console.log(chalk.gray(`- ${join(outputDir, 'llms.txt')}`))
    console.log(chalk.gray(`- ${join(outputDir, 'llms-full.txt')}`))
  } catch (error) {
    console.error(
      chalk.red('Error:'),
      error instanceof Error ? error.message : 'Unknown error occurred'
    )
    process.exit(1)
  }
}

async function main() {
  program.parse()
  const options = program.opts()

  // Prompt for URL if not provided
  let url = options.url
  if (url === 'https://example.com') {
    const { inputUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputUrl',
        message: 'Enter the URL to analyze:',
        validate: (input: string) => {
          try {
            new URL(input)
            return true
          } catch {
            return 'Please enter a valid URL'
          }
        }
      }
    ])
    url = inputUrl
  }

  const folders = await getExistingFolders()
  const selectedFolder = await selectFolder(folders)

  await generateLLMsText(options.apiKey, url, Number.parseInt(options.maxUrls, 10), selectedFolder)
}

main()
