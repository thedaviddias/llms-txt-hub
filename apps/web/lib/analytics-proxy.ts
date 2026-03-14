/**
 * Returns whether the pathname targets an analytics proxy endpoint that should
 * bypass standard auth-adjacent middleware checks.
 *
 * @param pathname - Request pathname to classify
 * @returns True when the pathname is handled by Plausible or OpenPanel proxying
 */
export function isAnalyticsProxyPath(pathname: string): boolean {
  return (
    pathname === '/track' ||
    pathname.startsWith('/track/') ||
    pathname.startsWith('/proxy/api/') ||
    pathname.startsWith('/proxy/js/script') ||
    pathname === '/api/event' ||
    pathname.startsWith('/js/script') ||
    pathname.startsWith('/api/op/')
  )
}
