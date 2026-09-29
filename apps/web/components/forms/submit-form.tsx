'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { useSubmissionFieldTracking } from './submission-field-analytics'
import { SubmitFormChrome } from './submit-form-chrome'
import { type Step1Data, type Step2Data, step1Schema, step2Schema } from './submit-form-schemas'
import { SubmitFormStep1 } from './submit-form-step1'
import { SubmitFormStep2 } from './submit-form-step2'
import { SubmitFormSuccess } from './submit-form-success'
import { SubmitFormSupport } from './submit-form-support'
import { useSubmitFormMetadata } from './use-submit-form-metadata'
import { type SubmissionSupport, useSubmitPublication } from './use-submit-publication'
import type { SubmitUrlStatus } from './use-submit-url-check'

/**

 * Preserve the full submission form behind a required maintainer-profile entry step.

 */
export function SubmitForm() {
  const [step, setStep] = useState<'website' | 'details'>('website')
  const [support, setSupport] = useState<SubmissionSupport>()
  const [focusTarget, setFocusTarget] = useState<'details' | 'website'>()
  const [llmsUrlStatus, setLlmsUrlStatus] = useState<SubmitUrlStatus>({
    checking: false,
    accessible: null
  })
  const [llmsFullUrlStatus, setLlmsFullUrlStatus] = useState<SubmitUrlStatus>({
    checking: false,
    accessible: null
  })
  const publication = useSubmitPublication(support)
  const { trackFormStepStart, trackFormStepComplete } = useAnalyticsEvents()
  const trackPageView = useRef(publication.analytics.trackSubmissionPageView)
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { website: '' }
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
  const fieldTracking = useSubmissionFieldTracking(
    step2Form,
    step === 'details' && !!support && !publication.result,
    publication.analytics
  )
  const metadata = useSubmitFormMetadata(step2Form, () => {
    setFocusTarget('details')
    setStep('details')
    trackFormStepStart(3, 'submit-form', 'submit-page')
  })
  useEffect(() => {
    trackPageView.current()
  }, [])

  /**

   * Begin a new listing without making an existing supporter repeat the entry step.

   */
  const handleReset = () => {
    if (publication.isLoading) return
    publication.reset()
    step1Form.reset({ website: '' })
    step2Form.reset({
      name: '',
      description: '',
      mdxContent: '',
      website: '',
      llmsUrl: '',
      llmsFullUrl: null,
      category: ''
    })
    fieldTracking.reset()
    setLlmsUrlStatus({ checking: false, accessible: null })
    setLlmsFullUrlStatus({ checking: false, accessible: null })
    metadata.reset()
    setFocusTarget('website')
    setStep('website')
  }
  /**
   * Return to the existing draft and require fresh checks after any edit.
   */
  const handleEdit = () => {
    if (publication.isLoading) return
    publication.reset()
    setFocusTarget('details')
    setStep('details')
  }

  return (
    <SubmitFormChrome
      step={!support ? 'support' : publication.result ? 'result' : step}
      showIntro={!!support && !publication.result}
      showGuidelines={!!support && !publication.result}
    >
      {!support ? (
        <SubmitFormSupport
          analytics={publication.analytics}
          onContinue={choice => {
            setSupport(choice)
            setFocusTarget(step)
            trackFormStepComplete(1, 'submit-form', 'submit-page')
            trackFormStepStart(step === 'website' ? 2 : 3, 'submit-form', 'submit-page')
          }}
        />
      ) : publication.result ? (
        <SubmitFormSuccess
          result={publication.result}
          onSubmitAnother={handleReset}
          onEdit={handleEdit}
          onRetry={publication.canRetry ? publication.retry : undefined}
          isLoading={publication.isLoading}
          onSupport={() => {
            publication.reset()
            setSupport(undefined)
          }}
        />
      ) : step === 'website' ? (
        <SubmitFormStep1
          form={step1Form}
          onSubmit={metadata.onFetchMetadata}
          isLoading={metadata.isLoading}
          shouldFocus={focusTarget === 'website'}
          onFocusComplete={() => setFocusTarget(undefined)}
        />
      ) : (
        <SubmitFormStep2
          form={step2Form}
          onSubmit={values =>
            publication.submit(values, () => {
              fieldTracking.capture(values)
              trackFormStepComplete(3, 'submit-form', 'submit-page')
            })
          }
          isLoading={publication.isLoading}
          fetchFailed={metadata.fetchFailed}
          websiteUrlStatus={{ checking: false, accessible: null }}
          llmsUrlStatus={llmsUrlStatus}
          llmsFullUrlStatus={llmsFullUrlStatus}
          setLlmsUrlStatus={setLlmsUrlStatus}
          setLlmsFullUrlStatus={setLlmsFullUrlStatus}
          onReset={handleReset}
          shouldFocus={focusTarget === 'details'}
          onFocusComplete={() => setFocusTarget(undefined)}
        />
      )}
    </SubmitFormChrome>
  )
}
