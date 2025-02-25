'use client'

import * as Sentry from '@sentry/nextjs'
import { useAuth } from '@thedaviddias/auth'
import { useEffect } from 'react'

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
