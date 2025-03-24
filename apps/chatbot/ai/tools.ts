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
  cacheFile?: string
  lastFetched: string
}

// Type for the llms-index.json file
type LlmsIndexData = {
  metadata: {
    generatedAt: string
    totalEntries: number
    successCount: number
    errorCount: number
  }
  entries: LlmsTxtData[]
}

// Mock data for fallback
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
    url: 'https://openrouter.ai/docs/llms.txt',
    name: 'OpenRouter',
    content:
      '# OpenRouter\nAPI aggregator for multiple LLM providers\nMODELS: multiple from various providers\nCONTEXT_WINDOW: varies by model\n',
    type: 'llms.txt',
    category: 'infrastructure-cloud',
    lastFetched: '2025-03-23'
  }
]

// Helper function to get metadata only (providers and categories)
async function getLlmsMetadata(): Promise<{ providers: string[]; categories: string[] }> {
  const providers = [
    'Anthropic',
    'OpenAI',
    'Mistral',
    'Cohere',
    'OpenRouter',
    'Fireworks',
    'ElevenLabs',
    'Hugging Face',
    'Together AI',
    'Vercel',
    'Google'
  ]

  const categories = [
    'ai-ml',
    'developer-tools',
    'infrastructure-cloud',
    'integration-automation',
    'analytics',
    'database',
    'security'
  ]

  return { providers, categories }
}

