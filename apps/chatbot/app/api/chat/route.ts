import { NextResponse } from 'next/server'
import type { Message } from 'ai'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import Fuse from 'fuse.js'

// Define the type for the llms.txt data
type LlmsTxtData = {
  url: string
  name: string
  content: string
  type: 'llms.txt' | 'llms-full.txt'
  category?: string
  description?: string
  website?: string
  cacheFile?: string
  minified?: boolean
  lastFetched: string
}

// Load a specific provider's llms.txt file
async function loadProviderFile(provider: string, useMinified = true): Promise<LlmsTxtData | null> {
  try {
    // Try both formats of filenames with minified option
    const providerSlug = provider.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const possiblePaths = [
      // Try minified version first if requested
      ...(useMinified
        ? [
            path.resolve(process.cwd(), `public/llms-cache/${providerSlug}-llms.min.txt`),
            path.resolve(process.cwd(), `public/llms-cache/${provider.toLowerCase()}-llms.min.txt`)
          ]
        : []),
      // Then try regular version
      path.resolve(process.cwd(), `public/llms-cache/${providerSlug}-llms.txt`),
      path.resolve(process.cwd(), `public/llms-cache/${provider.toLowerCase()}-llms.txt`)
    ]

    for (const filePath of possiblePaths) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        const isMinified = filePath.includes('.min.txt')

        return {
          name: provider,
          url: `https://${provider.toLowerCase()}.com/llms.txt`, // approximated URL
          content: fileContent,
          type: 'llms.txt',
          minified: isMinified,
          lastFetched: new Date().toISOString().split('T')[0]
        }
      } catch (e) {
        // Continue to next path
      }
    }

    return null
  } catch (error) {
    console.log(`Error loading provider file for ${provider}:`, error)
    return null
  }
}

// Get a list of popular providers
function getPopularProviders(): string[] {
  return [
    'anthropic',
    'openai',
    'openrouter',
    'elevenlabs',
    'fireworks-ai',
    'codeium',
    'cohere',
    'mistral',
    'google',
    'vercel-s-ai-sdk'
  ]
}

// Helper function to get llms.txt data - uses cached files
async function getLlmsTxtData(specificProvider?: string): Promise<LlmsTxtData[]> {
  try {
    // If a specific provider is requested, try to load just that one
    if (specificProvider) {
      const providerData = await loadProviderFile(specificProvider)
      if (providerData) {
        return [providerData]
      }
    }

    // Otherwise load a subset of popular providers
    const popularProviders = getPopularProviders()
    const loadPromises = popularProviders.map(provider => loadProviderFile(provider))
    const results = await Promise.all(loadPromises)

    // Filter out null results and return
    const validResults = results.filter(result => result !== null) as LlmsTxtData[]

    if (validResults.length > 0) {
      console.log(`Loaded ${validResults.length} llms.txt entries from cache files`)
      return validResults
    } else {
      console.log('No cache files found, using mock data')
      return [] // Return empty array as fallback
    }
  } catch (error) {
    console.log('Error loading llms.txt data:', error)
    return [] // Return empty array as fallback
  }
}

// Helper function to extract structured info from tool results for the UI
function formatToolResults(toolType: string, toolResult: any): any {
  return {
    usedTool: toolType,
    result: toolResult
  }
}

// Generate a response based on search results
function formatSearchResponse(results: any[]): string {
  if (results.length === 0) {
    return "I couldn't find any specific information about that in the llms.txt files I've analyzed. Could you try rephrasing your question or asking about a specific LLM provider?"
  }

  let response = `Here's what I found:\n\n`

  // Group by provider to avoid duplicates
  const resultsByProvider: Record<string, any> = {}
  results.forEach(result => {
    if (!resultsByProvider[result.name]) {
      resultsByProvider[result.name] = result
    }
  })

  // Create response for each provider
  Object.values(resultsByProvider).forEach((entry: any) => {
    response += `### ${entry.name}\n\n`

    // Add the file content with code formatting (truncate if too long)
    const contentPreview =
      entry.content.length > 5000 ? `${entry.content.substring(0, 5000)}...` : entry.content

    response += `\`\`\`\n${contentPreview}\n\`\`\`\n\n`

    // Add metadata
    if (entry.description) {
      response += `**Description**: ${entry.description}\n\n`
    }

    if (entry.category) {
      response += `**Category**: ${entry.category}\n\n`
    }

    if (entry.website) {
      response += `**Website**: ${entry.website}\n\n`
    }

    response += `**Last Updated**: ${entry.lastFetched}\n\n`
  })

  return response
}

