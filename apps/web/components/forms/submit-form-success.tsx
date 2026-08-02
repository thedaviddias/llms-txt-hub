'use client'

import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

type SubmissionResult =
  | { readonly outcome: 'automatic' | 'manual'; readonly prUrl: string }
  | { readonly message: string; readonly outcome: 'rejected' | 'retry_later' }

interface SubmitFormSuccessProps {
  result: SubmissionResult
  onSubmitAnother: () => void
}

const AUTOMATIC_COPY =
  'Your submission passed our checks and will be published automatically after repository validation.'
const MANUAL_COPY =
  'Your submission is safe to review, but one or more directory guidelines need a maintainer decision.'

const resultCopy = (result: SubmissionResult): string => {
  if ('message' in result) return result.message
  if (result.outcome === 'automatic') return AUTOMATIC_COPY
  return MANUAL_COPY
}

const resultHeading = (outcome: SubmissionResult['outcome']): string => {
  if (outcome === 'automatic') return 'Submission accepted'
  if (outcome === 'manual') return 'Submission ready for review'
  if (outcome === 'rejected') return 'Submission not published'
  return 'Verification unavailable'
}

/**
 * Displays the truthful final publication outcome and a PR link only after success.
 */
export function SubmitFormSuccess({ result, onSubmitAnother }: SubmitFormSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const successful = result.outcome === 'automatic' || result.outcome === 'manual'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section
      className="space-y-8"
      aria-labelledby="submission-result-heading"
      role={successful ? 'status' : 'alert'}
    >
      <div className="space-y-4">
        <h1
          ref={headingRef}
          id="submission-result-heading"
          tabIndex={-1}
          className="text-2xl font-semibold"
        >
          {resultHeading(result.outcome)}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{resultCopy(result)}</p>
      </div>

      {successful && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <h2 className="text-sm font-medium text-green-800 dark:text-green-200">
            Pull request created
          </h2>
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            Repository validation continues on GitHub.
          </p>
          <Link
            href={result.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex font-medium text-green-800 underline underline-offset-4 dark:text-green-200"
          >
            View pull request
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onSubmitAnother} variant="outline">
          Submit another
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  )
}
