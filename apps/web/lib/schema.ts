import type { WebsiteMetadata } from './mdx'

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
    applicationCategory: website.category || 'Application'
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
