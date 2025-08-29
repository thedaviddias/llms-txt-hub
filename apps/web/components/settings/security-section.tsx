'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { Github, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

interface SecuritySectionProps {
  hasGitHubAuth: boolean
}

export function SecuritySection({ hasGitHubAuth }: SecuritySectionProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center">
        <Shield className="w-5 h-5 mr-2" />
        Security & Authentication
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <div className="font-medium">Authentication Method</div>
            <div className="text-sm text-muted-foreground">
              {hasGitHubAuth ? 'Secure GitHub OAuth' : 'Email-based authentication'}
            </div>
          </div>
          <Badge variant={hasGitHubAuth ? 'default' : 'secondary'}>
            {hasGitHubAuth ? 'OAuth' : 'Email'}
          </Badge>
        </div>

        {!hasGitHubAuth && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Enhance Your Security
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Connect your GitHub account for improved security and additional features.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-3"
                  onClick={() => analytics.connectGitHub('settings-account', 'settings')}
                >
                  <a href="/auth/connect-github">
                    <Github className="w-4 h-4 mr-2" />
                    Connect GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
