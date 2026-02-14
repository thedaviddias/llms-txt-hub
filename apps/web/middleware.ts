import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { logger } from '@thedaviddias/logging'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { validateCSRFToken } from '@/lib/middleware-csrf'

// Edge Runtime compatible implementations

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/api/csrf(.*)', // CSRF token endpoint must be public
  '/api/cli/(.*)', // CLI endpoints called by external tool (no browser auth)
  '/api/webhooks(.*)',
  '/api/websites(.*)',
  '/api/rss-feed(.*)',
  '/api/fetch-metadata(.*)',
  '/api/debug/content-paths(.*)',
  '/api/members(.*)',
  '/proxy/api/event(.*)', // Plausible proxy endpoint
  '/search(.*)',
  '/websites(.*)',
  '/projects(.*)',
  '/docs(.*)',
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
 * Timestamp of the last rate limit cache cleanup sweep
 */
let lastCacheCleanup = Date.now()
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Sweep expired entries from the rate limit cache to prevent unbounded growth
 */
function cleanupRateLimitCache(): void {
  const now = Date.now()
  if (now - lastCacheCleanup < CACHE_CLEANUP_INTERVAL) return
  lastCacheCleanup = now

  for (const [key, entry] of rateLimitCache) {
    if (entry.resetTime <= now) {
      rateLimitCache.delete(key)
    }
  }
}

/**
 * Apply rate limiting based on route type (Edge Runtime compatible)
 */
async function applyRateLimit(req: NextRequest): Promise<Response | null> {
  const clientIp = getClientIp(req)
  const pathname = req.nextUrl.pathname

  // Periodic cleanup of expired rate limit entries
  cleanupRateLimitCache()

  // Skip rate limiting entirely for true static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // Files with extensions (CSS, JS, images, etc.)
  ) {
    return null
  }

  // Global per-IP rate limit: 120 requests/minute across all routes
  const globalResult = await checkRateLimit({
    identifier: clientIp,
    resource: 'global',
    maxRequests: 120,
    windowMs: 60 * 1000
  })

  if (!globalResult.allowed) {
    logger.warn('Global rate limit exceeded', {
      data: {
        ipHash: await hashSensitiveData(clientIp),
        pathname,
        retryAfter: globalResult.retryAfter
      },
      tags: { type: 'security', component: 'rate-limit', action: 'global-blocked' }
    })

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: globalResult.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(globalResult.retryAfter || 60),
          'X-RateLimit-Limit': '120',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': globalResult.resetTime.toISOString()
        }
      }
    )
  }

  // Skip per-route rate limiting for non-API page loads and analytics proxy
  if (
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap') ||
    // Plausible Analytics proxy endpoints
    pathname === '/api/event' ||
    pathname.startsWith('/proxy/api/event') ||
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
  const pathname = req.nextUrl.pathname

  // Block non-safe HTTP methods on page routes (not API, not _next)
  // Legitimate mutations go through Server Actions (/_next/) or API routes (/api/)
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/proxy/api/') &&
    !pathname.startsWith('/_next/')
  ) {
    return new Response(null, {
      status: 405,
      headers: { Allow: 'GET, HEAD, OPTIONS' }
    })
  }

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
      !req.nextUrl.pathname.startsWith('/api/cli/') &&
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
