'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { FETCH_METADATA_FALLBACK_MESSAGE, getMetadataErrorMessage } from './submit-form-errors'
import type { Step1Data, Step2Data } from './submit-form-schemas'
import { generateLlmsUrl } from './submit-form-utils'

interface SubmitFormMetadata {
  fetchFailed: boolean
  isLoading: boolean
  onFetchMetadata: (data: Step1Data) => Promise<void>
  resetFetchFailure: () => void
}

interface MetadataResponse {
  existingWebsite?: { readonly name?: string }
  isDuplicate?: boolean
  metadata?: Partial<Step2Data>
}

/**
 * Fetches and applies website metadata before the editable details step.
 */
export function useSubmitFormMetadata(
  step2Form: UseFormReturn<Step2Data>,
  onDetailsReady: () => void
): SubmitFormMetadata {
  const [isLoading, setIsLoading] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)
  const { trackFetchMetadataError, trackFetchMetadataSuccess, trackFormStepComplete } =
    useAnalyticsEvents()

  /** Apply fetched or fallback details and advance to the editable step. */
  const applyDetails = (formData: Step2Data, failed: boolean) => {
    step2Form.reset(formData)
    setFetchFailed(failed)
    onDetailsReady()
  }

  /** Fetch safe metadata for the website entered in the first step. */
  const onFetchMetadata = async (data: Step1Data) => {
    setIsLoading(true)
    trackFormStepComplete(1, 'submit-form', 'submit-page')

    try {
      const csrfMetaTag = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrfMetaTag?.content) headers['x-csrf-token'] = csrfMetaTag.content
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ website: data.website })
      })
      if (!response.ok) throw new Error(await getMetadataErrorMessage(response))

      const result: MetadataResponse = await response.json()
      if (result.isDuplicate) {
        trackFetchMetadataError(data.website, 'duplicate_website', 'submit-page')
        toast.warning(
          `This website is already in our directory under the name "${result.existingWebsite?.name ?? 'Unknown'}".`
        )
        return
      }

      const metadata = result.metadata ?? {}
      trackFetchMetadataSuccess(data.website, 'submit-page')
      applyDetails(
        {
          name: metadata.name ?? '',
          description: metadata.description ?? '',
          mdxContent: '',
          website: data.website,
          llmsUrl: metadata.llmsUrl || generateLlmsUrl(data.website),
          llmsFullUrl: metadata.llmsFullUrl || '',
          category: metadata.category ?? ''
        },
        false
      )
      toast.success('Website info fetched. Please review and complete the submission.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : FETCH_METADATA_FALLBACK_MESSAGE
      trackFetchMetadataError(data.website, errorMessage, 'submit-page')
      toast.error(errorMessage)
      applyDetails(
        {
          name: '',
          description: '',
          mdxContent: '',
          website: data.website,
          llmsUrl: generateLlmsUrl(data.website),
          llmsFullUrl: '',
          category: ''
        },
        true
      )
    } finally {
      setIsLoading(false)
    }
  }

  return {
    fetchFailed,
    isLoading,
    onFetchMetadata,
    resetFetchFailure: () => setFetchFailed(false)
  }
}
