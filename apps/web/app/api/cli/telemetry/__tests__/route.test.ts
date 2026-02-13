import { createMockRequest } from '@/app/api/__tests__/test-helpers'
import { POST } from '@/app/api/cli/telemetry/route'

// Mock the shared Redis module
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockTtl = jest.fn()
const mockHincrby = jest.fn()
const mockExec = jest.fn().mockResolvedValue([])

const mockPipeline = jest.fn(() => ({
  hincrby: mockHincrby,
  expire: mockExpire,
  exec: mockExec
}))

const mockRedisClient = {
  incr: mockIncr,
  expire: mockExpire,
  ttl: mockTtl,
  pipeline: mockPipeline
}

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  getRawClient: jest.fn(() => mockRedisClient)
}))

describe('/api/cli/telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIncr.mockResolvedValue(1)
    mockExpire.mockResolvedValue(true)
    mockTtl.mockResolvedValue(50)
    mockExec.mockResolvedValue([])
  })

  describe('valid requests', () => {
    it('accepts a valid install event and returns ok', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'install', skills: 'astro' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('stores per-event daily counters via pipeline', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'init', skills: 'stripe,astro' }
      })

      await POST(request)

      expect(mockPipeline).toHaveBeenCalled()
      // event counter
      expect(mockHincrby).toHaveBeenCalledWith(
        expect.stringMatching(/^telemetry:events:\d{4}-\d{2}-\d{2}$/),
        'init',
        1
      )
      // skill counters — 2 skills × 2 calls each (daily + total)
      expect(mockHincrby).toHaveBeenCalledWith(
        expect.stringMatching(/^telemetry:daily:\d{4}-\d{2}-\d{2}$/),
        'stripe',
        1
      )
      expect(mockHincrby).toHaveBeenCalledWith('telemetry:skills:total', 'stripe', 1)
      expect(mockHincrby).toHaveBeenCalledWith(
        expect.stringMatching(/^telemetry:daily:\d{4}-\d{2}-\d{2}$/),
        'astro',
        1
      )
      expect(mockHincrby).toHaveBeenCalledWith('telemetry:skills:total', 'astro', 1)
      expect(mockExec).toHaveBeenCalled()
    })

    it('accepts all valid event types', async () => {
      for (const event of ['install', 'remove', 'init', 'update', 'search']) {
        jest.clearAllMocks()
        mockIncr.mockResolvedValue(1)
        mockExec.mockResolvedValue([])

        const request = createMockRequest('/api/cli/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { event }
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })

    it('stores per-agent-per-skill counters for install events', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'install', skills: 'stripe', agents: 'cursor,claude-code' }
      })

      await POST(request)

      expect(mockHincrby).toHaveBeenCalledWith('telemetry:skills:agents:stripe', 'cursor', 1)
      expect(mockHincrby).toHaveBeenCalledWith('telemetry:skills:agents:stripe', 'claude-code', 1)
    })

    it('does not store per-agent counters for non-install events', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'search', skills: 'stripe', agents: 'cursor' }
      })

      await POST(request)

      expect(mockHincrby).not.toHaveBeenCalledWith(
        expect.stringMatching(/^telemetry:skills:agents:/),
        expect.anything(),
        expect.anything()
      )
    })

    it('handles events without skills field', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'search' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      // Only event counter + 2 expire calls, no skill counters
      expect(mockHincrby).toHaveBeenCalledTimes(1)
    })
  })

  describe('validation', () => {
    it('rejects invalid event types with 400', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'hackattempt' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.ok).toBe(false)
      expect(data.error).toBe('Invalid event type')
    })

    it('rejects missing event field with 400', async () => {
      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { skills: 'astro' }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('rate limiting', () => {
    it('allows requests under the limit', async () => {
      mockIncr.mockResolvedValue(30)

      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4'
        },
        body: { event: 'install', skills: 'astro' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('returns 429 when rate limit exceeded', async () => {
      mockIncr.mockResolvedValue(61)
      mockTtl.mockResolvedValue(45)

      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4'
        },
        body: { event: 'install', skills: 'astro' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.ok).toBe(false)
      expect(data.error).toBe('Rate limit exceeded')
      expect(response.headers.get('Retry-After')).toBe('45')
    })

    it('sets expire on first request in window', async () => {
      mockIncr.mockResolvedValue(1)

      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'install' }
      })

      await POST(request)

      // Rate limit expire (count === 1 triggers expire)
      expect(mockExpire).toHaveBeenCalledWith(expect.stringMatching(/^telemetry:rate:/), 60)
    })
  })

  describe('graceful degradation', () => {
    it('returns ok when Redis is unavailable', async () => {
      const { getRawClient } = require('@/lib/redis')
      ;(getRawClient as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(null)

      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'install', skills: 'astro' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('returns ok even on unexpected errors', async () => {
      mockIncr.mockRejectedValue(new Error('Redis connection failed'))

      const request = createMockRequest('/api/cli/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { event: 'install' }
      })

      const response = await POST(request)
      const data = await response.json()

      // The outer catch returns ok:true to never block the CLI
      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })
  })
})
