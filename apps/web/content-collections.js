import { defineCollection, defineConfig } from '@content-collections/core'

// Paths will resolve from the project root
const websitesPath = '../../packages/content/data/websites'
const guidesPath = '../../packages/content/data/guides'
const resourcesPath = '../../packages/content/data/resources'
const legalPath = '../../packages/content/data/legal'

const websites = defineCollection({
  name: 'Website',
  directory: websitesPath,
  include: '**/*.mdx',
  computedFields: {
    slug: {
      type: 'string',
      resolve: doc => doc._raw.sourceFileName.replace(/\.mdx$/, '')
    }
  },
  schema: z => ({
    name: z.string(),
    description: z.string(),
    website: z.string().url(),
    llmsUrl: z.string().url(),
    // Even more flexible validation for llmsFullUrl
    llmsFullUrl: z
      .union([
        z.string().url(),
        z.string().refine(val => val === '', {
          message: 'Empty string is allowed'
        }),
        z.null(),
        z.undefined()
      ])
      .optional(),
    category: z.string(),
    publishedAt: z.string(),
    isUnofficial: z.boolean().optional().default(false)
  })
})

const guides = defineCollection({
  name: 'Guide',
  directory: guidesPath,
  include: '**/*.mdx',
  computedFields: {
    slug: {
      type: 'string',
      resolve: doc => doc._raw.sourceFileName.replace(/\.mdx$/, '')
    }
  },
  schema: z => ({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    authors: z.array(
      z.object({
        name: z.string(),
        url: z.string().url().optional()
      })
    ),
    tags: z.array(z.string()).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    category: z
      .enum(['getting-started', 'implementation', 'best-practices', 'integration'])
      .default('getting-started'),
    published: z.boolean().default(true),
    publishedAt: z.string().optional(),
    readingTime: z.number().optional()
  })
})

const resources = defineCollection({
  name: 'Resource',
  directory: resourcesPath,
  include: '**/*.mdx',
  computedFields: {
    slug: {
      type: 'string',
      resolve: doc => doc._raw.sourceFileName.replace(/\.mdx$/, '')
    }
  },
  schema: z => ({
    title: z.string(),
    description: z.string(),
    url: z.string().url().optional(),
    category: z.string(),
    icon: z.string().optional(),
    featured: z.boolean().optional().default(false)
  })
})

const legal = defineCollection({
  name: 'Legal',
  directory: legalPath,
  include: '**/*.mdx',
  computedFields: {
    slug: {
      type: 'string',
      resolve: doc => doc._raw.sourceFileName.replace(/\.mdx$/, '')
    }
  },
  schema: z => ({
    title: z.string().optional(),
    lastUpdated: z.string().optional(),
    summary: z.string().optional()
  })
})

export default defineConfig({
  collections: [websites, guides, resources, legal]
})
