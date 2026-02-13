/**
 * Google s2 favicons API supported sizes (px). Use highest for best quality on retina.
 */
const GOOGLE_FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const
const MAX_FAVICON_SIZE = 256

/**
 * Gets the favicon URL for a given website using Google's s2 favicons API.
 * @param website - The website URL to get the favicon for
 * @param size - Preferred size in pixels. Clamped to nearest API size; use 256 for highest resolution.
 * @returns The favicon URL or placeholder if invalid input
 */
export function getFaviconUrl(website: string, size: number = MAX_FAVICON_SIZE): string {
  try {
    if (!website || typeof website !== 'string') {
      console.warn('Invalid website URL provided to getFaviconUrl:', website)
      return '/placeholder.svg'
    }

    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`
    const domain = new URL(normalizedUrl).hostname

    const sz =
      size >= MAX_FAVICON_SIZE
        ? MAX_FAVICON_SIZE
        : GOOGLE_FAVICON_SIZES.reduce(
            (prev, curr) => (Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev),
            GOOGLE_FAVICON_SIZES[0]
          )

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`
  } catch (error) {
    console.error(`Error getting favicon for ${website}:`, error)
    return '/placeholder.svg'
  }
}
