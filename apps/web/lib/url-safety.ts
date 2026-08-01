import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'

const URL_ERROR = {
  FORMAT: 'Invalid URL format',
  PROTOCOL: 'Invalid URL protocol',
  RESTRICTED_HOST: 'URL points to a restricted network address'
} as const

/** Existing web-facing shape for safe URL validation results. */
export type PublicUrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: (typeof URL_ERROR)[keyof typeof URL_ERROR] }

/**
 * Validates a submitted external URL using the shared fail-closed URL policy.
 *
 * This compatibility adapter preserves the web app's stable, user-safe error
 * strings while enforcing HTTPS-only normalized submission URLs.
 */
export function validatePublicHttpUrl(value: string): PublicUrlValidationResult {
  const result = validateSubmissionUrl(value)
  if (result.ok) {
    return { ok: true, url: result.url }
  }

  if (result.error.code === 'invalid_url') {
    return { error: URL_ERROR.FORMAT, ok: false }
  }
  if (result.error.code === 'https_required') {
    return { error: URL_ERROR.PROTOCOL, ok: false }
  }
  return { error: URL_ERROR.RESTRICTED_HOST, ok: false }
}

/** Stable web-facing URL validation errors retained for compatibility. */
export const URL_VALIDATION_ERRORS = URL_ERROR
