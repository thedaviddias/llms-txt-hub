'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { Github, Mail } from 'lucide-react'
import Link from 'next/link'
import type React from 'react'
import { AuthTierIndicator } from '@/components/auth/auth-tier-indicator'
import { Card } from '@/components/ui/card'
import { UserMessageBanner } from '@/components/ui/user-message-banner'

interface AuthCheckProps {
  children: React.ReactNode
  requireGitHub?: boolean
  fallbackContent?: React.ReactNode
}

/**
 * Renders children only when auth requirements are met, showing sign-in prompts otherwise
 */
export function AuthCheck({ children, requireGitHub = false, fallbackContent }: AuthCheckProps) {
  const { user, signIn } = useAuth()

  // Check if user has GitHub integration
  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)

  // Determine if user meets requirements
  const meetsRequirements = requireGitHub ? hasGitHubAuth : user

  if (!meetsRequirements) {
    if (fallbackContent) {
      return <>{fallbackContent}</>
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {requireGitHub && user && !hasGitHubAuth ? (
          // User has email account but needs GitHub for this feature
          <>
            <UserMessageBanner
              icon="alert-circle"
              title="GitHub Connection Required"
              description="To submit projects directly, you need to connect your GitHub account. This helps us verify project ownership and maintain quality."
              variant="warning"
            />

            <Card className="p-6 text-center space-y-4">
              <h2 className="text-2xl font-bold">Connect GitHub to Continue</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You're signed in with an email account. Connect your GitHub account to unlock direct
                project submissions and contributor features.
              </p>

              <div className="pt-4">
                <Button asChild className="w-full max-w-sm">
                  <Link href="/auth/connect-github">
                    <Github className="mr-2 h-4 w-4" />
                    Connect GitHub Account
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Alternatively, you can{' '}
                <Link
                  href="https://github.com/thedaviddias/llms-txt-hub?tab=readme-ov-file#adding-your-project"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  submit directly to the GitHub repository
                </Link>
                .
              </p>
            </Card>
          </>
        ) : (
          // No account at all
          <Card className="p-8 text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {requireGitHub ? 'Sign in to submit your llms.txt' : 'Join the Community'}
              </h2>
              <p className="text-muted-foreground">
                {requireGitHub
                  ? "Choose how you'd like to get started with the llms.txt hub."
                  : 'Create an account to unlock all features and join our growing community.'}
              </p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              {/* Primary CTA based on requirement */}
              {requireGitHub ? (
                <>
                  <Button onClick={() => signIn()} className="w-full">
                    <Github className="mr-2 h-4 w-4" />
                    Sign in with GitHub
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    <span>Just want to browse? </span>
                    <Button asChild variant="outline" className="w-full mt-2">
                      <Link href="/auth/email-signup">
                        <Mail className="mr-2 h-4 w-4" />
                        Create Email Account
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link href="/auth/email-signup">
                      <Mail className="mr-2 h-4 w-4" />
                      Quick Email Signup
                    </Link>
                  </Button>

                  <Button onClick={() => signIn()} variant="outline" className="w-full">
                    <Github className="mr-2 h-4 w-4" />
                    Sign in with GitHub
                  </Button>
                </>
              )}
            </div>

            {requireGitHub && (
              <p className="text-sm text-muted-foreground">
                Don't want to sign in? You can always{' '}
                <Link
                  href="https://github.com/thedaviddias/llms-txt-hub?tab=readme-ov-file#adding-your-project"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  submit directly to the GitHub repository
                </Link>
                .
              </p>
            )}

            {/* Auth tier comparison */}
            <div className="pt-6 border-t">
              <AuthTierIndicator showUpgrade={false} />
            </div>
          </Card>
        )}
      </div>
    )
  }

  return <>{children}</>
}
