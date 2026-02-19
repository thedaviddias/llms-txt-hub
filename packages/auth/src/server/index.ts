'use server'

import 'server-only'
import { auth as clerkAuth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server'
import type { AuthUser } from '../core/types'

/**
 * Return the current authenticated session or null
 */
export async function auth() {
  const { userId } = await clerkAuth()

  if (!userId) {
    return null
  }

  const user = await clerkCurrentUser()

  if (!user) {
    return null
  }

  // Return session-like object for compatibility
  return {
    user: {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      user_metadata: {
        user_name: user.username || null,
        full_name: user.fullName || null,
        avatar_url: user.imageUrl || null
      }
    }
  }
}

/**
 * Return the current authenticated user or null
 */
export async function currentUser(): Promise<AuthUser | null> {
  const user = await clerkCurrentUser()

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || null,
    name: user.fullName || user.username || null,
    user_metadata: {
      user_name: user.username || null,
      full_name: user.fullName || null,
      avatar_url: user.imageUrl || null
    },
    externalAccounts: (user.externalAccounts || []).map((account: any) => ({
      id: account.id,
      provider: account.provider,
      username: account.username || null
    }))
  }
}
