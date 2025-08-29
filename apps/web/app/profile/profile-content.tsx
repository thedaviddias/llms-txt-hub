'use client'

import { useAuth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import {
  AlertCircle,
  CheckCircle,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  Settings,
  Trash2,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EditProfileModal } from '@/components/profile/edit-profile-modal'
import { Card } from '@/components/ui/card'
import { UserMessageBanner } from '@/components/ui/user-message-banner'

export default function ProfileContent() {
  const { user, signOut, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Check for success/error messages from URL params
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      if (message.includes('success') || message.includes('connected')) {
        toast.success(message)
      } else if (message.includes('error') || message.includes('failed')) {
        toast.error(message)
      } else {
        toast.info(message)
      }

      // Clean up URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Redirect if not authenticated (but only after auth has loaded)
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login?message=Please sign in to view your profile')
    }
  }, [isLoaded, user, router])

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast.success('Account deleted successfully')
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Show loading state while auth is loading or user is not yet available
  if (!isLoaded || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  const hasGitHubAuth = user.user_metadata?.github_username || user.user_metadata?.user_name
  const displayName = hasGitHubAuth || user.email?.split('@')[0] || 'User'
  const accountType = hasGitHubAuth ? 'GitHub' : 'Email'
  const isProfilePrivate = user.publicMetadata?.isProfilePrivate === true

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Account Overview */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                {hasGitHubAuth ? (
                  <Github className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                ) : (
                  <User className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={hasGitHubAuth ? 'default' : 'secondary'} className="text-xs">
                    {accountType} Account
                  </Badge>
                  {hasGitHubAuth && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${isProfilePrivate ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                  >
                    {isProfilePrivate ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Private Profile
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Public Profile
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Status */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <UserMessageBanner
                icon={isProfilePrivate ? 'alert-circle' : 'info'}
                title={isProfilePrivate ? 'Your profile is private' : 'Your profile is public'}
                description={
                  isProfilePrivate
                    ? 'Only you can see your profile information. Others cannot view your profile page or find you in search results.'
                    : 'Your profile is visible to everyone. Others can view your profile page and see your basic information.'
                }
                variant={isProfilePrivate ? 'warning' : 'info'}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="flex-shrink-0"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Account Status */}
          {!hasGitHubAuth && (
            <UserMessageBanner
              icon="alert-circle"
              title="Upgrade Your Account"
              description="Connect your GitHub account to create pull requests under your name and get full contributor credit."
              variant="info"
              className="mb-4"
            />
          )}
        </Card>

        {/* GitHub Connection */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Github className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold">GitHub Integration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hasGitHubAuth
                    ? 'Your GitHub account is connected and verified'
                    : 'Connect GitHub to unlock premium features'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {hasGitHubAuth ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connected
                  </span>
                </>
              ) : (
                <Button asChild size="sm">
                  <Link href="/auth/connect-github">Connect GitHub</Link>
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Account Actions
          </h3>

          <div className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/submit">
                <ExternalLink className="w-4 h-4 mr-2" />
                Submit a Project
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/favorites">
                <User className="w-4 h-4 mr-2" />
                View Favorites
              </Link>
            </Button>

            {hasGitHubAuth && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/u/${user.user_metadata?.user_name}`}>
                  <Github className="w-4 h-4 mr-2" />
                  View Public Profile
                </Link>
              </Button>
            )}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">Danger Zone</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal open={showEditModal} onOpenChange={setShowEditModal} />
    </div>
  )
}
