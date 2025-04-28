import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WEBSITES_DIR = path.join(path.dirname(__dirname), 'packages/content/websites/data')
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

// Helper to minify text content
function minifyTextContent(content) {
  // Remove blank lines and excessive whitespace
  return content
    .split('\n')
    .filter(line => line.trim().length > 0) // Remove empty lines
    .map(line => line.trim()) // Trim whitespace at start/end of each line
    .join('\n')
}

// Helper to save to cache
function saveToCache(name, type, content) {
  const safeFileName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  // Save original version
  const cachePath = path.join(CACHE_PATH, `${safeFileName}-${type}.txt`)
  fs.writeFileSync(cachePath, content)

  // Save minified version with .min suffix
  const minifiedContent = minifyTextContent(content)
  const minifiedPath = path.join(CACHE_PATH, `${safeFileName}-${type}.min.txt`)
  fs.writeFileSync(minifiedPath, minifiedContent)

  return {
    original: cachePath,
    minified: minifiedPath
  }
}

// Helper to create metadata file for a provider
function createMetadataFile(name, provider, type, url, cachePaths) {
  const metadataPath = cachePaths.original.replace('.txt', '.json')
  const minifiedMetadataPath = cachePaths.minified.replace('.min.txt', '.min.json')

  const metadata = {
    name: provider.name,
    description: provider.description || `${provider.name} llms.txt file`,
    website: provider.website || url.replace('/llms.txt', '').replace('/llms-full.txt', ''),
    url,
    type,
    category: provider.category,
    cachePath: path.relative(path.dirname(__dirname), cachePaths.original),
    minifiedPath: path.relative(path.dirname(__dirname), cachePaths.minified),
    lastFetched: new Date().toISOString().split('T')[0]
  }

  // Save both regular and minified JSON files
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  fs.writeFileSync(minifiedMetadataPath, JSON.stringify(metadata))

  return {
    original: metadataPath,
    minified: minifiedMetadataPath
  }
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
            // Save to cache (both original and minified)
            const cachePaths = saveToCache(name, 'llms', llmsContent)

            // Create metadata file (both original and minified)
            const metadataPaths = createMetadataFile(name, data, 'llms.txt', llmsUrl, cachePaths)

            // Add file info to provider
            providerInfo.files.push({
              type: 'llms.txt',
              url: llmsUrl,
              cachePath: cachePaths.original,
              minifiedPath: cachePaths.minified,
              metadataPath: metadataPaths.original,
              minifiedMetadataPath: metadataPaths.minified
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
            // Save to cache (both original and minified)
            const cachePaths = saveToCache(name, 'llms-full', llmsFullContent)

            // Create metadata file (both original and minified)
            const metadataPaths = createMetadataFile(
              name,
              data,
              'llms-full.txt',
              llmsFullUrl,
              cachePaths
            )

            // Add file info to provider
            providerInfo.files.push({
              type: 'llms-full.txt',
              url: llmsFullUrl,
              cachePath: cachePaths.original,
              minifiedPath: cachePaths.minified,
              metadataPath: metadataPaths.original,
              minifiedMetadataPath: metadataPaths.minified
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
    errors,
    hasMinifiedVersions: true
  }

  // Write both regular and minified versions of metadata
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))
  fs.writeFileSync(METADATA_PATH.replace('.json', '.min.json'), JSON.stringify(metadata))

  // Write providers list (without content)
  const providersList = providersInfo.map(provider => ({
    name: provider.name,
    description: provider.description,
    website: provider.website,
    category: provider.category,
    hasLlmsTxt: provider.files.some(f => f.type === 'llms.txt'),
    hasLlmsFullTxt: provider.files.some(f => f.type === 'llms-full.txt'),
    // Add paths to minified files
    minifiedFiles: provider.files.map(f => ({
      type: f.type,
      minifiedPath: path.relative(path.dirname(__dirname), f.minifiedPath),
      minifiedMetadataPath: path.relative(path.dirname(__dirname), f.minifiedMetadataPath)
    }))
  }))

  // Write both regular and minified versions of the providers list
  fs.writeFileSync(PROVIDERS_LIST_PATH, JSON.stringify(providersList, null, 2))
  fs.writeFileSync(PROVIDERS_LIST_PATH.replace('.json', '.min.json'), JSON.stringify(providersList))

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
