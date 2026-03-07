'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getRoute } from '@/lib/routes'

export const UNINSTALL_REASONS = [
  'It did not work on my sites',
  'Too noisy or distracting',
  'Missing key features',
  'I only needed it temporarily',
  'I found a better alternative',
  'Other'
] as const

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

interface UninstallFeedbackFormProps {
  version?: string
  lang?: string
}

/**
 * Anonymous uninstall feedback form used by extension lifecycle flows.
 *
 * @param version - Optional extension version from query params
 * @param lang - Optional UI language from query params
 * @returns Feedback form or success state UI
 */
export function UninstallFeedbackForm({ version, lang }: UninstallFeedbackFormProps) {
  const [reason, setReason] = useState<string>('')
  const [comment, setComment] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const remainingCharacters = useMemo(() => 1000 - comment.length, [comment])

  /**
   * Validate and submit uninstall feedback.
   *
   * @param event - Form submit event
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const trimmedReason = reason.trim()
    const trimmedComment = comment.trim()

    if (!trimmedReason) {
      setErrorMessage('Please choose a reason before submitting.')
      return
    }

    if (trimmedComment.length > 1000) {
      setErrorMessage('Comments must be 1000 characters or fewer.')
      return
    }

    try {
      setSubmitState('submitting')

      const response = await fetch('/api/extension-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'uninstall',
          reason: trimmedReason,
          comment: trimmedComment || undefined,
          version,
          lang,
          submittedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitState('success')
    } catch (error) {
      setSubmitState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback')
    }
  }

  if (submitState === 'success') {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/50 p-8 space-y-4">
        <h2 className="text-2xl font-semibold">Thanks for the feedback</h2>
        <p className="text-muted-foreground">
          Your response helps us improve the extension without collecting personal identifiers.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={getRoute('home')} className="underline">
            Go to llms.txt Hub
          </Link>
          <Link
            href="https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Chrome Web Store
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border/50 bg-card/50 p-6 sm:p-8 space-y-6"
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What led you to uninstall?
        </legend>

        <div className="grid gap-2">
          {UNINSTALL_REASONS.map(option => (
            <label
              key={option}
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
            >
              <input
                type="radio"
                name="reason"
                value={option}
                checked={reason === option}
                onChange={event => setReason(event.target.value)}
                className="mt-1"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor="comment"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Additional comments (optional)
        </label>
        <textarea
          id="comment"
          name="comment"
          value={comment}
          onChange={event => setComment(event.target.value)}
          maxLength={1000}
          rows={5}
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          placeholder="If you'd like, share what would have made this more useful."
        />
        <p className="text-xs text-muted-foreground">{remainingCharacters} characters remaining</p>
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitState === 'submitting'}
          className="inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
        >
          {submitState === 'submitting' ? 'Submitting…' : 'Submit feedback'}
        </button>
        <Link href={getRoute('home')} className="text-sm underline">
          Skip and continue
        </Link>
      </div>
    </form>
  )
}
