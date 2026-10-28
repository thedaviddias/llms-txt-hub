import { type RequestOptions, request } from 'node:https'

import type {
  NetworkInspectorDependencies,
  PinnedTransportRequest,
  PinnedTransportResponse
} from '#types'

/** Narrow request handle used by the private production HTTPS seam. */
export interface NodeHttpsRequestHandle {
  destroy: (error?: Error) => void
  end: () => void
  once: (event: 'error', listener: (error: Error) => void) => unknown
  removeListener: (event: 'error', listener: (error: Error) => void) => unknown
  setTimeout: (timeoutMs: number, listener: () => void) => unknown
}

/** Narrow response handle used by the private production HTTPS seam. */
export interface NodeHttpsResponseHandle extends AsyncIterable<Uint8Array> {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>
  readonly statusCode?: number
  destroy: (error?: Error) => void
  once: (event: 'close' | 'end', listener: () => void) => unknown
  removeListener: (event: 'close' | 'end', listener: () => void) => unknown
}

/** Injectable request factory used only to verify the private production binding. */
export type NodeHttpsRequestFactory = (
  options: RequestOptions,
  onResponse: (response: NodeHttpsResponseHandle) => void
) => NodeHttpsRequestHandle

const defaultRequestFactory: NodeHttpsRequestFactory = (options, onResponse) =>
  request(options, response => onResponse(response))
const headerValue = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.join(', ')

/**
 * Owns one HTTPS request and its response lifecycle until cleanup.
 */
class NodeTransportSession {
  private response?: NodeHttpsResponseHandle
  private requestHandle?: NodeHttpsRequestHandle
  private destroyed = false
  private settled = false
  private resolve?: (response: PinnedTransportResponse) => void
  private reject?: (error: Error) => void
  private readonly abort = (): void => this.destroyAndReject('submission-request-aborted')
  private readonly error = (): void => this.rejectPending('submission-request-failed')
  private readonly cleanupResponse = (): void => this.cleanup()

  constructor(
    private readonly details: PinnedTransportRequest,
    private readonly factory: NodeHttpsRequestFactory
  ) {}

  start(): Promise<PinnedTransportResponse> {
    if (this.details.signal.aborted) return Promise.reject(new Error('submission-request-aborted'))
    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
      const url = new URL(this.details.url)
      this.requestHandle = this.factory(
        {
          agent: false,
          headers: this.details.headers,
          hostname: this.details.hostname,
          lookup: (_hostname, options, callback) => {
            if (options.all) {
              callback(null, [{ address: this.details.address, family: this.details.family }])
            } else callback(null, this.details.address, this.details.family)
          },
          method: 'GET',
          path: `${url.pathname}${url.search}`,
          port: 443,
          servername: this.details.servername,
          signal: this.details.signal
        },
        response => this.receive(response)
      )
      this.details.signal.addEventListener('abort', this.abort, { once: true })
      this.requestHandle.once('error', this.error)
      this.requestHandle.setTimeout(this.details.timeoutMs, () =>
        this.destroyAndReject('submission-request-timeout')
      )
      if (this.details.signal.aborted) this.abort()
      else this.requestHandle.end()
    })
  }

  private receive(response: NodeHttpsResponseHandle): void {
    this.response = response
    response.once('close', this.cleanupResponse)
    response.once('end', this.cleanupResponse)
    this.requestHandle?.removeListener('error', this.error)
    this.settled = true
    this.resolve?.({
      body: response,
      discard: () => {
        this.destroy()
        this.cleanup()
      },
      headers: {
        'content-encoding': headerValue(response.headers['content-encoding']),
        'content-type': headerValue(response.headers['content-type']),
        location: headerValue(response.headers.location)
      },
      statusCode: response.statusCode ?? 0
    })
  }

  private destroyAndReject(message: string): void {
    this.destroy(new Error(message))
    this.cleanup()
    this.rejectPending(message)
  }

  private rejectPending(message: string): void {
    this.cleanup()
    if (!this.settled) this.reject?.(new Error(message))
  }

  private destroy(error?: Error): void {
    if (this.destroyed) return
    this.destroyed = true
    this.response?.destroy(error)
    this.requestHandle?.destroy(error)
  }

  private cleanup(): void {
    this.details.signal.removeEventListener('abort', this.abort)
    this.requestHandle?.removeListener('error', this.error)
    this.response?.removeListener('close', this.cleanupResponse)
    this.response?.removeListener('end', this.cleanupResponse)
  }
}

/** Creates the production HTTPS transport while keeping its request seam testable. */
export const createNodeHttpsTransport =
  (
    factory: NodeHttpsRequestFactory = defaultRequestFactory
  ): NetworkInspectorDependencies['transport'] =>
  details =>
    new NodeTransportSession(details, factory).start()
