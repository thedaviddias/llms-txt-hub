'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { createContext } from 'react'
import type { AuthUser } from '../../core/types'

export interface AuthProvider {
  user: AuthUser | null
  isLoaded: boolean
  isSignedIn: boolean
  signIn(): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<{ user: AuthUser | null; isSignedIn: boolean }>
  getUser(): Promise<AuthUser | null>
  reloadUser(): Promise<void>
}

export const AuthContext = createContext<AuthProvider | null>(null)

/**
 * Authentication hook that uses Clerk internally
 * @returns AuthProvider object with user data and authentication methods
 */
export function useAuth(): AuthProvider {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const router = useRouter()

  // Transform Clerk user to AuthUser format
  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        name: user.fullName || user.username || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        username: user.username || null,
        imageUrl: user.imageUrl || null,
        user_metadata: {
          user_name: user.username || null,
          full_name: user.fullName || null,
          avatar_url: user.imageUrl || null
        },
        publicMetadata: user.publicMetadata,
        externalAccounts: (user.externalAccounts || []).map((account: any) => ({
          id: account.id,
          provider: account.provider,
          username: account.username || null
        }))
      }
    : null

  return {
    user: authUser,
    isLoaded,
    isSignedIn: !!isSignedIn,
    signIn: async () => {
      router.push('/login')
    },
    signOut: async () => {
      await clerkSignOut({ redirectUrl: '/' })
    },
    getSession: async () => {
      return { user: authUser, isSignedIn: !!isSignedIn }
    },
    getUser: async () => {
      return authUser
    },
    reloadUser: async () => {
      await user?.reload()
    }
  }
}

export const AuthContextProvider = AuthContext.Provider
