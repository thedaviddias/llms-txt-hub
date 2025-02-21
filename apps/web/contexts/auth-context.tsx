'use client'

import { supabase } from '@/lib/supabase-client'
import type { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

type AuthContextType = {
  user: User | null
  session: Session | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof supabase.auth.onAuthStateChange !== 'function') {
      console.warn(
        'Auth state change listener is not available. Authentication features may not work properly.',
      )
      return
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') {
        // Redirect to the intended page after sign-in
        const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') || '/'
        router.push(redirectTo)
      }
    })

    return () => {
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  const signIn = async () => {
    if (typeof supabase.auth.signInWithOAuth === 'function') {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user',
        },
      })
    } else {
      console.warn('Sign in functionality is not available due to missing Supabase credentials.')
    }
  }

  const signOut = async () => {
    if (typeof supabase.auth.signOut === 'function') {
      await supabase.auth.signOut()
      router.push('/')
    } else {
      console.warn('Sign out functionality is not available due to missing Supabase credentials.')
    }
  }

  const value = {
    user,
    session,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
