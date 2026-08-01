import { describe, expect, it, vi } from 'vitest'
import { createNetworkInspector } from './network-inspector.js'
import type {
  NetworkInspectorDependencies,
  PinnedTransportResponse,
  ReputationResult
} from './types.js'

const safeReputation: ReputationResult = {
  checkedAt: '2026-08-01T12:00:00.000Z',
  status: 'safe'
}

const emptyResponse = (): PinnedTransportResponse => ({
  body: {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('')
    }
  },
  headers: {},
  statusCode: 200
})

const dependencies = (
  overrides: Partial<NetworkInspectorDependencies> = {}
): NetworkInspectorDependencies => ({
  checkReputation: vi.fn(async () => safeReputation),
  now: () => new Date('2026-08-01T12:00:00.000Z'),
  resolve: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
  runWithTimeout: vi.fn(async (operation, _timeoutMs, parentSignal) =>
    operation(parentSignal ?? new AbortController().signal)
  ),
  transport: vi.fn(async () => emptyResponse()),
  ...overrides
})

describe('network inspector cancellation', () => {
  it('fails closed on timeout without exposing the raw error', async () => {
    const runWithTimeout = vi.fn(async () => {
      throw new Error('token=super-secret ETIMEDOUT upstream bytes')
    })
    const inspector = createNetworkInspector(dependencies({ runWithTimeout }))

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({ failure: { kind: 'timeout' }, ok: false })
    expect(JSON.stringify(result)).not.toContain('super-secret')
  })

  it('does not start transport after the total timeout while DNS is pending', async () => {
    let releaseDns: ((answers: readonly { address: string; family: number }[]) => void) | undefined
    const pendingDns = new Promise<readonly { address: string; family: number }[]>(resolve => {
      releaseDns = resolve
    })
    const transport = vi.fn(async () => emptyResponse())
    const runWithTimeout = vi.fn(async operation => {
      const controller = new AbortController()
      const lateOperation = operation(controller.signal)
      lateOperation.catch(() => undefined)
      controller.abort()
      throw new Error('controlled total timeout')
    })
    const inspector = createNetworkInspector(
      dependencies({ resolve: vi.fn(async () => pendingDns), runWithTimeout, transport })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })
    releaseDns?.([{ address: '93.184.216.34', family: 4 }])
    await Promise.resolve()
    await Promise.resolve()

    expect(result).toMatchObject({ failure: { kind: 'timeout' }, ok: false })
    expect(transport).not.toHaveBeenCalled()
  })

  it('does not start transport or leak a late rejection after total reputation timeout', async () => {
    vi.useFakeTimers()
    let rejectReputation: ((error: Error) => void) | undefined
    const pendingReputation = new Promise<ReputationResult>((_resolve, reject) => {
      rejectReputation = reject
    })
    const transport = vi.fn(async () => emptyResponse())
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      const inspector = createNetworkInspector({
        checkReputation: vi.fn(async () => pendingReputation),
        now: () => new Date('2026-08-01T12:00:00.000Z'),
        resolve: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
        transport
      })

      const resultPromise = inspector.inspect('https://example.com', { maxBytes: 100 })
      await vi.advanceTimersByTimeAsync(12_000)
      const result = await resultPromise
      rejectReputation?.(new Error('late private provider rejection'))
      await Promise.resolve()
      await Promise.resolve()

      expect(result).toMatchObject({ failure: { kind: 'timeout' }, ok: false })
      expect(transport).not.toHaveBeenCalled()
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
      vi.useRealTimers()
    }
  })

  it('closes the body and response before resolving a request timeout', async () => {
    let resolveBodyStarted: (() => void) | undefined
    const bodyStarted = new Promise<void>(resolve => {
      resolveBodyStarted = resolve
    })
    let iteratorReturned = false
    const body: AsyncIterable<Uint8Array> = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            resolveBodyStarted?.()
            return new Promise<IteratorResult<Uint8Array>>(() => undefined)
          },
          return: async () => {
            iteratorReturned = true
            return { done: true, value: undefined }
          }
        }
      }
    }
    const discard = vi.fn()
    const runWithTimeout: NetworkInspectorDependencies['runWithTimeout'] = async (
      operation,
      _timeoutMs,
      parentSignal
    ) => {
      if (!parentSignal) return operation(new AbortController().signal)
      const controller = new AbortController()
      const pending = operation(controller.signal)
      pending.catch(() => undefined)
      await bodyStarted
      controller.abort()
      throw new Error('controlled request timeout')
    }
    const inspector = createNetworkInspector(
      dependencies({
        runWithTimeout,
        transport: vi.fn(async () => ({ body, discard, headers: {}, statusCode: 200 }))
      })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({ failure: { kind: 'timeout' }, ok: false })
    expect(iteratorReturned).toBe(true)
    expect(discard).toHaveBeenCalledTimes(1)
  })
})
