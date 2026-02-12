'use client'

import { useAuth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { AlertCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

interface User {
  id: string
  email?: string
  user_metadata?: {
    github_username?: string
    user_name?: string
  }
}

interface DangerZoneProps {
  user: User | null
}

/**
 * Renders the account deletion danger zone with confirmation flow
 */
export function DangerZone({ user }: DangerZoneProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState('')
  const uniqueId = useId()

  /**
   * Handles account deletion after user types DELETE to confirm

   */
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      analytics.accountDeleteSuccess('settings-account')
      toast.success('Account deleted successfully')
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('Failed to delete account. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-800">
        <div className="p-6">
          <button
            type="button"
            onClick={() => {
              analytics.dangerZoneToggle(!showDangerZone, 'settings-account')
              setShowDangerZone(!showDangerZone)
            }}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Account Deletion</h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Irreversible actions that affect your account
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-red-600 border-red-600">
              {showDangerZone ? 'Hide' : 'Show'}
            </Badge>
          </button>

          {showDangerZone && (
            <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-800">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 dark:text-red-100">Delete Account</h4>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-1 mb-3">
                        Permanently delete your account and all associated data. This action cannot
                        be undone.
                      </p>

                      <div className="text-xs text-red-700 dark:text-red-300 mb-4 space-y-1">
                        <div>• All your favorites will be deleted</div>
                        <div>• Your submission history will be removed</div>
                        <div>• This action is immediate and irreversible</div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          analytics.accountDeleteStart('settings-account')
                          setShowDeleteConfirm(true)
                        }}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <button
            type="button"
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteConfirm(false)
              setDeleteConfirmText('')
              setError('')
            }}
          />
          <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-[400px] mx-4 animate-in zoom-in-95">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm">
                  This will permanently delete your account, profile, and remove all your data from
                  our servers.
                </p>

                <div className="space-y-2">
                  <label
                    htmlFor={`${uniqueId}-deleteConfirm`}
                    className="text-sm font-medium block"
                  >
                    Type{' '}
                    <span className="font-mono bg-destructive/20 px-1 rounded text-destructive">
                      DELETE
                    </span>{' '}
                    to confirm
                  </label>
                  <input
                    id={`${uniqueId}-deleteConfirm`}
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDeleting}
                  />
                </div>

                {error && <div className="text-sm text-destructive">{error}</div>}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    analytics.accountDeleteCancel('settings-account')
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                    setError('')
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
