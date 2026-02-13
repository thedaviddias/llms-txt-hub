import type { FetchResult } from '../types/index.js'

const TIMEOUT_MS = 30_000
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CONCURRENT = 5

const PRIVATE_IP_PREFIXES = [
  '127.',
  '10.',
  '192.168.',
  '0.0.0.0',
  '0.',
  '169.254.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.'
]

/**
 * Validate a URL before fetching: must be http(s) and not target private networks.
 */
function validateUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported protocol "${parsed.protocol}" in URL: ${url}`)
  }

  const hostname = parsed.hostname
  if (
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    PRIVATE_IP_PREFIXES.some(prefix => hostname.startsWith(prefix))
  ) {
    throw new Error(`URL targets a private/reserved address: ${url}`)
  }
}

let activeRequests = 0
const queue: Array<() => void> = []

/**
 * Release a concurrency slot and drain the queue.
 */
function releaseSlot(): void {
  activeRequests--
  const next = queue.shift()
  if (next) {
    activeRequests++
    next()
  }
}

/**
 * Wait until a concurrency slot is available.
 */
function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++
    return Promise.resolve()
  }
  return new Promise<void>(resolve => {
    queue.push(resolve)
  })
}

export interface FetchLlmsTxtInput {
  url: string
  existingEtag?: string | null
}

/**
 * Fetch an llms.txt file with concurrency control and ETag support.
 */
export async function fetchLlmsTxt({ url, existingEtag }: FetchLlmsTxtInput): Promise<FetchResult> {
  validateUrl(url)
  await acquireSlot()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const headers: Record<string, string> = {}
    if (existingEtag) {
      headers['If-None-Match'] = existingEtag
    }

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s: ${url}`)
      }
      throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      clearTimeout(timeout)
    }

    if (response.status === 304) {
      return {
        content: '',
        etag: existingEtag || null,
        lastModified: response.headers.get('last-modified'),
        notModified: true
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      throw new Error(`Received HTML instead of plain text from ${url} — the URL may be invalid`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_SIZE) {
      throw new Error(`Response too large (${contentLength} bytes, max ${MAX_SIZE})`)
    }

    const text = await response.text()
    if (text.length > MAX_SIZE) {
      throw new Error(`Response too large (${text.length} bytes, max ${MAX_SIZE})`)
    }

    return {
      content: text,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      notModified: false
    }
  } finally {
    releaseSlot()
  }
}
