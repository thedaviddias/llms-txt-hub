import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const websitesDir = path.join(process.cwd(), 'packages/content/data/websites')

// Map categories to default content types
const categoryToContentType = {
  'ai-ml': 'tool',
  'developer-tools': 'tool',
  'data-analytics': 'tool',
  'infrastructure-cloud': 'platform',
  'security-identity': 'tool',
  'integration-automation': 'platform',
  'personal-sites': 'personal'
}

// Personal site indicators (names that suggest personal sites)
const personalSiteIndicators = [
  'personal',
  'portfolio',
  'blog',
  'developer',
  'tech',
  'site',
  'homepage'
]

function isPersonalSite(name, description) {
  const lowerName = name.toLowerCase()
  const lowerDesc = description.toLowerCase()

  // Check if name or description contains personal site indicators
  return personalSiteIndicators.some(
    indicator => lowerName.includes(indicator) || lowerDesc.includes(indicator)
  )
}

function updateMdxFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const { data, content: mdxContent } = matter(content)

  // Skip if already has contentType
  if (data.contentType) {
    return false
  }

  // Determine content type
  let contentType = 'tool' // default
  let priority = 'medium' // default

  if (isPersonalSite(data.name, data.description)) {
    contentType = 'personal'
    priority = 'low'
  } else if (data.category && categoryToContentType[data.category]) {
    contentType = categoryToContentType[data.category]
    priority = contentType === 'personal' ? 'low' : 'high'
  } else if (data.category === 'personal-sites') {
    contentType = 'personal'
    priority = 'low'
  }

  // Update frontmatter
  data.contentType = contentType
  data.priority = priority

  // Reconstruct the file
  const newContent = matter.stringify(mdxContent, data)
  fs.writeFileSync(filePath, newContent)

  return true
}

function main() {
  const files = fs.readdirSync(websitesDir).filter(file => file.endsWith('.mdx'))

  let updatedCount = 0

  for (const file of files) {
    const filePath = path.join(websitesDir, file)
    const wasUpdated = updateMdxFile(filePath)
    if (wasUpdated) {
      updatedCount++
      console.log(`Updated: ${file}`)
    }
  }

  console.log(`\nUpdated ${updatedCount} files with contentType and priority fields.`)
}

main()
