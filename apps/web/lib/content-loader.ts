import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveFromRoot } from './utils'

// This module runs at build time only!
// It loads all content files and prepares them for use in the application

// Define the base directories using safer path resolution
const contentBase = resolveFromRoot('content')
const dataDir = resolveFromRoot('data')

// Structure to store the loaded content
interface ContentStore {
  websites: any[]
  guides: any[]
  legal: Record<string, string>
}

// Define guide metadata interface for TypeScript
interface GuideMetadata {
  slug: string
  content: string
  readingTime: number
  date?: string // Make date optional
  [key: string]: any // Allow for other properties
}

// Initialize the content store
const contentStore: ContentStore = {
  websites: [],
  guides: [],
  legal: {}
}

// Function to load all website MDX files
function loadWebsites() {
  try {
    // Try direct content directory first
    const websitesDir = path.join(contentBase, 'websites')
    if (!fs.existsSync(websitesDir)) {
      console.warn(`Websites directory not found at ${websitesDir}, falling back to JSON`)
      // Fall back to the JSON file if no directory
      // Try multiple possible locations for the websites.json file
      const possiblePaths = [
        path.join(dataDir, 'websites.json'),
        path.join(process.cwd(), 'data', 'websites.json'),
        path.join(process.cwd(), 'apps/web/data', 'websites.json'),
        path.join(process.cwd(), 'apps', 'web', 'data', 'websites.json')
      ]

      let jsonPath: string | null = null
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          jsonPath = p
          console.log(`Found websites.json at: ${p}`)
          break
        }
      }

      if (jsonPath && fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        contentStore.websites = jsonData.map((item: any) => ({
          slug: item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: item.name,
          description: item.description,
          website: item.domain,
          llmsUrl: item.llmsTxtUrl,
          llmsFullUrl: item.llmsFullTxtUrl,
          category: item.category,
          publishedAt: item.publishedAt,
          isUnofficial: false
        }))
        return
      }
      console.error('Neither websites directory nor JSON fallback found')
      return
    }

    // Process official websites
    const fileNames = fs.readdirSync(websitesDir)
    const websites = fileNames
      .filter(fileName => fileName.endsWith('.mdx'))
      .map(fileName => {
        const slug = fileName.replace(/\.mdx$/, '')
        const fullPath = path.join(websitesDir, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
          slug,
          name: data.name,
          description: data.description,
          website: data.website,
          llmsUrl: data.llmsUrl,
          llmsFullUrl: data.llmsFullUrl,
          category: data.category,
          publishedAt: data.publishedAt,
          isUnofficial: false,
          content
        }
      })

    // Process unofficial websites
    const unofficialDir = path.join(contentBase, 'unofficial')
    if (fs.existsSync(unofficialDir)) {
      const unofficialDirs = fs
        .readdirSync(unofficialDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(unofficialDir, dirent.name))

      for (const dir of unofficialDirs) {
        if (fs.existsSync(dir)) {
          const dirFiles = fs.readdirSync(dir)
          const dirWebsites = dirFiles
            .filter(fileName => fileName.endsWith('.mdx'))
            .map(fileName => {
              const slug = fileName.replace(/\.mdx$/, '')
              const fullPath = path.join(dir, fileName)
              const fileContents = fs.readFileSync(fullPath, 'utf8')
              const { data, content } = matter(fileContents)

              return {
                slug,
                name: data.name,
                description: data.description,
                website: data.website,
                llmsUrl: data.llmsUrl,
                llmsFullUrl: data.llmsFullUrl,
                category: data.category,
                publishedAt: data.publishedAt,
                isUnofficial: true,
                content
              }
            })
          websites.push(...dirWebsites)
        }
      }
    }

    contentStore.websites = websites
  } catch (error) {
    console.error('Error loading websites:', error)
    // Attempt to load from JSON as fallback
    try {
      // Try multiple possible locations for the websites.json file
      const possiblePaths = [
        path.join(dataDir, 'websites.json'),
        path.join(process.cwd(), 'data', 'websites.json'),
        path.join(process.cwd(), 'apps/web/data', 'websites.json'),
        path.join(process.cwd(), 'apps', 'web', 'data', 'websites.json')
      ]

      let jsonPath: string | null = null
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          jsonPath = p
          console.log(`Found websites.json at: ${p}`)
          break
        }
      }

      if (jsonPath && fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        contentStore.websites = jsonData.map((item: any) => ({
          slug: item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: item.name,
          description: item.description,
          website: item.domain,
          llmsUrl: item.llmsTxtUrl,
          llmsFullUrl: item.llmsFullTxtUrl,
          category: item.category,
          publishedAt: item.publishedAt,
          isUnofficial: false
        }))
      }
    } catch (e) {
      console.error('Error loading websites from JSON fallback:', e)
    }
  }
}

