'use client'

import { useEffect, useRef } from 'react'
import { checkUrl } from './submit-form-utils'

export interface SubmitUrlStatus {
  accessible: boolean | null
  checking: boolean
  error?: string
}

interface SubmitUrlCheck {
  check: (url: string) => Promise<void>
  invalidate: () => void
}

const EMPTY_STATUS: SubmitUrlStatus = { accessible: null, checking: false }

/**
 * Keeps URL-check results bound to the exact latest URL and request generation.
 */
export function useSubmitUrlCheck(
  getCurrentUrl: () => string,
  setStatus: (status: SubmitUrlStatus) => void
): SubmitUrlCheck {
  const abortController = useRef<AbortController | undefined>(undefined)
  const generation = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
      abortController.current?.abort()
    }
  }, [])

  /** Invalidate an old check before an edit, reset, or replacement request. */
  const invalidate = () => {
    generation.current += 1
    abortController.current?.abort()
    abortController.current = undefined
    setStatus(EMPTY_STATUS)
  }

  /** Check one captured URL and apply the result only while it remains current. */
  const check = async (url: string) => {
    const requestId = generation.current + 1
    generation.current = requestId
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller
    setStatus({ accessible: null, checking: true })

    const status = await checkUrl(url, controller.signal)
    if (!(mounted.current && generation.current === requestId && getCurrentUrl() === url)) return
    abortController.current = undefined
    setStatus(status)
  }

  return { check, invalidate }
}
