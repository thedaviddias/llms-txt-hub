const fs = require('node:fs')
const path = require('node:path')
const glob = require('glob')
const matter = require('gray-matter')

const possibleContentDirs = ['packages/content/websites/data', 'packages/content/data/websites', 'content/websites', 'websites']

const outputPath = 'apps/web/public/search/search-index.json'

let contentDir = null
let files = []

for (const dir of possibleContentDirs) {
  if (fs.existsSync(dir)) {
    console.log(`Found directory: ${dir}`)
    const dirFiles = glob.sync(`${dir}/**/*.{md,mdx}`)
    if (dirFiles.length > 0) {
      contentDir = dir
      files = dirFiles
      console.log(`Found ${files.length} content files in ${contentDir}`)
      break
    } else {
      console.log(`Directory ${dir} exists but contains no markdown files`)
    }
  } else {
    console.log(`Directory not found: ${dir}`)
  }
}

if (!contentDir) {
  console.error('Could not find any content directory with markdown files')
  console.log('Listing all directories in the current working directory:')
  const rootDirs = fs.readdirSync('.')
  console.log(rootDirs)

  const allMdFiles = glob.sync('**/*.{md,mdx}', {
    ignore: ['node_modules/**', '.git/**', '.next/**']
  })
  console.log(`Found ${allMdFiles.length} markdown files in the entire project:`)
  allMdFiles.slice(0, 10).forEach(file => console.log(` - ${file}`))
  if (allMdFiles.length > 10) {
    console.log(`... and ${allMdFiles.length - 10} more`)
  }

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
