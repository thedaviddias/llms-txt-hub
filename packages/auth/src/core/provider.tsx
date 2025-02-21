'use client'

import { env } from '@thedaviddias/config-environment'
import type { PropsWithChildren } from 'react'
import { FallbackProvider } from '../client/providers/fallback/provider'
import { SupabaseProvider } from '../client/providers/supabase/provider'

interface AuthProviderProps extends PropsWithChildren {}

export function AuthProvider({ children }: AuthProviderProps) {
  const hasSupabaseConfig = Boolean(env.NEXT_PUBLIC_SUPABASE_URL)

  if (!hasSupabaseConfig) {
    return <FallbackProvider>{children}</FallbackProvider>
  }

  return <SupabaseProvider>{children}</SupabaseProvider>
}
