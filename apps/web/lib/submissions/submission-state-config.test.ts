describe('submission signing configuration boundary', () => {
  afterEach(() => {
    jest.resetModules()
    jest.dontMock('@thedaviddias/logging')
  })

  it('logs an unavailable signing secret once without leaking input or configuration', async () => {
    const error = jest.fn()
    jest.doMock('@thedaviddias/logging', () => ({ logger: { error } }))

    await jest.isolateModulesAsync(async () => {
      const { consumeSubmissionContinuation, createSubmissionContinuation } = await import(
        './submission-state'
      )
      await createSubmissionContinuation(
        { fields: { website: 'sensitive.example' }, submissionId: 'sub_123', userId: 'user_123' },
        {
          now: () => new Date('2026-08-01T12:00:00.000Z'),
          redis: { eval: jest.fn(), get: jest.fn(), setNx: jest.fn() },
          secret: 'short-secret'
        }
      )
      await consumeSubmissionContinuation(
        { continuationToken: 'sensitive-token', fields: {}, userId: 'user_123' },
        {
          now: () => new Date('2026-08-01T12:00:00.000Z'),
          redis: { eval: jest.fn(), get: jest.fn(), setNx: jest.fn() },
          secret: ''
        }
      )
    })

    expect(error).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(error.mock.calls)
    expect(logged).not.toContain('short-secret')
    expect(logged).not.toContain('sensitive-token')
    expect(logged).not.toContain('sensitive.example')
  })
})
