import fs from 'node:fs'
import path from 'node:path'
import { getContentFilePath, getContentPath } from '@thedaviddias/utils/content-paths'
import matter from 'gray-matter'

interface SearchEntry {
  title: string
  description: string
  url: string
  content: string
  category?: string
}

async function generateSearchIndex() {
  const websitesDirectory = getContentPath('websites')
  const allFiles = fs.readdirSync(websitesDirectory)

  // Only process .mdx files
  const files = allFiles.filter(file => file.endsWith('.mdx'))

  const entries: SearchEntry[] = []

  for (const file of files) {
    const filePath = getContentFilePath('websites', file)
    const content = fs.readFileSync(filePath, 'utf8')
    const { data, content: mdxContent } = matter(content)

    entries.push({
      title: data.name,
      description: data.description,
      url: `/${file.replace(/\.mdx$/, '')}`,
      content: mdxContent,
      category: data.category
    })
  }

  // Write the search index to the apps/web/public directory instead of the root public directory
  const searchIndexPath = path.join(
    process.cwd(),
    'apps',
    'web',
    'public',
    'search',
    'search-index.json'
  )

  // Ensure the directory exists
  const searchIndexDir = path.dirname(searchIndexPath)
  if (!fs.existsSync(searchIndexDir)) {
    fs.mkdirSync(searchIndexDir, { recursive: true })
  }

  fs.writeFileSync(searchIndexPath, JSON.stringify(entries))
  console.log(`Search index generated at ${searchIndexPath}`)
}

generateSearchIndex().catch(console.error)
