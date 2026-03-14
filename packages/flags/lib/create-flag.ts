import { currentUser } from '@thedaviddias/auth/server'
import { flag } from '@vercel/flags/next'

/**
 * Create a feature flag resolver backed by the current authenticated user.
 *
 * @param key - The feature flag key
 * @returns A configured Vercel flag instance
 */
export const createFlag = (key: string) =>
  flag({
    key,
    defaultValue: false,
    async decide() {
      const user = await currentUser()

      if (!user?.id) {
        return this.defaultValue as boolean
      }

      // Since we don't have a feature flag system integrated,
      // always return the default value for now
      return this.defaultValue as boolean

      // When you implement a real feature flag system, uncomment and adapt:
      // const isEnabled = await yourFeatureFlagSystem.isFeatureEnabled(key, user.id)
      // return isEnabled ?? (this.defaultValue as boolean)
    }
  })
