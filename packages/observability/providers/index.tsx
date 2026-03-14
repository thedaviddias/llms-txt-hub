'use client'

import * as Sentry from '@sentry/nextjs'
import { useAuth } from '@thedaviddias/auth/client'
import { useEffect } from 'react'

/**
 * Sync the current authenticated user into Sentry's browser-side user context.
 *
 * @param props - Provider children to render
 * @returns The unchanged children wrapped with Sentry user syncing
 */
export function SentryUserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
        ip_address: '{{auto}}'
      })
    } else {
      Sentry.setUser(null)
    }
  }, [user])

  return <>{children}</>
}
