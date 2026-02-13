import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { logger } from '@thedaviddias/logging'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Edge Runtime compatible implementations

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/api/csrf(.*)', // CSRF token endpoint must be public
  '/api/webhooks(.*)',
  '/api/websites(.*)',
  '/api/rss-feed(.*)',
  '/api/fetch-metadata(.*)',
  '/api/debug/content-paths(.*)',
  '/api/members(.*)',
  '/search(.*)',
  '/websites(.*)',
  '/projects(.*)',
  '/guides(.*)',
  '/news(.*)',
  '/tools(.*)',
  '/resources(.*)',
  '/categories(.*)',
  '/members(.*)',
  '/u(.*)', // User profiles
  '/featured(.*)',
  '/faq(.*)',
  '/about(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/favorites(.*)',
  '/cookies(.*)',
  // Category pages
  '/(ai-ml|developer-tools|data-analytics|integration-automation|infrastructure-cloud|security-identity|automation-workflow|finance-fintech|marketing-sales|ecommerce-retail|content-media|business-operations|personal|agency-services|international|other)(.*)',
  // Static files
  '/robots.txt',
  '/llms.txt',
  '/sitemap.xml',
  '/opengraph-image.png'
])

/**
 * Generate full SHA-256 hash for rate limiting keys
 * @param data - The data to hash
 * @returns Full SHA-256 hex string
 */
async function generateFullHash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Edge Runtime compatible hash function for sensitive data
 * @param data - The data to hash
 * @returns A truncated hashed version of the data for logging
 */
async function hashSensitiveData(data: string): Promise<string> {
  const fullHash = await generateFullHash(data)
  return fullHash.slice(0, 12)
}

/**
 * Extract client IP from request headers (Edge Runtime compatible)
 * @param request - The incoming request
 * @returns The client IP address
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return cfConnectingIp || realIp || 'unknown'
}

/**
 * Input parameters for rate limit checking
 */
interface CheckRateLimitInput {
  identifier: string
  resource: string
  maxRequests: number
  windowMs: number
}

/**
 * Simple in-memory rate limiter for Edge Runtime
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit for a given identifier and resource
 * @param input - Rate limit parameters
 * @returns Rate limit status with allowed flag, remaining requests, and reset time
 */
async function checkRateLimit(
  input: CheckRateLimitInput
): Promise<{ allowed: boolean; remaining: number; resetTime: Date; retryAfter?: number }> {
  const { identifier, resource, maxRequests, windowMs } = input
  const fullHash = await generateFullHash(identifier)
  const key = `${fullHash}:${resource}`
  const now = Date.now()
  const resetTime = new Date(now + windowMs)

  const entry = rateLimitCache.get(key)

  // Clean expired entries
  if (entry && entry.resetTime <= now) {
    rateLimitCache.delete(key)
  }

  const currentEntry = rateLimitCache.get(key)

  if (currentEntry) {
    if (currentEntry.count >= maxRequests) {
      const retryAfter = Math.ceil((currentEntry.resetTime - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(currentEntry.resetTime),
        retryAfter
      }
    }

    currentEntry.count++
    return {
      allowed: true,
      remaining: maxRequests - currentEntry.count,
      resetTime: new Date(currentEntry.resetTime)
    }
  }

  // Create new entry
  rateLimitCache.set(key, {
    count: 1,
    resetTime: resetTime.getTime()
  })

  return {
    allowed: true,
    remaining: maxRequests - 1,
    resetTime
  }
}

/**
 * Edge Runtime compatible CSRF token validation
 * @param request - The incoming request
 * @returns Whether the CSRF token is valid
 */
async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  // Skip for API routes with Bearer token auth
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return true
  }

  // Skip validation for Server Actions (Next.js internal endpoints)
  // These will be handled by the Server Action itself
  if (request.nextUrl.pathname.startsWith('/_next/static/chunks/')) {
    return true
  }

  let csrfToken: string | null = null

  // 1. Try to get from headers (for AJAX requests)
  csrfToken = request.headers.get('x-csrf-token')

  // 2. Try to get from query params (not recommended but sometimes used)
  if (!csrfToken) {
    csrfToken = request.nextUrl.searchParams.get('_csrf')
  }

  // 3. Try to extract from FormData (for form submissions)
  const contentType = request.headers.get('content-type') || ''
  if (
    !csrfToken &&
    (contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded'))
  ) {
    try {
      // Clone the request to avoid consuming the original body
      const clonedRequest = request.clone()

      if (contentType.includes('multipart/form-data')) {
        const formData = await clonedRequest.formData()
        csrfToken = formData.get('_csrf') as string | null
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await clonedRequest.text()
        const params = new URLSearchParams(body)
        csrfToken = params.get('_csrf')
      }
    } catch (_error) {
      // Form parsing failed, continue without token
    }
  }

  // Double-submit cookie validation
  // Get token from cookie (it's stored as JSON with token and expiresAt)
  const cookieValue = request.cookies.get('csrf_token')?.value || null
  if (!cookieValue) return false

  let cookieToken: string | null = null
  try {
    const tokenData = JSON.parse(cookieValue)
    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      return false
    }
    cookieToken = tokenData.token
  } catch {
    // If it's not JSON, treat it as a raw token (for backwards compatibility)
    cookieToken = cookieValue
  }

  if (!csrfToken || !cookieToken) return false

  // Basic same-origin check
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      const { host, protocol } = new URL(origin)
      const reqHost = request.headers.get('host')
      const reqProto = request.headers.get('x-forwarded-proto') || 'https'
      if (host !== reqHost || (protocol && protocol.replace(':', '') !== reqProto)) return false
    } catch {
      return false
    }
  }

  // Compare tokens (timing-safe comparison would be ideal but acceptable here)
  return csrfToken === cookieToken
}

