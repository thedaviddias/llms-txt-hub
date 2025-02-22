'use client'

import { useAuth } from './use-auth'

export function useUser() {
  const auth = useAuth()
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    user: auth.user
  }
}
