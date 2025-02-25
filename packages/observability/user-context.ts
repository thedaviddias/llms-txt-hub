import * as Sentry from '@sentry/nextjs'
/**
 * Utility functions for configuring Sentry user context
 */
import type { AuthUser } from '@thedaviddias/auth'

/**
 * Configure Sentry user context with GitHub user information
 *
 * @param user - Supabase user object containing GitHub user data
 */
export function configureSentryUser(user: AuthUser | null) {
  if (!user) {
    Sentry.setUser(null)
    return
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.name ?? undefined,
    ip_address: '{{auto}}'
  })
}
