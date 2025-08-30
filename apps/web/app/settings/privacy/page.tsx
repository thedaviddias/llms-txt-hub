'use client'

import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'
import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { Download, Eye, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * Renders the Privacy Settings page and manages client-side privacy interactions.
 *
 * This component displays controls for profile visibility and data-rights actions,
 * keeps local UI state in sync with the authenticated user's public metadata,
 * and performs the necessary side effects when the user updates settings:
 * - Toggling profile visibility sends a POST to `/api/user/update-metadata`, updates local state optimistically,
 *   and on success reloads user data and refreshes the router. On failure it reverts local state and shows an error.
 * - Exporting data issues a GET to `/api/user/export-data` and triggers a JSON download of the returned payload.
 *
 * It also logs analytics events for page view, settings changes, profile visibility toggles, and data exports.
 *
 * The "Public Profile" control is disabled while the profile is considered incomplete
 * (missing first name, username, and GitHub username) to prevent accidental visibility changes.
 *
 * @returns The privacy settings page UI (JSX element).
 */
export default function PrivacySettingsPage() {
  const { user, isLoaded, reloadUser } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    profilePublic: true,
    trackingOptOut: false,
    analyticsOptOut: false
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check if profile is incomplete (needs name or username to be visible)
  const isProfileIncomplete = Boolean(
    user &&
      !user.user_metadata?.full_name &&
      !user.user_metadata?.user_name &&
      !user.publicMetadata?.github_username
  )

  // Load and sync real user privacy settings
  useEffect(() => {
    if (user && isLoaded) {
      const isProfilePrivate = user.publicMetadata?.isProfilePrivate === true
      const currentProfilePublic = !isProfilePrivate

      // Only update if the value has actually changed to prevent unnecessary re-renders
      setSettings(prev => {
        if (prev.profilePublic !== currentProfilePublic) {
          return {
            ...prev,
            profilePublic: currentProfilePublic
          }
        }
        return prev
      })
    }
  }, [user?.id, Boolean(user?.publicMetadata?.isProfilePrivate), isLoaded])

  useEffect(() => {
    analytics.settingsPageView('privacy', 'settings')
  }, [])

  /**
   * Handle privacy setting change
   * @param key - Setting key to change
   * @param value - New value for the setting
   */
  const handleSettingChange = async (key: string, value: boolean) => {
    if (key === 'profilePublic') {
      setIsLoading(true)

      // Update local state immediately for UI feedback
      setSettings(prev => ({ ...prev, [key]: value }))

      try {
        // Save to backend
        const response = await fetch('/api/user/update-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            isProfilePrivate: !value, // Invert since UI shows "Public" but metadata stores "Private"
            bio: user?.publicMetadata?.bio || null,
            work: user?.publicMetadata?.work || null,
            website: user?.publicMetadata?.website || null
          })
        })

        if (!response.ok) {
          // Revert on error
          setSettings(prev => ({ ...prev, [key]: !value }))
          const data = await response.json()
          toast.error(data.error || 'Failed to update privacy setting')
          return
        }

        // Track successful change
        analytics.settingsToggleChange(key, value, 'privacy')
        analytics.profileVisibilityToggle(value, 'settings-privacy')

        toast.success('Privacy setting updated')

        // Force reload user data to update all components
        await reloadUser()

        // Refresh to update all UI components
        router.refresh()
      } catch {
        // Revert on error
        setSettings(prev => ({ ...prev, [key]: !value }))
        toast.error('Failed to update privacy setting. Please try again.')
      } finally {
        setIsLoading(false)
      }
    } else {
      // For other settings, just update local state
      setSettings(prev => ({ ...prev, [key]: value }))
      analytics.settingsToggleChange(key, value, 'privacy')
      toast.success('Setting updated')
    }
  }

  /**
   * Handle data export request
   */
  const handleExportData = async () => {
    try {
      analytics.exportData('settings-privacy')
      toast.info('Preparing your data export...')

      const response = await fetch('/api/user/export-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const userData = await response.json()

      // Create downloadable JSON file
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      // Create download link
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `llms-txt-hub-data-export-${new Date().toISOString().split('T')[0]}.json`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Data export downloaded successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data. Please try again.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Privacy Settings</h2>
        <p className="text-muted-foreground">
          Control how your information is collected and displayed
        </p>
      </div>

      {/* Profile Privacy */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Profile Visibility
        </h3>

        <div className="space-y-4">
          {isProfileIncomplete && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Profile is hidden:</strong> Your profile won't appear in member listings
                because you haven't added a first name or username yet. Go to your profile and click
                "Edit Profile" to add this information.
              </p>
            </div>
          )}

          <div
            className={`flex items-center justify-between p-4 border rounded-lg ${isProfileIncomplete ? 'opacity-50' : ''}`}
          >
            <div>
              <div className="font-medium">Public Profile</div>
              <div className="text-sm text-muted-foreground">
                {isProfileIncomplete
                  ? 'Complete your profile to control visibility settings'
                  : 'Allow others to view your profile and contributions'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.profilePublic}
              onClick={() => {
                if (isProfileIncomplete) {
                  toast.warning(
                    'Please add a first name or username in your profile settings first'
                  )
                  return
                }
                handleSettingChange('profilePublic', !settings.profilePublic)
              }}
              disabled={isLoading || isProfileIncomplete}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.profilePublic ? 'bg-primary' : 'bg-input'}
                ${isLoading || isProfileIncomplete ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={isProfileIncomplete ? 'Complete your profile to enable this setting' : ''}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-background shadow-sm ring-0 transition-transform
                  ${settings.profilePublic ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Data Rights */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Your Data Rights
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Data Transparency</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
              We collect minimal data to provide our service. You have full control over your
              information and can request access or deletion at any time.
            </p>
            <div className="space-y-2 text-xs text-blue-700 dark:text-blue-300">
              <div>• Account information (email, username)</div>
              <div>• Favorite projects (stored locally and in cloud if signed in)</div>
              <div>• Submission history (public contributions)</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Export Your Data</div>
              <div className="text-sm text-muted-foreground">
                Download a complete copy of your account data
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Data Security
            </h4>
            <p className="text-sm text-muted-foreground">
              All data is encrypted in transit and at rest. We use industry-standard security
              measures and never share personal information with third parties without explicit
              consent.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
