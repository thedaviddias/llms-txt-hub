import type { User } from '@supabase/supabase-js'

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

export interface AuthContext {
  isLoaded: boolean
  isSignedIn: boolean
  user: User | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
