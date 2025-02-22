import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LLMS_DIR = path.join(path.dirname(__dirname), 'content/websites')
const README_PATH = path.join(path.dirname(__dirname), 'README.md')
const PROD_URL = 'https://llmstxthub.com'

// Markers for the llms list section in README
const START_MARKER = '<!-- LLMS-LIST:START - Do not remove or modify this section -->'
const END_MARKER = '<!-- LLMS-LIST:END -->'

// Helper to get LLM metadata
function getLLMMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(content)

    return {
      name: data.name || '',
      description: data.description || '',
      website: data.website || '',
      llmsUrl: data.llmsUrl || ''
    }
  } catch (error) {
    console.error(`Error reading metadata from ${filePath}:`, error)
    return {
      name: '',
      description: '',
      website: '',
      llmsUrl: ''
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

function generateLLMsList() {
  // Get all LLM files
  const llmFiles = fs
    .readdirSync(LLMS_DIR)
    .filter(file => file.endsWith('.mdx') && !file.startsWith('_'))

  // Generate LLMs list content
  let llmsContent = '\n## LLM Tools and Resources\n\n'
  llmsContent +=
    'A curated list of LLM-powered tools and resources with llms.txt implementation.\n\n'

  // Sort files alphabetically
  llmFiles.sort((a, b) => a.localeCompare(b))

  for (const file of llmFiles) {
    const filePath = path.join(LLMS_DIR, file)
    const metadata = getLLMMetadata(filePath)
    const fileName = file.replace('.mdx', '')

    if (metadata.name && metadata.description) {
      llmsContent += `### [${metadata.name}](${PROD_URL}/websites/${fileName})\n\n`
      llmsContent += `${metadata.description}\n\n`

      // Add links if available
      const links = []
      if (metadata.website) {
        links.push(`[Website](${metadata.website})`)
      }
      if (metadata.llmsUrl) {
        links.push(`[llms.txt](${metadata.llmsUrl})`)
      }

      if (links.length > 0) {
        llmsContent += `<sub>${links.join(' • ')}</sub>\n\n`
      }
    }
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
