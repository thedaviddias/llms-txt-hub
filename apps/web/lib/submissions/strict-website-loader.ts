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
  try {
    const websites = websiteCollectionSource.read()
    // Some production bundlers preserve the generated collection but lose the
    // module-level availability flag. A populated, validated read is still
    // trustworthy; only an empty read with a false flag is unavailable.
    if (!websiteCollectionSource.available && websites.length === 0) {
      return { status: 'unavailable' }
    }
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
