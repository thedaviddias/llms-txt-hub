'use client'

// Re-export Clerk client components
export {
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  OrganizationSwitcher
} from '@clerk/nextjs'

// Re-export our hooks
export { useAuth } from './hooks/use-auth'
export { useUser } from './hooks/use-user'
