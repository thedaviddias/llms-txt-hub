// Server exports
export { auth, currentUser } from './server'

// Client exports
export { createBrowserClient, type SupabaseClient } from './client'
export { useAuth, type AuthProvider } from './client/context'
export { useUser } from './client/hooks/use-user'

// Core exports
export { AuthProvider as AuthProviderComponent } from './core/provider'
export { middleware } from './server/middleware'
export * from './core/types'
