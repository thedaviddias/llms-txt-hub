'use client'

import { createContext, useContext } from 'react'
import type { AuthUser } from '../../core/types'

export interface AuthProvider {
  user: AuthUser | null
  isLoaded: boolean
  isSignedIn: boolean
  signIn(): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<{ user: AuthUser | null; isSignedIn: boolean }>
  getUser(): Promise<AuthUser | null>
}

export const AuthContext = createContext<AuthProvider | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthContextProvider = AuthContext.Provider
