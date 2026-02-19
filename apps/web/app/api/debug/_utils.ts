import crypto from 'node:crypto'
import { auth } from '@thedaviddias/auth'
import { NextResponse } from 'next/server'

type DebugAccessSuccess = { ok: true; userId: string }
type DebugAccessFailure = { ok: false; response: NextResponse }
export type DebugAccessResult = DebugAccessSuccess | DebugAccessFailure

/**
 * Compare tokens using constant-time semantics to reduce timing leakage.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  return (
    providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)
  )
}

/**
 * Restrict debug endpoints to authenticated users in non-production environments.
 * Optionally supports additional shared-secret hardening via DEBUG_API_TOKEN.
 */
export async function ensureDebugAccess(request?: Request): Promise<DebugAccessResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const requiredToken = process.env.DEBUG_API_TOKEN
  if (requiredToken) {
    const providedToken = request?.headers.get('x-debug-token')
    if (!providedToken || !tokensMatch(providedToken, requiredToken)) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
  }

  return { ok: true, userId: session.user.id }
}
