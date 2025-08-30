'use client'

import type { PropsWithChildren } from 'react'
import { FallbackProvider } from '../client/providers/fallback/provider'

interface AuthProviderProps extends PropsWithChildren {}

export function AuthProvider({ children }: AuthProviderProps) {
  return <FallbackProvider>{children}</FallbackProvider>
}
