'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { preflightSubmission } from '@/actions/preflight-submission'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { useSubmissionAnalytics } from '@/components/analytics-tracker'
import { getCSRFTokenForClient } from '@/lib/csrf-client'
import type { SupportPlatform } from '@/lib/submissions/submission-support'
import { appendSubmissionFields, type PreparedSubmission } from './submission-field-analytics'
import type { Step2Data } from './submit-form-schemas'

/**

 * A completed entry gate, retained while the user edits or retries a submission.

 */
export interface SubmissionSupport {
  platform: SupportPlatform
}
type SubmissionResult =
  | { outcome: 'automatic' | 'manual'; prUrl: string }
  | { outcome: 'rejected' | 'retry_later'; message: string }
interface PublicationSnapshot {
  fields: PreparedSubmission
  continuationToken: string
}
const RETRY_MESSAGE =
  'We could not finish the submission. Your details are still here. Please try again.'

/**

 * Coordinate one preflight/final request at a time and retain exact retry fields.

 */
export function useSubmitPublication(support: SubmissionSupport | undefined) {
  const analytics = useSubmissionAnalytics()
  const [result, setResult] = useState<SubmissionResult>()
  const [isLoading, setIsLoading] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const snapshot = useRef<PublicationSnapshot | undefined>(undefined)
  const activeRequest = useRef<number | undefined>(undefined)
  const generation = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
    }
  }, [])

  /**

   * Claim a request before an asynchronous boundary to prevent double submission.

   */
  const begin = () => {
    if (activeRequest.current !== undefined || !support) return
    const id = ++generation.current
    activeRequest.current = id
    setIsLoading(true)
    return id
  }
  /**
   * Check whether this mounted flow still owns the request.
   */
  const current = (id: number) =>
    mounted.current && activeRequest.current === id && generation.current === id
  /**
   * Release only the request that currently owns the busy state.
   */
  const finish = (id: number) => {
    if (activeRequest.current !== id) return
    activeRequest.current = undefined
    if (mounted.current) setIsLoading(false)
  }
  /**
   * Bind the field snapshot to its CSRF token and selected social platform.
   */
  const payload = (fields: PreparedSubmission) => {
    const form = new FormData()
    form.set('_csrf', getCSRFTokenForClient())
    form.set('supportPlatform', support?.platform ?? '')
    appendSubmissionFields(form, fields)
    return form
  }

  /**

   * Reuse the exact publication continuation when a response may have been lost.

   */
  const publish = async (prepared: PublicationSnapshot, id: number) => {
    if (!support) return
    const startedAt = analytics.startFinal(support.platform)
    const form = payload(prepared.fields)
    form.set('continuationToken', prepared.continuationToken)
    try {
      const response = await submitLlmsTxt(form)
      if (!current(id)) return
      analytics.finishFinal(response, support.platform, startedAt)
      if (response.success) {
        toast.success('Your pull request has been created successfully!')
        snapshot.current = undefined
        setResult({ outcome: response.outcome, prUrl: response.prUrl })
      } else {
        setCanRetry(response.recovery === 'same_submission')
        setResult({ outcome: response.outcome, message: response.error })
      }
    } catch {
      if (!current(id)) return
      analytics.failFinal(support.platform, startedAt)
      setCanRetry(true)
      toast.error(RETRY_MESSAGE)
      setResult({ outcome: 'retry_later', message: RETRY_MESSAGE })
    }
  }

  /**

   * Validate the editable snapshot, then publish without another social step.

   */
  const submit = async (values: Step2Data, onAccepted?: () => void) => {
    const id = begin()
    if (id === undefined) return
    snapshot.current = undefined
    setCanRetry(false)
    const startedAt = analytics.startPreflight()
    try {
      onAccepted?.()
      const fields = {
        ...values,
        name: values.name.trim(),
        publishedAt: new Date().toISOString().slice(0, 10)
      }
      const response = await preflightSubmission(payload(fields))
      if (!current(id)) return
      analytics.finishPreflight(response, startedAt)
      if (response.status !== 'support_required') {
        setResult({ outcome: response.status, message: response.message })
        return
      }
      const prepared = { fields, continuationToken: response.continuationToken }
      snapshot.current = prepared
      await publish(prepared, id)
    } catch {
      if (!current(id)) return
      analytics.failPreflight(startedAt)
      toast.error(RETRY_MESSAGE)
      setResult({ outcome: 'retry_later', message: RETRY_MESSAGE })
    } finally {
      finish(id)
    }
  }

  /**

   * Retry only a potentially incomplete final publication, retaining idempotency.

   */
  const retry = async () => {
    const prepared = snapshot.current
    if (!prepared || !canRetry) return
    const id = begin()
    if (id === undefined) return
    try {
      await publish(prepared, id)
    } finally {
      finish(id)
    }
  }

  /**

   * Discard stale publication authorization before editing, without clearing form values.

   */
  const reset = () => {
    if (activeRequest.current !== undefined) return
    generation.current += 1
    snapshot.current = undefined
    setCanRetry(false)
    setResult(undefined)
  }
  return { analytics, canRetry, isLoading, reset, result, retry, submit }
}
