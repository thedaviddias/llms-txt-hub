interface PublicE2eBoundaryInput {
  enabled: boolean
  isProduction: boolean
  isPublicRoute: boolean
}

interface PublicE2eModeInput {
  enabled: boolean
  isProduction: boolean
}

interface PublicE2eProxyInput<Request> {
  handle: (request: Request) => Promise<Response>
  isPublicRoute: (request: Request) => boolean
  unauthorized: () => Response
}

/**
 * Allow an authless E2E request only for an already-public route outside production.
 *
 * @param input - Explicit test mode, runtime environment, and route classification
 * @returns Whether Clerk may be skipped for this public test request
 */
export function canBypassClerkForPublicE2e(input: PublicE2eBoundaryInput): boolean {
  return input.enabled && !input.isProduction && input.isPublicRoute
}

/**
 * Allow an empty public members fixture only in explicitly enabled non-production E2E.
 *
 * @param input - Explicit test mode and production status
 * @returns Whether a missing external member source may resolve to an empty list
 */
export function canUseEmptyMembersForPublicE2e(input: PublicE2eModeInput): boolean {
  return input.enabled && !input.isProduction
}

/**
 * Build a public-only authless request handler for explicitly enabled E2E servers.
 *
 * @param input - Route classifier, public handler, and fail-closed response factory
 * @returns A test handler outside production, otherwise null
 */
export function createPublicE2eProxy<Request>(
  input: PublicE2eProxyInput<Request>
): ((request: Request) => Promise<Response>) | null {
  const enabled = process.env.E2E_PUBLIC_ROUTES === '1'
  const isProduction = process.env.NODE_ENV === 'production'
  if (!enabled || isProduction) return null
  return async request =>
    canBypassClerkForPublicE2e({
      enabled,
      isProduction,
      isPublicRoute: input.isPublicRoute(request)
    })
      ? input.handle(request)
      : input.unauthorized()
}
