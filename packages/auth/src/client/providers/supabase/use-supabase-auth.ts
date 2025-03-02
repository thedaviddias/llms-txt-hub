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
      try {
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
            imageUrl: session.user.user_metadata?.avatar_url
          }

          // Update all auth states atomically
          setUser(userData)
          setIsSignedIn(true)
          setIsLoaded(true)
        } else {
          // Clear auth state atomically
          setUser(null)
          setIsSignedIn(false)
          setIsLoaded(true)
        }
      } catch (error) {
        // Handle any errors by clearing auth state
        console.error('Error handling auth state change:', error)
        setUser(null)
        setIsSignedIn(false)
        setIsLoaded(true)
      }
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
          imageUrl: session.user.user_metadata?.avatar_url
        })
        setIsSignedIn(true)
      }
      setIsLoaded(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async () => {
    if (typeof supabase.auth.signInWithOAuth === 'function') {
      // Get redirectTo from URL parameters or current path
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirectTo') || window.location.pathname

      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
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
