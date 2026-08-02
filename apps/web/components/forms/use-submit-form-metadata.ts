'use client'

import { useEffect, useRef, useState } from 'react'
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
  reset: () => void
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
  const activeRequest = useRef<number | undefined>(undefined)
  const abortController = useRef<AbortController | undefined>(undefined)
  const generation = useRef(0)
  const mounted = useRef(true)
  const { trackFetchMetadataError, trackFetchMetadataSuccess, trackFormStepComplete } =
    useAnalyticsEvents()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current += 1
      abortController.current?.abort()
    }
  }, [])

  /** Return whether a metadata request still owns the active generation. */
  const isCurrentRequest = (requestId: number) =>
    mounted.current && generation.current === requestId && activeRequest.current === requestId

  /** Apply fetched or fallback details and advance to the editable step. */
  const applyDetails = (formData: Step2Data, failed: boolean) => {
    step2Form.reset(formData)
    setFetchFailed(failed)
    onDetailsReady()
  }

  /** Fetch safe metadata for the website entered in the first step. */
  const onFetchMetadata = async (data: Step1Data) => {
    if (activeRequest.current !== undefined) return
    const requestId = generation.current + 1
    generation.current = requestId
    activeRequest.current = requestId
    const controller = new AbortController()
    abortController.current = controller
    setIsLoading(true)
    trackFormStepComplete(1, 'submit-form', 'submit-page')

    try {
      const csrfMetaTag = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrfMetaTag?.content) headers['x-csrf-token'] = csrfMetaTag.content
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ website: data.website }),
        signal: controller.signal
      })
      if (!isCurrentRequest(requestId)) return
      if (!response.ok) {
        const message = await getMetadataErrorMessage(response)
        if (!isCurrentRequest(requestId)) return
        throw new Error(message)
      }

      const result: MetadataResponse = await response.json()
      if (!isCurrentRequest(requestId)) return
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
      if (!isCurrentRequest(requestId)) return
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
      if (isCurrentRequest(requestId)) {
        activeRequest.current = undefined
        abortController.current = undefined
        setIsLoading(false)
      }
    }
  }

  /** Invalidate pending metadata work and restore its local state. */
  const reset = () => {
    generation.current += 1
    abortController.current?.abort()
    abortController.current = undefined
    activeRequest.current = undefined
    setIsLoading(false)
    setFetchFailed(false)
  }

  return {
    fetchFailed,
    isLoading,
    onFetchMetadata,
    reset
  }
}
