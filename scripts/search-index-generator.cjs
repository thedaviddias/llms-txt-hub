const fs = require('node:fs')
const path = require('node:path')
const matter = require('gray-matter')

// Resolve from the repo root so this works from the root build and the apps/web build
const repoRoot = path.join(__dirname, '..')
const contentDir = path.join(repoRoot, 'packages/content/data/websites')
const outputPath = path.join(repoRoot, 'apps/web/public/search/search-index.json')

// Check if directory exists
if (!fs.existsSync(contentDir)) {
  console.error(`Content directory not found: ${contentDir}`)
  process.exit(1)
}

// Get all markdown files (the websites directory is flat)
const files = fs
  .readdirSync(contentDir)
  .filter(file => /\.mdx?$/.test(file))
  .map(file => path.join(contentDir, file))
console.log(`Found ${files.length} content files in ${path.relative(repoRoot, contentDir)}`)

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
      const slug = data.slug || path.basename(filePath, path.extname(filePath))

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
  // Tie-break on slug so the output doesn't depend on filesystem order
  .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug))

// Ensure the output directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write the search index to the output file
fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2))

console.log(`Search index generated with ${searchIndex.length} entries at ${outputPath}`)
