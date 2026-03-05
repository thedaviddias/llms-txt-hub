let allExtensionUpdates: any[] = []

try {
  const collections = require('@/.content-collections/generated')
  allExtensionUpdates = collections.allExtensionUpdates || []
} catch {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Extension update content collection not available, using empty array')
  }
}

interface ContentMeta {
  path: string
  content?: string
}

interface ExtensionUpdate {
  slug?: string
  version: string
  title: string
  description: string
  date: string
  published: boolean
  highlights: string[]
  content?: string
  _meta?: ContentMeta
}

export interface ExtensionUpdateMetadata {
  slug: string
  version: string
  title: string
  description: string
  date: string
  published: boolean
  highlights: string[]
  content?: string
}

/**
 * Normalize extension versions so both `v2.0.0` and `2.0.0` match.
 *
 * @param version - Version string from query/frontmatter
 * @returns Normalized version without leading `v`
 */
function normalizeExtensionVersion(version: string): string {
  if (typeof version !== 'string') {
    return ''
  }

  const normalized = version.trim().toLowerCase()
  return normalized.startsWith('v') ? normalized.slice(1) : normalized
}

/**
 * Return all published extension updates sorted by release date descending.
 *
 * @returns List of normalized extension updates
 */
export function getExtensionUpdates(): ExtensionUpdateMetadata[] {
  return allExtensionUpdates
    .filter((update: ExtensionUpdate) => update.published)
    .map((update: ExtensionUpdate) => ({
      slug: update.slug || update._meta?.path || '',
      version: update.version || '',
      title: update.title || '',
      description: update.description || '',
      date: update.date || '',
      published: update.published !== false,
      highlights: Array.isArray(update.highlights) ? update.highlights.slice(0, 5) : [],
      content: update.content || update._meta?.content || ''
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Return the newest published extension update.
 *
 * @returns Latest update or null when none exist
 */
export function getLatestExtensionUpdate(): ExtensionUpdateMetadata | null {
  const updates = getExtensionUpdates()
  return updates.length > 0 ? updates[0] : null
}

/**
 * Resolve an extension update by version.
 *
 * @param version - Version identifier (`2.0.0` or `v2.0.0`)
 * @returns Matching update or null
 */
export function getExtensionUpdateByVersion(version: string): ExtensionUpdateMetadata | null {
  const normalizedTarget = normalizeExtensionVersion(version)
  if (!normalizedTarget) {
    return null
  }

  const updates = getExtensionUpdates()
  return (
    updates.find(update => normalizeExtensionVersion(update.version) === normalizedTarget) || null
  )
}
