describe('Redis safety boundary', () => {
  const originalEnvironment = process.env

  afterEach(() => {
    jest.useRealTimers()
    process.env = originalEnvironment
    jest.resetModules()
    jest.dontMock('@thedaviddias/logging')
    jest.dontMock('@upstash/redis')
  })

  it('retries GET once with fresh bounded signals and disables client retries', async () => {
    jest.useFakeTimers()
    process.env = {
      ...originalEnvironment,
      KV_REST_API_TOKEN: 'test-token',
      KV_REST_API_URL: 'https://redis.example.com',
      NODE_ENV: 'test'
    }
    let configuration: {
      retry?: { retries?: number }
      signal?: AbortSignal | (() => AbortSignal)
    } = {}
    const observedSignals: AbortSignal[] = []
    const waitForAbort = () => {
      if (typeof configuration.signal !== 'function') throw new Error('Missing signal factory')
      const signal = configuration.signal()
      observedSignals.push(signal)
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
    }
    const client = {
      eval: jest.fn().mockResolvedValue('allowed'),
      get: jest.fn().mockImplementation(waitForAbort),
      set: jest.fn().mockResolvedValue('OK')
    }
    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn().mockImplementation(options => {
        configuration = options
        return client
      })
    }))

    await jest.isolateModulesAsync(async () => {
      const redis = await import('./redis')
      const first = redis.get('opaque-key')
      // GET retries once, so each call makes two attempts with fresh deadlines
      await jest.advanceTimersByTimeAsync(1_500)
      await jest.advanceTimersByTimeAsync(1_500)
      await expect(first).resolves.toBeNull()
      expect(observedSignals).toHaveLength(2)
      const second = redis.get('opaque-key')
      expect(observedSignals[2]?.aborted).toBe(false)
      await jest.advanceTimersByTimeAsync(1_500)
      await jest.advanceTimersByTimeAsync(1_500)
      await expect(second).resolves.toBeNull()
      await redis.setNx('opaque-key', 'value', 60)
      await redis.evalRedis('return 1', ['opaque-key'], [])
    })

    expect(configuration.retry).toEqual({ retries: 0 })
    expect(typeof configuration.signal).toBe('function')
    if (typeof configuration.signal !== 'function') return
    expect(new Set(observedSignals).size).toBe(4)
    for (const signal of observedSignals) {
      expect(signal.aborted).toBe(true)
    }
    jest.useRealTimers()
  })

  it('logs missing production configuration once without values', async () => {
    process.env = { ...originalEnvironment, NODE_ENV: 'production' }
    delete process.env.KV_REST_API_TOKEN
    delete process.env.KV_REST_API_URL
    const error = jest.fn()
    jest.doMock('@thedaviddias/logging', () => ({ logger: { error, warn: jest.fn() } }))

    await jest.isolateModulesAsync(async () => {
      const redis = await import('./redis')
      await redis.get('sensitive-key')
      await redis.setNx('sensitive-key', 'secret-value', 60)
      await redis.evalRedis('return 1', ['sensitive-key'], [])
    })

    expect(error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(error.mock.calls)).not.toContain('sensitive-key')
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-value')
  })

  it('logs client initialization failure once without leaking configuration or exceptions', async () => {
    process.env = {
      ...originalEnvironment,
      KV_REST_API_TOKEN: 'super-secret-token',
      KV_REST_API_URL: 'https://redis.example.com',
      NODE_ENV: 'production'
    }
    const error = jest.fn()
    jest.doMock('@thedaviddias/logging', () => ({ logger: { error, warn: jest.fn() } }))
    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn().mockImplementation(() => {
        throw new Error('super-secret-token exploded')
      })
    }))

    await jest.isolateModulesAsync(async () => {
      const redis = await import('./redis')
      await redis.get('one')
      await redis.get('two')
    })

    expect(error).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(error.mock.calls)
    expect(logged).not.toContain('super-secret-token')
    expect(logged).not.toContain('exploded')
  })
})
