'use client'

import { env } from '@thedaviddias/config-environment'
import type { PropsWithChildren } from 'react'
import { useAuth } from '../hooks/use-auth'

interface SignInProps extends PropsWithChildren {
  redirectUrl?: string
}

export function SignIn({ children }: SignInProps) {
  const { provider } = useAuth()
  const hasClerkConfig = Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const hasSupabaseConfig = Boolean(env.NEXT_PUBLIC_SUPABASE_URL)

  // If no auth is configured, just render children
  if (!hasClerkConfig && !hasSupabaseConfig) {
    return <>{children}</>
  }

  switch (provider) {
    case 'clerk':
      return (
        <div className="w-full max-w-sm">
          {/* Add Clerk sign-in UI here */}
          {children}
        </div>
      )
    case 'supabase':
      return (
        <div className="w-full max-w-sm">
          {/* Add Supabase sign-in UI here */}
          {children}
        </div>
      )
    default:
      return <>{children}</>
  }
}
