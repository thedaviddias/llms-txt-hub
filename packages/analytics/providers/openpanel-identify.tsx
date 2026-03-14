'use client'

import { useAuth } from '@thedaviddias/auth/client'
import { useEffect } from 'react'

/**
 * Syncs the authenticated Clerk user to OpenPanel's user identification.
 * Must be rendered inside the Clerk/auth provider tree.
 */
export function OpenPanelIdentify() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.op) return

    if (user) {
      window.op.identify({
        profileId: user.id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        email: user.email ?? undefined
      })
    } else {
      window.op.clear()
    }
  }, [user])

  return null
}
