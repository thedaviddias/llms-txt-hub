import { NextResponse } from 'next/server'
import { createCSRFToken } from '@/lib/csrf-protection'

/**
 * GET handler that returns a freshly generated CSRF token.
 *
 * Generates a token (via createCSRFToken) and responds with JSON { token } on success.
 * If token generation fails, responds with JSON { error: 'Failed to generate CSRF token' } and HTTP 500.
 *
 * @returns A NextResponse containing the token on success, or an error message with status 500 on failure.
 */
export async function GET() {
  try {
    const token = await createCSRFToken()
    return NextResponse.json({ token })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
  }
}
