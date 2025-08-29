import { logger } from '@thedaviddias/logging'
import * as cheerio from 'cheerio'
import DOMPurify from 'isomorphic-dompurify'
import { NextResponse } from 'next/server'
import normalizeUrl from 'normalize-url'
import validator from 'validator'
import { getWebsites, type WebsiteMetadata } from '@/lib/content-loader'

/**
 * Clean and sanitize a page title by removing common suffixes and special characters
 *
 * @param title - The raw title string to clean
 * @returns The cleaned and sanitized title string
 */
function cleanTitle(title: string): string {
  // Sanitize title first
  const sanitized = DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })

  // Remove common suffixes and clean up the title
  return sanitized
    .replace(/\s*[|\-–—]\s*([^|\-–—]*)$/, '') // Remove everything after | - – —
    .replace(/\s*[-–—]\s*([^-–—]*)$/, '') // Remove everything after - – —
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // Remove zero-width characters
    .trim()
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

    const normalizedNewUrl = normalizeUrl(url, {
      stripProtocol: true,
      stripWWW: true,
      removeTrailingSlash: true,
      removeQueryParameters: true
    })

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
    const response = await fetch(url)
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
    const name = DOMPurify.sanitize(rawName, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
      .trim()
      .substring(0, 200) // Limit length

    const description = DOMPurify.sanitize(rawDescription, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
      .trim()
      .substring(0, 500) // Limit length

    // Check for llms.txt
    const llmsUrl = `${url}/llms.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsResponse = await fetch(llmsUrl)
    const llmsExists = llmsResponse.ok

    // Check for llms-full.txt
    const llmsFullUrl = `${url}/llms-full.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsFullResponse = await fetch(llmsFullUrl)
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

  // Check for malicious URLs first
  const lowerDomain = domain.toLowerCase()
  if (
    lowerDomain.includes('javascript:') ||
    lowerDomain.includes('data:') ||
    lowerDomain.includes('vbscript:') ||
    lowerDomain.includes('file:')
  ) {
    return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
  }

  // Enhanced URL validation
  if (
    !validator.isURL(domain, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })
  ) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  try {
    const metadata = await fetchMetadata(domain)
    return NextResponse.json(metadata)
  } catch {
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
    const body = await request.json()
    const { website } = body

    if (!website || typeof website !== 'string') {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }

    // Check for malicious URLs first
    const lowerWebsite = website.toLowerCase()
    if (
      lowerWebsite.includes('javascript:') ||
      lowerWebsite.includes('data:') ||
      lowerWebsite.includes('vbscript:') ||
      lowerWebsite.includes('file:')
    ) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }

    // Enhanced URL validation
    if (
      !validator.isURL(website, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
      })
    ) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const metadata = await fetchMetadata(website)
    return NextResponse.json(metadata)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
