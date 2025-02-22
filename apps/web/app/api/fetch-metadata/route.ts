import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }

  try {
    // Fetch the main page
    const response = await fetch(domain)
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract metadata
    const name = $('meta[property="og:site_name"]').attr('content') || $('title').text() || ''
    const description = $('meta[name="description"]').attr('content') || ''

    // Check for llms.txt
    const llmsUrl = `${domain}/llms.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsResponse = await fetch(llmsUrl)
    const llmsExists = llmsResponse.ok

    // Check for llms-full.txt
    const llmsFullUrl = `${domain}/llms-full.txt`.replace(/([^:]\/)\/+/g, '$1')
    const llmsFullResponse = await fetch(llmsFullUrl)
    const llmsFullExists = llmsFullResponse.ok

    return NextResponse.json({
      name,
      description,
      website: domain,
      llmsUrl: llmsExists ? llmsUrl : '',
      llmsFullUrl: llmsFullExists ? llmsFullUrl : ''
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
