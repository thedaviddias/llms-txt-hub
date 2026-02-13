import type { LucideIcon } from 'lucide-react'
import { Chrome, Code2, Command, GitBranch, Terminal } from 'lucide-react'

export interface Tool {
  name: string
  slug: string
  icon: LucideIcon
  url: string
  description: string
}

export const tools: Tool[] = [
  {
    name: 'Chrome Extension',
    slug: 'chrome-extension',
    icon: Chrome,
    url: 'https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej',
    description: 'Check if websites implement llms.txt'
  },
  {
    name: 'VS Code Extension',
    slug: 'vscode-extension',
    icon: Code2,
    url: 'https://marketplace.visualstudio.com/items?itemName=TheDavidDias.vscode-llms-txt',
    description: 'Search and explore llms.txt in VS Code'
  },
  {
    name: 'MCP Explorer',
    slug: 'mcp-explorer',
    icon: GitBranch,
    url: 'https://github.com/thedaviddias/mcp-llms-txt-explorer',
    description: 'Explore llms.txt files using MCP'
  },
  {
    name: 'Raycast Extension',
    slug: 'raycast-extension',
    icon: Command,
    url: 'https://www.raycast.com/thedaviddias/llms-txt',
    description: 'Search llms.txt hub from Raycast'
  },
  {
    name: 'CLI',
    slug: 'cli',
    icon: Terminal,
    url: 'https://www.npmjs.com/package/llmstxt-cli',
    description: 'Install llms.txt docs into your AI agents'
  }
]