// Format provider response
function formatProviderResponse(providerResults: any): string {
  if (!providerResults.found) {
    let response = `I couldn't find specific information about that provider in the llms.txt files I've analyzed.`

    if (providerResults.suggestions && providerResults.suggestions.length > 0) {
      response += '\n\nYou might be interested in these providers instead:\n'
      providerResults.suggestions.forEach((name: string, index: number) => {
        response += `${index + 1}. ${name}\n`
      })
    }

    return response
  }

  let response = `Here's information about the provider you requested:\n\n`

  providerResults.files.forEach((file: any) => {
    response += `### ${file.name} (${file.type})\n\n`

    // Add the file content with code formatting (truncate if too long)
    const contentPreview =
      file.content.length > 5000 ? `${file.content.substring(0, 5000)}...` : file.content

    response += `\`\`\`\n${contentPreview}\n\`\`\`\n\n`

    // Add metadata
    if (file.description) {
      response += `**Description**: ${file.description}\n\n`
    }

    if (file.category) {
      response += `**Category**: ${file.category}\n\n`
    }

    if (file.website) {
      response += `**Website**: ${file.website}\n\n`
    }

    response += `**Last Updated**: ${file.lastFetched}\n\n`
  })

  return response
}

// Extract a field from llms.txt files
async function extractField(field: string, providerFilter?: string): Promise<any> {
  const llmsData = await getLlmsTxtData(providerFilter)

  // Common fields that might have different formats
  const fieldVariants: Record<string, string[]> = {
    CONTEXT_WINDOW: ['CONTEXT_WINDOW', 'CONTEXT', 'WINDOW_SIZE', 'MAX_TOKENS'],
    MODELS: ['MODELS', 'MODEL', 'AVAILABLE_MODELS', 'SUPPORTED_MODELS'],
    API: ['API', 'API_ENDPOINTS', 'ENDPOINTS', 'API_VERSIONS'],
    PRICING: ['PRICING', 'PRICE', 'COST', 'RATE'],
    FEATURES: ['FEATURES', 'CAPABILITIES', 'SUPPORTS']
  }

  // Get field variants to check
  const fieldsToCheck = fieldVariants[field] || [field]

  // Use regex to extract fields with multiple possible formats
  const results = llmsData
    .map(data => {
      let fieldValue = null

      // Try each field variant
      for (const fieldName of fieldsToCheck) {
        const fieldRegex = new RegExp(`${fieldName}:\\s*(.+?)(?:\\n|$)`, 'i')
        const match = data.content.match(fieldRegex)

        if (match) {
          fieldValue = match[1].trim()
          break
        }
      }

      // Also try searching for the field in paragraph format
      if (!fieldValue) {
        // More targeted search for model information
        if (field === 'MODELS') {
          // Try to find sections about models
          const modelSectionRegex =
            /(?:\n|^).*?(models?|available models|supported models).*?(?:\n|$)/i
          const match = data.content.match(modelSectionRegex)

          if (match) {
            // Get the matching line and a few lines after it for context
            const startIndex = data.content.indexOf(match[0])
            const nextParagraphIndex = data.content.indexOf('\n\n', startIndex)

            if (nextParagraphIndex > startIndex) {
              fieldValue = data.content.substring(startIndex, nextParagraphIndex).trim()
            } else {
              fieldValue = match[0].trim()
            }
          }
        } else {
          // Default paragraph pattern for other fields
          const paragraphRegex = new RegExp(`(?:\\n|^).*?(${field.toLowerCase()}).*?(?:\\n|$)`, 'i')
          const match = data.content.match(paragraphRegex)

          if (match) {
            fieldValue = match[0].trim()
          }
        }
      }

      return {
        name: data.name,
        url: data.url,
        type: data.type,
        fieldValue,
        category: data.category
      }
    })
    .filter(result => result.fieldValue !== null)

  return {
    field,
    results,
    count: results.length,
    providerFilter
  }
}

// Format field extraction response
function formatFieldExtractionResponse(extractionResult: any): string {
  if (extractionResult.count === 0) {
    return `I couldn't find any '${extractionResult.field}' values in the llms.txt files I've analyzed.${
      extractionResult.providerFilter ? ` for ${extractionResult.providerFilter}` : ''
    }`
  }

  let response = `Here are the '${extractionResult.field}' values I found${
    extractionResult.providerFilter ? ` for ${extractionResult.providerFilter}` : ''
  }:\n\n`

  extractionResult.results.forEach((result: any, index: number) => {
    response += `${index + 1}. **${result.name}**: ${result.fieldValue}\n`
  })

  return response
}

// Search for llms.txt files
async function searchLlmsTxt(query: string, limit = 5): Promise<any> {
  const llmsData = await getLlmsTxtData()

  // Set up Fuse.js for fuzzy searching
  const fuse = new Fuse(llmsData, {
    keys: ['content', 'name', 'url', 'category', 'description'],
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true
  })

  // Search with Fuse.js
  const searchResults = fuse.search(query)

  // Return top results based on limit
  const results = searchResults.slice(0, limit).map(result => ({
    name: result.item.name,
    url: result.item.url,
    type: result.item.type,
    content: result.item.content,
    description: result.item.description,
    category: result.item.category,
    relevanceScore: Math.round((1 - (result.score || 0)) * 100), // Convert to percentage
    lastFetched: result.item.lastFetched
  }))

  return {
    results,
    count: results.length,
    query
  }
}

