'use client'

import type { PropsWithChildren } from 'react'
import { AuthContextProvider } from '../../context'

export function FallbackProvider({ children }: PropsWithChildren) {
  return (
    <AuthContextProvider
      value={{
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        user: null
      }}
    >
      {children}
    </AuthContextProvider>
  )
}
