'use client'

import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'

interface SubmitFormSuccessProps {
  prUrl: string
  onSubmitAnother: () => void
}

/**
 * Success state of the submit form
 */
export function SubmitFormSuccess({ prUrl, onSubmitAnother }: SubmitFormSuccessProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Successfully Submitted! 🎉</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your llms.txt has been submitted successfully. A pull request has been created for review.
        </p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              role="img"
              aria-label="Success checkmark"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Pull Request Created
            </h3>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>View your pull request on GitHub:</p>
              <Link
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-green-900 dark:hover:text-green-100"
              >
                {prUrl}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">What happens next?</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>Your pull request will be reviewed by the maintainers</li>
          <li>Once approved, your llms.txt will be added to the directory</li>
          <li>You'll be notified via GitHub when the PR is merged</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <Button onClick={onSubmitAnother} variant="outline">
          Submit Another
        </Button>
        <Link href="/">
          <Button variant="ghost">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}
