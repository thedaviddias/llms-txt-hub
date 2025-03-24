import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WEBSITES_DIR = path.join(path.dirname(__dirname), 'content/websites')
const CACHE_PATH = path.join(path.dirname(__dirname), 'apps/chatbot/public/llms-cache')
const METADATA_PATH = path.join(path.dirname(__dirname), 'apps/chatbot/public/llms-metadata.json')
const PROVIDERS_LIST_PATH = path.join(
  path.dirname(__dirname),
  'apps/chatbot/public/llms-providers.json'
)

// Ensure cache directory exists
if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH, { recursive: true })
}

// Helper to fetch with retries
async function fetchWithRetry(url, maxRetries = 3, timeout = 5000) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': 'llmstxthub.com/chatbot (GitHub: thedaviddias/llms-txt-hub)'
        }
      })
      return response.data
    } catch (error) {
      lastError = error
      console.warn(`Retry ${i + 1}/${maxRetries} failed for ${url}: ${error.message}`)
      // Wait before retrying (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
  throw lastError
}

// Helper to save to cache
function saveToCache(name, type, content) {
  const safeFileName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const cachePath = path.join(CACHE_PATH, `${safeFileName}-${type}.txt`)
  fs.writeFileSync(cachePath, content)
  return cachePath
}

// Helper to create metadata file for a provider
function createMetadataFile(name, provider, type, url, cachePath) {
  const metadataPath = cachePath.replace('.txt', '.json')

  const metadata = {
    name: provider.name,
    description: provider.description || `${provider.name} llms.txt file`,
    website: provider.website || url.replace('/llms.txt', '').replace('/llms-full.txt', ''),
    url,
    type,
    category: provider.category,
    cachePath: path.relative(path.dirname(__dirname), cachePath),
    lastFetched: new Date().toISOString().split('T')[0]
  }

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  return metadataPath
}

async function generateLlmsIndex() {
  // Get all website files
  const websiteFiles = fs
    .readdirSync(WEBSITES_DIR)
    .filter(file => file.endsWith('.mdx') && !file.startsWith('_'))

  console.log(`Found ${websiteFiles.length} website files`)

  const providersInfo = []
  const categories = new Set()
  const errors = []
  let successCount = 0
  let errorCount = 0

  // Process each website
  for (const file of websiteFiles) {
    try {
      const filePath = path.join(WEBSITES_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContent)

      const { name, description, website, llmsUrl, llmsFullUrl, category } = data

      // Add category to the set if available
      if (category) {
        categories.add(category)
      }

      const providerInfo = {
        name,
        description,
        website,
        category,
        files: []
      }

      // Process llms.txt file
      if (llmsUrl) {
        try {
          console.log(`Fetching llms.txt for ${name} from ${llmsUrl}`)
          const llmsContent = await fetchWithRetry(llmsUrl)

          if (llmsContent) {
            // Save to cache
            const cachePath = saveToCache(name, 'llms', llmsContent)

            // Create metadata file
            const metadataPath = createMetadataFile(name, data, 'llms.txt', llmsUrl, cachePath)

            // Add file info to provider
            providerInfo.files.push({
              type: 'llms.txt',
              url: llmsUrl,
              cachePath,
              metadataPath
            })

            successCount++
          }
        } catch (error) {
          console.error(`Error fetching llms.txt for ${name}: ${error.message}`)
          errors.push({
            name,
            type: 'llms.txt',
            url: llmsUrl,
            error: error.message
          })
          errorCount++
        }
      }

      // Process llms-full.txt file
      if (llmsFullUrl) {
        try {
          console.log(`Fetching llms-full.txt for ${name} from ${llmsFullUrl}`)
          const llmsFullContent = await fetchWithRetry(llmsFullUrl)

          if (llmsFullContent) {
            // Save to cache
            const cachePath = saveToCache(name, 'llms-full', llmsFullContent)

            // Create metadata file
            const metadataPath = createMetadataFile(
              name,
              data,
              'llms-full.txt',
              llmsFullUrl,
              cachePath
            )

            // Add file info to provider
            providerInfo.files.push({
              type: 'llms-full.txt',
              url: llmsFullUrl,
              cachePath,
              metadataPath
            })

            successCount++
          }
        } catch (error) {
          console.error(`Error fetching llms-full.txt for ${name}: ${error.message}`)
          errors.push({
            name,
            type: 'llms-full.txt',
            url: llmsFullUrl,
            error: error.message
          })
          errorCount++
        }
      }

      // Only add providers that have at least one file successfully fetched
      if (providerInfo.files.length > 0) {
        providersInfo.push(providerInfo)
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  }

  // Write metadata file
  const metadata = {
    generatedAt: new Date().toISOString(),
    totalProviders: providersInfo.length,
    successCount,
    errorCount,
    categories: Array.from(categories),
    errors
  }

  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))

  // Write providers list (without content)
  const providersList = providersInfo.map(provider => ({
    name: provider.name,
    description: provider.description,
    website: provider.website,
    category: provider.category,
    hasLlmsTxt: provider.files.some(f => f.type === 'llms.txt'),
    hasLlmsFullTxt: provider.files.some(f => f.type === 'llms-full.txt')
  }))

  fs.writeFileSync(PROVIDERS_LIST_PATH, JSON.stringify(providersList, null, 2))

  console.log(`Generated llms metadata with information for ${providersInfo.length} providers`)
  console.log(`Success: ${successCount}, Errors: ${errorCount}`)
  console.log(`Categories: ${Array.from(categories).join(', ')}`)
}

// Run the generator if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateLlmsIndex()
    .then(() => console.log('llms index generation complete'))
    .catch(error => console.error('Error generating llms index:', error))
}

export default generateLlmsIndex
