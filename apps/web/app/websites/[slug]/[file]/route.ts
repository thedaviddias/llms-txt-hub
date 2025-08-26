import fs from 'node:fs'
import path from 'node:path'
import * as Sentry from '@sentry/nextjs'
import { UpstashCache } from '@thedaviddias/caching/upstash'
import { createRateLimiter, slidingWindow } from '@thedaviddias/rate-limiting'
import { NextResponse } from 'next/server'
import { resolveFromRoot } from '@/lib/utils'

const CACHE_TTL = 3600 // 1 hour in seconds

// Initialize file content cache with namespace
const fileCache = new UpstashCache('file_content')

// Create rate limiters with different limits for each file type
const llmsRateLimiter = createRateLimiter({
  prefix: 'llms_txt',
  limiter: slidingWindow(20, '300 s') // 20 requests per 5 minutes
})

const llmsFullRateLimiter = createRateLimiter({
  prefix: 'llms_full_txt',
  limiter: slidingWindow(10, '300 s') // 10 requests per 5 minutes
})

export async function GET(
  request: Request,
  { params }: { params: { slug: string; file: string } }
) {
  const { slug, file } = await params
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  try {
    // Check if the file name is valid
    if (!['llms.txt', 'llms-full.txt'].includes(file)) {
      Sentry.captureMessage('Invalid file name requested', {
        level: 'warning',
        extra: {
          ip,
          slug,
          file,
          error: 'Invalid file name'
        }
      })
      return new NextResponse('Not Found', { status: 404 })
    }

    // Apply rate limiting based on file type
    const rateLimiter = file === 'llms.txt' ? llmsRateLimiter : llmsFullRateLimiter
    const { success, limit, reset, remaining } = await rateLimiter.limit(ip)

    if (!success) {
      Sentry.captureMessage('Rate limit exceeded', {
        level: 'warning',
        extra: {
          ip,
          slug,
          file,
          limit,
          remaining,
          reset
        }
      })
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
      content = await fileCache.get<string>(cacheKey)
      isCacheHit = !!content
    } catch (error) {
      // Log cache error but continue with filesystem
      Sentry.captureException(error, {
        level: 'warning',
        extra: {
          ip,
          slug,
          file,
          error: 'Cache get error'
        }
      })
    }

    // If not in cache, read from filesystem
    if (!content) {
      const unofficialDir = resolveFromRoot('content/unofficial')
      const websiteDir = path.join(unofficialDir, slug)

      if (!fs.existsSync(websiteDir)) {
        Sentry.captureMessage('Website directory not found', {
          level: 'error',
          extra: {
            ip,
            slug,
            file,
            websiteDir
          }
        })
        return new NextResponse('Not Found', { status: 404 })
      }

      const filePath = path.join(websiteDir, file)

      if (!fs.existsSync(filePath)) {
        Sentry.captureMessage('File not found', {
          level: 'error',
          extra: {
            ip,
            slug,
            file,
            filePath
          }
        })
        return new NextResponse('Not Found', { status: 404 })
      }

      content = fs.readFileSync(filePath, 'utf-8')

      // Store in cache
      try {
        await fileCache.set(cacheKey, content, { ttl: CACHE_TTL })
      } catch (error) {
        // Log cache error but continue serving content
        Sentry.captureException(error, {
          level: 'warning',
          extra: {
            ip,
            slug,
            file,
            error: 'Cache set error'
          }
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
    Sentry.captureException(error, {
      extra: {
        ip,
        slug,
        file,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
