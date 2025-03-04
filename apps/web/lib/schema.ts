import type { WebsiteMetadata } from './mdx'
import type { GuideMetadata } from './mdx'

export interface SchemaOrg {
  '@context': 'https://schema.org'
  '@type': string
  [key: string]: any
}

export interface WebsiteSchema extends SchemaOrg {
  '@type': 'SoftwareApplication'
  name: string
  description: string
  url: string
  applicationCategory: string
  operatingSystem: string
}

export interface ArticleSchema extends SchemaOrg {
  '@type': 'TechArticle'
  headline: string
  description: string
  datePublished: string
  author: {
    '@type': 'Organization'
    name: string
  }
}

export interface CollectionPageSchema extends SchemaOrg {
  '@type': 'CollectionPage'
  name: string
  description: string
  hasPart: WebsiteSchema[]
}

export interface GuideSchema extends SchemaOrg {
  '@type': 'TechArticle'
  headline: string
  description: string
  datePublished: string
  author: {
    '@type': 'Person'
    name: string
    url?: string
  }
  articleSection: string
  timeRequired: string
  difficulty: string
}

export interface FAQPageSchema extends SchemaOrg {
  '@type': 'FAQPage'
  mainEntity: Array<{
    '@type': 'Question'
    name: string
    acceptedAnswer: {
      '@type': 'Answer'
      text: string
    }
  }>
}

/**
 * Generates schema.org structured data for a website
 *
 * @param website - Website metadata
 * @returns Schema.org SoftwareApplication structured data
 */
export function generateWebsiteSchema(website: WebsiteMetadata): WebsiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: website.name,
    description: website.description,
    url: website.website,
    applicationCategory: website.category || 'Application',
    operatingSystem: 'Web'
  }
}

/**
 * Generates schema.org structured data for an article about a website
 *
 * @param website - Website metadata
 * @returns Schema.org TechArticle structured data
 */
export function generateArticleSchema(website: WebsiteMetadata): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${website.name} - llms.txt Implementation`,
    description: website.description,
    datePublished: website.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'LLMs.txt Hub'
    }
  }
}

/**
 * Generates schema.org structured data for the websites collection page
 *
 * @param websites - Array of website metadata
 * @returns Schema.org CollectionPage structured data
 */
export function generateCollectionSchema(websites: WebsiteMetadata[]): CollectionPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'LLMs.txt Implementations',
    description: 'Directory of websites implementing llms.txt specification',
    hasPart: websites.map(site => generateWebsiteSchema(site))
  }
}

/**
 * Generates schema.org structured data for a guide
 *
 * @param guide - Guide metadata
 * @returns Schema.org TechArticle structured data
 */
export function generateGuideSchema(guide: GuideMetadata): GuideSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    author: {
      '@type': 'Person',
      name: guide.authors[0].name,
      ...(guide.authors[0].url && { url: guide.authors[0].url })
    },
    articleSection: guide.category,
    timeRequired: `PT${Math.ceil(guide.readingTime)}M`,
    difficulty: guide.difficulty
  }
}

/**
 * Generates schema.org structured data for FAQ page
 *
 * @param items - Array of FAQ items with questions and answers
 * @returns Schema.org FAQPage structured data
 */
export function generateFAQSchema(
  items: Array<{ question: string; answer: string }>
): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
}
