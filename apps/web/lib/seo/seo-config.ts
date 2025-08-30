import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'

/**
 * Centralized SEO Configuration
 *
 * This module provides a single source of truth for all SEO-related configuration
 * across the application, ensuring consistency and maintainability.
 */

// Site-wide constants
export const SITE_NAME = 'llms.txt hub'
export const SITE_TAGLINE = 'Discover AI-Ready Documentation'
export const SITE_DESCRIPTION =
  'The largest directory of AI-ready websites and tools implementing the llms.txt standard. Find APIs, platforms, and documentation optimized for LLM integration.'
export const SITE_URL = getBaseUrl()
export const TWITTER_HANDLE = '@llmstxthub'
export const TWITTER_CREATOR = '@thedaviddias'

// SEO Defaults
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image.png`,
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} - ${SITE_TAGLINE}`
}

// Robots configuration
export const ROBOTS_CONFIG = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    noimageindex: false,
    'max-video-preview': -1,
    'max-image-preview': 'large' as const,
    'max-snippet': -1
  }
}

// Keywords by page type
export const KEYWORDS = {
  global: ['llms.txt', 'AI documentation', 'LLM integration', 'API documentation', 'AI-ready'],
  homepage: ['llms.txt hub', 'AI tools directory', 'LLM documentation', 'developer tools'],
  categories: {
    ai: ['AI tools', 'artificial intelligence', 'machine learning', 'neural networks'],
    'developer-tools': ['developer tools', 'programming', 'software development', 'coding tools'],
    education: ['education technology', 'e-learning', 'online courses', 'educational platforms'],
    productivity: ['productivity tools', 'workflow automation', 'task management', 'efficiency'],
    documentation: ['technical documentation', 'API docs', 'developer docs', 'knowledge base'],
    saas: ['SaaS platforms', 'cloud software', 'web applications', 'software as a service']
  }
}

/**
 * Generate base metadata with all required fields
 */
export function generateBaseMetadata(options: {
  title: string
  description: string
  path?: string
  keywords?: string[]
  image?: typeof DEFAULT_OG_IMAGE
  noindex?: boolean
}): Metadata {
  const {
    title,
    description,
    path = '',
    keywords = KEYWORDS.global,
    image = DEFAULT_OG_IMAGE,
    noindex = false
  } = options

  const url = `${SITE_URL}${path}`
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: 'David Dias', url: 'https://thedaviddias.com' }],
    creator: 'David Dias',
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [image],
      locale: 'en_US',
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_CREATOR,
      images: [image.url]
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false
          }
        }
      : ROBOTS_CONFIG,
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
      other: {
        'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || ''
      }
    }
  }
}

/**
 * Generate metadata for dynamic pages (websites, categories, etc.)
 */
export function generateDynamicMetadata(options: {
  type: 'website' | 'category' | 'member' | 'guide' | 'news'
  name: string
  description: string
  slug: string
  additionalKeywords?: string[]
  image?: typeof DEFAULT_OG_IMAGE
  publishedAt?: string
  updatedAt?: string
}): Metadata {
  const {
    type,
    name,
    description,
    slug,
    additionalKeywords = [],
    image,
    publishedAt,
    updatedAt
  } = options

  let path = ''
  let title = name

  switch (type) {
    case 'website':
      path = `/websites/${slug}`
      title = `${name} - llms.txt Documentation`
      break
    case 'category':
      path = `/${slug}`
      title = `${name} AI Tools & Platforms`
      break
    case 'member':
      path = `/u/${slug}`
      title = `${name} - Community Member`
      break
    case 'guide':
      path = `/guides/${slug}`
      title = `${name} - Developer Guide`
      break
    case 'news':
      path = `/news/${slug}`
      title = `${name} - News & Updates`
      break
  }

  const metadata = generateBaseMetadata({
    title,
    description,
    path,
    keywords: [...KEYWORDS.global, ...additionalKeywords],
    image
  })

  // Add article metadata for guides and news
  if ((type === 'guide' || type === 'news') && publishedAt) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: updatedAt || publishedAt,
      authors: ['David Dias']
    }
  }

  return metadata
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url?: string }>) {
  const breadcrumbs = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    ...(item.url ? { item: `${SITE_URL}${item.url}` } : {})
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs
  }
}

/**
 * Generate website schema for homepage
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`
      },
      sameAs: [
        'https://github.com/thedaviddias/llms-txt-hub',
        'https://www.reddit.com/r/llmstxt/',
        'https://x.com/llmstxthub'
      ]
    }
  }
}

/**
 * Generate CollectionPage schema for category pages
 */
export function generateCollectionSchema(options: {
  name: string
  description: string
  url: string
  itemCount: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: `${SITE_URL}${options.url}`,
    numberOfItems: options.itemCount,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL
    }
  }
}

/**
 * Generate FAQ schema
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

/**
 * Helper to generate optimized alt text for images
 */
export function generateAltText(
  type: 'favicon' | 'avatar' | 'logo' | 'website',
  name: string
): string {
  switch (type) {
    case 'favicon':
      return `${name} website favicon - Visit ${name}'s llms.txt documentation`
    case 'avatar':
      return `${name}'s profile picture - ${SITE_NAME} community member`
    case 'logo':
      return `${SITE_NAME} logo - The largest directory of AI-ready documentation`
    case 'website':
      return `${name} - AI-ready documentation and llms.txt implementation`
    default:
      return name
  }
}

/**
 * Helper to ensure consistent title formatting
 */
export function formatPageTitle(title: string, includeSiteName = true): string {
  const cleanTitle = title.trim()
  if (!includeSiteName || cleanTitle.includes(SITE_NAME)) {
    return cleanTitle
  }
  return `${cleanTitle} | ${SITE_NAME}`
}

/**
 * Helper to truncate and optimize meta descriptions
 */
export function optimizeMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) {
    return description
  }

  // Truncate at the last complete word before maxLength
  const truncated = description.substring(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.substring(0, lastSpace)}...`
}
