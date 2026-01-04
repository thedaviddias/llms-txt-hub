/**
 * Gets the favicon URL for a given website using Google's favicon service
 * @param website - The website URL to get the favicon for
 * @param size - The size of the favicon (default: 32, max: 256)
 * @returns The favicon URL or placeholder if not found
 */
export function getFaviconUrl(website: string, size: number = 32) {
  try {
    if (!website || typeof website !== 'string') {
      console.warn('Invalid website URL provided to getFaviconUrl:', website)
      return '/placeholder.svg'
    }

    // Handle URLs that don't start with http:// or https://
    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`

    // Use the newer Google favicon API endpoint that works better
    // Size can be 16, 32, 64, 128, or 256
    const validSize = Math.min(Math.max(size, 16), 256)
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(normalizedUrl)}&size=${validSize}`
  } catch (error) {
    console.error(`Error getting favicon for ${website}:`, error)
    return '/placeholder.svg'
  }
}
