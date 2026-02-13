import type { NextRequest } from 'next/server'

/**
 * Edge Runtime compatible CSRF token validation
 * @param request - The incoming request
 * @returns Whether the CSRF token is valid
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  // Skip for API routes with Bearer token auth
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return true
  }

  // Skip validation for Server Actions (Next.js internal endpoints)
  // These will be handled by the Server Action itself
  if (request.nextUrl.pathname.startsWith('/_next/static/chunks/')) {
    return true
  }

  let csrfToken: string | null = null

  // 1. Try to get from headers (for AJAX requests)
  csrfToken = request.headers.get('x-csrf-token')

  // 2. Try to get from query params (not recommended but sometimes used)
  if (!csrfToken) {
    csrfToken = request.nextUrl.searchParams.get('_csrf')
  }

  // 3. Try to extract from FormData (for form submissions)
  const contentType = request.headers.get('content-type') || ''
  if (
    !csrfToken &&
    (contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded'))
  ) {
    try {
      // Clone the request to avoid consuming the original body
      const clonedRequest = request.clone()

      if (contentType.includes('multipart/form-data')) {
        const formData = await clonedRequest.formData()
        csrfToken = formData.get('_csrf') as string | null
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await clonedRequest.text()
        const params = new URLSearchParams(body)
        csrfToken = params.get('_csrf')
      }
    } catch (_error) {
      // Form parsing failed, continue without token
    }
  }

  // Double-submit cookie validation
  // Get token from cookie (it's stored as JSON with token and expiresAt)
  const cookieValue = request.cookies.get('csrf_token')?.value || null
  if (!cookieValue) return false

  let cookieToken: string | null = null
  try {
    const tokenData = JSON.parse(cookieValue)
    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      return false
    }
    cookieToken = tokenData.token
  } catch {
    // If it's not JSON, treat it as a raw token (for backwards compatibility)
    cookieToken = cookieValue
  }

  if (!csrfToken || !cookieToken) return false

  // Basic same-origin check
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      const { host, protocol } = new URL(origin)
      const reqHost = request.headers.get('host')
      const reqProto = request.headers.get('x-forwarded-proto') || 'https'
      if (host !== reqHost || (protocol && protocol.replace(':', '') !== reqProto)) return false
    } catch {
      return false
    }
  }

  // Compare tokens (timing-safe comparison would be ideal but acceptable here)
  return csrfToken === cookieToken
}
