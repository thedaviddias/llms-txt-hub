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
  const files = fs.readdirSync(websitesDirectory)

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

  // Write the search index to the public directory
  const searchIndexPath = path.join(process.cwd(), 'public', 'search-index.json')
  fs.writeFileSync(searchIndexPath, JSON.stringify(entries))
}

generateSearchIndex().catch(console.error)
