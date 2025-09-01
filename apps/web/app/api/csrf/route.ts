import { createCSRFToken } from '@/lib/csrf-protection'
import { NextResponse } from 'next/server'

/**
 * GET handler for CSRF token generation
 *
 * @returns Promise resolving to NextResponse with CSRF token or error
 */
export async function GET() {
  try {
    const token = await createCSRFToken()
    return NextResponse.json({ token })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
  }
}
