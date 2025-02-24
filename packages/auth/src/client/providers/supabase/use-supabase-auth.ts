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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoaded(true)
      setIsSignedIn(!!session)
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name,
              imageUrl: session.user.user_metadata?.avatar_url
            }
          : null
      )
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
      data: { session }
    } = await supabase.auth.getSession()
    return {
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
            imageUrl: session.user.user_metadata?.avatar_url
          }
        : null,
      isSignedIn: !!session
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
