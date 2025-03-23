import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WEBSITES_DIR = path.join(path.dirname(__dirname), 'content/websites')
const OUTPUT_PATH = path.join(path.dirname(__dirname), 'apps/search/public/search-index.json')

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function fetchLlmsTxt(url) {
  try {
    const response = await axios.get(url, { timeout: 5000 })
    return response.data
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message)
    return null
  }
}

async function generateSearchIndex() {
  // Get all website files
  const websiteFiles = fs
    .readdirSync(WEBSITES_DIR)
    .filter(file => file.endsWith('.mdx') && !file.startsWith('_'))

  console.log(`Found ${websiteFiles.length} website files`)

  const searchIndex = []

  // Process each website
  for (const file of websiteFiles) {
    try {
      const filePath = path.join(WEBSITES_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContent)

      const { name, description, website, llmsUrl, llmsFullUrl, category } = data

      if (llmsUrl) {
        console.log(`Fetching llms.txt for ${name} from ${llmsUrl}`)
        const llmsContent = await fetchLlmsTxt(llmsUrl)

        if (llmsContent) {
          searchIndex.push({
            name,
            description,
            website,
            url: llmsUrl,
            content: llmsContent,
            type: 'llms.txt',
            category,
            lastFetched: new Date().toISOString().split('T')[0]
          })
        }
      }

      if (llmsFullUrl) {
        console.log(`Fetching llms-full.txt for ${name} from ${llmsFullUrl}`)
        const llmsFullContent = await fetchLlmsTxt(llmsFullUrl)

        if (llmsFullContent) {
          searchIndex.push({
            name,
            description,
            website,
            url: llmsFullUrl,
            content: llmsFullContent,
            type: 'llms-full.txt',
            category,
            lastFetched: new Date().toISOString().split('T')[0]
          })
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  }

  // Write search index to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(searchIndex, null, 2))
  console.log(`Generated search index with ${searchIndex.length} entries at ${OUTPUT_PATH}`)
}

// Run the generator if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSearchIndex()
    .then(() => console.log('Search index generation complete'))
    .catch(error => console.error('Error generating search index:', error))
}

export default generateSearchIndex
