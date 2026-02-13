'use client'

import { useAuth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { AlertTriangle, CheckCircle, ExternalLink, Github } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

export default function IntegrationsSettingsPage() {
  const { user } = useAuth()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    analytics.settingsPageView('integrations', 'settings')
  }, [])

  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)
  const githubUsername = user?.user_metadata?.user_name || user?.user_metadata?.github_username

  /**
   * Handles disconnecting the user's GitHub account
   */
  const handleDisconnectGitHub = async () => {
    analytics.disconnectService('github', 'settings-integrations')
    if (
      !confirm(
        'Are you sure you want to disconnect your GitHub account? You will lose access to premium features.'
      )
    ) {
      analytics.accountDeleteCancel('settings-integrations-disconnect')
      return
    }

    setIsDisconnecting(true)

    try {
      // Implementation would handle GitHub disconnection
      toast.info('GitHub disconnection not yet implemented')
    } catch (_error) {
      toast.error('Failed to disconnect GitHub account')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external services to enhance your experience
        </p>
      </div>

      {/* GitHub Integration */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Github className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">GitHub</h3>
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account for enhanced features
              </p>
            </div>
          </div>

          {hasGitHubAuth ? (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>

        {hasGitHubAuth ? (
          <div className="space-y-6">
            {/* Connected Account Info */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    GitHub Connected
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Connected as <span className="font-mono">@{githubUsername}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Active Features */}
            <div>
              <h4 className="font-medium mb-3">Active Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <div className="text-sm font-medium">Direct Project Submission</div>
                      <div className="text-xs text-muted-foreground">
                        Create pull requests under your GitHub account
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <div className="text-sm font-medium">Contributor Profile</div>
                      <div className="text-xs text-muted-foreground">
                        Public profile with your GitHub contributions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Active</Badge>
                    {githubUsername && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() =>
                          analytics.profileNavClick(`/u/${githubUsername}`, 'settings-integrations')
                        }
                      >
                        <Link href={`/u/${githubUsername}`} className="flex items-center">
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <div className="text-sm font-medium">Enhanced Authentication</div>
                      <div className="text-xs text-muted-foreground">Secure OAuth-based login</div>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="pt-6 border-t">
              <h4 className="font-medium mb-3">Account Management</h4>
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900 dark:text-red-100">
                      Disconnect GitHub
                    </div>
                    <div className="text-sm text-red-800 dark:text-red-200 mt-1">
                      Remove GitHub integration and lose premium features
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnectGitHub}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Benefits */}
            <div>
              <h4 className="font-medium mb-3">Benefits of Connecting GitHub</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Submit projects directly through the platform</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Get proper credit for your contributions</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Showcase your contributions on your profile</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">Enhanced security with OAuth authentication</span>
                </div>
              </div>
            </div>

            {/* Connect Button */}
            <div className="pt-4">
              <Button
                asChild
                className="w-full sm:w-auto"
                onClick={() => analytics.connectGitHub('settings-integrations', 'settings')}
              >
                <Link href="/auth/connect-github">
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub Account
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
