import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

interface RegistryEntry {
  slug: string
  webSlug: string
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
 * Derive a deterministic fallback slug from the MDX filename.
 */
function slugFromFilename(file: string): string {
  return file.replace(/\.mdx$/, '')
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

  const raw = mdxFiles
    .map(file => {
      const filePath = join(websitesDir, file)
      const fileContent = readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)

      if (!data.name || !data.llmsUrl) return null

      const category = (data.category || 'other').replace(/'/g, '')
      let slug = data.slug || toSlug(data.name)

      // Fallback to filename-derived slug when toSlug produces empty string
      if (!slug) {
        slug = slugFromFilename(file)
        process.stderr.write(`Warning: empty slug for "${data.name}", using filename: ${slug}\n`)
      }

      const webSlug = slugFromFilename(file)

      return {
        slug,
        webSlug,
        name: data.name,
        domain: data.website || '',
        description: data.description || '',
        llmsTxtUrl: data.llmsUrl,
        ...(data.llmsFullUrl ? { llmsFullTxtUrl: data.llmsFullUrl } : {}),
        category,
        _sourceFile: file
      }
    })
    .filter((entry): entry is RegistryEntry & { _sourceFile: string } => entry !== null)

  // Deduplicate: when multiple entries resolve to the same slug, keep the first
  // and re-slug duplicates using their filename
  const seen = new Map<string, number>()
  const entries: RegistryEntry[] = []

  for (const { _sourceFile, ...entry } of raw) {
    const prevIndex = seen.get(entry.slug)
    if (prevIndex === undefined) {
      seen.set(entry.slug, entries.length)
      entries.push(entry)
    } else {
      const fallback = slugFromFilename(_sourceFile)
      if (fallback !== entry.slug && !seen.has(fallback)) {
        process.stderr.write(
          `Warning: duplicate slug "${entry.slug}" for "${entry.name}", using "${fallback}"\n`
        )
        seen.set(fallback, entries.length)
        entries.push({ ...entry, slug: fallback })
      } else {
        process.stderr.write(
          `Warning: skipping duplicate slug "${entry.slug}" for "${entry.name}" (file: ${_sourceFile})\n`
        )
      }
    }
  }

  // Only include entries from primary categories in the CLI registry
  const PRIMARY_CATEGORIES = [
    'ai-ml',
    'developer-tools',
    'data-analytics',
    'automation-workflow',
    'infrastructure-cloud',
    'security-identity'
  ]
  const filtered = entries.filter(entry => PRIMARY_CATEGORIES.includes(entry.category))

  // Sort by name
  filtered.sort((a, b) => a.name.localeCompare(b.name))

  writeFileSync(outputFile, `${JSON.stringify(filtered, null, 2)}\n`, 'utf-8')

  process.stdout.write(
    `Built registry with ${filtered.length} entries (from ${entries.length} total) -> ${outputFile}\n`
  )

  // Auto-generate package-mappings.json from registry slugs
  const npmMap: Record<string, string> = {}
  for (const entry of filtered) {
    npmMap[entry.slug] = entry.slug
  }
  const mappingsFile = join(outputDir, 'package-mappings.json')
  writeFileSync(mappingsFile, `${JSON.stringify({ version: 1, npm: npmMap }, null, 2)}\n`, 'utf-8')
  process.stdout.write(
    `Built package-mappings with ${Object.keys(npmMap).length} entries -> ${mappingsFile}\n`
  )
}

buildRegistry()
