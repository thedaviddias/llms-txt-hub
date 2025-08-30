import { isSameDomain, normalizeDomain } from './submit-form-utils'

/**
 * Validates that URLs belong to the same domain
 */
export function validateDomains(
  websiteUrl: string,
  llmsUrl: string,
  llmsFullUrl: string | null,
  setError: (field: string, error: { type: string; message: string }) => void,
  clearErrors: (fields: string[]) => void
): boolean {
  // Clear existing custom errors first
  clearErrors(['llmsUrl', 'llmsFullUrl'])

  if (!websiteUrl) return true

  let isValid = true

  /**
   * Validates individual URL
   */
  const validateUrl = (url: string, type: 'llms' | 'llmsFull') => {
    const cleanedUrl = url.trim().replace(/[\r\n\t]/g, '')

    if (!cleanedUrl || !websiteUrl) return true

    if (!isSameDomain(cleanedUrl, websiteUrl)) {
      const expectedDomain = normalizeDomain(websiteUrl)
      const actualDomain = normalizeDomain(cleanedUrl)

      const errorMessage = `Domain mismatch: expected ${expectedDomain}, got ${actualDomain}`

      const fieldName = type === 'llms' ? 'llmsUrl' : 'llmsFullUrl'
      setError(fieldName, {
        type: 'manual',
        message: errorMessage
      })
      isValid = false
      return false
    }

    return true
  }

  // Validate both URLs
  validateUrl(llmsUrl, 'llms')
  if (llmsFullUrl) {
    validateUrl(llmsFullUrl, 'llmsFull')
  }

  return isValid
}
