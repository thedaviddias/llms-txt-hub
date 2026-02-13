// Import content-collections with fallback for CI
let allGuides: any[] = []
let allLegals: any[] = []
let allResources: any[] = []
let allWebsites: any[] = []
let allDocs: any[] = []

try {
  const collections = require('@/.content-collections/generated')
  allGuides = collections.allGuides || []
  allLegals = collections.allLegals || []
  allResources = collections.allResources || []
  allWebsites = collections.allWebsites || []
  allDocs = collections.allDocs || []
} catch {
  // Fallback for CI/build environments where content-collections hasn't been generated yet
  // Only warn if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Content collections not available, using empty arrays')
  }
}

const collectionGuides = allGuides
const collectionLegals = allLegals
const collectionResources = allResources
const collectionWebsites = allWebsites
const collectionDocs = allDocs

// Define types compatible with content-collections schema
interface Website {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string | null
  category: string
  publishedAt: string
  isUnofficial?: boolean
  priority?: 'high' | 'medium' | 'low'
  featured?: boolean
  content?: string
  relatedWebsites?: WebsiteMetadata[]
  previousWebsite?: WebsiteMetadata | null
  nextWebsite?: WebsiteMetadata | null
  _meta?: ContentMeta
}

interface Guide {
  slug: string
  title: string
  description: string
  date: string
  image?: string
  authors: Array<{ name: string; url?: string }>
  tags?: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'getting-started' | 'implementation' | 'best-practices' | 'integration'
  published: boolean
  publishedAt?: string
  readingTime?: number
  content?: string
  _meta?: ContentMeta
}

interface Resource {
  slug?: string
  title: string
  description: string
  url?: string
  category: string
  icon?: string
  featured?: boolean
  content?: string
  _meta?: ContentMeta
}

interface Doc {
  slug: string
  title: string
  description: string
  order: number
  published: boolean
  content?: string
  _meta?: ContentMeta
}

interface Legal {
  slug?: string
  title?: string
  lastUpdated?: string
  summary?: string
  content?: string
  _meta?: ContentMeta
}

/**
 * Interface for the _meta property found in content-collections items
 */
interface ContentMeta {
  filePath: string
  fileName: string
  directory: string
  path: string
  extension: string
  content?: string
}

/**
 * Types for content metadata
 */
export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string | null
  category: string
  publishedAt: string
  isUnofficial?: boolean
  featured?: boolean
  priority?: 'high' | 'medium' | 'low'
  content?: string
  relatedWebsites?: WebsiteMetadata[]
  previousWebsite?: WebsiteMetadata | null
  nextWebsite?: WebsiteMetadata | null
  _meta?: ContentMeta
}

export interface GuideMetadata {
  slug: string
  title: string
  description: string
  date: string
  image?: string
  authors: Array<{ name: string; url?: string }>
  tags?: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'getting-started' | 'implementation' | 'best-practices' | 'integration'
  published: boolean
  publishedAt?: string
  readingTime?: number
  content?: string
  _meta?: ContentMeta
}

export interface DocMetadata {
  slug: string
  title: string
  description: string
  order: number
  published: boolean
  content?: string
}

/**
 * Get all websites
 *
 * @returns Array of website metadata
 */
export function getWebsites(): WebsiteMetadata[] {
  if (!collectionWebsites || collectionWebsites.length === 0) {
    return []
  }

  // Ensure each website has a valid slug
  const websitesWithSlugs = collectionWebsites.map((website: Website) => {
    // If website already has a valid slug, use it
    if (website.slug && typeof website.slug === 'string') {
      return website
    }

    // Derive slug from _meta.path, _meta.fileName, or name (in priority order)
    const slug =
      website._meta?.path ||
      website._meta?.fileName?.replace(/\.mdx$/, '') ||
      website.name
        ?.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-') ||
      ''

    return { ...website, slug }
  })

  return websitesWithSlugs.sort((a: Website, b: Website) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })
}

/**
 * Get a website by slug
 *
 * @param slug - The website slug
 * @returns Website with content and navigation, or null if not found
 */
export async function getWebsiteBySlug(slug: string) {
  if (!collectionWebsites || collectionWebsites.length === 0) {
    return null
  }

  const websites = getWebsites() // Use the enhanced function that ensures slugs

  // Find the website with the matching slug
  const website = websites.find((site: Website) => site.slug === slug)

  if (!website) {
    return null
  }

  // Find current index for previous/next navigation
  const currentIndex = websites.findIndex((site: Website) => site.slug === slug)

  // Get previous and next websites
  const previousWebsite = websites[currentIndex - 1] || null
  const nextWebsite = websites[currentIndex + 1] || null

  // Get related websites (same category, excluding current)
  const relatedWebsites = websites
    .filter((site: Website) => site.category === website.category && site.slug !== slug)
    .slice(0, 4)

  // Get content from _meta if available
  const content = website.content || website._meta?.content || ''

  return {
    ...website,
    content,
    relatedWebsites,
    previousWebsite,
    nextWebsite
  }
}

