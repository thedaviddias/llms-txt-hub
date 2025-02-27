export function getFaviconUrl(website: string) {
  try {
    if (!website || typeof website !== 'string') {
      console.warn('Invalid website URL provided to getFaviconUrl:', website)
      return '/placeholder.svg'
    }

    // Handle URLs that don't start with http:// or https://
    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`
    const domain = new URL(normalizedUrl).hostname
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
  } catch (error) {
    console.error(`Error getting favicon for ${website}:`, error)
    return '/placeholder.svg'
  }
}
