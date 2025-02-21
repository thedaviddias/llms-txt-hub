/**
 * Cookie names used across the application
 * Centralized to avoid duplication and ensure consistency
 */
export const COOKIE_NAMES = {
  // Theme
  COLOR_THEME: 'theme',

  // Preferences
  LANGUAGE: 'language'
} as const

/**
 * Cookie options configuration
 * Default options that can be used when setting cookies
 */
export const COOKIE_OPTIONS = {
  // Session cookie options (expires when browser closes)
  SESSION: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/'
  },

  // Client-side accessible cookies (for theme, language, etc.)
  CLIENT: {
    secure: true,
    sameSite: 'lax' as const,
    path: '/'
  }
} as const
