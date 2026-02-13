export interface RegistryEntry {
  slug: string
  webSlug: string
  name: string
  domain: string
  description: string
  llmsTxtUrl: string
  llmsFullTxtUrl?: string
  category: string
}

export interface LockfileEntry {
  slug: string
  format: 'llms.txt' | 'llms-full.txt'
  sourceUrl: string
  etag: string | null
  lastModified: string | null
  fetchedAt: string
  checksum: string
  size: number
  name: string
}

export interface Lockfile {
  version: 1
  updatedAt: string
  entries: Record<string, LockfileEntry>
}

export interface FetchResult {
  content: string
  etag: string | null
  lastModified: string | null
  notModified: boolean
}

export interface DetectedMatch {
  slug: string
  matchedPackages: string[]
  registryEntry: RegistryEntry
}

export const PRIMARY_CATEGORIES = [
  'ai-ml',
  'developer-tools',
  'data-analytics',
  'automation-workflow',
  'infrastructure-cloud',
  'security-identity'
] as const

export type PrimaryCategory = (typeof PRIMARY_CATEGORIES)[number]
