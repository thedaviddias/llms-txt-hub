/**
 * Malicious URL protocols to block
 */
export const MALICIOUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'] as const

/**
 * Reserved usernames that cannot be used
 */
export const RESERVED_USERNAMES = [
  'admin',
  'api',
  'root',
  'system',
  'support',
  'help',
  'about',
  'login',
  'signup',
  'www',
  'mail',
  'ftp',
  'app',
  'dashboard',
  'settings',
  'profile',
  'user',
  'users',
  'member',
  'members'
] as const