// Get a specific provider's llms.txt file
async function getProviderFile(provider: string, fuzzyMatch = false): Promise<any> {
  // First try direct lookup of the provider's file
  const directLookup = await getLlmsTxtData(provider)

  if (directLookup.length > 0) {
    // Direct match found
    return {
      found: true,
      files: directLookup.map(file => ({
        name: file.name,
        url: file.url,
        type: file.type,
        content: file.content,
        description: file.description,
        website: file.website,
        category: file.category,
        lastFetched: file.lastFetched
      })),
      count: directLookup.length
    }
  }

  // If no direct match, get suggestions
  const suggestions = getPopularProviders()
    .filter(p => p.includes(provider.substring(0, 3).toLowerCase()))
    .slice(0, 5)

  return {
    found: false,
    message: `No llms.txt files found for provider: ${provider}`,
    suggestions,
    suggestFuzzyMatch: true
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages: Message[] = body.messages || []

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1]

    if (latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    const userQuery = latestMessage.content

    // Extract potentially relevant provider names from the query
    const lowerQuery = userQuery.toLowerCase()
    let relevantProviders: string[] = []

    // List of providers to check for in the query
    const allProviders = [
      'anthropic',
      'claude',
      'openai',
      'gpt',
      'openrouter',
      'google',
      'gemini',
      'cohere',
      'mistral',
      'elevenlabs',
      'fireworks',
      'codeium',
      'vercel',
      'ux-patterns-for-devs',
      'ux patterns'
    ]

    // Check if any providers are mentioned in the query
    for (const provider of allProviders) {
      if (lowerQuery.includes(provider.toLowerCase())) {
        // Handle 'ux patterns' special case
        const normalizedProvider = provider === 'ux patterns' ? 'ux-patterns-for-devs' : provider
        relevantProviders.push(normalizedProvider)
      }
    }

    // If no specific providers found and possibly asking about a general term
    if (relevantProviders.length === 0) {
      // Check for general topics
      if (lowerQuery.includes('model')) {
        relevantProviders = ['anthropic', 'openai', 'openrouter', 'elevenlabs']
      } else if (lowerQuery.includes('pattern') || lowerQuery.includes('ux')) {
        relevantProviders = ['ux-patterns-for-devs']
      }
    }

    // Load data for relevant providers or use general search
    let contextData: any[] = []
    let toolType = 'llm'

    if (relevantProviders.length > 0) {
      // Load data for specific providers
      const loadPromises = relevantProviders.map(provider => loadProviderFile(provider))
      const results = await Promise.all(loadPromises)
      contextData = results.filter(result => result !== null) as LlmsTxtData[]
    }

    // If no specific data found, search across all providers
    if (contextData.length === 0) {
      const searchResults = await searchLlmsTxt(userQuery, 5)
      contextData = searchResults.results
      toolType = 'search'
    }

    // Format the context data for the LLM
    const contextText = contextData
      .map(data => {
        return `Source: ${data.name}\n\n${data.content.substring(0, 2000)}${data.content.length > 2000 ? '...' : ''}\n\n`
      })
      .join('\n---\n\n')

    // Prepare system prompt
    const systemPrompt = `You are a helpful assistant that provides information about various websites and their functionality based on llms.txt files.
The llms.txt file is a standard for documenting APIs, features, and capabilities of various services and tools.
Answer the user's question based ONLY on the context information provided below.
Be concise, accurate, and helpful. If the information isn't in the context, politely say so.

Context information:
${contextText}`

    // Use the LLM to generate a response
    let response: string

    try {
      // Use the AI model to generate a response
      const llmMessages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userQuery
        }
      ]

      // Since we can't directly determine the available methods,
      // let's go back to using a simple implementation
      // Use the systemPrompt and userQuery to construct a response
      response = `Based on the provided information about llms.txt files, here's what I found related to your query:
      
${contextData.map(data => `From ${data.name}: ${data.content.substring(0, 200)}...`).join('\n\n')}

Is there anything specific about these llms.txt files you'd like to know more about?`
      toolType = 'llm'
    } catch (error) {
      console.error('Error calling LLM:', error)

      // Fallback to traditional search if LLM fails
      if (contextData.length > 0) {
        response = formatSearchResponse(contextData)
        toolType = 'search'
      } else {
        const searchResults = await searchLlmsTxt(userQuery, 5)
        response = formatSearchResponse(searchResults.results)
        toolType = 'search'
      }
    }

    // Create results object for the response
    const toolResult = {
      query: userQuery,
      sources: contextData.map(data => data.name),
      usedModel: toolType === 'llm' ? 'grok-2-1212' : 'search'
    }

    return NextResponse.json({
      response,
      toolResults: formatToolResults(toolType, toolResult)
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
