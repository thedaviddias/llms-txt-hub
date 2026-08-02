'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { preflightSubmission } from '@/actions/preflight-submission'
import { type FinalSubmissionResult, submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { SubmitFormChrome } from './submit-form-chrome'
import { type Step1Data, type Step2Data, step1Schema, step2Schema } from './submit-form-schemas'
import { SubmitFormStep1 } from './submit-form-step1'
import { SubmitFormStep2 } from './submit-form-step2'
import { SubmitFormSuccess } from './submit-form-success'
import { SubmitFormSupport } from './submit-form-support'
import { useSubmitFormMetadata } from './use-submit-form-metadata'
import type { SubmitUrlStatus } from './use-submit-url-check'

type SubmitStep = 'website' | 'details' | 'support' | 'result'

type PreparedSubmission = Step2Data & { readonly publishedAt: string }

type Continuation = { readonly submissionId: string; readonly token: string }

type SubmissionResult =
  | { readonly outcome: 'automatic' | 'manual'; readonly prUrl: string }
  | { readonly message: string; readonly outcome: 'rejected' | 'retry_later' }

const RETRY_MESSAGE =
  'We could not safely verify this site right now. Nothing was published. Please try again later.'

/**
 * Append the normalized preflight snapshot to an action payload.
 */
const appendSubmissionFields = (formData: FormData, values: PreparedSubmission) => {
  for (const [key, value] of Object.entries(values)) {
    if (value) formData.append(key, value)
  }
}

/**
 * Main form component for submitting websites
 */
export function SubmitForm() {
  const [step, setStep] = useState<SubmitStep>('website')
  const [isLoading, setIsLoading] = useState(false)
  const [focusTarget, setFocusTarget] = useState<'details' | 'website'>()
  const [preparedSubmission, setPreparedSubmission] = useState<PreparedSubmission>()
  const [continuation, setContinuation] = useState<Continuation>()
  const [result, setResult] = useState<SubmissionResult>()
  const activeRequest = useRef<number | undefined>(undefined)
  const flowGeneration = useRef(0)
  const requestGeneration = useRef(0)
  const mounted = useRef(true)
  const [llmsUrlStatus, setLlmsUrlStatus] = useState<SubmitUrlStatus>({
    checking: false,
    accessible: null
  })
  const [llmsFullUrlStatus, setLlmsFullUrlStatus] = useState<SubmitUrlStatus>({
    checking: false,
    accessible: null
  })
  const [websiteUrlStatus] = useState<SubmitUrlStatus>({ checking: false, accessible: null })
  const { trackFormStepStart, trackFormStepComplete, trackSubmitSuccess, trackSubmitError } =
    useAnalyticsEvents()

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      website: ''
    }
  })

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      name: '',
      description: '',
      mdxContent: '',
      website: '',
      llmsUrl: '',
      llmsFullUrl: null,
      category: ''
    }
  })

  const metadata = useSubmitFormMetadata(step2Form, () => {
    setStep('details')
    trackFormStepStart(2, 'submit-form', 'submit-page')
  })

  useEffect(() => {
    trackFormStepStart(1, 'submit-form', 'submit-page')
  }, [trackFormStepStart])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      flowGeneration.current += 1
    }
  }, [])

  /** Return whether a submission request still owns the active flow generation. */
  const isCurrentRequest = (requestId: number, generation: number) =>
    mounted.current && activeRequest.current === requestId && flowGeneration.current === generation

  /** Claim the shared preflight/final request guard with a monotonic request ID. */
  const beginRequest = () => {
    if (activeRequest.current !== undefined) return
    const requestId = requestGeneration.current + 1
    requestGeneration.current = requestId
    activeRequest.current = requestId
    return { generation: flowGeneration.current, requestId }
  }

  /** Release only the exact request that currently owns the shared guard. */
  const finishRequest = (requestId: number) => {
    if (activeRequest.current !== requestId) return
    activeRequest.current = undefined
    if (mounted.current) setIsLoading(false)
  }

  /**
   * Submits the final form data
   */
  async function onSubmitStep2(values: Step2Data) {
    const request = beginRequest()
    if (!request) return
    setIsLoading(true)
    trackFormStepComplete(2, 'submit-form', 'submit-page')

    try {
      const prepared = {
        ...values,
        name: values.name.trim(),
        publishedAt: new Date().toISOString().split('T')[0] ?? ''
      }
      const formData = new FormData()
      const csrfMetaTag = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
      if (csrfMetaTag?.content) {
        formData.append('_csrf', csrfMetaTag.content)
      }
      appendSubmissionFields(formData, prepared)

      const preflightResult = await preflightSubmission(formData)
      if (!isCurrentRequest(request.requestId, request.generation)) return
      if (preflightResult.status === 'support_required') {
        setPreparedSubmission(prepared)
        setContinuation({
          submissionId: preflightResult.submissionId,
          token: preflightResult.continuationToken
        })
        setStep('support')
        trackFormStepStart(3, 'submit-form', 'submit-page')
      } else {
        setResult({
          message:
            preflightResult.status === 'retry_later' ? RETRY_MESSAGE : preflightResult.message,
          outcome: preflightResult.status
        })
        setStep('result')
        trackFormStepStart(4, 'submit-form', 'submit-page')
      }
    } catch (error) {
      if (!isCurrentRequest(request.requestId, request.generation)) return
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      trackSubmitError(values.website, errorMessage, 'submit-page')
      toast.error(RETRY_MESSAGE)
      setResult({ message: RETRY_MESSAGE, outcome: 'retry_later' })
      setStep('result')
    } finally {
      finishRequest(request.requestId)
    }
  }

  /**
   * Performs the final reassessment with the exact preflight fields and support attestation.
   */
  async function onSubmitSupport(support: { followAttested: true; platform: 'x' | 'linkedin' }) {
    const request = beginRequest()
    if (!request) return
    setIsLoading(true)
    trackFormStepComplete(3, 'submit-form', 'submit-page')

    try {
      if (!(preparedSubmission && continuation)) {
        setResult({ message: RETRY_MESSAGE, outcome: 'retry_later' })
        setStep('result')
        return
      }
      const formData = new FormData()
      const csrfMetaTag = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
      if (csrfMetaTag?.content) formData.append('_csrf', csrfMetaTag.content)
      appendSubmissionFields(formData, preparedSubmission)
      formData.append('continuationToken', continuation.token)
      formData.append('supportPlatform', support.platform)
      formData.append('followAttested', String(support.followAttested))

      const finalResult: FinalSubmissionResult = await submitLlmsTxt(formData)
      if (!isCurrentRequest(request.requestId, request.generation)) return
      if (finalResult.success) {
        trackSubmitSuccess(preparedSubmission.website, preparedSubmission.category, 'submit-page')
        toast.success('Your pull request has been created successfully!')
        setResult({ outcome: finalResult.outcome, prUrl: finalResult.prUrl })
      } else {
        const message = finalResult.outcome === 'retry_later' ? RETRY_MESSAGE : finalResult.error
        trackSubmitError(preparedSubmission.website, message, 'submit-page')
        setResult({ message, outcome: finalResult.outcome })
      }
      setStep('result')
      trackFormStepStart(4, 'submit-form', 'submit-page')
    } catch {
      if (!isCurrentRequest(request.requestId, request.generation)) return
      setResult({ message: RETRY_MESSAGE, outcome: 'retry_later' })
      setStep('result')
      toast.error(RETRY_MESSAGE)
    } finally {
      finishRequest(request.requestId)
    }
  }

  /**
   * Returns to editable details and discards the single-use continuation.
   */
  function handleBackToDetails() {
    if (activeRequest.current !== undefined) return
    flowGeneration.current += 1
    setContinuation(undefined)
    setPreparedSubmission(undefined)
    setFocusTarget('details')
    setStep('details')
  }

  /**
   * Resets the form to initial state
   */
  function handleReset() {
    flowGeneration.current += 1
    step2Form.reset()
    step1Form.reset()
    setContinuation(undefined)
    setPreparedSubmission(undefined)
    setResult(undefined)
    setLlmsUrlStatus({ checking: false, accessible: null })
    setLlmsFullUrlStatus({ checking: false, accessible: null })
    metadata.reset()
    setFocusTarget('website')
    setStep('website')
  }

  return (
    <SubmitFormChrome
      showIntro={step === 'website' || step === 'details'}
      showGuidelines={step !== 'result'}
    >
      {step === 'website' ? (
        <SubmitFormStep1
          form={step1Form}
          onSubmit={metadata.onFetchMetadata}
          isLoading={metadata.isLoading}
          shouldFocus={focusTarget === 'website'}
          onFocusComplete={() => setFocusTarget(undefined)}
        />
      ) : step === 'details' ? (
        <SubmitFormStep2
          form={step2Form}
          onSubmit={onSubmitStep2}
          isLoading={isLoading}
          fetchFailed={metadata.fetchFailed}
          websiteUrlStatus={websiteUrlStatus}
          llmsUrlStatus={llmsUrlStatus}
          llmsFullUrlStatus={llmsFullUrlStatus}
          setLlmsUrlStatus={setLlmsUrlStatus}
          setLlmsFullUrlStatus={setLlmsFullUrlStatus}
          onReset={handleReset}
          shouldFocus={focusTarget === 'details'}
          onFocusComplete={() => setFocusTarget(undefined)}
        />
      ) : step === 'support' && continuation ? (
        <SubmitFormSupport
          key={continuation.submissionId}
          isLoading={isLoading}
          onBack={handleBackToDetails}
          onSubmit={onSubmitSupport}
        />
      ) : (
        result && <SubmitFormSuccess result={result} onSubmitAnother={handleReset} />
      )}
    </SubmitFormChrome>
  )
}
