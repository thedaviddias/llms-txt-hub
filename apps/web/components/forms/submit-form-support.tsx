'use client'

import { Button } from '@thedaviddias/design-system/button'
import { useEffect, useRef, useState } from 'react'
import { useSubmissionAnalytics } from '@/components/analytics-tracker'

type SupportPlatform = 'x' | 'linkedin'

interface SupportChoice {
  label: string
  platform: SupportPlatform
  profileLabel: string
  url: string
}

interface SubmitFormSupportProps {
  isLoading: boolean
  onBack: () => void
  onSubmit: (support: { followAttested: true; platform: SupportPlatform }) => void
}

const SUPPORT_CHOICES: readonly SupportChoice[] = [
  {
    label: 'Follow David on X',
    platform: 'x',
    profileLabel: "Open David's X profile",
    url: 'https://x.com/thedaviddias'
  },
  {
    label: 'Follow David on LinkedIn',
    platform: 'linkedin',
    profileLabel: "Open David's LinkedIn profile",
    url: 'https://www.linkedin.com/in/thedaviddias/'
  }
]

/**
 * Collects the required social-support choice and truthful self-attestation.
 */
export function SubmitFormSupport({ isLoading, onBack, onSubmit }: SubmitFormSupportProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [platform, setPlatform] = useState<SupportPlatform>()
  const [profileOpened, setProfileOpened] = useState(false)
  const [followAttested, setFollowAttested] = useState(false)
  const submissionAnalytics = useSubmissionAnalytics()

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  /** Select one platform and invalidate any prior profile-open confirmation. */
  const selectPlatform = (nextPlatform: SupportPlatform) => {
    setPlatform(nextPlatform)
    setProfileOpened(false)
    setFollowAttested(false)
    submissionAnalytics.trackSubmissionSupportPlatformSelect({
      platform: nextPlatform,
      source: 'support_step'
    })
  }

  /** Submit only a complete, locally consistent support attestation. */
  const submitSupport = () => {
    if (!(platform && profileOpened && followAttested) || isLoading) return
    onSubmit({ followAttested: true, platform })
  }

  return (
    <section className="space-y-8" aria-labelledby="support-heading">
      <div className="space-y-3">
        <h1 ref={headingRef} id="support-heading" tabIndex={-1} className="text-3xl font-bold">
          Support the maintainer
        </h1>
        <p className="text-muted-foreground">
          Choose one profile to follow before finishing your submission. This is a self-attestation;
          we do not ask for your username or verify your account.
        </p>
      </div>

      <fieldset className="space-y-4" disabled={isLoading}>
        <legend className="text-base font-semibold">Choose one platform</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {SUPPORT_CHOICES.map(choice => {
            const selected = platform === choice.platform
            return (
              <div
                key={choice.platform}
                data-support-card=""
                data-state={selected ? 'selected' : 'unselected'}
                className={`space-y-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  selected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                    : 'border-border bg-card'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-3 font-medium">
                  <input
                    type="radio"
                    name="support-platform"
                    value={choice.platform}
                    checked={selected}
                    readOnly
                    onClick={() => selectPlatform(choice.platform)}
                    className="h-4 w-4"
                  />
                  {choice.label}
                </label>
                <a
                  href={choice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={choice.profileLabel}
                  onClick={() => {
                    if (selected) {
                      setProfileOpened(true)
                      submissionAnalytics.trackSubmissionProfileOpen({
                        platform: choice.platform,
                        source: 'support_step'
                      })
                    }
                  }}
                  className="inline-flex text-sm font-medium text-primary underline underline-offset-4"
                >
                  Open profile in a new tab
                </a>
              </div>
            )
          })}
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            aria-label="I follow David on this platform"
            checked={followAttested}
            readOnly
            disabled={!platform || !profileOpened || isLoading}
            onClick={() => {
              const nextFollowAttested = !followAttested
              setFollowAttested(nextFollowAttested)
              if (nextFollowAttested && platform) {
                submissionAnalytics.trackSubmissionFollowAttest({
                  platform,
                  source: 'support_step'
                })
              }
            }}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block font-medium">I follow David on this platform</span>
            <span className="block text-sm text-muted-foreground">
              Please confirm only after opening the selected profile.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
          Back to details
        </Button>
        <Button
          type="button"
          onClick={submitSupport}
          disabled={!platform || !profileOpened || !followAttested || isLoading}
        >
          {isLoading ? 'Finishing...' : 'Finish submission'}
        </Button>
      </div>
    </section>
  )
}
