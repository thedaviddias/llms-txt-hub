/**
 * Gets the favicon URL for a given website using icon.horse service
 * icon.horse returns generated letter icons for missing favicons (no 404s)
 * @param website - The website URL to get the favicon for
 * @param _size - The size parameter (unused - icon.horse auto-sizes)
 * @returns The favicon URL or placeholder if invalid input
 */
export function getFaviconUrl(website: string, _size: number = 32) {
  try {
    if (!website || typeof website !== 'string') {
      console.warn('Invalid website URL provided to getFaviconUrl:', website)
      return '/placeholder.svg'
    }

    // Handle URLs that don't start with http:// or https://
    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`

    // Extract domain from URL
    const domain = new URL(normalizedUrl).hostname

    // Use icon.horse - returns generated letter icons for missing favicons
    // This service doesn't rate limit and never returns 404s
    return `https://icon.horse/icon/${domain}`
  } catch (error) {
    console.error(`Error getting favicon for ${website}:`, error)
    return '/placeholder.svg'
  }
}
