'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@thedaviddias/auth'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { SubmitFormGuidelines } from './submit-form-guidelines'
import { type Step1Data, type Step2Data, step1Schema, step2Schema } from './submit-form-schemas'
import { SubmitFormStep1 } from './submit-form-step1'
import { SubmitFormStep2 } from './submit-form-step2'
import { SubmitFormSuccess } from './submit-form-success'
import { generateLlmsUrl } from './submit-form-utils'

/**
 * Main form component for submitting websites
 */
export function SubmitForm() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [prUrl, setPrUrl] = useState<string>('')
  const [llmsUrlStatus, setLlmsUrlStatus] = useState<{
    checking: boolean
    accessible: boolean | null
    error?: string
  }>({
    checking: false,
    accessible: null
  })
  const [llmsFullUrlStatus, setLlmsFullUrlStatus] = useState<{
    checking: boolean
    accessible: boolean | null
    error?: string
  }>({
    checking: false,
    accessible: null
  })
  const [websiteUrlStatus] = useState<{
    checking: boolean
    accessible: boolean | null
    error?: string
  }>({
    checking: false,
    accessible: null
  })
  const { user } = useAuth()

  const {
    trackFormStepStart,
    trackFormStepComplete,
    trackFetchMetadataSuccess,
    trackFetchMetadataError,
    trackSubmitSuccess,
    trackSubmitError
  } = useAnalyticsEvents()

  // Determine submission type
  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)
  const userDisplayName =
    user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'Anonymous'

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

  // Track form start on component mount
  useEffect(() => {
    trackFormStepStart(1, 'submit-form', 'submit-page')
  }, [trackFormStepStart])

  /**
   * Fetches metadata for the website
   */
  async function onFetchMetadata(data: Step1Data) {
    setIsLoading(true)
    // Track step 1 completion
    trackFormStepComplete(1, 'submit-form', 'submit-page')

    try {
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ website: data.website })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch metadata')
      }

      const result = await response.json()

      if (result.isDuplicate) {
        // Track duplicate submission attempt
        trackFetchMetadataError(data.website, 'duplicate_website', 'submit-page')
        toast.warning(
          `This website is already in our directory under the name "${result.existingWebsite.name}".`
        )
        setIsLoading(false)
        return
      }

      // Track successful metadata fetch
      trackFetchMetadataSuccess(data.website, 'submit-page')

      // Auto-generate llms.txt URL if not provided
      const autoLlmsUrl = result.metadata.llmsUrl || generateLlmsUrl(data.website)

      // Pre-populate form with fetched metadata
      step2Form.reset({
        name: result.metadata.name || '',
        description: result.metadata.description || '',
        mdxContent: '',
        website: data.website,
        llmsUrl: autoLlmsUrl,
        llmsFullUrl: result.metadata.llmsFullUrl || '', // Only use if found in metadata, don't auto-generate
        category: result.metadata.category || ''
      })

      setStep(2)
      // Track step 2 start
      trackFormStepStart(2, 'submit-form', 'submit-page')
      toast.success('Website info fetched. Please review and complete the submission.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Track metadata fetch error
      trackFetchMetadataError(data.website, errorMessage, 'submit-page')
      toast.error('Failed to fetch website information. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Submits the final form data
   */
  async function onSubmitStep2(values: Step2Data) {
    setIsLoading(true)
    // Track step 2 completion
    trackFormStepComplete(2, 'submit-form', 'submit-page')

    try {
      const formData = new FormData()
      // Set current date for publishedAt
      const currentDate = new Date().toISOString().split('T')[0]

      // Process values before adding to formData
      const processedValues = {
        ...values,
        name: values.name.trim() // Trim title/name
      }

      // Add all form values except publishedAt
      Object.entries(processedValues).forEach(([key, value]) => {
        if (key !== 'publishedAt' && value) {
          formData.append(key, value)
        }
      })
      // Add the current date as publishedAt
      formData.append('publishedAt', currentDate)

      const result = await submitLlmsTxt(formData)

      if (result.success && result.prUrl) {
        // Track successful submission
        trackSubmitSuccess(values.website, values.category, 'submit-page')
        toast.success('Your PR has been created successfully!')
        setPrUrl(result.prUrl as string)
        setStep(3)
        // Track step 3 start (success page)
        trackFormStepStart(3, 'submit-form', 'submit-page')
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Track submission error
      trackSubmitError(values.website, errorMessage, 'submit-page')
      toast.error(
        error instanceof Error
          ? error.message
          : 'There was an error submitting your llms.txt. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Resets the form to initial state
   */
  function handleReset() {
    step2Form.reset()
    step1Form.reset()
    setStep(1)
  }

  /**
   * Resets form for another submission
   */
  function _handleSubmitAnother() {
    setPrUrl('')
    step1Form.reset()
    step2Form.reset()
    setStep(1)
  }

  return (
    <>
      {(step === 1 || step === 2) && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Submit your llms.txt</h1>
            <p className="text-muted-foreground">
              Enter your project's domain to automatically fetch your llms.txt information. You'll
              have a chance to review and edit the details before submitting.
            </p>
          </div>

          {/* User submission info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {hasGitHubAuth ? (
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {hasGitHubAuth ? (
                    <>
                      <span className="text-green-700 dark:text-green-400">GitHub connected:</span>{' '}
                      Your submission will create a pull request under your account
                    </>
                  ) : (
                    <>
                      <span className="text-blue-700 dark:text-blue-400">Email account:</span> Your
                      submission will be reviewed and added to the directory
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {hasGitHubAuth && `Submitting as: ${userDisplayName}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 ? (
        <SubmitFormStep1 form={step1Form} onSubmit={onFetchMetadata} isLoading={isLoading} />
      ) : step === 2 ? (
        <SubmitFormStep2
          form={step2Form}
          onSubmit={onSubmitStep2}
          isLoading={isLoading}
          websiteUrlStatus={websiteUrlStatus}
          llmsUrlStatus={llmsUrlStatus}
          llmsFullUrlStatus={llmsFullUrlStatus}
          setLlmsUrlStatus={setLlmsUrlStatus}
          setLlmsFullUrlStatus={setLlmsFullUrlStatus}
          onReset={handleReset}
        />
      ) : (
        <SubmitFormSuccess prUrl={prUrl} onSubmitAnother={handleReset} />
      )}

      {/* Add guidelines for all steps except success */}
      {step !== 3 && <SubmitFormGuidelines />}
    </>
  )
}
