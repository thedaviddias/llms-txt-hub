// Server exports
export { auth, currentUser } from './src/server'

// Client exports
export {
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  OrganizationSwitcher,
  useAuth,
  useUser
} from './src/client'

// Core exports
export { AuthProvider } from './src/provider'
export { middleware } from './src/middleware'
export * from './src/types'
