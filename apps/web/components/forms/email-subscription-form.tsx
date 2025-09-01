'use client'

import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { Label } from '@thedaviddias/design-system/label'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'

interface EmailSubscriptionFormProps {
  /** Form title */
  title?: string
  /** Form description */
  description?: string
  /** Compact mode (inline form) */
  compact?: boolean
  /** Custom CSS classes */
  className?: string
}

interface FormData {
  email: string
}

export function EmailSubscriptionForm({
  title = 'Never miss an update from llms.txt hub!',
  description = 'Join our newsletter for AI documentation insights and best practices.',
  compact = false,
  className = ''
}: EmailSubscriptionFormProps) {
  const emailId = useId()
  const [formData, setFormData] = useState<FormData>({
    email: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleEmailChange = (value: string) => {
    setFormData({ email: value })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Get CSRF token from meta tag if it exists
      const csrfToken =
        typeof document !== 'undefined'
          ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          : ''

      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          email: formData.email
          // Groups are handled server-side based on provider configuration
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSubmitStatus('success')
        // Reset form after successful submission
        setFormData({
          email: ''
        })
      } else {
        setSubmitStatus('error')
        setErrorMessage(result.error || 'Failed to subscribe. Please try again.')
      }
    } catch (_error) {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>

        <div className={`${compact ? 'max-w-lg mx-auto' : ''}`}>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Successfully subscribed!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Thank you for subscribing! Please check your email to confirm your subscription.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>

      {/* Email Field */}
      <div className={`space-y-2 ${compact ? 'max-w-lg mx-auto' : ''}`}>
        <Label htmlFor={emailId} className={compact ? 'sr-only' : ''}>
          Email address *
        </Label>
        <div className={`flex gap-2 ${compact ? '' : 'flex-col sm:flex-row'}`}>
          <Input
            id={emailId}
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={e => handleEmailChange(e.target.value)}
            required
            className="plausible-event-name=Newsletter+Input+Focus px-4 py-2 rounded-lg flex-1"
          />
          <Button
            type="submit"
            disabled={isSubmitting || !formData.email}
            className="plausible-event-name=Newsletter+Submit whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              'Subscribe'
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {submitStatus === 'error' && (
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Privacy Notice */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        By subscribing, you agree to receive email updates. You can unsubscribe at any time.
      </p>
    </form>
  )
}
