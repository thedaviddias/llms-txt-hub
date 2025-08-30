'use client'

import { AccountInfo } from '@/components/settings/account-info'
import { DangerZone } from '@/components/settings/danger-zone'
import { SecuritySection } from '@/components/settings/security-section'
import { analytics } from '@/lib/analytics'
import { useAuth } from '@thedaviddias/auth'
import { useEffect } from 'react'

/**
 * Renders the Account Settings page.
 *
 * Displays account information, security settings, and a danger zone for destructive actions.
 * On mount, records a settings page view via the analytics service.
 *
 * Derived values passed to child components:
 * - hasGitHubAuth: true when the user's metadata contains a GitHub username or name.
 * - displayName: GitHub username/name when available, otherwise the email local-part or a fallback.
 * - accountType: "GitHub" when GitHub auth is present, otherwise "Email".
 * - userData: a sanitized user object (id, optional email, optional user_metadata with github_username and user_name) or null.
 *
 * @returns The Account Settings page JSX.
 */
export default function AccountSettingsPage() {
  const { user } = useAuth()

  useEffect(() => {
    analytics.settingsPageView('account', 'settings')
  }, [])

  const hasGitHubAuth = Boolean(
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)
  )
  const displayName = hasGitHubAuth
    ? user?.user_metadata?.github_username || user?.user_metadata?.user_name || 'GitHub User'
    : user?.email?.split('@')[0] || 'User'
  const accountType = hasGitHubAuth ? 'GitHub' : 'Email'

  // Transform user data to match expected interface
  const userData = user
    ? {
        id: user.id,
        email: user.email || undefined,
        user_metadata: user.user_metadata
          ? {
              github_username: user.user_metadata.github_username || undefined,
              user_name: user.user_metadata.user_name || undefined
            }
          : undefined
      }
    : null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your account information and security preferences
        </p>
      </div>

      <AccountInfo
        user={userData}
        hasGitHubAuth={hasGitHubAuth}
        displayName={displayName}
        accountType={accountType}
      />

      <SecuritySection hasGitHubAuth={hasGitHubAuth} />

      <DangerZone user={userData} />
    </div>
  )
}