// Get a list of most popular providers (instead of loading all data)
async function getPopularProviders(): Promise<string[]> {
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

// Load a specific provider's llms.txt file
async function loadProviderFile(provider: string): Promise<LlmsTxtData | null> {
  try {
    // Try both formats of filenames
    const providerSlug = provider.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const possiblePaths = [
      path.resolve(process.cwd(), `public/llms-cache/${providerSlug}-llms.txt`),
      path.resolve(process.cwd(), `public/llms-cache/${provider.toLowerCase()}-llms.txt`)
    ]

    for (const filePath of possiblePaths) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        return {
          name: provider,
          url: `https://${provider.toLowerCase()}.com/llms.txt`, // approximated URL
          content: fileContent,
          type: 'llms.txt',
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

// Helper function to get llms.txt data - uses cached files instead of large index
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
    const popularProviders = await getPopularProviders()
    const loadPromises = popularProviders.map(provider => loadProviderFile(provider))
    const results = await Promise.all(loadPromises)

    // Filter out null results and return
    const validResults = results.filter(result => result !== null) as LlmsTxtData[]

    if (validResults.length > 0) {
      console.log(`Loaded ${validResults.length} llms.txt entries from cache files`)
      return validResults
    } else {
      console.log('No cache files found, using mock data')
      return MOCK_LLMS_DATA
    }
  } catch (error) {
    console.log('Error loading llms.txt data:', error)
    return MOCK_LLMS_DATA
  }
}

// Tool 1: Search llms.txt files
export const searchLlmsTxtTool = tool({
  description: 'Searches across llms.txt files from various providers for specific information',
  parameters: z.object({
    query: z.string().describe('The search query to find information in llms.txt files'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
    categoryFilter: z.string().optional().describe('Optional category to filter by'),
    providerFilter: z.string().optional().describe('Optional provider to filter by')
  }),
  execute: async ({ query, limit = 5, categoryFilter, providerFilter }) => {
    // If providerFilter is provided, load just that provider's data
    const llmsData = await getLlmsTxtData(providerFilter)

    // Apply category filter if provided
    let filteredData = llmsData
    if (categoryFilter) {
      filteredData = llmsData.filter(data =>
        data.category?.toLowerCase().includes(categoryFilter.toLowerCase())
      )
    }

    // Set up Fuse.js for fuzzy searching
    const fuse = new Fuse(filteredData, {
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
      relevanceScore: Math.round((1 - (result.score || 0)) * 100) // Convert to percentage
    }))

    // Get metadata for categories
    const { categories } = await getLlmsMetadata()

    return {
      results,
      count: results.length,
      totalAvailable: filteredData.length,
      categories,
      query,
      categoryFilter,
      providerFilter
    }
  }
})

// Tool 2: Get specific llms.txt file
export const getLlmsTxtFileTool = tool({
  description: 'Gets the complete llms.txt file for a specific provider',
  parameters: z.object({
    provider: z.string().describe('The name of the provider (e.g., "Anthropic", "OpenRouter")'),
    fuzzyMatch: z
      .boolean()
      .optional()
      .describe('Whether to use fuzzy matching for provider name (default: false)')
  }),
  execute: async ({ provider, fuzzyMatch = false }) => {
    // First try direct lookup of the provider's file
    const directLookup = await getLlmsTxtData(provider)

    if (directLookup.length > 0 && directLookup[0].name.toLowerCase() === provider.toLowerCase()) {
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

    // If direct lookup fails, try loading all popular providers
    const allData = await getLlmsTxtData()

    let matchingFiles: LlmsTxtData[] = []

    if (fuzzyMatch) {
      // Use Fuse.js for fuzzy matching if requested
      const fuse = new Fuse(allData, {
        keys: ['name'],
        includeScore: true,
        threshold: 0.3
      })

      const results = fuse.search(provider)
      if (results.length > 0) {
        matchingFiles = results.map(result => result.item)
      }
    } else {
      // Exact match (case insensitive)
      matchingFiles = allData.filter(data => data.name.toLowerCase() === provider.toLowerCase())

      // If no exact match found, try partial match
      if (matchingFiles.length === 0) {
        matchingFiles = allData.filter(data =>
          data.name.toLowerCase().includes(provider.toLowerCase())
        )
      }
    }

    if (matchingFiles.length === 0) {
      // Get list of available providers for suggestions
      const { providers } = await getLlmsMetadata()

      // Filter suggestions based on query
      const suggestions = providers
        .filter(p => p.toLowerCase().includes(provider.substring(0, 3).toLowerCase()))
        .slice(0, 5)

      return {
        found: false,
        message: `No llms.txt files found for provider: ${provider}`,
        suggestions,
        suggestFuzzyMatch: true
      }
    }

    return {
      found: true,
      files: matchingFiles.map(file => ({
        name: file.name,
        url: file.url,
        type: file.type,
        content: file.content,
        description: file.description,
        website: file.website,
        category: file.category,
        lastFetched: file.lastFetched
      })),
      count: matchingFiles.length
    }
  }
})

// Tool 3: Get llms.txt providers by category
export const getLlmsTxtCategoriesTool = tool({
  description: 'Gets providers of llms.txt files by category or lists all available categories',
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe('Optional category to filter by (e.g., "ai-ml", "infrastructure-cloud")'),
    includeDescriptions: z
      .boolean()
      .optional()
      .describe('Whether to include provider descriptions in results (default: false)')
  }),
  execute: async ({ category, includeDescriptions = false }) => {
    // Get predefined categories and providers
    const { categories, providers } = await getLlmsMetadata()

    // Format categories for display with estimated counts
    const formattedCategories = categories
      .map(category => ({
        name: category,
        count:
          category === 'ai-ml'
            ? 35
            : category === 'developer-tools'
              ? 48
              : category === 'infrastructure-cloud'
                ? 22
                : category === 'integration-automation'
                  ? 18
                  : category === 'analytics'
                    ? 12
                    : category === 'database'
                      ? 14
                      : category === 'security'
                        ? 10
                        : 5 // default count
      }))
      .sort((a, b) => b.count - a.count) // Sort by most frequent categories first

    // If a specific category is requested, get data for that category
    let filteredData: LlmsTxtData[] = []
    let matchedCategory = category

    if (category) {
      // Find closest matching category from our predefined list
      matchedCategory =
        categories.find(c => c.toLowerCase().includes(category.toLowerCase())) || category

      // Get data for popular providers to have some results
      filteredData = await getLlmsTxtData()

      // Filter by the matched category (approximate matching)
      filteredData = filteredData.filter(data => {
        const dataCategory = data.category?.toLowerCase() || ''
        return (
          dataCategory.includes(matchedCategory!.toLowerCase()) ||
          matchedCategory!.toLowerCase().includes(dataCategory)
        )
      })
    } else {
      // Get data for popular providers for the general case
      filteredData = await getLlmsTxtData()
    }

    // Group by name to avoid duplicates
    const providersByName: Record<string, LlmsTxtData> = {}
    filteredData.forEach(data => {
      if (!providersByName[data.name] || data.type === 'llms.txt') {
        providersByName[data.name] = data
      }
    })

    // Convert to array with appropriate fields
    const filteredProviders = Object.values(providersByName).map(data => {
      const result: any = {
        name: data.name,
        category: data.category || matchedCategory, // Use matched category if provider has none
        url: data.url,
        type: data.type
      }

      if (includeDescriptions) {
        result.description = data.description || `${data.name} llms.txt file`
        result.website = data.website || data.url.replace('/llms.txt', '')
      }

      return result
    })

    return {
      categories: formattedCategories,
      providers: filteredProviders,
      count: filteredProviders.length,
      totalCategories: formattedCategories.length,
      filteredByCategory: Boolean(category),
      category: matchedCategory,
      allProviderCount: providers.length
    }
  }
})

// Tool 4: Extract specific fields from llms.txt files
export const extractLlmsTxtFieldsTool = tool({
  description: 'Extracts specific structured fields from llms.txt files across providers',
  parameters: z.object({
    field: z.string().describe('The field to extract (e.g., "MODELS", "CONTEXT_WINDOW")'),
    providerFilter: z.string().optional().describe('Optional provider name to filter by')
  }),
  execute: async ({ field, providerFilter }) => {
    // If a provider filter is specified, try to load just that provider's data
    const llmsData = await getLlmsTxtData(providerFilter)

    // Apply additional provider filtering if needed (when multiple files are loaded)
    let filteredData = llmsData
    if (providerFilter && llmsData.length > 1) {
      filteredData = llmsData.filter(data =>
        data.name.toLowerCase().includes(providerFilter.toLowerCase())
      )
    }

    // Common fields that might have different formats
    const fieldVariants = {
      CONTEXT_WINDOW: ['CONTEXT_WINDOW', 'CONTEXT', 'WINDOW_SIZE', 'MAX_TOKENS'],
      MODELS: ['MODELS', 'MODEL', 'AVAILABLE_MODELS', 'SUPPORTED_MODELS'],
      API: ['API', 'API_ENDPOINTS', 'ENDPOINTS', 'API_VERSIONS'],
      PRICING: ['PRICING', 'PRICE', 'COST', 'RATE'],
      FEATURES: ['FEATURES', 'CAPABILITIES', 'SUPPORTS']
    }

    // Get field variants to check
    const fieldsToCheck = fieldVariants[field as keyof typeof fieldVariants] || [field]

    // Use regex to extract fields with multiple possible formats
    const results = filteredData
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
          const paragraphRegex = new RegExp(`(?:\\n|^).*?(${field.toLowerCase()}).*?(?:\\n|$)`, 'i')
          const match = data.content.match(paragraphRegex)

          if (match) {
            fieldValue = match[0].trim()
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
      providerFilter,
      searchedFields: fieldsToCheck
    }
  }
})

// Export the toolset
export const toolSpec = {
  searchLlmsTxtTool,
  getLlmsTxtFileTool,
  getLlmsTxtCategoriesTool,
  extractLlmsTxtFieldsTool
}

export default toolSpec