/**
 * Generate a nonce for CSP (Edge Runtime compatible)
 */
function generateNonce(): string {
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  // Use btoa instead of Buffer for Edge Runtime compatibility
  // Convert Uint8Array to string manually for Edge Runtime compatibility
  let binary = ''
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Adds security headers including CSP to all responses
 * @param response - NextResponse object to add headers to
 * @param nonce - CSP nonce for inline scripts
 * @returns NextResponse with security headers added
 */
function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  // Stronger Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"} https://plausible.io https://*.clerk.accounts.dev https://*.clerk.com https://clerk.llmstxthub.com https://va.vercel-scripts.com https://vercel.live https://challenges.cloudflare.com https://*.cloudflare.com`,
    "worker-src 'self' blob:",
    `style-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"}`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss: blob: https://vercel.live https://challenges.cloudflare.com https://*.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
    "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.llmstxthub.com https://*.substack.com https://vercel.live https://challenges.cloudflare.com https://*.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests'
  ]

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

  // Enhanced security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  )
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  // HSTS header for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // CSP nonce for inline scripts
  if (nonce) {
    response.headers.set('X-Nonce', nonce)
  }

  return response
}

/**
 * Apply rate limiting based on route type (Edge Runtime compatible)
 */
async function applyRateLimit(req: NextRequest): Promise<Response | null> {
  const clientIp = getClientIp(req)
  const pathname = req.nextUrl.pathname

  // Skip rate limiting for static assets and regular page loads
  if (
    // Static assets
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap') ||
    pathname.includes('.') || // Files with extensions (CSS, JS, images, etc.)
    // Plausible Analytics proxy endpoints
    pathname === '/api/event' ||
    pathname.startsWith('/js/script') ||
    // Regular page loads (non-API routes) - exclude search route
    (!pathname.startsWith('/api/') && req.method === 'GET' && pathname !== '/search')
  ) {
    return null
  }

  // Determine rate limit config based on route
  let maxRequests = 60 // Default: 60 requests per minute
  let windowMs = 60 * 1000 // 1 minute

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/login')) {
    maxRequests = 5 // 5 attempts per 15 minutes
    windowMs = 15 * 60 * 1000
  } else if (pathname.startsWith('/api/search') || pathname.startsWith('/search')) {
    maxRequests = 30 // 30 searches per minute
  } else if (pathname.startsWith('/api/github')) {
    maxRequests = 20 // 20 requests per minute
  } else if (pathname.startsWith('/api/user') || pathname.startsWith('/submit')) {
    maxRequests = 10 // 10 actions per minute
  }

  const result = await checkRateLimit({
    identifier: clientIp,
    resource: pathname,
    maxRequests,
    windowMs
  })

  if (!result.allowed) {
    logger.warn('Rate limit exceeded', {
      data: {
        ipHash: await hashSensitiveData(clientIp),
        pathname,
        retryAfter: result.retryAfter
      },
      tags: { type: 'security', component: 'rate-limit', action: 'blocked' }
    })

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': result.resetTime.toISOString()
        }
      }
    )
  }

  return null
}

export default clerkMiddleware(async (auth, req) => {
  // Apply rate limiting (Edge Runtime compatible)
  const rateLimitResponse = await applyRateLimit(req)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enhanced CSRF protection for API routes (Edge Runtime compatible)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Skip CSRF for webhook endpoints, auth endpoints, and GET requests
    if (
      !req.nextUrl.pathname.startsWith('/api/webhooks') &&
      !req.nextUrl.pathname.startsWith('/api/members') &&
      !req.nextUrl.pathname.startsWith('/api/auth') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    ) {
      const isValidCSRF = await validateCSRFToken(req)
      if (!isValidCSRF) {
        const clientIp = getClientIp(req)
        logger.error('CSRF validation failed - potential security threat', {
          data: {
            method: req.method,
            pathname: req.nextUrl.pathname,
            origin: req.headers.get('origin'),
            referer: req.headers.get('referer'),
            userAgent: req.headers.get('user-agent'),
            ipHash: await hashSensitiveData(clientIp),
            timestamp: new Date().toISOString()
          },
          tags: {
            type: 'security',
            component: 'csrf',
            action: 'blocked',
            severity: 'high'
          }
        })

        return NextResponse.json(
          { error: 'CSRF validation failed', code: 'CSRF_INVALID' },
          { status: 403 }
        )
      }
    }
  }

  // Check if route is protected
  if (!isPublicRoute(req)) {
    // Check if user is authenticated
    const { userId } = await auth()

    if (!userId) {
      // For API routes, return 401 instead of redirecting
      if (req.nextUrl.pathname.startsWith('/api/')) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return addSecurityHeaders(response)
      }

      // For web routes, redirect to custom login page
      const loginUrl = new URL('/login', req.url)
      const response = NextResponse.redirect(loginUrl)
      return addSecurityHeaders(response)
    }
  }

  // Generate nonce for CSP if needed
  const nonce = req.nextUrl.pathname.includes('.html') ? generateNonce() : undefined

  // Add security headers to all responses
  const response = NextResponse.next()
  return addSecurityHeaders(response, nonce)
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
}
