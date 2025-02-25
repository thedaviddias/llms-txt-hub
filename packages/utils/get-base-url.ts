/**
 * Returns the base URL for the application based on the current environment.
 * Automatically detects Vercel deployment URLs and falls back to development URL.
 *
 * @returns The base URL for the application
 *
 * @example
 * ```ts
 * const baseUrl = getBaseUrl()
 * // Returns 'https://your-domain.vercel.app' in production
 * // Returns 'http://localhost:3000' in development
 * ```
 */
export function getBaseUrl(): string {
  // Custom domain URL
  if (process.env.NEXT_PUBLIC_WEB_URL) {
    return process.env.NEXT_PUBLIC_WEB_URL
  }

  // Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Development URL
  return 'http://localhost:3000'
}
