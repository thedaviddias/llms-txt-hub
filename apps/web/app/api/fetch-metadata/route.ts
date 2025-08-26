import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'
import normalizeUrl from 'normalize-url'
import { getWebsites } from '@/lib/content-loader'

function cleanTitle(title: string): string {
  // Remove common suffixes and clean up the title
  return title
    .replace(/\s*[|\-–—]\s*([^|\-–—]*)$/, '') // Remove everything after | - – —
    .replace(/\s*[-–—]\s*([^-–—]*)$/, '') // Remove everything after - – —
    .trim()
}

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

    const duplicateWebsite = existingWebsites.find(website => {
      const normalizedExisting = normalizeUrl(website.website, {
        stripProtocol: true,
        stripWWW: true,
        removeTrailingSlash: true,
        removeQueryParameters: true
      })

      // Check if either URL is a base path of the other
      return (
        normalizedExisting.startsWith(normalizedNewUrl) ||
        normalizedNewUrl.startsWith(normalizedExisting)
      )
    })

    if (duplicateWebsite) {
      return { isDuplicate: true, existingWebsite: duplicateWebsite }
    }
    // Fetch the main page
    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract metadata
    const title = $('title').text()
    const cleanedTitle = cleanTitle(title)
    const name = cleanedTitle || $('meta[property="og:site_name"]').attr('content') || ''
    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      ''

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
    console.error('Error fetching metadata:', error)
    throw new Error('Failed to fetch metadata')
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }

  try {
    const metadata = await fetchMetadata(domain)
    return NextResponse.json(metadata)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { website } = body

    if (!website) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }

    const metadata = await fetchMetadata(website)
    return NextResponse.json(metadata)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
