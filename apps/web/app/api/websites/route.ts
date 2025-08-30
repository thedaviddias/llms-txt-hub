import { getWebsites } from '@/lib/content-loader'
import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'

/**
 * HTTP GET handler that returns the list of websites as JSON.
 *
 * Attempts to fetch websites via `getWebsites()`. On success returns a 200 JSON
 * response containing the websites. On failure logs the error and returns a 500
 * JSON response with `{ error: 'Failed to fetch websites' }`.
 *
 * @returns A NextResponse containing the websites (200) or an error object (500).
 */
export async function GET() {
  try {
    const websites = await getWebsites()
    return NextResponse.json(websites)
  } catch (error) {
    logger.error('Error fetching websites', { data: error, tags: { api: 'websites' } })
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
  }
}
