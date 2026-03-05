'use client'

import { Alert, AlertDescription, AlertTitle } from '@thedaviddias/design-system/alert'
import { Button } from '@thedaviddias/design-system/button'
import { Form } from '@thedaviddias/design-system/form'
import { AlertTriangle } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { Step2Data } from './submit-form-schemas'
import { ContentFields } from './submit-form-step2-content-fields'
import { UrlFields } from './submit-form-step2-url-fields'
import { checkUrl, isSameDomain, normalizeDomain } from './submit-form-utils'

interface SubmitFormStep2Props {
  form: UseFormReturn<Step2Data>
  onSubmit: (data: Step2Data) => void
  isLoading: boolean
  fetchFailed?: boolean
  websiteUrlStatus: {
    checking: boolean
    accessible: boolean | null
    error?: string
  }
  llmsUrlStatus: {
    checking: boolean
    accessible: boolean | null
    error?: string
  }
  llmsFullUrlStatus: {
    checking: boolean
    accessible: boolean | null
    error?: string
  }
  setLlmsUrlStatus: (status: {
    checking: boolean
    accessible: boolean | null
    error?: string
  }) => void
  setLlmsFullUrlStatus: (status: {
    checking: boolean
    accessible: boolean | null
    error?: string
  }) => void
  onReset: () => void
}

/**
 * Step 2 of the submit form - Complete website details
 */
export function SubmitFormStep2({
  form,
  onSubmit,
  isLoading,
  fetchFailed,
  websiteUrlStatus,
  llmsUrlStatus,
  llmsFullUrlStatus,
  setLlmsUrlStatus,
  setLlmsFullUrlStatus,
  onReset
}: SubmitFormStep2Props) {
  /**
   * Validates domains with comprehensive error handling
   */
  const validateDomains = () => {
    const websiteUrl = form.getValues('website')
    const llmsUrl = form.getValues('llmsUrl')
    const llmsFullUrl = form.getValues('llmsFullUrl')

    // Clear existing custom errors first
    form.clearErrors(['llmsUrl', 'llmsFullUrl'])

    /**
     * Validates individual URL
     */
    const validateUrl = (url: string, _expectedDomain: string, type: 'llms' | 'llmsFull') => {
      const cleanedUrl = url.trim().replace(/[\r\n\t]/g, '')

      // Check if URL is valid format
      try {
        new URL(cleanedUrl)
      } catch {
        const field = type === 'llms' ? 'llmsUrl' : 'llmsFullUrl'
        form.setError(field, {
          type: 'manual',
          message: 'Invalid URL format. Please enter a valid URL.'
        })
        return false
      }

      // Check domain match
      if (!isSameDomain(websiteUrl, cleanedUrl)) {
        const urlDomain = normalizeDomain(cleanedUrl)
        const websiteDomain = normalizeDomain(websiteUrl)

        // Provide specific error messages for common cases
        let errorMessage = `Domain mismatch: expected ${websiteDomain}, got ${urlDomain}`

        if (urlDomain.startsWith('www.') || websiteDomain.startsWith('www.')) {
          errorMessage = 'Domain mismatch: www variations should resolve to the same domain'
        } else if (
          urlDomain.includes('.') &&
          websiteDomain.includes('.') &&
          urlDomain.split('.').slice(-2).join('.') === websiteDomain.split('.').slice(-2).join('.')
        ) {
          errorMessage = `Subdomain mismatch: ${type === 'llms' ? 'llms.txt' : 'llms-full.txt'} must be on the same domain as your website`
        }

        const field = type === 'llms' ? 'llmsUrl' : 'llmsFullUrl'
        form.setError(field, {
          type: 'manual',
          message: errorMessage
        })
        return false
      }

      // Check path validation
      const parsedUrl = new URL(cleanedUrl)
      const expectedPath = type === 'llms' ? '/llms.txt' : '/llms-full.txt'

      if (!parsedUrl.pathname.endsWith(expectedPath)) {
        const field = type === 'llms' ? 'llmsUrl' : 'llmsFullUrl'
        const fileName = type === 'llms' ? 'llms.txt' : 'llms-full.txt'
        form.setError(field, {
          type: 'manual',
          message: `URL must end with "${expectedPath}" for ${fileName} file`
        })
        return false
      }

      return true
    }

    // Validate llms.txt URL
    if (llmsUrl && websiteUrl) {
      validateUrl(llmsUrl, normalizeDomain(websiteUrl), 'llms')
    }

    // Validate llms-full.txt URL
    if (llmsFullUrl && websiteUrl) {
      validateUrl(llmsFullUrl, normalizeDomain(websiteUrl), 'llmsFull')
    }
  }

  /**
   * Checks llms URL accessibility
   */
  const checkLlmsUrl = (url: string) => checkUrl(url, setLlmsUrlStatus)
  /**
   * Checks llms-full URL accessibility
   */
  const checkLlmsFullUrl = (url: string) => checkUrl(url, setLlmsFullUrlStatus)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {fetchFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not fetch website information</AlertTitle>
            <AlertDescription>
              We were unable to automatically retrieve details for this website. Please fill in the
              fields below manually.
            </AlertDescription>
          </Alert>
        )}

        <UrlFields
          form={form}
          websiteUrlStatus={websiteUrlStatus}
          llmsUrlStatus={llmsUrlStatus}
          llmsFullUrlStatus={llmsFullUrlStatus}
          setLlmsUrlStatus={setLlmsUrlStatus}
          setLlmsFullUrlStatus={setLlmsFullUrlStatus}
          validateDomains={validateDomains}
          checkLlmsUrl={checkLlmsUrl}
          checkLlmsFullUrl={checkLlmsFullUrl}
        />

        <ContentFields form={form} />

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            onClick={onReset}
            className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 plausible-event-name=Form+Reset"
          >
            Reset
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900 plausible-event-name=Submit+Website"
          >
            {isLoading ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