/**
 * Get all guides
 *
 * @returns Array of guide metadata
 */
export function getGuides() {
  if (!collectionGuides || collectionGuides.length === 0) {
    return []
  }

  // Map to match the Guide type expected by components
  return collectionGuides
    .filter((guide: Guide) => guide.published)
    .map((guide: Guide) => ({
      title: guide.title || '',
      description: guide.description || '',
      slug: guide.slug || '',
      image: guide.image || undefined,
      difficulty: (guide.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
      category: (guide.category || 'getting-started') as
        | 'getting-started'
        | 'implementation'
        | 'best-practices'
        | 'integration',
      published: guide.published !== false,
      publishedAt: guide.publishedAt || guide.date || new Date().toISOString(),
      date: guide.date || new Date().toISOString(),
      authors: guide.authors || []
    }))
    .sort((a: Guide, b: Guide) => {
      return (
        new Date(b.publishedAt || b.date).getTime() - new Date(a.publishedAt || a.date).getTime()
      )
    })
}

/**
 * Get a guide by slug
 *
 * @param slug - The guide slug
 * @returns Guide with content, or null if not found
 */
export async function getGuideBySlug(slug: string): Promise<GuideMetadata | null> {
  const guide = collectionGuides.find((guide: Guide) => guide.slug === slug && guide.published)

  if (!guide) {
    return null
  }

  // Get content from guide
  const content = guide.content || guide._meta?.content || ''

  // Ensure the guide has all required properties from GuideMetadata
  return {
    slug: guide.slug || slug,
    title: guide.title || 'Untitled Guide',
    description: guide.description || '',
    date: guide.date || new Date().toISOString(),
    authors: guide.authors || [],
    tags: guide.tags || [],
    difficulty: guide.difficulty || 'beginner',
    category: guide.category || 'getting-started',
    published: guide.published !== false,
    publishedAt: guide.publishedAt || guide.date || new Date().toISOString(),
    readingTime: guide.readingTime || 0,
    content
  }
}

/**
 * Get legal content by key (e.g., 'privacy', 'terms')
 *
 * @param key - The legal content key
 * @returns Legal content string
 */
export async function getLegalContent(key: string): Promise<string> {
  const legal = collectionLegals.find((l: Legal) => l._meta?.path === key)

  if (!legal) {
    throw new Error(`Legal content "${key}" not found`)
  }

  return legal.content || legal._meta?.content || ''
}

/**
 * Get all resources
 *
 * @returns Array of resources
 */
export function getResources() {
  return collectionResources
}

/**
 * Get a resource by slug
 *
 * @param slug - The resource slug
 * @returns Resource with content, or null if not found
 */
export async function getResourceBySlug(slug: string) {
  const resource = collectionResources.find((resource: Resource) => resource.slug === slug)

  if (!resource) {
    return null
  }

  // Get content from resource
  const content = resource.content || resource._meta?.content || ''

  return {
    ...resource,
    content
  }
}

/**
 * Get all docs
 *
 * @returns Array of doc metadata sorted by order
 */
export function getDocs(): DocMetadata[] {
  if (!collectionDocs || collectionDocs.length === 0) {
    return []
  }

  return collectionDocs
    .filter((doc: Doc) => doc.published)
    .map((doc: Doc) => ({
      slug: doc.slug || '',
      title: doc.title || '',
      description: doc.description || '',
      order: doc.order ?? 0,
      published: doc.published !== false
    }))
    .sort((a: DocMetadata, b: DocMetadata) => a.order - b.order)
}

/**
 * Get a doc by slug
 *
 * @param slug - The doc slug
 * @returns Doc with content, or null if not found
 */
export async function getDocBySlug(slug: string): Promise<DocMetadata | null> {
  const doc = collectionDocs.find((doc: Doc) => doc.slug === slug && doc.published)

  if (!doc) {
    return null
  }

  const content = doc.content || doc._meta?.content || ''

  return {
    slug: doc.slug || slug,
    title: doc.title || 'Untitled',
    description: doc.description || '',
    order: doc.order ?? 0,
    published: doc.published !== false,
    content
  }
}
