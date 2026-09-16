'use client'

import { SiX } from '@icons-pack/react-simple-icons'
import { Linkedin } from 'lucide-react'
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

interface SubmitFormSupportProps {
  /** Shared submission analytics lifecycle, when already created by the parent form. */
  analytics?: ReturnType<typeof useSubmissionAnalytics>
  /** Continues the client flow after an allowlisted profile opens. */
  onContinue: (support: SubmissionSupport) => void
}

interface OpenProfileInput {
  event: MouseEvent<HTMLAnchorElement>
  platform: SupportPlatform
}

/**
 * Invite a profile visit and unlock the form after its server acknowledgement.
 *
 * @param props - Social entry-step configuration
 * @param props.analytics - Optional shared submission analytics lifecycle
 * @param props.onContinue - Continues the client flow with the selected platform
 * @returns The branded LinkedIn and X entry step
 * @example
 * <SubmitFormSupport onContinue={setSupport} />
 */
export function SubmitFormSupport({
  onContinue,
  analytics: sharedAnalytics
}: SubmitFormSupportProps) {
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
   *
   * @param input - Native click event and selected platform
   * @returns A promise that settles after the acknowledgement request
   */
  async function openProfile({ event, platform }: OpenProfileInput): Promise<void> {
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
      if (response.success) onContinue({ platform })
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
              void openProfile({ event, platform: profile.platform })
            }}
            onAuxClick={event => {
              if (event.button === 1) void openProfile({ event, platform: profile.platform })
            }}
            className={`group flex items-center gap-4 rounded-xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              profile.platform === 'linkedin'
                ? 'border-blue-200 bg-blue-50/70 hover:border-[#0A66C2] hover:bg-blue-100/70 focus-visible:ring-[#0A66C2] dark:border-blue-900 dark:bg-blue-950/30 dark:hover:border-blue-500 dark:hover:bg-blue-950/60'
                : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 focus-visible:ring-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${
                profile.platform === 'linkedin'
                  ? 'bg-[#0A66C2] text-white'
                  : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
              }`}
            >
              {profile.platform === 'linkedin' ? (
                <Linkedin className="size-6" aria-hidden="true" />
              ) : (
                <SiX className="size-6" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={`block font-semibold ${profile.platform === 'linkedin' ? 'text-[#0A66C2] dark:text-blue-200' : 'text-foreground'}`}
              >
                {profile.label} <span aria-hidden="true">↗</span>
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{profile.detail}</span>
            </span>
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
