import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { getWebsites } from '@/lib/content-loader'

/**
 * Handles GET requests to fetch all websites
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
