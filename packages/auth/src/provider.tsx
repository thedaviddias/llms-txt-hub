'use client'

import { env } from '@thedaviddias/config-environment'
import type { PropsWithChildren } from 'react'
import { ClerkProvider } from './providers/clerk/provider'
import { FallbackProvider } from './providers/fallback/provider'
import { SupabaseProvider } from './providers/supabase/provider'

export type AuthProviderType = 'clerk' | 'supabase'

interface AuthProviderProps extends PropsWithChildren {
  provider?: AuthProviderType
}

export function AuthProvider({
  children,
  provider = 'clerk'
}: AuthProviderProps) {
  const hasClerkConfig = Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const hasSupabaseConfig = Boolean(env.NEXT_PUBLIC_SUPABASE_URL)

  if (provider === 'clerk' && !hasClerkConfig) {
    return <FallbackProvider>{children}</FallbackProvider>
  }

  if (provider === 'supabase' && !hasSupabaseConfig) {
    return <FallbackProvider>{children}</FallbackProvider>
  }

  switch (provider) {
    case 'clerk':
      return <ClerkProvider>{children}</ClerkProvider>
    case 'supabase':
      return <SupabaseProvider>{children}</SupabaseProvider>
    default:
      return <FallbackProvider>{children}</FallbackProvider>
  }
}
