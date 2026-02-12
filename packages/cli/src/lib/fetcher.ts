import type { FetchResult } from '../types/index.js'

const TIMEOUT_MS = 30_000
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CONCURRENT = 5

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

/**
 * Fetch an llms.txt file with concurrency control and ETag support.
 */
export async function fetchLlmsTxt(
  url: string,
  existingEtag?: string | null
): Promise<FetchResult> {
  await acquireSlot()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const headers: Record<string, string> = {}
    if (existingEtag) {
      headers['If-None-Match'] = existingEtag
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers
    })
    clearTimeout(timeout)

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
