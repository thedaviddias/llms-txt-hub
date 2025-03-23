import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import Fuse from 'fuse.js'

// Define the type for our search index data
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

// Mock data for initial development - will be replaced by actual data from index
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

// Try to load the search index from file, falling back to mock data
async function getSearchData(): Promise<LlmsTxtData[]> {
  try {
    const filePath = path.join(process.cwd(), 'public/search-index.json')
    const fileData = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileData)
    return Array.isArray(data) ? data : MOCK_LLMS_DATA
  } catch (error) {
    console.log('Error loading search index, using mock data:', error)
    return MOCK_LLMS_DATA
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase() || ''

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const searchData = await getSearchData()

    // Set up Fuse.js for fuzzy searching
    const fuse = new Fuse(searchData, {
      keys: ['content', 'name', 'url', 'category'],
      includeScore: true,
      threshold: 0.4
    })

    // Search with Fuse.js
    const searchResults = fuse.search(query)

    // Extract the items and sort by score
    const results = searchResults.map(result => result.item)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
