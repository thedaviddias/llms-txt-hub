import { describe, expect, it } from 'vitest'
import { createNodeHttpsTransport } from './node-https-transport.js'
import type {
  NodeHttpsRequestFactory,
  NodeHttpsRequestHandle,
  NodeHttpsResponseHandle
} from './types.js'

/**
 * Minimal response handle for lifecycle assertions.
 */
class FakeNodeResponse implements NodeHttpsResponseHandle {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>> = {
    'content-type': 'text/plain'
  }
  readonly statusCode = 200
  destroyCount = 0
  private readonly listeners = new Map<string, Set<() => void>>()

  destroy(): void {
    this.destroyCount += 1
  }

  emit(event: 'close' | 'end'): void {
    for (const listener of this.listeners.get(event) ?? []) listener()
  }

  once(event: 'close' | 'end', listener: () => void): unknown {
    const listeners = this.listeners.get(event) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
    return this
  }

  removeListener(event: 'close' | 'end', listener: () => void): unknown {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    yield Buffer.from('body')
  }
}

/**
 * Minimal request handle for lifecycle assertions.
 */
class FakeNodeRequest implements NodeHttpsRequestHandle {
  destroyCount = 0
  endCount = 0
  timeoutMs?: number
  timeoutListener?: () => void
  private errorListener?: (error: Error) => void

  destroy(): void {
    this.destroyCount += 1
  }

  end(): void {
    this.endCount += 1
  }

  once(_event: 'error', listener: (error: Error) => void): unknown {
    this.errorListener = listener
    return this
  }

  removeListener(_event: 'error', listener: (error: Error) => void): unknown {
    if (this.errorListener === listener) this.errorListener = undefined
    return this
  }

  setTimeout(timeoutMs: number, listener: () => void): unknown {
    this.timeoutMs = timeoutMs
    this.timeoutListener = listener
    return this
  }
}

describe('createNodeHttpsTransport', () => {
  it.each([
    ['93.184.216.34', 4],
    ['2606:4700:4700::1111', 6]
  ] as const)('pins only selected address %s with family %s', async (address, family) => {
    let capturedOptions: Parameters<NodeHttpsRequestFactory>[0] | undefined
    let respond: ((response: NodeHttpsResponseHandle) => void) | undefined
    const outbound = new FakeNodeRequest()
    const factory: NodeHttpsRequestFactory = (options, onResponse) => {
      capturedOptions = options
      respond = onResponse
      return outbound
    }
    const controller = new AbortController()
    const transport = createNodeHttpsTransport(factory)
    const pending = transport({
      address,
      family,
      headers: {
        'accept-encoding': 'identity',
        'user-agent': 'llms-txt-hub-submission-inspector/1.0'
      },
      hostname: 'example.com',
      servername: 'example.com',
      signal: controller.signal,
      timeoutMs: 5_000,
      url: 'https://example.com/docs?q=1'
    })

    const responseHandle = new FakeNodeResponse()
    respond?.(responseHandle)
    await pending

    expect(capturedOptions).toMatchObject({
      agent: false,
      headers: {
        'accept-encoding': 'identity',
        'user-agent': 'llms-txt-hub-submission-inspector/1.0'
      },
      hostname: 'example.com',
      method: 'GET',
      path: '/docs?q=1',
      port: 443,
      servername: 'example.com',
      signal: controller.signal
    })
    expect(capturedOptions?.host).toBeUndefined()
    expect(capturedOptions?.checkServerIdentity).toBeUndefined()
    expect(capturedOptions?.rejectUnauthorized).toBeUndefined()

    let singleAddress: string | undefined
    let singleFamily: number | undefined
    capturedOptions?.lookup?.('example.com', { all: false }, (_error, result, resultFamily) => {
      if (typeof result === 'string') singleAddress = result
      singleFamily = resultFamily
    })
    expect(singleAddress).toBe(address)
    expect(singleFamily).toBe(family)

    let allAddresses: readonly { address: string; family: number }[] = []
    capturedOptions?.lookup?.('example.com', { all: true }, (_error, result) => {
      if (Array.isArray(result)) allAddresses = result
    })
    expect(allAddresses).toEqual([{ address, family }])
  })

  it('destroys the active request and response on abort, then cleans listeners on end', async () => {
    let respond: ((response: NodeHttpsResponseHandle) => void) | undefined
    const outbound = new FakeNodeRequest()
    const factory: NodeHttpsRequestFactory = (_options, onResponse) => {
      respond = onResponse
      return outbound
    }
    const controller = new AbortController()
    const transport = createNodeHttpsTransport(factory)
    const pending = transport({
      address: '93.184.216.34',
      family: 4,
      headers: {},
      hostname: 'example.com',
      servername: 'example.com',
      signal: controller.signal,
      timeoutMs: 5_000,
      url: 'https://example.com/'
    })
    const responseHandle = new FakeNodeResponse()
    respond?.(responseHandle)
    await pending

    controller.abort()
    expect(outbound.destroyCount).toBe(1)
    expect(responseHandle.destroyCount).toBe(1)

    const cleanupController = new AbortController()
    const cleanOutbound = new FakeNodeRequest()
    let cleanRespond: ((response: NodeHttpsResponseHandle) => void) | undefined
    const cleanTransport = createNodeHttpsTransport((_options, onResponse) => {
      cleanRespond = onResponse
      return cleanOutbound
    })
    const cleanPending = cleanTransport({
      address: '93.184.216.34',
      family: 4,
      headers: {},
      hostname: 'example.com',
      servername: 'example.com',
      signal: cleanupController.signal,
      timeoutMs: 5_000,
      url: 'https://example.com/'
    })
    const cleanResponse = new FakeNodeResponse()
    cleanRespond?.(cleanResponse)
    await cleanPending
    cleanResponse.emit('end')
    cleanupController.abort()

    expect(cleanOutbound.destroyCount).toBe(0)
    expect(cleanResponse.destroyCount).toBe(0)
  })

  it('destroys and rejects the request when the socket timeout fires', async () => {
    const outbound = new FakeNodeRequest()
    const transport = createNodeHttpsTransport(() => outbound)
    const controller = new AbortController()
    const pending = transport({
      address: '93.184.216.34',
      family: 4,
      headers: {},
      hostname: 'example.com',
      servername: 'example.com',
      signal: controller.signal,
      timeoutMs: 5_000,
      url: 'https://example.com/'
    })
    const rejection = expect(pending).rejects.toThrow('submission-request-timeout')

    expect(outbound.timeoutMs).toBe(5_000)
    outbound.timeoutListener?.()

    await rejection
    expect(outbound.destroyCount).toBe(1)
  })
})
