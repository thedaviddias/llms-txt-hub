import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
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
    content: '# Anthropic Claude\nLLM platform for AI assistants with safety focus\nMODELS: claude-3-opus, claude-3-sonnet, claude-3-haiku\nCONTEXT_WINDOW: 200K tokens\n',
    type: 'llms.txt',
    category: 'ai-ml',
    lastFetched: '2025-03-23'
  },
  {
    url: 'https://docs.anthropic.com/llms-full.txt',
    name: 'Anthropic',
    content: '# Anthropic Claude\nFull LLM platform for AI assistants with safety focus\nMODELS: claude-3-opus, claude-3-sonnet, claude-3-haiku\nCONTEXT_WINDOW: 200K tokens\nAPI_ENDPOINTS: /v1/messages, /v1/completions\nDOCUMENTATION: https://docs.anthropic.com/claude/reference/\n',
    type: 'llms-full.txt',
    category: 'ai-ml',
    lastFetched: '2025-03-23'
  },
  {
    url: 'https://openrouter.ai/docs/llms.txt',
    name: 'OpenRouter',
    content: '# OpenRouter\nAPI aggregator for multiple LLM providers\nMODELS: multiple from various providers\nCONTEXT_WINDOW: varies by model\n',
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = body.messages || []
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }
    
    const latestMessage = messages[messages.length - 1]
    
    if (latestMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      )
    }
    
    const userQuery = latestMessage.content
    
    // Get llms.txt data
    const searchData = await getSearchData()
    
    // Set up Fuse.js for fuzzy searching
    const fuse = new Fuse(searchData, {
      keys: ['content', 'name', 'url', 'category'],
      includeScore: true,
      threshold: 0.4
    })
    
    // Search with Fuse.js
    const searchResults = fuse.search(userQuery)
    
    // Extract the items
    const results = searchResults.map(result => result.item)
    
    let response = ''
    
    if (results.length === 0) {
      response = "I couldn't find any llms.txt files matching your query. You could try asking about specific LLM models, context windows, or API endpoints. For example, try asking about Claude, OpenRouter, or llms.txt specifications."
    } else {
      // Generate a response based on search results
      response = `Here's what I found about "${userQuery}":\n\n`
      
      const topResults = results.slice(0, 3)
      
      topResults.forEach((result, idx) => {
        response += `${idx + 1}. **${result.name}** (${result.type}):\n\`\`\`\n${result.content.slice(0, 300)}${result.content.length > 300 ? '...' : ''}\n\`\`\`\n\n`
      })
      
      if (results.length > 3) {
        response += `I found ${results.length - 3} more results. Would you like me to show more or refine your search?`
      }
    }
    
    // Simulate a brief delay for a more realistic experience
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}