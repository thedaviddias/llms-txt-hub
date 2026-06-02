/**
 * Default safe message shown when metadata fetching fails without a structured API error.
 */
export const FETCH_METADATA_FALLBACK_MESSAGE =
  'Failed to fetch website information. You can fill in the details manually.'

/**
 * Extracts a safe user-facing error message from the metadata API response.
 *
 * @param response - Failed metadata API response
 * @returns Server-provided error message when available, otherwise the fallback message
 */
export async function getMetadataErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      const message = body.error.trim()
      if (message) {
        return message
      }
    }
  } catch {
    // Fall back when the API does not return a JSON error payload.
  }

  return FETCH_METADATA_FALLBACK_MESSAGE
}