// Function to load all guide MDX files
function loadGuides() {
  try {
    const guidesDir = path.join(contentBase, 'guides')
    if (!fs.existsSync(guidesDir)) {
      console.warn(`Guides directory not found at ${guidesDir}`)
      return
    }

    const fileNames = fs.readdirSync(guidesDir)
    const guides = fileNames
      .filter(fileName => fileName.endsWith('.mdx'))
      .map(fileName => {
        const slug = fileName.replace(/\.mdx$/, '')
        const fullPath = path.join(guidesDir, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        // Calculate reading time (assuming average reading speed of 200 words per minute)
        const words = content.trim().split(/\s+/).length
        const readingTime = Math.ceil(words / 200)

        return {
          slug,
          ...data,
          readingTime,
          content
        } as GuideMetadata
      })
      .sort((a, b) => {
        // Make sure date exists before using it
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })

    contentStore.guides = guides
  } catch (error) {
    console.error('Error loading guides:', error)
  }
}

// Function to load legal content
function loadLegalContent() {
  try {
    const legalDir = path.join(contentBase, 'legal')
    if (!fs.existsSync(legalDir)) {
      console.warn(`Legal directory not found at ${legalDir}`)
      return
    }

    const legalFiles = ['privacy.mdx', 'terms.mdx']
    legalFiles.forEach(file => {
      const fullPath = path.join(legalDir, file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        const key = file.replace(/\.mdx$/, '')
        contentStore.legal[key] = content
      }
    })
  } catch (error) {
    console.error('Error loading legal content:', error)
  }
}

// Load all content at build time
console.log('Loading content at build time...')
console.log('Current working directory:', process.cwd())
console.log('Content base path:', contentBase)
console.log('Data directory path:', dataDir)
loadWebsites()
loadGuides()
loadLegalContent()

// Export functions to access the content
export async function getWebsites() {
  return contentStore.websites
}

export async function getWebsiteBySlug(slug: string) {
  const website = contentStore.websites.find(w => w.slug === slug)
  if (!website) return null

  // Get related websites with the same category
  const relatedWebsites = contentStore.websites
    .filter(w => w.category === website.category && w.slug !== slug)
    .slice(0, 4)

  // Get previous and next websites
  const currentIndex = contentStore.websites.findIndex(w => w.slug === slug)
  const previousWebsite = currentIndex > 0 ? contentStore.websites[currentIndex - 1] : null
  const nextWebsite =
    currentIndex < contentStore.websites.length - 1 ? contentStore.websites[currentIndex + 1] : null

  return {
    ...website,
    relatedWebsites,
    previousWebsite,
    nextWebsite
  }
}

export async function getGuides() {
  return contentStore.guides
}

export async function getGuideBySlug(slug: string) {
  return contentStore.guides.find(g => g.slug === slug) || null
}

export async function getLegalContent(key: string) {
  const content = contentStore.legal[key]
  if (!content) {
    console.warn(`Legal content for ${key} not found`)
    return `# ${key.charAt(0).toUpperCase() + key.slice(1)}\n\nContent unavailable.`
  }
  return content
}
