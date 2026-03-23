import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

const OPENPANEL_API = 'https://api.openpanel.dev'
const OPENPANEL_CDN = 'https://openpanel.dev'
const SCRIPT_PATH = '/op1.js'

/**
 * Build forwarding headers that OpenPanel expects for server-side proxy requests
 */
function buildProxyHeaders(req: Request): Headers {
  const headers = new Headers()
  const clientIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-vercel-forwarded-for')

  headers.set('Content-Type', 'application/json')
  headers.set('openpanel-client-id', req.headers.get('openpanel-client-id') ?? '')

  const origin =
    req.headers.get('origin') ??
    (() => {
      const url = new URL(req.url)
      return `${url.protocol}//${url.host}`
    })()
  headers.set('origin', origin)
  headers.set('User-Agent', req.headers.get('user-agent') ?? '')
  if (clientIp) headers.set('openpanel-client-ip', clientIp)

  return headers
}

/**
 * Forward a tracking request to the OpenPanel API
 */
async function proxyTrackRequest(req: Request, apiUrl: string, path: string) {
  const headers = buildProxyHeaders(req)
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(await req.json()) : undefined
    })
    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return NextResponse.json(await res.json(), { status: res.status })
    }
    return NextResponse.json(await res.text(), { status: res.status })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to proxy request',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch and cache the OpenPanel SDK script from the CDN
 */
async function serveScript(req: Request) {
  const url = new URL(req.url)
  const scriptUrl = `${OPENPANEL_CDN}${SCRIPT_PATH}${url.searchParams.size > 0 ? `?${url.searchParams.toString()}` : ''}`

  try {
    const res = await fetch(scriptUrl, { next: { revalidate: 86400 } })
    const body = await res.text()
    const etag = `"${createHash('md5')
      .update(scriptUrl + body)
      .digest('hex')}"`

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/javascript',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        ETag: etag
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch script',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * OpenPanel proxy route handler -- forwards tracking events and serves the SDK script
 * through the app's own domain to avoid ad blockers
 */
async function handler(req: Request) {
  const { pathname } = new URL(req.url)

  if (req.method === 'GET' && pathname.endsWith(SCRIPT_PATH)) {
    return serveScript(req)
  }

  const trackIndex = pathname.indexOf('/track')
  if (trackIndex === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return proxyTrackRequest(req, OPENPANEL_API, pathname.substring(trackIndex))
}

export const GET = handler
export const POST = handler
