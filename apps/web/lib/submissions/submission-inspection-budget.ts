/** Shared deadline and request allowance for one duplicate inspection. */
export interface SubmissionInspectionBudget {
  readonly request: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>
}

/** Build a fail-closed budget that aborts and bounds all inspection requests together. */
export const createSubmissionInspectionBudget = (options: {
  readonly deadlineMs: number
  readonly now: () => number
  readonly requestBudget: number
}): SubmissionInspectionBudget => {
  const deadlineAt = options.now() + options.deadlineMs
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.deadlineMs)
  if (typeof timeout === 'object') timeout.unref()
  const signal = controller.signal
  let remaining = options.requestBudget
  return {
    async request<T>(operation: (requestSignal: AbortSignal) => Promise<T>): Promise<T> {
      if (remaining <= 0 || signal.aborted || options.now() >= deadlineAt) {
        throw new Error('Duplicate inspection budget exhausted')
      }
      remaining -= 1
      let rejectAbort: ((reason: Error) => void) | undefined
      const abort = new Promise<never>((_resolve, reject) => {
        rejectAbort = reject
      })
      /** Reject the active operation when the shared deadline expires. */
      const handleAbort = () => rejectAbort?.(new Error('Duplicate inspection deadline exceeded'))
      signal.addEventListener('abort', handleAbort, { once: true })
      let result: T
      try {
        result = await Promise.race([operation(signal), abort])
      } finally {
        signal.removeEventListener('abort', handleAbort)
      }
      if (options.now() >= deadlineAt) {
        throw new Error('Duplicate inspection deadline exceeded')
      }
      return result
    }
  }
}
