export interface AuthExternalAccount {
  id: string
  provider: string
  username?: string | null
}

export interface AuthUser {
  id: string
  email?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  imageUrl?: string | null
  user_metadata?: {
    user_name?: string | null
    full_name?: string | null
    avatar_url?: string | null
    github_username?: string | null
  } | null
  publicMetadata?: any
  externalAccounts?: AuthExternalAccount[]
}

export interface AuthSession {
  user: AuthUser | null
  isSignedIn: boolean
}

export interface AuthContext {
  isLoaded: boolean
  isSignedIn: boolean
  user: AuthUser | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
