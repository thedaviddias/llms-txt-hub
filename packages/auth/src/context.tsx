'use client'

import { createContext, useContext } from 'react'
import type { AuthProvider } from './types'

const AuthContext = createContext<AuthProvider | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthContextProvider = AuthContext.Provider
