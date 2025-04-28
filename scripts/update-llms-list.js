import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LLMS_DIR = path.join(path.dirname(__dirname), 'packages/content/data/websites')
const README_PATH = path.join(path.dirname(__dirname), 'README.md')
const PROD_URL = 'https://llmstxthub.com'

// Markers for the llms list section in README
const START_MARKER = '<!-- LLMS-LIST:START - Do not remove or modify this section -->'
const END_MARKER = '<!-- LLMS-LIST:END -->'

// Category to emoji mapping based on categories.ts slugs
const CATEGORY_EMOJIS = {
  'ai-ml': '🤖',
  'developer-tools': '💻',
  'data-analytics': '📊',
  'infrastructure-cloud': '☁️',
  'security-identity': '🔒',
  'integration-automation': '⚡',
  other: '🔍' // Keep this as fallback
}

// Format category name
function formatCategory(category) {
  // Convert category to match our slug format
  const slug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .trim()

  // Get emoji for category or use default
  const emoji = CATEGORY_EMOJIS[slug] || '🔍'

  // Convert slug back to display format (e.g., 'ai-ml' -> 'ai & ml')
  const displayName = category
    .toLowerCase()
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .trim()

  return `${emoji} ${displayName}`
}

// Helper to get LLM metadata
function getLLMMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(content)

    return {
      name: data.name || '',
      description: data.description || '',
      website: data.website || '',
      llmsUrl: data.llmsUrl || '',
      llmsFullUrl: data.llmsFullUrl || '',
      category: data.category || 'Other'
    }
  } catch (error) {
    console.error(`Error reading metadata from ${filePath}:`, error)
    return {
      name: '',
      description: '',
      website: '',
      llmsUrl: '',
      llmsFullUrl: '',
      category: 'Other'
    }
  }
}

// Convert filename to title case (remove .mdx and convert to title case)
function toTitleCase(str) {
  return str
    .replace('.mdx', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Group LLMs by category
function groupLLMsByCategory(llmFiles) {
  const categories = {}

  for (const file of llmFiles) {
    const filePath = path.join(LLMS_DIR, file)
    const metadata = getLLMMetadata(filePath)
    const fileName = file.replace('.mdx', '')

    if (metadata.name && metadata.description) {
      if (!categories[metadata.category]) {
        categories[metadata.category] = []
      }

      categories[metadata.category].push({
        ...metadata,
        fileName
      })
    }
  }

  // Sort categories and their contents
  const sortedCategories = {}
  Object.keys(categories)
    .sort((a, b) => a.localeCompare(b))
    .forEach(category => {
      sortedCategories[category] = categories[category].sort((a, b) => a.name.localeCompare(b.name))
    })

  return sortedCategories
}

// Get favicon URL for a website
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&size=128`
  } catch (error) {
    console.error(`Error getting favicon for ${url}:`, error)
    return ''
  }
}

function generateLLMsList() {
  // Get all LLM files
  const llmFiles = fs
    .readdirSync(LLMS_DIR)
    .filter(file => file.endsWith('.mdx') && !file.startsWith('_'))

  // Generate LLMs list content
  let llmsContent = '\n## LLM Tools and Resources\n\n'
  llmsContent +=
    'A curated list of LLM-powered tools and resources with llms.txt implementation.\n\n'

  // Group and sort LLMs by category
  const categorizedLLMs = groupLLMsByCategory(llmFiles)

  // Generate content for each category
  for (const [category, llms] of Object.entries(categorizedLLMs)) {
    llmsContent += `### ${formatCategory(category)}\n\n`

    llms.forEach((llm, index) => {
      // Get favicon URL
      const faviconUrl = getFaviconUrl(llm.website)

      // Create a single line entry with bullet point
      llmsContent += `- ${faviconUrl ? `![${llm.name} favicon](${faviconUrl}) ` : ''}**[${llm.name}](${llm.website})** - ${llm.description}`

      // Add llms.txt related links
      const links = []
      if (llm.llmsUrl) {
        links.push(`[llms.txt](${llm.llmsUrl})`)
      }
      if (llm.llmsFullUrl) {
        links.push(`[llms-full.txt](${llm.llmsFullUrl})`)
      }

      if (links.length > 0) {
        llmsContent += ` <sub>${links.join(' • ')}</sub>`
      }

      llmsContent += '\n' // Single newline after each entry
    })

    llmsContent += '\n' // Add extra spacing after the category
  }

  return llmsContent
}

function updateLLMsList() {
  try {
    // Read current README
    let readme = fs.readFileSync(README_PATH, 'utf8')

    // Check if markers exist
    if (!readme.includes(START_MARKER) || !readme.includes(END_MARKER)) {
      throw new Error(
        `Could not find ${START_MARKER} and ${END_MARKER} markers in README.md. Please add them around the LLMs section.`
      )
    }

    // Generate new LLMs list
    const llmsContent = generateLLMsList()

    // Replace content between markers
    const newReadme = readme.replace(
      new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`),
      `${START_MARKER}${llmsContent}${END_MARKER}`
    )

    // Write updated README
    fs.writeFileSync(README_PATH, newReadme)
    console.log('✅ README.md has been updated successfully!')
  } catch (error) {
    console.error('Error updating LLMs list:', error)
    process.exit(1)
  }
}

// Run the update if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateLLMsList()
}

export default updateLLMsList
