import { type WebsiteMetadata, websiteCollectionSource } from '@/lib/content-loader'

/** Availability-aware website collection result for security-sensitive callers. */
export type StrictWebsitesResult =
  | { readonly status: 'available'; readonly websites: readonly WebsiteMetadata[] }
  | { readonly status: 'unavailable' }

/**
 * Load generated websites without confusing an unavailable catalogue with a legitimate empty one.
 *
 * @returns Validated websites or an unavailable result
 */
export function getWebsitesStrict(): StrictWebsitesResult {
  if (!websiteCollectionSource.available) return { status: 'unavailable' }

  try {
    const websites = websiteCollectionSource.read()
    const valid = websites.every(
      website =>
        typeof website.website === 'string' &&
        website.website.length > 0 &&
        typeof website.llmsUrl === 'string' &&
        website.llmsUrl.length > 0 &&
        (website.llmsFullUrl === undefined ||
          website.llmsFullUrl === null ||
          typeof website.llmsFullUrl === 'string')
    )
    return valid ? { status: 'available', websites } : { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}
