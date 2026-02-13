import { SITE_NAME } from './seo-config'

/**
 * Helper to generate optimized alt text for images
 */
export function generateAltText(
  type: 'favicon' | 'avatar' | 'logo' | 'website',
  name: string
): string {
  switch (type) {
    case 'favicon':
      return `${name} website favicon - Visit ${name}'s llms.txt documentation`
    case 'avatar':
      return `${name}'s profile picture - ${SITE_NAME} community member`
    case 'logo':
      return `${SITE_NAME} logo - The largest directory of AI-ready documentation`
    case 'website':
      return `${name} - AI-ready documentation and llms.txt implementation`
    default:
      return name
  }
}

/**
 * Helper to ensure consistent title formatting
 */
export function formatPageTitle(title: string, includeSiteName = true): string {
  const cleanTitle = title.trim()
  if (!includeSiteName || cleanTitle.includes(SITE_NAME)) {
    return cleanTitle
  }
  return `${cleanTitle} | ${SITE_NAME}`
}

/**
 * Helper to truncate and optimize meta descriptions
 */
export function optimizeMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) {
    return description
  }

  // Truncate at the last complete word before maxLength
  const truncated = description.substring(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.substring(0, lastSpace)}...`
}
