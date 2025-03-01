'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { AuthUser } from '../../../core/types'
import type { AuthProvider } from '../../context'

export function useSupabaseAuth(supabase: SupabaseClient): AuthProvider {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoaded(true)
      setIsSignedIn(!!session)

      if (session?.user) {
        // Verify user data with server
        const {
          data: { user: verifiedUser }
        } = await supabase.auth.getUser()
        if (verifiedUser) {
          setUser({
            id: verifiedUser.id,
            email: verifiedUser.email,
            name: verifiedUser.user_metadata?.name,
            imageUrl: verifiedUser.user_metadata?.avatar_url
          })
        } else {
          setUser(null)
          setIsSignedIn(false)
        }
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async () => {
    if (typeof supabase.auth.signInWithOAuth === 'function') {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'read:user public_repo'
        }
      })
    } else {
      console.warn('Sign in functionality is not available due to missing Supabase credentials.')
    }
  }

  const signOut = async () => {
    if (typeof supabase.auth.signOut === 'function') {
      await supabase.auth.signOut()
    } else {
      console.warn('Sign out functionality is not available due to missing Supabase credentials.')
    }
  }

  const getSession = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name,
            imageUrl: user.user_metadata?.avatar_url
          }
        : null,
      isSignedIn: !!user
    }
  }

  const getUser = async () => {
    const {
      data: { user: supabaseUser }
    } = await supabase.auth.getUser()
    return supabaseUser
      ? {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name,
          imageUrl: supabaseUser.user_metadata?.avatar_url
        }
      : null
  }

  return {
    isLoaded,
    isSignedIn,
    user,
    signIn,
    signOut,
    getSession,
    getUser
  }
}
