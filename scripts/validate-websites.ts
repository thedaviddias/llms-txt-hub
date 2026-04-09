import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

interface WebsiteEntry {
  file: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl: string
  category: string
}

const websitesDirectory = path.join(process.cwd(), 'packages/content/data/websites')
const allowedCategories = new Set([
  'developer-tools',
  'ai-ml',
  'data-analytics',
  'infrastructure-cloud',
  'security-identity',
  'automation-workflow',
  'finance-fintech',
  'marketing-sales',
  'ecommerce-retail',
  'content-media',
  'business-operations',
  'personal',
  'agency-services',
  'international',
  'other'
])
const fileNamePattern = /-llms-txt\.mdx$/
const llmsUrlPattern = /\/llms\.txt(?:$|\?)/i
const llmsFullUrlPattern = /\/llms-full\.txt(?:$|\?)/i
const descriptionWarningPatterns = [
  /<meta|<head|<!DOCTYPE/i,
  /information and resources/i,
  /platform and services/i,
  /visibility:\s*hidden/i,
  /window\.dataLayer/i,
  /moved permanently/i,
  /permanent redirect/i,
  /charset=/i
]
const shapeOverrides = new Map<
  string,
  {
    llmsUrl?: RegExp
    llmsFullUrl?: RegExp
  }
>([
  [
    'agoragentic-llms-txt.mdx',
    {
      llmsFullUrl: /\/llms-ctx\.txt(?:$|\?)/i
    }
  ],
  [
    'convex-llms-txt.mdx',
    {
      llmsFullUrl: /\/llms\.txt(?:$|\?)/i
    }
  ],
  [
    'matt-rickard-llms-txt.mdx',
    {
      llmsUrl: /\/llms-full\.md(?:$|\?)/i,
      llmsFullUrl: /\/llms-full\.md(?:$|\?)/i
    }
  ]
])

/**
 * Reads website entries from disk and normalizes their frontmatter values.
 */
function getEntries(): WebsiteEntry[] {
  const files = fs.readdirSync(websitesDirectory).filter(file => file.endsWith('.mdx'))

  return files.map(file => {
    const filePath = path.join(websitesDirectory, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(content)

    return {
      file,
      name: String(data.name || ''),
      description: String(data.description || ''),
      website: String(data.website || ''),
      llmsUrl: String(data.llmsUrl || ''),
      llmsFullUrl: String(data.llmsFullUrl || ''),
      category: String(data.category || '')
    }
  })
}

/**
 * Returns an optional per-file override for accepted llms resource URL shapes.
 */
function getOverridePattern(file: string, key: 'llmsUrl' | 'llmsFullUrl'): RegExp | null {
  return shapeOverrides.get(file)?.[key] ?? null
}

/**
 * Checks whether a URL matches the default pattern or a legacy override.
 */
function matchesAllowedPattern(
  value: string,
  fallbackPattern: RegExp,
  overridePattern: RegExp | null
) {
  return fallbackPattern.test(value) || (overridePattern ? overridePattern.test(value) : false)
}

/**
 * Formats a titled multiline list for terminal output.
 */
function formatLines(title: string, entries: string[]) {
  if (entries.length === 0) {
    return ''
  }

  return [`${title}:`, ...entries.map(entry => `  - ${entry}`), ''].join('\n')
}

/**
 * Validates website entries and returns blocking errors plus optional warnings.
 */
function validateEntries(entries: WebsiteEntry[], warnDescriptions: boolean) {
  const errors: string[] = []
  const warnings: string[] = []
  const llmsUrlToFiles = new Map<string, string[]>()

  for (const entry of entries) {
    if (!fileNamePattern.test(entry.file)) {
      errors.push(`${entry.file}: filename must end with -llms-txt.mdx`)
    }

    if (!allowedCategories.has(entry.category)) {
      errors.push(`${entry.file}: invalid category "${entry.category}"`)
    }

    if (entry.website.includes('llms.txt') || entry.website.includes('llms-full.txt')) {
      errors.push(`${entry.file}: website must point to the product/site URL, not an llms file`)
    }

    try {
      const websiteUrl = new URL(entry.website)
      if (websiteUrl.search || websiteUrl.hash) {
        errors.push(`${entry.file}: website must not include query strings or fragments`)
      }
    } catch {
      errors.push(`${entry.file}: website is not a valid URL`)
    }

    try {
      new URL(entry.llmsUrl)
    } catch {
      errors.push(`${entry.file}: llmsUrl is not a valid URL`)
    }

    const llmsOverride = getOverridePattern(entry.file, 'llmsUrl')
    if (!matchesAllowedPattern(entry.llmsUrl, llmsUrlPattern, llmsOverride)) {
      errors.push(`${entry.file}: llmsUrl must point to an llms.txt resource`)
    }

    if (entry.llmsFullUrl) {
      try {
        new URL(entry.llmsFullUrl)
      } catch {
        errors.push(`${entry.file}: llmsFullUrl is not a valid URL`)
      }

      const fullOverride = getOverridePattern(entry.file, 'llmsFullUrl')
      if (!matchesAllowedPattern(entry.llmsFullUrl, llmsFullUrlPattern, fullOverride)) {
        errors.push(`${entry.file}: llmsFullUrl must point to an llms-full.txt resource`)
      }
    }

    if (warnDescriptions) {
      const hasSuspiciousDescription = descriptionWarningPatterns.some(pattern =>
        pattern.test(entry.description)
      )

      if (hasSuspiciousDescription) {
        warnings.push(`${entry.file}: description looks scraped, placeholder, or broken`)
      }
    }

    const files = llmsUrlToFiles.get(entry.llmsUrl) ?? []
    files.push(entry.file)
    llmsUrlToFiles.set(entry.llmsUrl, files)
  }

  for (const [llmsUrl, files] of llmsUrlToFiles.entries()) {
    if (files.length > 1) {
      errors.push(`duplicate llmsUrl ${llmsUrl}: ${files.join(', ')}`)
    }
  }

  return { errors, warnings }
}

/**
 * Runs the website content validator CLI.
 */
function main() {
  const warnDescriptions = process.argv.includes('--warn-descriptions')
  const entries = getEntries()
  const { errors, warnings } = validateEntries(entries, warnDescriptions)

  process.stdout.write(`Validated ${entries.length} website entries.\n`)

  if (warnings.length > 0) {
    process.stdout.write(formatLines('Warnings', warnings))
  }

  if (errors.length > 0) {
    process.stdout.write(formatLines('Errors', errors))
    process.exit(1)
  }

  process.stdout.write('All website entries passed validation.\n')
}

main()
