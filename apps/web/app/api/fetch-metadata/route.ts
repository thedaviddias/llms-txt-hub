import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'

function cleanTitle(title: string): string {
  // Remove common suffixes and clean up the title
  return title
    .replace(/\s*[|\-–—]\s*([^|\-–—]*)$/, '') // Remove everything after | - – —
    .replace(/\s*[-–—]\s*([^-–—]*)$/, '') // Remove everything after - – —
    .trim()
}

async function fetchMetadata(url: string) {
  try {
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
      name,
      description,
      website: url,
      llmsUrl: llmsExists ? llmsUrl : '',
      llmsFullUrl: llmsFullExists ? llmsFullUrl : ''
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
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const metadata = await fetchMetadata(url)
    return NextResponse.json(metadata)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
