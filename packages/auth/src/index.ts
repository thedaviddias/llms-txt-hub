// Server exports
export { auth, currentUser } from './server'

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
} from './client'

// Core exports
export { AuthProvider } from './provider'
export { middleware } from './middleware'
export * from './types'
