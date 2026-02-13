'use client'

import { useAuth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { Check, Eye, Github, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { getMemberBadgeSync } from '@/lib/member-client-utils'

export type AuthTier = 'anonymous' | 'email' | 'github'

interface Feature {
  name: string
  description: string
  tiers: AuthTier[]
}

const FEATURES: Feature[] = [
  {
    name: 'Browse & Search',
    description: 'Full access to all projects and documentation',
    tiers: ['anonymous', 'email', 'github']
  },
  {
    name: 'Local Favorites',
    description: 'Save favorites locally (device-only)',
    tiers: ['anonymous']
  },
  {
    name: 'Cloud Favorites',
    description: 'Sync favorites across all devices',
    tiers: ['email', 'github']
  },
  {
    name: 'Community Updates',
    description: 'Newsletter and platform updates',
    tiers: ['email', 'github']
  },
  {
    name: 'Direct Submission',
    description: 'Submit projects directly through the platform',
    tiers: ['github']
  },
  {
    name: 'Contributor Profile',
    description: 'Showcase your contributions and GitHub activity',
    tiers: ['github']
  }
]

/**
 * Returns display info (name, icon, color) for an auth tier
 */
function getTierInfo(tier: AuthTier) {
  switch (tier) {
    case 'anonymous':
      return {
        name: 'Browser',
        icon: Eye,
        color: 'bg-gray-100 text-gray-700',
        description: 'Full browsing access'
      }
    case 'email':
      return {
        name: 'Community Member',
        icon: Mail,
        color: 'bg-blue-100 text-blue-700',
        description: 'Email account with cloud sync'
      }
    case 'github':
      return {
        name: 'Contributor',
        icon: Github,
        color: 'bg-green-100 text-green-700',
        description: 'Full access with GitHub integration'
      }
  }
}

/**
 * Determines the current user's auth tier based on their metadata
 */
function getCurrentUserTier(user: any): AuthTier {
  if (!user) return 'anonymous'

  // Check if user has GitHub integration
  if (user.user_metadata?.github_username || user.user_metadata?.user_name) {
    return 'github'
  }

  // Has email but no GitHub
  if (user.email) {
    return 'email'
  }

  return 'anonymous'
}

/**
 * Checks whether the user has GitHub contributions
 */
function getUserContributions(user: any): boolean {
  // This would need to be determined based on actual contribution data
  // For now, we'll assume GitHub users might be contributors
  const tier = getCurrentUserTier(user)
  return tier === 'github' // This is a simplified assumption
}

interface AuthTierIndicatorProps {
  showUpgrade?: boolean
  compact?: boolean
}

/**
 * Displays the user's current auth tier with feature comparison and upgrade options
 */
export function AuthTierIndicator({ showUpgrade = true, compact = false }: AuthTierIndicatorProps) {
  const { user } = useAuth()
  const currentTier = getCurrentUserTier(user)
  const tierInfo = getTierInfo(currentTier)
  const IconComponent = tierInfo.icon

  if (compact) {
    // Use the same badge system as member cards
    const hasContributions = getUserContributions(user)
    const memberBadge = getMemberBadgeSync(hasContributions)

    return (
      <div className="flex items-center gap-2">
        <Badge variant={memberBadge.variant} className="text-xs">
          {memberBadge.label}
        </Badge>
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Current tier */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${tierInfo.color.replace('text-', 'bg-').replace('700', '200')}`}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{tierInfo.name}</h3>
              <p className="text-sm text-muted-foreground">{tierInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Available Features</h4>
          <div className="space-y-2">
            {FEATURES.map((feature, index) => {
              const isAvailable = feature.tiers.includes(currentTier)
              const isUpgrade =
                !isAvailable &&
                feature.tiers.some(
                  tier =>
                    (tier === 'email' && currentTier === 'anonymous') ||
                    (tier === 'github' && ['anonymous', 'email'].includes(currentTier))
                )

              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className={`flex-shrink-0 ${isAvailable ? 'text-green-600' : isUpgrade ? 'text-orange-500' : 'text-gray-400'}`}
                  >
                    {isAvailable ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`text-sm ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {feature.name}
                    </span>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upgrade buttons */}
        {showUpgrade && currentTier !== 'github' && (
          <div className="pt-2 border-t space-y-2">
            {currentTier === 'anonymous' && (
              <>
                <Button asChild size="sm" className="w-full">
                  <Link href="/login">
                    <Mail className="h-4 w-4 mr-2" />
                    Join Community
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/login">
                    <Github className="h-4 w-4 mr-2" />
                    Become a Contributor
                  </Link>
                </Button>
              </>
            )}
            {currentTier === 'email' && (
              <Button asChild size="sm" className="w-full">
                <Link href="/auth/connect-github">
                  <Github className="h-4 w-4 mr-2" />
                  Connect GitHub to Contribute
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
