/**
 * Normalize stored URLs for comparison only, never for network access.
 * Legacy HTTP entries compare with HTTPS submissions; private/IP URLs remain
 * inert strings so unrelated legacy content cannot disable all submissions.
 */
export function normalizeCatalogueDuplicateUrls(website: string, llmsUrl: string) {
  try {
    const urls = [website, llmsUrl].map(value => {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('Invalid catalogue URL')
      }
      url.protocol = 'https:'
      url.hash = ''
      return url.href
    })
    return { website: urls[0]!, llmsUrl: urls[1]! }
  } catch {
    return null
  }
}
