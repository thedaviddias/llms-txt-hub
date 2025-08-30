'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { Github, User as UserIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface UserData {
  id: string
  email?: string
  user_metadata?: {
    github_username?: string
    user_name?: string
  }
}

interface AccountInfoProps {
  user: UserData | null
  hasGitHubAuth: boolean
  displayName: string
  accountType: string
}

/**
 * Account information display component
 *
 * @param props - Component props
 * @returns React component
 */
export function AccountInfo({ user, hasGitHubAuth, displayName, accountType }: AccountInfoProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center">
        <UserIcon className="w-5 h-5 mr-2" />
        Account Information
      </h3>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              {hasGitHubAuth ? (
                <Github className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div>
              <h4 className="font-medium">{displayName}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={hasGitHubAuth ? 'default' : 'secondary'} className="text-xs">
                  {accountType} Account
                </Badge>
                {hasGitHubAuth && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center space-x-1"
                    title="GitHub Connected"
                  >
                    <Github className="w-3 h-3" />
                    <span>GitHub</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
