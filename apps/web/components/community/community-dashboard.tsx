'use client'

import { useAuth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { Progress } from '@thedaviddias/design-system/progress'
import { Award, Calendar, Github, Heart, Mail, Star, TrendingUp, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthTierIndicator } from '@/components/auth/auth-tier-indicator'
import { ProgressiveAuthBanner } from '@/components/auth/progressive-auth-banner'
import { Card } from '@/components/ui/card'
import { useFavorites } from '@/contexts/favorites-context'

interface CommunityStats {
  totalProjects: number
  totalMembers: number
  thisWeekAdditions: number
  trendingProjects: Array<{ name: string; slug: string; growth: number }>
}

interface UserStats {
  favoritesCount: number
  joinDate?: string
  contributionsCount?: number
  profileViews?: number
}

export function CommunityDashboard() {
  const { user } = useAuth()
  const { favorites } = useFavorites()
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [showAuthBanner, setShowAuthBanner] = useState(true)

  // Fetch community stats
  useEffect(() => {
    fetch('/api/stats/community')
      .then(res => res.json())
      .then(setCommunityStats)
      .catch(console.error)
  }, [])

  // Fetch user stats if authenticated
  useEffect(() => {
    if (user) {
      fetch('/api/user/stats')
        .then(res => res.json())
        .then(setUserStats)
        .catch(console.error)
    } else {
      // Mock stats for anonymous users
      setUserStats({
        favoritesCount: favorites.length
      })
    }
  }, [user, favorites.length])

  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)

  // Calculate engagement level
  const getEngagementLevel = () => {
    if (!userStats) return 0

    let score = 0
    score += Math.min(userStats.favoritesCount * 2, 20) // Up to 20 points for favorites
    if (user) score += 30 // Account creation bonus
    if (hasGitHubAuth) score += 30 // GitHub connection bonus
    if (userStats.contributionsCount) score += userStats.contributionsCount * 10 // Contributions

    return Math.min(score, 100)
  }

  const engagementLevel = getEngagementLevel()

  return (
    <div className="space-y-6">
      {/* Auth banner for anonymous users */}
      {!user && showAuthBanner && (
        <ProgressiveAuthBanner context="community" onDismiss={() => setShowAuthBanner(false)} />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Community Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Community Pulse</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold">{communityStats?.totalProjects || '...'}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Community Members</p>
                    <p className="text-2xl font-bold">{communityStats?.totalMembers || '...'}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Added This Week</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {communityStats?.thisWeekAdditions || '...'}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        +
                        {Math.round(
                          ((communityStats?.thisWeekAdditions || 0) /
                            (communityStats?.totalProjects || 1)) *
                            100
                        )}
                        %
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Trending Projects */}
          {communityStats?.trendingProjects && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Trending This Week</h3>
              <div className="space-y-3">
                {communityStats.trendingProjects.map((project, index) => (
                  <Card key={project.slug} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <Link
                            href={`/project/${project.slug}`}
                            className="text-sm text-primary hover:underline"
                          >
                            View project
                          </Link>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        +{project.growth}% growth
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Panel */}
        <div className="space-y-6">
          {user ? (
            <>
              {/* User stats */}
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-semibold">Your Engagement</h3>
                    <p className="text-sm text-muted-foreground">Community involvement level</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{engagementLevel}%</span>
                    </div>
                    <Progress value={engagementLevel} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{userStats?.favoritesCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Favorites</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats?.contributionsCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Contributions</p>
                    </div>
                  </div>

                  {engagementLevel < 50 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {!hasGitHubAuth
                          ? 'Connect GitHub to boost your level!'
                          : 'Keep exploring to level up!'}
                      </p>
                      {!hasGitHubAuth && (
                        <Button asChild size="sm">
                          <Link href="/auth/connect-github">
                            <Github className="h-4 w-4 mr-2" />
                            Connect GitHub
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Auth tier indicator */}
              <AuthTierIndicator showUpgrade={true} />
            </>
          ) : (
            <>
              {/* Anonymous user encouragement */}
              <Card className="p-6 text-center space-y-4">
                <div>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Your Local Favorites</h3>
                  <p className="text-sm text-muted-foreground">Saved on this device</p>
                </div>

                <div>
                  <p className="text-3xl font-bold">{favorites.length}</p>
                  <p className="text-sm text-muted-foreground">Projects favorited</p>
                </div>

                <div className="pt-4 space-y-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/login">
                      <Mail className="h-4 w-4 mr-2" />
                      Sign In to Save
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Create account to sync your favorites
                  </p>
                </div>
              </Card>

              {/* Community invitation */}
              <Card className="p-6 text-center space-y-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
                <div>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Join Our Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with {communityStats?.totalMembers || '2,000+'} developers building
                    AI-ready documentation
                  </p>
                </div>

                <div className="space-y-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/login">
                      <Github className="h-4 w-4 mr-2" />
                      Join with GitHub
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link
                      href="#"
                      onClick={e => {
                        e.preventDefault()
                        window.open('https://substack.com', '_blank')
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Newsletter
                    </Link>
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* Quick actions */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href="/search">
                  <Zap className="h-4 w-4 mr-2" />
                  Discover Projects
                </Link>
              </Button>

              {hasGitHubAuth ? (
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href="/submit">
                    <Star className="h-4 w-4 mr-2" />
                    Submit Project
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href="/guides">
                    <Award className="h-4 w-4 mr-2" />
                    Read Guides
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
