import {
  allGuides as collectionGuides,
  allLegals as collectionLegals,
  allResources as collectionResources,
  allWebsites as collectionWebsites,
  type Guide,
  type Legal,
  type Resource,
  type Website
} from 'content-collections'

/**
 * Interface for the _meta property found in content-collections items
 */
interface ContentMeta {
  filePath: string
  fileName: string
  directory: string
  path: string
  extension: string
  content?: string // Content is optional as it might not be available
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
  contentType?: 'tool' | 'platform' | 'personal' | 'library'
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

/**
 * Get all websites
 *
 * @returns Array of website metadata
 */
export function getWebsites() {
  if (!collectionWebsites || collectionWebsites.length === 0) {
    return []
  }

  // Ensure each website has a valid slug
  const websitesWithSlugs = collectionWebsites.map((website: Website) => {
    // If website already has a valid slug, use it
    if (website.slug && typeof website.slug === 'string') {
      return website
    }

    // Otherwise, derive slug from _meta.path or _meta.fileName
    let slug = ''
    if (website._meta?.path) {
      slug = website._meta.path
    } else if (website._meta?.fileName) {
      slug = website._meta.fileName.replace(/\.mdx$/, '')
    }

    // If we still don't have a valid slug, create one from the name
    if (!slug && website.name) {
      slug = website.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    }

    return {
      ...website,
      slug
    }
  })

  return websitesWithSlugs.sort((a: WebsiteMetadata, b: WebsiteMetadata) => {
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
  const website = websites.find((site: WebsiteMetadata) => site.slug === slug)

  if (!website) {
    return null
  }

  // Find current index for previous/next navigation
  const currentIndex = websites.findIndex((site: WebsiteMetadata) => site.slug === slug)

  // Get previous and next websites
  const previousWebsite = currentIndex > 0 ? websites[currentIndex - 1] : null
  const nextWebsite = currentIndex < websites.length - 1 ? websites[currentIndex + 1] : null

  // Get related websites (same category, excluding current)
  const relatedWebsites = websites
    .filter((site: WebsiteMetadata) => site.category === website.category && site.slug !== slug)
    .slice(0, 4)

  // Get content from _meta if available
  const content = website.content || (website._meta as any)?.content || ''

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
    .sort((a: GuideMetadata, b: GuideMetadata) => {
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
  const content = guide.content || (guide._meta as any)?.content || ''

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
  const legal = collectionLegals.find((l: Legal) => l._meta.path === key)

  if (!legal) {
    throw new Error(`Legal content "${key}" not found`)
  }

  return legal.content || (legal._meta as any)?.content || ''
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
  const content = resource.content || (resource._meta as any)?.content || ''

  return {
    ...resource,
    content
  }
}
