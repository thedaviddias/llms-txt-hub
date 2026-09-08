'use client'

import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { recordSubmissionSupport } from '@/actions/record-submission-support'
import { useSubmissionAnalytics } from '@/components/analytics-tracker'
import { getCSRFTokenForClient } from '@/lib/csrf-client'
import type { SupportPlatform } from '@/lib/submissions/submission-support'
import type { SubmissionSupport } from './use-submit-publication'

const PROFILES = [
  {
    platform: 'linkedin',
    label: 'Follow or connect on LinkedIn',
    detail: 'David Dias',
    url: 'https://www.linkedin.com/in/thedaviddias/'
  },
  {
    platform: 'x',
    label: 'Follow David on X',
    detail: '@thedaviddias',
    url: 'https://x.com/thedaviddias'
  }
] satisfies ReadonlyArray<{ platform: SupportPlatform; label: string; detail: string; url: string }>

/**

 * Invite a profile visit and unlock the form only after its server receipt is issued.

 */
export function SubmitFormSupport({
  onContinue,
  analytics: sharedAnalytics
}: {
  onContinue: (support: SubmissionSupport) => void
  analytics?: ReturnType<typeof useSubmissionAnalytics>
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const busy = useRef(false)
  const mounted = useRef(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const localAnalytics = useSubmissionAnalytics()
  const analytics = sharedAnalytics ?? localAnalytics
  const trackView = useRef(analytics.trackSubmissionSupportView)
  useEffect(() => {
    mounted.current = true
    heading.current?.focus()
    trackView.current()
    return () => {
      mounted.current = false
    }
  }, [])

  /**

   * Keep native new-tab navigation while recording only the chosen platform.

   */
  const openProfile = async (event: MouseEvent<HTMLAnchorElement>, platform: SupportPlatform) => {
    event.nativeEvent.stopImmediatePropagation()
    if (busy.current) {
      event.preventDefault()
      return
    }
    busy.current = true
    setIsLoading(true)
    setError(undefined)
    const properties = { attemptId: analytics.getAttemptId(), platform, source: 'support_step' }
    analytics.trackSubmissionSupportPlatformSelect(properties)
    analytics.trackSubmissionProfileOpen(properties)
    const form = new FormData()
    form.set('_csrf', getCSRFTokenForClient())
    form.set('supportPlatform', platform)
    try {
      const response = await recordSubmissionSupport(form)
      if (!mounted.current) return
      if (response.success) onContinue({ platform, token: response.token })
      else setError(response.error)
    } catch {
      if (mounted.current) setError('We could not open the submission form. Please try again.')
    } finally {
      busy.current = false
      if (mounted.current) setIsLoading(false)
    }
  }

  return (
    <section aria-labelledby="support-heading" className="space-y-6" aria-busy={isLoading}>
      <div className="space-y-3">
        <h1
          ref={heading}
          id="support-heading"
          tabIndex={-1}
          className="text-3xl font-bold focus:outline-none"
        >
          Follow or connect with David
        </h1>
        <p className="text-muted-foreground">
          Stay connected with the creator of llms.txt Hub. Follow David on X, or follow or connect
          with him on LinkedIn, then submit your website.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILES.map(profile => (
          <a
            key={profile.platform}
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={isLoading}
            onClick={event => {
              void openProfile(event, profile.platform)
            }}
            onAuxClick={event => {
              if (event.button === 1) void openProfile(event, profile.platform)
            }}
            className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block font-semibold">
              {profile.label} <span aria-hidden="true">↗</span>
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{profile.detail}</span>
          </a>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Already following or connected? Open either profile to continue.
      </p>
      <p className="border-t pt-4 text-sm text-muted-foreground" role="status">
        {isLoading
          ? 'Opening your submission form…'
          : 'Your form appears after you click a profile.'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
