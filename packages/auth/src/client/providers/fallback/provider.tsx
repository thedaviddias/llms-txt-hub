'use client'

import type { PropsWithChildren } from 'react'
import { AuthContextProvider } from '../../context'

export function FallbackProvider({ children }: PropsWithChildren) {
  return (
    <AuthContextProvider
      value={{
        isLoaded: true,
        isSignedIn: false,
        user: null,
        signIn: async () => {},
        signOut: async () => {},
        getSession: async () => ({ user: null, isSignedIn: false }),
        getUser: async () => null,
        reloadUser: async () => {
          // No-op for fallback provider
        }
      }}
    >
      {children}
    </AuthContextProvider>
  )
}
