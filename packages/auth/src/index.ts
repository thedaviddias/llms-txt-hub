// Server exports

// Client exports
export { type AuthProvider, useAuth } from './client/context'
export { useUser } from './client/hooks/use-user'
// Core exports
export { AuthProvider as AuthProviderComponent } from './core/provider'
export * from './core/types'
export { auth, currentUser } from './server'
export { middleware } from './server/middleware'
