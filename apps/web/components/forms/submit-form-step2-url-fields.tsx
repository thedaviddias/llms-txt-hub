'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@thedaviddias/design-system/form'
import { Input } from '@thedaviddias/design-system/input'
import type { UseFormReturn } from 'react-hook-form'
import { CheckIcon, XIcon } from './submit-form-icons'
import type { Step2Data } from './submit-form-schemas'
import { generateLlmsFullUrl } from './submit-form-utils'

interface UrlFieldsProps {
  form: UseFormReturn<Step2Data>
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
  validateDomains: () => void
  checkLlmsUrl: (url: string) => void
  checkLlmsFullUrl: (url: string) => void
}

/**
 * URL fields for Step 2 of the submit form
 */
export function UrlFields({
  form,
  websiteUrlStatus,
  llmsUrlStatus,
  llmsFullUrlStatus,
  setLlmsUrlStatus,
  setLlmsFullUrlStatus,
  validateDomains,
  checkLlmsUrl,
  checkLlmsFullUrl
}: UrlFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Website URL <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input className="px-4 py-2 rounded-lg" {...field} />
                {/* Status Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {websiteUrlStatus.checking && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  )}
                  {!websiteUrlStatus.checking && websiteUrlStatus.accessible === true && (
                    <div className="text-green-500" title="Website is accessible">
                      <CheckIcon />
                    </div>
                  )}
                  {!websiteUrlStatus.checking && websiteUrlStatus.accessible === false && (
                    <div
                      className="text-red-500"
                      title={websiteUrlStatus.error || 'Website is not accessible'}
                    >
                      <XIcon />
                    </div>
                  )}
                </div>
              </div>
            </FormControl>
            {websiteUrlStatus.accessible === false && websiteUrlStatus.error && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {websiteUrlStatus.error} - The website may still be valid for submission.
              </p>
            )}
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="llmsUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              llms.txt URL <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder="https://example.com/llms.txt"
                  className="px-4 py-2 rounded-lg"
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    // Validate domain and check URL accessibility when it changes
                    setTimeout(() => {
                      validateDomains()
                      if (e.target.value) {
                        checkLlmsUrl(e.target.value)
                      } else {
                        setLlmsUrlStatus({ checking: false, accessible: null })
                      }
                    }, 100) // Small delay to ensure form state is updated
                  }}
                />
                {/* Status Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {llmsUrlStatus.checking && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  )}
                  {!llmsUrlStatus.checking && llmsUrlStatus.accessible === true && (
                    <div className="text-green-500" title="URL is accessible">
                      <CheckIcon />
                    </div>
                  )}
                  {!llmsUrlStatus.checking && llmsUrlStatus.accessible === false && (
                    <div
                      className="text-red-500"
                      title={llmsUrlStatus.error || 'URL is not accessible'}
                    >
                      <XIcon />
                    </div>
                  )}
                </div>
              </div>
            </FormControl>
            {/* URL accessibility warning (non-blocking) */}
            {llmsUrlStatus.accessible === false && llmsUrlStatus.error && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {llmsUrlStatus.error} - The URL may still be valid for submission.
              </p>
            )}
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="llmsFullUrl"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>llms-full.txt URL (optional)</FormLabel>
              {!field.value && (
                <button
                  type="button"
                  onClick={() => {
                    const websiteUrl = form.getValues('website')
                    if (websiteUrl) {
                      const autoUrl = generateLlmsFullUrl(websiteUrl)
                      field.onChange(autoUrl)
                      setTimeout(() => {
                        validateDomains()
                        checkLlmsFullUrl(autoUrl)
                      }, 100)
                    }
                  }}
                  className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                >
                  Auto-generate
                </button>
              )}
            </div>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder="https://example.com/llms-full.txt"
                  className="px-4 py-2 rounded-lg"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => {
                    field.onChange(e)
                    // Validate domain and check URL accessibility when it changes
                    setTimeout(() => {
                      validateDomains()
                      if (e.target.value) {
                        checkLlmsFullUrl(e.target.value)
                      } else {
                        setLlmsFullUrlStatus({ checking: false, accessible: null })
                      }
                    }, 100) // Small delay to ensure form state is updated
                  }}
                />
                {/* Status Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {llmsFullUrlStatus.checking && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  )}
                  {!llmsFullUrlStatus.checking && llmsFullUrlStatus.accessible === true && (
                    <div className="text-green-500" title="URL is accessible">
                      <CheckIcon />
                    </div>
                  )}
                  {!llmsFullUrlStatus.checking &&
                    llmsFullUrlStatus.accessible === false &&
                    field.value && (
                      <div
                        className="text-red-500"
                        title={llmsFullUrlStatus.error || 'URL is not accessible'}
                      >
                        <XIcon />
                      </div>
                    )}
                </div>
              </div>
            </FormControl>
            {/* URL accessibility warning (non-blocking) */}
            {llmsFullUrlStatus.accessible === false && llmsFullUrlStatus.error && field.value && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {llmsFullUrlStatus.error} - The URL may still be valid for submission.
              </p>
            )}
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />
    </>
  )
}
