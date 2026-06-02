import fs from 'node:fs'
import path from 'node:path'
import { UpstashCache } from '@thedaviddias/caching/upstash'
import { logger } from '@thedaviddias/logging'
import { createRateLimiter, slidingWindow } from '@thedaviddias/rate-limiting'
import { NextResponse } from 'next/server'

// Inline server-only function to avoid import issues
/**
 * Resolves file paths relative to the project root directory
 */
function resolveFromRoot(...paths: string[]): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), ...paths)
}

const CACHE_TTL = 3600 // 1 hour in seconds

// Lazy initialization functions
let fileCache: UpstashCache | null = null
let llmsRateLimiter: ReturnType<typeof createRateLimiter> | null = null
let llmsFullRateLimiter: ReturnType<typeof createRateLimiter> | null = null

const getFileCache = (): UpstashCache => {
  if (!fileCache) {
    fileCache = new UpstashCache('file_content')
  }
  return fileCache
}

/**
 * Returns or creates a rate limiter for llms.txt requests
 */
const getLlmsRateLimiter = () => {
  if (!llmsRateLimiter) {
    llmsRateLimiter = createRateLimiter({
      prefix: 'llms_txt',
      limiter: slidingWindow(20, '300 s') // 20 requests per 5 minutes
    })
  }
  return llmsRateLimiter
}

/**
 * Returns or creates a rate limiter for llms-full.txt requests
 */
const getLlmsFullRateLimiter = () => {
  if (!llmsFullRateLimiter) {
    llmsFullRateLimiter = createRateLimiter({
      prefix: 'llms_full_txt',
      limiter: slidingWindow(10, '300 s') // 10 requests per 5 minutes
    })
  }
  return llmsFullRateLimiter
}

/**
 * Handles GET requests to serve llms.txt or llms-full.txt file content
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; file: string }> }
) {
  const { slug, file } = await params
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  try {
    // Check if the file name is valid
    if (!['llms.txt', 'llms-full.txt'].includes(file)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Apply rate limiting based on file type
    const rateLimiter = file === 'llms.txt' ? getLlmsRateLimiter() : getLlmsFullRateLimiter()
    const { success, limit, reset, remaining } = await rateLimiter.limit(ip)

    if (!success) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      })
    }

    // Try to get content from cache
    const cacheKey = `${slug}:${file}`
    let content: string | null = null
    let isCacheHit = false

    try {
      const fileCache = getFileCache()
      content = await fileCache.get<string>(cacheKey)
      isCacheHit = !!content
    } catch (error) {
      // Log cache error but continue with filesystem
      logger.error(error instanceof Error ? error : new Error('Cache get error'), {
        extra: {
          file,
          operation: 'cache-get',
          slug
        },
        fingerprint: ['website-file-route', 'cache-get'],
        tags: { route: 'website-file', type: 'api' }
      })
    }

    // If not in cache, read from filesystem
    if (!content) {
      const unofficialDir = resolveFromRoot('content/unofficial')
      const websiteDir = path.join(unofficialDir, slug)

      if (!fs.existsSync(websiteDir)) {
        return new NextResponse('Not Found', { status: 404 })
      }

      const filePath = path.join(websiteDir, file)

      if (!fs.existsSync(filePath)) {
        return new NextResponse('Not Found', { status: 404 })
      }

      content = fs.readFileSync(filePath, 'utf-8')

      // Store in cache
      try {
        const fileCache = getFileCache()
        await fileCache.set(cacheKey, content, { ttl: CACHE_TTL })
      } catch (error) {
        // Log cache error but continue serving content
        logger.error(error instanceof Error ? error : new Error('Cache set error'), {
          extra: {
            file,
            operation: 'cache-set',
            slug
          },
          fingerprint: ['website-file-route', 'cache-set'],
          tags: { route: 'website-file', type: 'api' }
        })
      }
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'X-Cache': isCacheHit ? 'HIT' : 'MISS'
      }
    })
  } catch (error) {
    // Log unexpected errors
    logger.error(
      error instanceof Error ? error : new Error('Unexpected website file route error'),
      {
        extra: {
          file,
          slug
        },
        fingerprint: ['website-file-route', 'unexpected'],
        tags: { route: 'website-file', type: 'api' }
      }
    )

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
