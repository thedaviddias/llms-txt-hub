import crypto from 'node:crypto'
import { hashSensitiveData } from '@/lib/server-crypto'
import { logger } from '@thedaviddias/logging'
import { cookies } from 'next/headers'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_FORM_FIELD = '_csrf'
const TOKEN_LENGTH = 32
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CSRFToken {
  token: string
  expiresAt: number
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Create and store a CSRF token in cookies
 */
export async function createCSRFToken(): Promise<string> {
  const token = generateCSRFToken()
  const expiresAt = Date.now() + TOKEN_EXPIRY

  const tokenData: CSRFToken = {
    token,
    expiresAt
  }

  // Store token in HTTP-only cookie
  const cookieStore = await cookies()
  cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify(tokenData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/'
  })

  logger.info('CSRF token created', {
    data: {
      tokenHash: hashSensitiveData(token),
      expiresAt: new Date(expiresAt).toISOString()
    },
    tags: { type: 'security', component: 'csrf', action: 'create' }
  })

  return token
}

/**
 * Get CSRF token from cookies
 */
export async function getStoredCSRFToken(): Promise<CSRFToken | null> {
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get(CSRF_TOKEN_NAME)

    if (!tokenCookie?.value) {
      return null
    }

    const tokenData: CSRFToken = JSON.parse(tokenCookie.value)

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      logger.warn('CSRF token expired', {
        data: {
          tokenHash: hashSensitiveData(tokenData.token),
          expiredAt: new Date(tokenData.expiresAt).toISOString()
        },
        tags: { type: 'security', component: 'csrf', action: 'expired' }
      })
      return null
    }

    return tokenData
  } catch (error) {
    logger.error('Failed to parse CSRF token', {
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'security', component: 'csrf', action: 'parse-error' }
    })
    return null
  }
}

/**
 * Extract CSRF token from request
 */
export function extractCSRFTokenFromRequest(request: Request): string | null {
  // Check header first (for AJAX requests)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken) {
    return headerToken
  }

  // Check form data (for form submissions)
  const contentType = request.headers.get('content-type')
  if (
    contentType?.includes('application/x-www-form-urlencoded') ||
    contentType?.includes('multipart/form-data')
  ) {
    // Note: In actual implementation, you'd need to parse the body
    // This is a simplified version for demonstration
    return null
  }

  // Check query parameters (not recommended but sometimes used)
  const url = new URL(request.url)
  const queryToken = url.searchParams.get(CSRF_FORM_FIELD)
  if (queryToken) {
    return queryToken
  }

  return null
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  // Skip for API routes with Bearer token auth
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return true
  }

  try {
    // Get stored token
    const storedToken = await getStoredCSRFToken()
    if (!storedToken) {
      logger.warn('No CSRF token found in storage', {
        data: {
          method: request.method,
          url: new URL(request.url).pathname
        },
        tags: { type: 'security', component: 'csrf', action: 'missing-stored' }
      })
      return false
    }

    // Get token from request
    const requestToken = extractCSRFTokenFromRequest(request)
    if (!requestToken) {
      logger.warn('No CSRF token found in request', {
        data: {
          method: request.method,
          url: new URL(request.url).pathname
        },
        tags: { type: 'security', component: 'csrf', action: 'missing-request' }
      })
      return false
    }

    // Compare tokens using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(storedToken.token),
      Buffer.from(requestToken)
    )

    if (!isValid) {
      logger.warn('CSRF token validation failed', {
        data: {
          method: request.method,
          url: new URL(request.url).pathname,
          storedTokenHash: hashSensitiveData(storedToken.token),
          requestTokenHash: hashSensitiveData(requestToken)
        },
        tags: { type: 'security', component: 'csrf', action: 'invalid' }
      })
      return false
    }

    logger.info('CSRF token validated successfully', {
      data: {
        method: request.method,
        url: new URL(request.url).pathname,
        tokenHash: hashSensitiveData(requestToken)
      },
      tags: { type: 'security', component: 'csrf', action: 'validated' }
    })

    return true
  } catch (error) {
    logger.error('CSRF validation error', {
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: request.method,
        url: new URL(request.url).pathname
      },
      tags: { type: 'security', component: 'csrf', action: 'error' }
    })
    return false
  }
}

/**
 * Middleware helper to enforce CSRF protection
 */
export async function enforceCSRFProtection(request: Request): Promise<Response | null> {
  const isValid = await validateCSRFToken(request)

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED'
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Error': 'true'
        }
      }
    )
  }

  return null // Continue with request
}

/**
 * Create a new CSRF token (stored in the HTTP-only cookie) and return an HTML meta tag embedding the token.
 *
 * This calls createCSRFToken(), which persists the token and its expiry in a secure, HTTP-only cookie,
 * then returns a string of the form `<meta name="csrf-token" content="...">` suitable for inclusion in server-rendered HTML.
 *
 * @returns An HTML meta tag string containing the newly generated CSRF token.
 */
export async function generateCSRFMetaTag(): Promise<string> {
  const token = await createCSRFToken()
  return `<meta name="csrf-token" content="${token}">`
}
