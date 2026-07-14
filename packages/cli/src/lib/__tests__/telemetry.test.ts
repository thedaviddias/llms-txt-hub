import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('telemetry', () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('__CLI_VERSION__', 'test-version')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks payloads that contain corrected agent attribution', async () => {
    const { track } = await import('../telemetry.js')

    track({ event: 'install', skills: 'turbo', agents: 'cursor' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://llmstxthub.com/api/cli/telemetry',
      expect.objectContaining({
        body: JSON.stringify({
          event: 'install',
          skills: 'turbo',
          agents: 'cursor',
          schemaVersion: 2,
          version: 'test-version'
        })
      })
    )
  })
})
