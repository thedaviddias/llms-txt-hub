export interface AuthUser {
  id: string
  email?: string | null
  name?: string | null
  imageUrl?: string | null
}

export interface AuthSession {
  user: AuthUser | null
  isSignedIn: boolean
}

export interface AuthProvider {
  signIn(): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession>
  getUser(): Promise<AuthUser | null>
}

export type AuthProviderType = 'clerk' | 'supabase'
