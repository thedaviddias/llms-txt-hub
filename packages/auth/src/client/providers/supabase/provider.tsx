'use client'

import { createBrowserClient } from '@supabase/ssr'
import { keys } from '@thedaviddias/supabase/keys'
import type { PropsWithChildren } from 'react'
import { AuthContextProvider } from '../../context'
import { useSupabaseAuth } from './use-supabase-auth'

export function SupabaseProvider({ children }: PropsWithChildren) {
  const supabase = createBrowserClient(
    keys().NEXT_PUBLIC_SUPABASE_URL,
    keys().NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const auth = useSupabaseAuth(supabase)

  return <AuthContextProvider value={auth}>{children}</AuthContextProvider>
}
