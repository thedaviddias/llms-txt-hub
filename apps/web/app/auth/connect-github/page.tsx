'use client'

import { Card } from '@/components/ui/card'
import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { ArrowLeft, CheckCircle, Github } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ConnectGitHubPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)

  // Check if user already has GitHub connected
  const hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)

  useEffect(() => {
    // If user doesn't exist, redirect to login
    if (!user) {
      router.push('/login?redirect=/auth/connect-github')
      return
    }

    // If user already has GitHub, redirect to profile
    if (hasGitHubAuth) {
      router.push('/profile?message=GitHub account already connected')
      return
    }
  }, [user, hasGitHubAuth, router])

  const handleConnectGitHub = async () => {
    setIsConnecting(true)

    try {
      // Redirect to login with GitHub to connect account
      window.location.href =
        '/login?provider=github&redirect=/profile?message=GitHub account connected successfully'
    } catch (error) {
      console.error('Error connecting GitHub:', error)
      toast.error('Failed to connect GitHub account. Please try again.')
      setIsConnecting(false)
    }
  }

  // Loading state while checking user
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  // Already connected state
  if (hasGitHubAuth) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">GitHub Connected!</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your GitHub account is already connected to your profile.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/profile">View Profile</Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/submit">Submit Project</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Back button */}
        <Button asChild variant="outline" size="sm">
          <Link href="/profile" className="inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
        </Button>

        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
            <Github className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">Connect Your GitHub Account</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upgrade your account to unlock direct project submissions and get proper credit for
              your contributions.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Benefits of connecting GitHub:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Create pull requests under your GitHub account
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Get proper attribution for your contributions
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Faster submission process
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Access to contributor features
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button onClick={handleConnectGitHub} disabled={isConnecting} className="w-full">
              <Github className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect GitHub Account'}
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              This will merge your accounts. You'll keep your existing profile and data.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
