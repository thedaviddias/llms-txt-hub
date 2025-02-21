'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { AuthContextValue } from '../../context'

export function useSupabaseAuth(supabase: SupabaseClient): AuthContextValue {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoaded(true)
      setIsSignedIn(!!session)
      setUserId(session?.user.id ?? null)
      setSessionId(session?.id ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return {
    provider: 'supabase',
    isLoaded,
    isSignedIn,
    userId,
    sessionId,
    user: null // TODO: Add user data if needed
  }
}
