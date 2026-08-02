'use client'

import { useAuth } from '@thedaviddias/auth'
import type { ReactNode } from 'react'
import { SubmitFormGuidelines } from './submit-form-guidelines'

interface SubmitFormChromeProps {
  children: ReactNode
  showGuidelines: boolean
  showIntro: boolean
}

/**
 * Preserves the submission page introduction, account context, and guidelines around each step.
 */
export function SubmitFormChrome({ children, showGuidelines, showIntro }: SubmitFormChromeProps) {
  const { user } = useAuth()
  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)
  const userDisplayName =
    user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'Anonymous'

  return (
    <>
      {showIntro && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Submit your llms.txt</h1>
            <p className="text-muted-foreground">
              Enter your project's domain to automatically fetch your llms.txt information. You'll
              have a chance to review and edit the details before submitting.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    hasGitHubAuth
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-blue-100 dark:bg-blue-900'
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      hasGitHubAuth ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {hasGitHubAuth ? (
                    <>
                      <span className="text-green-700 dark:text-green-400">GitHub connected:</span>{' '}
                      Your submission will create a pull request under the account below:
                    </>
                  ) : (
                    <>
                      <span className="text-blue-700 dark:text-blue-400">Email account:</span> Your
                      submission will be reviewed and added to the directory
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {hasGitHubAuth && `Submitting as: ${userDisplayName}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
      {showGuidelines && <SubmitFormGuidelines />}
    </>
  )
}
