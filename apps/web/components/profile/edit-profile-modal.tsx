'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { AboutFields } from './edit-profile-about-fields'
import { BasicInfoFields } from './edit-profile-basic-fields'
import { LinksFields } from './edit-profile-links-fields'
import { useProfileForm } from './use-profile-form'
import { useUsernameValidation } from './use-username-validation'

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal component for editing user profile information
 * @param props - Component props
 * @param props.open - Whether the modal is open
 * @param props.onOpenChange - Callback for when modal open state changes
 */
export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user, isLoaded } = useAuth()
  const uniqueId = useId()
  const { trackProfileModalOpen } = useAnalyticsEvents()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
    work: '',
    website: '',
    linkedin: ''
  })

  const { usernameError, isCheckingUsername, setUsernameError } = useUsernameValidation({
    username: formData.username,
    currentUsername: user?.username || user?.user_metadata?.user_name
  })

  const { isLoading, error, setError, handleSubmit } = useProfileForm({
    onSuccess: () => onOpenChange(false),
    usernameError,
    isCheckingUsername
  })

  // Track when modal opens for analytics
  useEffect(() => {
    if (user && open) {
      trackProfileModalOpen('profile-edit-modal')
    }
  }, [user, open, trackProfileModalOpen])

  // Update form when user data loads or modal opens (separate effect to avoid dependency issues)
  useEffect(() => {
    if (user && open) {
      setFormData({
        firstName: user.firstName || (user.publicMetadata?.firstName as string) || '',
        lastName: user.lastName || (user.publicMetadata?.lastName as string) || '',
        username: user.user_metadata?.user_name || user.username || '',
        bio: (user.publicMetadata?.bio as string) || '',
        work: (user.publicMetadata?.work as string) || '',
        website: (user.publicMetadata?.website as string) || '',
        linkedin: (user.publicMetadata?.linkedin as string) || ''
      })
    }
  }, [open, user?.id]) // Only depend on modal open state and user ID

  /**
   * Handle form submission for profile updates
   * @param e - Form submission event
   */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(formData)
  }

  // Clear errors when modal closes
  useEffect(() => {
    if (!open) {
      setError('')
      setUsernameError('')
    }
  }, [open])

  if (!isLoaded || !open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Content */}
      <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-[500px] mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <BasicInfoFields
              uniqueId={uniqueId}
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              usernameError={usernameError}
              isCheckingUsername={isCheckingUsername}
            />

            <AboutFields
              uniqueId={uniqueId}
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
            />

            <LinksFields
              uniqueId={uniqueId}
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
            />
          </div>

          {error && (
            <div className="mx-6 mb-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <div className="flex justify-end items-center p-6 border-t">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
