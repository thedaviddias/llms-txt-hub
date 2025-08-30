import { logger } from '@thedaviddias/logging'

interface RateLimitInfo {
  remaining: number
  reset: number
  limit: number
}

interface GitHubRequestOptions extends RequestInit {
  timeout?: number
}

/**
 * Secure GitHub API client with rate limiting and error handling
 */
export class GitHubAPIClient {
  private static instance: GitHubAPIClient
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map()
  private requestQueue: Map<string, Promise<any>> = new Map()
  private readonly DEFAULT_TIMEOUT = 10000 // 10 seconds
  private readonly MIN_RATE_LIMIT_REMAINING = 2

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GitHubAPIClient {
    if (!GitHubAPIClient.instance) {
      GitHubAPIClient.instance = new GitHubAPIClient()
    }
    return GitHubAPIClient.instance
  }

  /**
   * Clear rate limit cache (useful for debugging)
   */
  public clearRateLimitCache(): void {
    this.rateLimitInfo.clear()
    this.requestQueue.clear()
  }

  /**
   * Make a secure request to GitHub API with rate limiting
   */
  async makeSecureRequest<T>(
    url: string,
    options: GitHubRequestOptions = {}
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      // Check rate limit before making request
      const rateLimit = this.rateLimitInfo.get('global')

      // Only log rate limit issues, not every check

      if (rateLimit && rateLimit.remaining < this.MIN_RATE_LIMIT_REMAINING) {
        const resetTime = new Date(rateLimit.reset * 1000)
        const waitTime = resetTime.getTime() - Date.now()

        if (waitTime > 0) {
          logger.warn('GitHub API rate limit exceeded', {
            data: {
              remaining: rateLimit.remaining,
              limit: rateLimit.limit,
              resetTime: resetTime.toISOString()
            },
            tags: { type: 'github-api', security: 'rate-limit' }
          })

          return {
            data: null,
            error: `Rate limit exceeded. Resets at ${resetTime.toISOString()}`
          }
        }
      }

      // Deduplicate concurrent requests to the same endpoint
      const requestKey = `${options.method || 'GET'}:${url}`
      if (this.requestQueue.has(requestKey)) {
        return await this.requestQueue.get(requestKey)
      }

      // Create request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout || this.DEFAULT_TIMEOUT
      )

      const requestPromise = this.performRequest<T>(url, {
        ...options,
        signal: controller.signal
      })

      this.requestQueue.set(requestKey, requestPromise)

      try {
        const result = await requestPromise
        clearTimeout(timeoutId)
        return result
      } finally {
        this.requestQueue.delete(requestKey)
      }
    } catch (error) {
      // Sanitize error messages to prevent information leakage
      const sanitizedError = this.sanitizeError(error)

      logger.error('GitHub API request failed', {
        data: {
          url: this.sanitizeUrl(url),
          error: sanitizedError
        },
        tags: { type: 'github-api', security: 'error' }
      })

      return {
        data: null,
        error: sanitizedError
      }
    }
  }

  /**
   * Perform the actual API request
   */
  private async performRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<{ data: T | null; error: string | null }> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json'
    }

    // Add authentication if available
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    // Merge with any existing headers from options
    if (options.headers) {
      if (options.headers instanceof Headers) {
        const existingHeaders = Object.fromEntries(options.headers.entries())
        Object.assign(headers, existingHeaders)
      } else if (Array.isArray(options.headers)) {
        // Handle array format [key, value][]
        for (const [key, value] of options.headers) {
          headers[key] = value
        }
      } else if (typeof options.headers === 'object') {
        // Handle object format
        Object.assign(headers, options.headers)
      }
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    // Update rate limit info from response headers
    this.updateRateLimitInfo(response.headers)

    if (!response.ok) {
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset')
          return {
            data: null,
            error: `GitHub API rate limit exceeded. Resets at ${
              resetTime ? new Date(Number.parseInt(resetTime, 10) * 1000).toISOString() : 'unknown'
            }`
          }
        }
      }

      return {
        data: null,
        error: `GitHub API error: ${response.status} ${response.statusText}`
      }
    }

    const data: T = await response.json()
    return { data, error: null }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit')
    const remaining = headers.get('x-ratelimit-remaining')
    const reset = headers.get('x-ratelimit-reset')

    if (limit && remaining && reset) {
      this.rateLimitInfo.set('global', {
        limit: Number.parseInt(limit, 10),
        remaining: Number.parseInt(remaining, 10),
        reset: Number.parseInt(reset, 10)
      })
    }
  }

  /**
   * Sanitize error messages to prevent information leakage
   */
  private sanitizeError(error: any): string {
    if (error instanceof Error) {
      // Remove any sensitive information from error messages
      const message = error.message
        .replace(/Bearer [^ ]+/gi, 'Bearer [REDACTED]')
        .replace(/token[= ][^ ]+/gi, 'token=[REDACTED]')
        .replace(/api_key[= ][^ ]+/gi, 'api_key=[REDACTED]')

      if (error.name === 'AbortError') {
        return 'Request timeout'
      }

      return message
    }

    return 'An unknown error occurred'
  }

  /**
   * Sanitize URLs for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove any sensitive query parameters
      const sensitiveParams = ['token', 'api_key', 'client_secret', 'access_token']
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]')
        }
      })
      return urlObj.toString()
    } catch {
      return '[INVALID_URL]'
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo | null {
    return this.rateLimitInfo.get('global') || null
  }
}

/**
 * Sanitize user data for logging
 */
export function sanitizeUserDataForLogging(data: any): any {
  if (!data) return data

  const sensitiveFields = [
    'email',
    'imageUrl',
    'firstName',
    'lastName',
    'publicMetadata',
    'privateMetadata',
    'unsafeMetadata',
    'externalAccounts',
    'emailAddresses',
    'phoneNumbers',
    'web3Wallets',
    'password',
    'token',
    'secret',
    'api_key',
    'access_token',
    'refresh_token'
  ]

  if (typeof data === 'object') {
    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        if (field === 'email' && sanitized[field]) {
          // Partially mask email
          const email = sanitized[field]
          const [localPart, domain] = email.split('@')
          if (localPart && domain) {
            sanitized[field] = `${localPart.charAt(0)}***@${domain}`
          } else {
            sanitized[field] = '[REDACTED]'
          }
        } else if (field === 'id' && sanitized[field]) {
          // Keep last 6 chars of ID for debugging
          const id = sanitized[field]
          sanitized[field] = `***${id.slice(-6)}`
        } else {
          sanitized[field] = '[REDACTED]'
        }
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeUserDataForLogging(sanitized[key])
      }
    }

    return sanitized
  }

  return data
}

// Note: hashSensitiveData has been moved to lib/server-crypto.ts
// This file should only contain client-safe utilities
