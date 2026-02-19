import { logger } from '@thedaviddias/logging'
import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'
import normalizeUrl from 'normalize-url'
import { getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { stripHtml } from '@/lib/security-utils-helpers'
import { validatePublicHttpUrl } from '@/lib/url-safety'

/**
 * Clean and sanitize a page title by removing common suffixes and special characters
 *
 * @param title - The raw title string to clean
 * @returns The cleaned and sanitized title string
 */
function cleanTitle(title: string): string {
  const sanitized = stripHtml(title)

  // Remove common suffixes and clean up the title
  return sanitized
    .replace(/\s*[|\-–—]\s*([^|\-–—]*)$/, '') // Remove everything after | - – —
    .replace(/\s*[-–—]\s*([^-–—]*)$/, '') // Remove everything after - – —
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // Remove zero-width characters
    .trim()
}

const FETCH_TIMEOUT_MS = 10_000

/**
 * Error used to signal user-facing URL safety failures (e.g. restricted redirects).
 */
class UrlSafetyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlSafetyError'
  }
}

/**
 * Fetch with timeout to avoid hanging on slow or unresponsive URLs
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number; maxRedirects?: number } = {}
): Promise<Response> {
  const { timeoutMs = FETCH_TIMEOUT_MS, maxRedirects = 3, ...init } = options
  let currentUrl = url

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal
      })

      const isRedirect = response.status >= 300 && response.status < 400
      if (!isRedirect) {
        return response
      }

      const location = response.headers.get('location')
      if (!location) return response
      if (redirects === maxRedirects) {
        throw new Error('Too many redirects')
      }

      const nextUrl = new URL(location, currentUrl).toString()
      const redirectValidation = validatePublicHttpUrl(nextUrl)
      if (!redirectValidation.ok) {
        throw new UrlSafetyError(redirectValidation.error)
      }

      currentUrl = redirectValidation.url.toString()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('Too many redirects')
}

/**
 * Fetch and extract metadata from a given URL
 *
 * @param url - The URL to fetch metadata from
 * @returns Object containing metadata and duplicate check results
 */
async function fetchMetadata(url: string) {
  try {
    // Check for duplicate websites
    const existingWebsites = await getWebsites()

    const _normalizedNewUrl = normalizeUrl(url, {
      stripProtocol: true,
      stripWWW: true,
      removeTrailingSlash: true,
      removeQueryParameters: true
    })

    /**
     * Normalizes a URL into hostname and path for duplicate detection

     */
    const toKey = (u: string) => {
      try {
        const { hostname, pathname } = new URL(
          normalizeUrl(u, {
            stripWWW: true,
            removeTrailingSlash: true,
            removeQueryParameters: true
          })
        )
        const path = pathname.endsWith('/') ? pathname : `${pathname}/`
        return { hostname, path }
      } catch {
        return null
      }
    }
    const newKey = toKey(url)
    const duplicateWebsite = newKey
      ? existingWebsites.find((w: WebsiteMetadata) => {
          const k = toKey(w.website)
          if (!k || k.hostname !== newKey.hostname) return false
          return (
            k.path === newKey.path ||
            k.path.startsWith(newKey.path) ||
            newKey.path.startsWith(k.path)
          )
        })
      : undefined

    if (duplicateWebsite) {
      return { isDuplicate: true, existingWebsite: duplicateWebsite }
    }
    // Fetch the main page
    const response = await fetchWithTimeout(url)
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract and sanitize metadata
    const rawTitle = $('title').text()
    const cleanedTitle = cleanTitle(rawTitle)
    const rawName = cleanedTitle || $('meta[property="og:site_name"]').attr('content') || ''
    const rawDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      ''

    // Sanitize extracted data
    const name = stripHtml(rawName).trim().substring(0, 200) // Limit length

    const description = stripHtml(rawDescription).trim().substring(0, 500) // Limit length

    // Check for llms.txt
    const llmsUrl = `${url}/llms.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsResponse = await fetchWithTimeout(llmsUrl)
    const llmsExists = llmsResponse.ok

    // Check for llms-full.txt
    const llmsFullUrl = `${url}/llms-full.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsFullResponse = await fetchWithTimeout(llmsFullUrl)
    const llmsFullExists = llmsFullResponse.ok

    return {
      isDuplicate: false,
      metadata: {
        name,
        description,
        website: url,
        llmsUrl: llmsExists ? llmsUrl : '',
        llmsFullUrl: llmsFullExists ? llmsFullUrl : ''
      }
    }
  } catch (error) {
    if (error instanceof UrlSafetyError) {
      throw error
    }

    logger.error('Error fetching metadata:', { data: error, tags: { type: 'api' } })
    throw new Error('Failed to fetch metadata')
  }
}

/**
 * Handle GET requests to fetch metadata for a domain
 *
 * @param request - The incoming HTTP request
 * @returns JSON response with metadata or error
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }

  const validation = validatePublicHttpUrl(domain)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const metadata = await fetchMetadata(validation.url.toString())
    return NextResponse.json(metadata)
  } catch (error) {
    if (error instanceof UrlSafetyError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

/**
 * Handle POST requests to fetch metadata for a website
 *
 * @param request - The incoming HTTP request with website in body
 * @returns JSON response with metadata or error
 */
export async function POST(request: Request) {
  try {
    let body: { website?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { website } = body

    if (!website || typeof website !== 'string') {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }

    const validation = validatePublicHttpUrl(website)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const metadata = await fetchMetadata(validation.url.toString())
    return NextResponse.json(metadata)
  } catch (error) {
    if (error instanceof UrlSafetyError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
