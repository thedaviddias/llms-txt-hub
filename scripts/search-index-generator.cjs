const fs = require('node:fs')
const path = require('node:path')
const glob = require('glob')
const matter = require('gray-matter')

// Use the correct content directory
const contentDir = 'packages/content/data/websites'
const outputPath = 'apps/web/public/search/search-index.json'

// Check if directory exists
if (!fs.existsSync(contentDir)) {
  console.error(`Content directory not found: ${contentDir}`)
  process.exit(1)
}

// Get all markdown files
const files = glob.sync(`${contentDir}/**/*.{md,mdx}`)
console.log(`Found ${files.length} content files in ${contentDir}`)

if (files.length === 0) {
  console.error('No markdown files found in content directory')
  process.exit(1)
}

// Process each file to extract searchable data
const searchIndex = files
  .map(filePath => {
    try {
      // Skip .DS_Store files
      if (path.basename(filePath) === '.DS_Store') {
        return null
      }

      const fileContent = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContent)

      // Extract slug from file path
      const slug = path.basename(filePath, path.extname(filePath))

      return {
        name: data.name || data.title || '',
        description: data.description || '',
        url: data.url || `/${slug}`,
        content: content.trim() || '',
        category: data.category || '',
        slug: slug,
        website: data.website || '',
        llmsUrl: data.llmsUrl || '',
        llmsFullUrl: data.llmsFullUrl || ''
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error)
      return null
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name))

// Ensure the output directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write the search index to the output file
fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2))

console.log(`Search index generated with ${searchIndex.length} entries at ${outputPath}`)
