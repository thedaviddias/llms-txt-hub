'use client'

import type { PropsWithChildren } from 'react'
import { FallbackProvider } from '../client/providers/fallback/provider'
import { SupabaseProvider } from '../client/providers/supabase/provider'
import { keys } from '../keys'

interface AuthProviderProps extends PropsWithChildren {}

export function AuthProvider({ children }: AuthProviderProps) {
  const hasSupabaseConfig = Boolean(keys().NEXT_PUBLIC_SUPABASE_URL)

  if (!hasSupabaseConfig) {
    return <FallbackProvider>{children}</FallbackProvider>
  }

  return <SupabaseProvider>{children}</SupabaseProvider>
}
