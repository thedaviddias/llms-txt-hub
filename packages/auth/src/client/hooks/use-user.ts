'use client'

import { useAuth } from '../context'

/**
 * Returns the normalized authenticated user state from the Clerk-backed auth hook.
 */
export function useUser() {
  const auth = useAuth()
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    user: auth.user
  }
}
