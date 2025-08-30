'use client'

import { AuthCheck } from '@/components/auth-check'
import { SubmitForm } from '@/components/forms/submit-form'
import { useAuth } from '@thedaviddias/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SubmitPage() {
  const { user, isLoaded } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login?message=Please sign in to submit a project')
    }
  }, [isLoaded, user, router])

  // Show loading state while auth is loading
  if (!isLoaded) {
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

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <AuthCheck requireGitHub={false}>
          <SubmitForm />
        </AuthCheck>
      </div>
    </div>
  )
}
