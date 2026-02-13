import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import type { GuideMetadata, WebsiteMetadata } from './content-loader'
import { getRoute } from './routes'

export interface SchemaOrg {
  '@context': 'https://schema.org'
  '@type': string
  [key: string]: any
}

export interface WebsiteSchema extends SchemaOrg {
  '@type': 'Service'
  name: string
  description: string
  url: string
  provider: {
    '@type': 'Organization'
    name: string
    url: string
  }
  category: string
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
 * @returns Schema.org Service structured data
 */
export function generateWebsiteSchema(website: WebsiteMetadata): WebsiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: website.name,
    description: website.description,
    url: website.website,
    provider: {
      '@type': 'Organization',
      name: website.name,
      url: website.website
    },
    category: website.category || 'DeveloperAPI'
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
 * Generates comprehensive schema.org structured data for a website detail page
 * This creates a rich @graph with multiple schema types for better SEO
 *
 * @param website - Website metadata
 * @param baseUrl - Base URL of the site
 * @returns Schema.org structured data graph
 */
export function generateWebsiteDetailSchema(website: WebsiteMetadata, baseUrl: string) {
  const pageUrl = `${baseUrl}/websites/${website.slug}`
  const categoryFormatted = website.category
    ? website.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Developer Tools'

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // Main WebPage
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${website.name} - llms.txt Documentation`,
        description: website.description,
        isPartOf: {
          '@id': `${baseUrl}/#website`
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: getFaviconUrl(website.website, 256)
        },
        datePublished: website.publishedAt,
        dateModified: website.publishedAt,
        breadcrumb: {
          '@id': `${pageUrl}#breadcrumb`
        }
      },
      // BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Websites',
            item: `${baseUrl}${getRoute('website.list')}`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: website.name,
            item: pageUrl
          }
        ]
      },
      // SoftwareApplication - better for tools/platforms
      {
        '@type': 'SoftwareApplication',
        '@id': `${pageUrl}#software`,
        name: website.name,
        description: website.description,
        url: website.website,
        applicationCategory: categoryFormatted,
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock'
        },
        publisher: {
          '@type': 'Organization',
          name: website.name,
          url: website.website
        },
        ...(website.llmsUrl && {
          documentation: website.llmsUrl
        })
      },
      // TechArticle about the implementation
      {
        '@type': 'TechArticle',
        '@id': `${pageUrl}#article`,
        headline: `${website.name} llms.txt Implementation Guide`,
        description: `${website.description} Learn how ${website.name} implements the llms.txt standard for AI-ready documentation.`,
        datePublished: website.publishedAt,
        dateModified: website.publishedAt,
        author: {
          '@type': 'Organization',
          name: 'llms.txt Hub',
          url: baseUrl
        },
        publisher: {
          '@type': 'Organization',
          name: 'llms.txt Hub',
          url: baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`
          }
        },
        mainEntityOfPage: {
          '@id': `${pageUrl}#webpage`
        },
        about: {
          '@id': `${pageUrl}#software`
        },
        keywords: [
          'llms.txt',
          website.name,
          'AI documentation',
          'LLM integration',
          categoryFormatted
        ].join(', ')
      },
      // FAQ Schema for common questions
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `What is ${website.name}'s llms.txt file?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${website.name} provides an llms.txt file that contains AI-ready documentation. This file helps AI assistants and LLMs understand ${website.name}'s services and API documentation in a structured format.`
            }
          },
          {
            '@type': 'Question',
            name: `How do I access ${website.name}'s llms.txt?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `You can access ${website.name}'s llms.txt file directly at ${website.llmsUrl || `${website.website}/llms.txt`}. This file provides concise, AI-optimized documentation${website.llmsFullUrl ? ', and a more comprehensive version is available at llms-full.txt.' : '.'}`
            }
          },
          {
            '@type': 'Question',
            name: `What category does ${website.name} belong to?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${website.name} is categorized under "${categoryFormatted}" in the llms.txt Hub directory. ${website.description}`
            }
          }
        ]
      }
    ]
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
    datePublished: guide.publishedAt || guide.date,
    author: {
      '@type': 'Person',
      name: guide.authors[0].name,
      ...(guide.authors[0].url && { url: guide.authors[0].url })
    },
    articleSection: guide.category,
    timeRequired: `PT${Math.ceil(guide.readingTime || 5)}M`,
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

/**
 * Generates enhanced schema.org structured data for the homepage
 *
 * @param websites - Array of website metadata
 * @returns Schema.org structured data graph for homepage
 */
export function generateHomepageSchema(websites: WebsiteMetadata[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://llmstxthub.com/#website',
        url: 'https://llmstxthub.com',
        name: 'llms.txt Hub',
        description: 'The largest directory of AI-ready websites with llms.txt files',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://llmstxthub.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': 'https://llmstxthub.com/#organization',
        name: 'llms.txt Hub',
        url: 'https://llmstxthub.com',
        description: 'Curating and organizing AI-ready websites with llms.txt implementations',
        sameAs: ['https://github.com/thedaviddias/llms-txt-hub']
      },
      {
        '@type': 'ItemList',
        '@id': 'https://llmstxthub.com/#websitelist',
        name: 'AI-Ready Websites Directory',
        description: 'Curated list of websites implementing the llms.txt standard',
        numberOfItems: websites.length,
        itemListElement: websites.slice(0, 20).map((website, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: website.name,
            url: website.website,
            description: website.description,
            applicationCategory: website.category,
            operatingSystem: 'Web Browser',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD'
            }
          }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://llmstxthub.com'
          }
        ]
      }
    ]
  }
}
