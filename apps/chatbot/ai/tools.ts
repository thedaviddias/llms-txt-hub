import { tool } from 'ai'
import { z } from 'zod'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import Fuse from 'fuse.js'

// Type for the llms.txt data
type LlmsTxtData = {
  url: string
  name: string
  content: string
  type: 'llms.txt' | 'llms-full.txt'
  category?: string
  description?: string
  website?: string
  lastFetched: string
}

// Mock data for testing
const MOCK_LLMS_DATA: LlmsTxtData[] = [
  {
    url: 'https://docs.anthropic.com/llms.txt',
    name: 'Anthropic',
    content:
      '# Anthropic Claude\nLLM platform for AI assistants with safety focus\nMODELS: claude-3-opus, claude-3-sonnet, claude-3-haiku\nCONTEXT_WINDOW: 200K tokens\n',
    type: 'llms.txt',
    category: 'ai-ml',
    lastFetched: '2025-03-23'
  },
  {
    url: 'https://docs.anthropic.com/llms-full.txt',
    name: 'Anthropic',
    content:
      '# Anthropic Claude\nFull LLM platform for AI assistants with safety focus\nMODELS: claude-3-opus, claude-3-sonnet, claude-3-haiku\nCONTEXT_WINDOW: 200K tokens\nAPI_ENDPOINTS: /v1/messages, /v1/completions\nDOCUMENTATION: https://docs.anthropic.com/claude/reference/\n',
    type: 'llms-full.txt',
    category: 'ai-ml',
    lastFetched: '2025-03-23'
  },
  {
    url: 'https://openrouter.ai/docs/llms.txt',
    name: 'OpenRouter',
    content:
      '# OpenRouter\nAPI aggregator for multiple LLM providers\nMODELS: multiple from various providers\nCONTEXT_WINDOW: varies by model\n',
    type: 'llms.txt',
    category: 'infrastructure-cloud',
    lastFetched: '2025-03-23'
  },
  {
    url: 'https://llmstxt.org/llms.txt',
    name: 'LLMsTxt.org',
    content: '# llms.txt\nThe official llms.txt documentation site\nSPECIFICATION: v1.0\n',
    type: 'llms.txt',
    category: 'developer-tools',
    lastFetched: '2025-03-23'
  }
]

// Helper function to get llms.txt data
async function getLlmsTxtData(): Promise<LlmsTxtData[]> {
  try {
    // In a production app, this would load from a database or file
    // For this demo, try to load from the search index JSON file
    const filePath = path.resolve(process.cwd(), 'public/search-index.json')
    const fileData = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileData)
    return Array.isArray(data) ? data : MOCK_LLMS_DATA
  } catch (error) {
    console.log('Error loading llms.txt data:', error)
    return MOCK_LLMS_DATA
  }
}

// Tool 1: Search llms.txt files
export const searchLlmsTxtTool = tool({
  description: 'Searches across llms.txt files from various providers for specific information',
  parameters: z.object({
    query: z.string().describe('The search query to find information in llms.txt files')
  }),
  execute: async ({ query }) => {
    const llmsData = await getLlmsTxtData()

    // Set up Fuse.js for fuzzy searching
    const fuse = new Fuse(llmsData, {
      keys: ['content', 'name', 'url', 'category'],
      includeScore: true,
      threshold: 0.4
    })

    // Search with Fuse.js
    const searchResults = fuse.search(query)

    // Return top 5 results
    const results = searchResults.slice(0, 5).map(result => ({
      name: result.item.name,
      url: result.item.url,
      type: result.item.type,
      content: result.item.content,
      relevanceScore: (1 - (result.score || 0)) * 100 // Convert to percentage
    }))

    return {
      results,
      count: results.length,
      query
    }
  }
})

// Tool 2: Get specific llms.txt file
export const getLlmsTxtFileTool = tool({
  description: 'Gets the complete llms.txt file for a specific provider',
  parameters: z.object({
    provider: z.string().describe('The name of the provider (e.g., "Anthropic", "OpenRouter")')
  }),
  execute: async ({ provider }) => {
    const llmsData = await getLlmsTxtData()

    // Find matching providers (case insensitive)
    const matchingFiles = llmsData.filter(
      data => data.name.toLowerCase() === provider.toLowerCase()
    )

    if (matchingFiles.length === 0) {
      return {
        found: false,
        message: `No llms.txt files found for provider: ${provider}`,
        suggestions: llmsData.slice(0, 3).map(d => d.name) // Suggest some providers
      }
    }

    return {
      found: true,
      files: matchingFiles.map(file => ({
        name: file.name,
        url: file.url,
        type: file.type,
        content: file.content,
        lastFetched: file.lastFetched
      }))
    }
  }
})

// Tool 3: Get llms.txt providers by category
export const getLlmsTxtCategoriesTool = tool({
  description: 'Gets providers of llms.txt files by category',
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe('Optional category to filter by (e.g., "ai-ml", "infrastructure-cloud")')
  }),
  execute: async ({ category }) => {
    const llmsData = await getLlmsTxtData()

    // Get all unique categories
    const allCategories = [
      ...new Set(llmsData.map(data => data.category).filter(Boolean))
    ] as string[]

    // If category is provided, filter by it
    let filteredData = llmsData
    if (category) {
      filteredData = llmsData.filter(
        data => data.category?.toLowerCase() === category.toLowerCase()
      )
    }

    // Group by name to avoid duplicates
    const providersByName: Record<string, LlmsTxtData> = {}
    filteredData.forEach(data => {
      if (!providersByName[data.name] || data.type === 'llms.txt') {
        providersByName[data.name] = data
      }
    })

    // Convert to array
    const providers = Object.values(providersByName).map(data => ({
      name: data.name,
      category: data.category,
      url: data.url,
      type: data.type
    }))

    return {
      categories: allCategories,
      providers,
      count: providers.length,
      filteredByCategory: Boolean(category),
      category
    }
  }
})

// Export the toolset
export const toolSpec = {
  searchLlmsTxtTool,
  getLlmsTxtFileTool,
  getLlmsTxtCategoriesTool
}

export default toolSpec
