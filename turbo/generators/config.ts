import type { PlopTypes } from '@turbo/gen'

/**
 * Input type for the website MDX generator
 */
interface WebsiteMdxInput {
  /** Name of the website/tool */
  name: string
  /** Brief description of the website/tool */
  description: string
  /** Website URL */
  website: string
  /** URL to the llms.txt file */
  llmsUrl: string
  /** URL to the full llms.txt file */
  llmsFullUrl: string
  /** Category of the website/tool */
  category: WebsiteCategory
}

/**
 * Available categories for websites
 */
const CATEGORIES = [
  'integration-automation',
  'developer-tools',
  'ai-ml',
  'data-analytics',
  'security-identity',
  'infrastructure-cloud'
] as const

type WebsiteCategory = (typeof CATEGORIES)[number]

/**
 * Generator for creating new website MDX files
 *
 * @param plop - Plop API instance
 * @returns void
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Add helper for current date in YYYY-MM-DD format
  plop.setHelper('currentDate', () => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  plop.setGenerator('website', {
    description: 'Generate a new website entry',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the website/tool?',
        validate: (value: string) => {
          if (!value) return 'Name is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Provide a brief description:',
        validate: (value: string) => {
          if (!value) return 'Description is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'website',
        message: 'Enter the website URL:',
        validate: (value: string) => {
          if (!value) return 'Website URL is required'
          if (!value.startsWith('https://')) return 'Website URL must start with https://'
          return true
        }
      },
      {
        type: 'input',
        name: 'llmsUrl',
        message: 'Enter the URL to the llms.txt file:',
        validate: (value: string) => {
          if (!value) return 'llms.txt URL is required'
          if (!value.startsWith('https://')) return 'URL must start with https://'
          return true
        }
      },
      {
        type: 'input',
        name: 'llmsFullUrl',
        message: 'Enter the URL to the full llms.txt file:'
      },
      {
        type: 'list',
        name: 'category',
        message: 'Select the category:',
        choices: CATEGORIES,
        default: 'integration-automation'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'content/websites/{{dashCase name}}.mdx',
        templateFile: 'templates/mdx.hbs'
      }
    ]
  })
}
