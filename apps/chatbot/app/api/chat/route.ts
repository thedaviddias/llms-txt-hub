import { NextResponse } from 'next/server'
import type { Message } from 'ai'

// Helper function to extract tools results
function extractToolResults(content: string) {
  // In a real implementation, this would parse tool results from the AI response
  // For now, we'll simulate this by searching in provided content
  const hasSearchResults = content.includes('search results') || content.includes('I found')
  const hasProviderInfo = content.includes('provider') || content.includes('file content')
  const hasCategoryInfo = content.includes('category') || content.includes('categories')

  return {
    usedTools: {
      search: hasSearchResults,
      provider: hasProviderInfo,
      category: hasCategoryInfo
    }
  }
}

// Sample bot messages for simulation
const SAMPLE_RESPONSES: Record<string, string> = {
  default:
    "I'm sorry, I couldn't find specific information about that. Could you try rephrasing your question or asking about a specific LLM provider?",

  anthropic: `I found information about Anthropic's models:

\`\`\`
# Anthropic Claude
LLM platform for AI assistants with safety focus
MODELS: claude-3-opus, claude-3-sonnet, claude-3-haiku
CONTEXT_WINDOW: 200K tokens
\`\`\`

Anthropic offers three main Claude models:
- claude-3-opus: Their most powerful model
- claude-3-sonnet: A balanced model for most tasks
- claude-3-haiku: Their fastest and most cost-effective model

All of these models support a context window of up to 200,000 tokens, which is among the largest in the industry.`,

  openrouter: `Here's the llms.txt information for OpenRouter:

\`\`\`
# OpenRouter
API aggregator for multiple LLM providers
MODELS: multiple from various providers
CONTEXT_WINDOW: varies by model
\`\`\`

OpenRouter is unique because it acts as an aggregator for multiple LLM providers, giving you access to various models through a single API. The context window varies depending on which underlying model you're using through their service.`,

  context: `Based on the llms.txt files I've analyzed, here are the providers with the largest context windows:

1. Anthropic Claude: 200K tokens
2. OpenRouter: varies by model, but supports some models with large context windows

Context windows are important because they determine how much text the AI can "see" at once. Larger context windows allow for more comprehensive understanding of documents and conversations.`,

  categories: `I've found llms.txt files in several categories:

1. AI/ML (ai-ml): Anthropic
2. Infrastructure/Cloud (infrastructure-cloud): OpenRouter
3. Developer Tools (developer-tools): LLMsTxt.org

These categories reflect the different focus areas of companies implementing the llms.txt standard. Would you like more information about any specific category?`
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

    const userQuery = latestMessage.content.toLowerCase()

    // Simulate AI processing with delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Simple keyword matching for demo purposes
    // In a real implementation, this would use a proper AI model
    let response: string

    if (userQuery.includes('anthropic') || userQuery.includes('claude')) {
      response = SAMPLE_RESPONSES.anthropic
    } else if (userQuery.includes('openrouter')) {
      response = SAMPLE_RESPONSES.openrouter
    } else if (userQuery.includes('context window') || userQuery.includes('largest context')) {
      response = SAMPLE_RESPONSES.context
    } else if (userQuery.includes('category') || userQuery.includes('categories')) {
      response = SAMPLE_RESPONSES.categories
    } else {
      response = SAMPLE_RESPONSES.default
    }

    // Extract tool results
    const toolResults = extractToolResults(response)

    return NextResponse.json({
      response,
      toolResults
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
