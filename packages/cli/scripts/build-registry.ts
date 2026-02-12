import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

interface RegistryEntry {
  slug: string
  name: string
  domain: string
  description: string
  llmsTxtUrl: string
  llmsFullTxtUrl?: string
  category: string
}

/**
 * Convert a name string into a URL-friendly slug.
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Build the CLI registry JSON from website MDX frontmatter.
 */
function buildRegistry(): void {
  // Resolve from packages/cli/ up to repo root
  const repoRoot = join(import.meta.dirname, '..', '..', '..')
  const websitesDir = join(repoRoot, 'packages', 'content', 'data', 'websites')
  const outputDir = join(import.meta.dirname, '..', 'data')
  const outputFile = join(outputDir, 'registry.json')

  mkdirSync(outputDir, { recursive: true })

  const mdxFiles = readdirSync(websitesDir).filter(file => file.endsWith('.mdx'))

  const entries: RegistryEntry[] = mdxFiles
    .map(file => {
      const filePath = join(websitesDir, file)
      const fileContent = readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)

      if (!data.name || !data.llmsUrl) return null

      const category = (data.category || 'other').replace(/'/g, '')

      return {
        slug: data.slug || toSlug(data.name),
        name: data.name,
        domain: data.website || '',
        description: data.description || '',
        llmsTxtUrl: data.llmsUrl,
        ...(data.llmsFullUrl ? { llmsFullTxtUrl: data.llmsFullUrl } : {}),
        category
      }
    })
    .filter((entry): entry is RegistryEntry => entry !== null)

  // Sort by name
  entries.sort((a, b) => a.name.localeCompare(b.name))

  writeFileSync(outputFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8')

  process.stdout.write(`Built registry with ${entries.length} entries -> ${outputFile}\n`)
}

buildRegistry()
