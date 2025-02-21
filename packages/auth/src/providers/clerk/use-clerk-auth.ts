'use client'

import { useAuth } from '@clerk/nextjs'
import type { AuthProvider, AuthSession, AuthUser } from '../../types'

export function useClerkAuth(): AuthProvider {
  const clerk = useAuth()

  const getUser = (): Promise<AuthUser | null> => {
    if (!clerk.userId) {
      return Promise.resolve(null)
    }

    return Promise.resolve({
      id: clerk.userId,
      email: '',
      name: ''
    })
  }

  const getSession = async (): Promise<AuthSession> => {
    const token = await clerk.getToken()
    const user = await getUser()

    return {
      user,
      isSignedIn: !!token
    }
  }

  return {
    signIn: (): Promise<void> => {
      window.location.href = '/sign-in'
      return Promise.resolve()
    },
    signOut: () => clerk.signOut(),
    getSession,
    getUser
  }
}
