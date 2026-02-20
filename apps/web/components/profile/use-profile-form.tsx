'use client'

import { useAuth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { fetchWithCSRF } from '@/lib/csrf-client'

interface FormData {
  firstName: string
  lastName: string
  username: string
  bio: string
  work: string
  website: string
  linkedin: string
}

interface UseProfileFormProps {
  onSuccess: () => void
  usernameError: string
  isCheckingUsername: boolean
}

/**
 * Custom hook for handling profile form submission and validation
 * @param props - Hook configuration
 * @returns Form handlers and state
 */
export function useProfileForm({
  onSuccess,
  usernameError,
  isCheckingUsername
}: UseProfileFormProps) {
  const { user, reloadUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { trackProfileUpdateSuccess, trackProfileUpdateError } = useAnalyticsEvents()

  /**
   * Validate form data client-side
   * @param formData - Form data to validate
   * @returns Error message or empty string if valid
   */
  const validateForm = (formData: FormData): string => {
    if (isCheckingUsername) return 'Please wait while we check username availability'
    if (usernameError) return 'Please fix the username error before submitting'
    if (formData.firstName.length > 50) return 'First name must be 50 characters or less'
    if (formData.lastName.length > 50) return 'Last name must be 50 characters or less'

    if (formData.username) {
      if (formData.username.length < 3) return 'Username must be at least 3 characters'
      if (formData.username.length > 30) return 'Username must be 30 characters or less'
      if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        return 'Username can only contain letters, numbers, underscores, and hyphens'
      }
    }

    if (formData.bio && formData.bio.length > 160) return 'Bio must be 160 characters or less'
    if (formData.work && formData.work.length > 100) return 'Work must be 100 characters or less'

    if (formData.website) {
      if (formData.website.length > 100) return 'Website URL must be 100 characters or less'
      if (!formData.website.startsWith('http://') && !formData.website.startsWith('https://')) {
        return 'Website must start with http:// or https://'
      }
      try {
        new URL(formData.website)
      } catch {
        return 'Please enter a valid website URL'
      }
    }

    if (formData.linkedin) {
      if (formData.linkedin.length > 100) return 'LinkedIn URL must be 100 characters or less'
      if (!formData.linkedin.includes('linkedin.com/in/')) {
        return 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)'
      }
      try {
        const urlToCheck = formData.linkedin.startsWith('http')
          ? formData.linkedin
          : `https://${formData.linkedin}`
        new URL(urlToCheck)
      } catch {
        return 'Please enter a valid LinkedIn URL'
      }
    }

    return ''
  }

  /**
   * Handle form submission
   * @param formData - Form data to submit
   */
  const handleSubmit = async (formData: FormData) => {
    setError('')

    const validationError = validateForm(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      if (!user) throw new Error('User not found')

      const response = await fetchWithCSRF('/api/user/update-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: formData.bio || null,
          work: formData.work || null,
          website: formData.website || null,
          linkedin: formData.linkedin || null,
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          username: formData.username
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile metadata')
      }

      trackProfileUpdateSuccess(true, 'profile-edit-modal')
      await reloadUser()

      const currentUsername = user?.username || user?.user_metadata?.user_name
      const usernameChanged = formData.username !== currentUsername

      onSuccess()

      if (usernameChanged) {
        if (formData.username) {
          router.push(`/u/${formData.username}`)
        } else {
          router.push(`/u/${user.id}`)
        }
      } else {
        router.refresh()
      }
    } catch (err) {
      logger.error('Error updating profile:', { data: err, tags: { type: 'component' } })
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update profile. Please try again.'
      trackProfileUpdateError(errorMessage, 'profile-edit-modal')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    setError,
    handleSubmit
  }
}
