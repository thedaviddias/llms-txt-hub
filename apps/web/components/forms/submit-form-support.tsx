'use client'

import { Button } from '@thedaviddias/design-system/button'
import { useState } from 'react'

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
    label: 'Support on X',
    platform: 'x',
    profileLabel: "Open David's X profile",
    url: 'https://x.com/thedaviddias'
  },
  {
    label: 'Support on LinkedIn',
    platform: 'linkedin',
    profileLabel: "Open David's LinkedIn profile",
    url: 'https://www.linkedin.com/in/thedaviddias/'
  }
]

/**
 * Collects a submitter's optional social-support choice and truthful self-attestation.
 */
export function SubmitFormSupport({ isLoading, onBack, onSubmit }: SubmitFormSupportProps) {
  const [platform, setPlatform] = useState<SupportPlatform>()
  const [profileOpened, setProfileOpened] = useState(false)
  const [followAttested, setFollowAttested] = useState(false)

  /** Select one platform and invalidate any prior profile-open confirmation. */
  const selectPlatform = (nextPlatform: SupportPlatform) => {
    setPlatform(nextPlatform)
    setProfileOpened(false)
    setFollowAttested(false)
  }

  /** Submit only a complete, locally consistent support attestation. */
  const submitSupport = () => {
    if (!(platform && profileOpened && followAttested) || isLoading) return
    onSubmit({ followAttested: true, platform })
  }

  return (
    <section className="space-y-8" aria-labelledby="support-heading">
      <div className="space-y-3">
        <h1 id="support-heading" className="text-3xl font-bold">
          Support the directory
        </h1>
        <p className="text-muted-foreground">
          Choose one profile to follow before finishing your submission. This is a self-attestation;
          we do not ask for your username or verify your account.
        </p>
      </div>

      <fieldset className="space-y-4" disabled={isLoading}>
        <legend className="text-base font-semibold">Choose one platform</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {SUPPORT_CHOICES.map(choice => (
            <div
              key={choice.platform}
              className="space-y-3 rounded-lg border border-border bg-card p-4"
            >
              <label className="flex cursor-pointer items-center gap-3 font-medium">
                <input
                  type="radio"
                  name="support-platform"
                  value={choice.platform}
                  checked={platform === choice.platform}
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
                  if (platform === choice.platform) setProfileOpened(true)
                }}
                className="inline-flex text-sm font-medium text-primary underline underline-offset-4"
              >
                Open profile in a new tab
              </a>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            aria-label="I follow David on this platform"
            checked={followAttested}
            readOnly
            disabled={!platform || !profileOpened || isLoading}
            onClick={() => setFollowAttested(current => !current)}
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
