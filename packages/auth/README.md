# @thedaviddias/auth

A comprehensive authentication package built for Next.js applications using Clerk as the authentication provider. This package provides a complete authentication solution with both server and client-side utilities, React components, and middleware support.

## Features

- 🔐 Complete Clerk authentication integration
- ⚡️ Server and client-side utilities
- 🎣 Type-safe React hooks for authentication state
- 🧩 Pre-built authentication components
- 🛡️ Strict type safety with TypeScript
- 🔄 Next.js middleware support
- 🔒 Built-in error handling
- 🎭 Fallback provider for testing and development

## Installation

```bash
pnpm add @thedaviddias/auth
```

## Prerequisites

This package requires the following peer dependencies:

- Next.js 15.x
- React 19.x
- Clerk project and credentials

You'll need to set up your Clerk environment variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key
```

## Usage

### 1. Provider Setup

Wrap your application with the AuthProvider:

```tsx
import { AuthProviderComponent } from '@thedaviddias/auth'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviderComponent>
      {children}
    </AuthProviderComponent>
  )
}
```

### 2. Client-Side Authentication

Use the provided hooks for client-side authentication:

```tsx
import { useAuth, useUser } from '@thedaviddias/auth'

export function AuthenticationExample() {
  const { signOut, isLoaded } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <SignIn />
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### 3. Server-Side Authentication

Access authentication state in server components:

```tsx
import { auth, currentUser } from '@thedaviddias/auth'

export default async function ServerComponent() {
  const session = await auth()
  const user = await currentUser()

  if (!user) {
    return <p>Please sign in</p>
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <p>Session expires at: {new Date(session?.expires_at ?? 0).toLocaleString()}</p>
    </div>
  )
}
```

### 4. Middleware Protection

Protect your routes using the provided middleware:

```tsx
// middleware.ts
import { middleware } from '@thedaviddias/auth'

export default middleware

export const config = {
  matcher: ['/protected/:path*']
}
```

## API Reference

### Server Utilities

#### `auth()`
Returns the current session or null if not authenticated.

#### `currentUser()`
Returns the current user or null if not authenticated.

### Client Hooks

#### `useAuth()`
Provides authentication methods and state:
```typescript
{
  isLoaded: boolean
  isSignedIn: boolean
  user: AuthUser | null
  signIn(): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<{ user: AuthUser | null; isSignedIn: boolean }>
  getUser(): Promise<AuthUser | null>
  reloadUser(): Promise<void>
}
```

#### `useUser()`
Provides the current user state:
```typescript
{
  user: AuthUser | null
}
```

### Components

#### `AuthProviderComponent`
Main provider component for authentication context.

#### `SignIn`
Pre-built sign-in component with Clerk authentication.

#### `FallbackProvider`
A mock provider for testing and development environments.

### Types

#### `AuthUser`
```typescript
interface AuthUser {
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
  }
  publicMetadata?: Record<string, unknown>
}
```

#### `AuthProvider`
```typescript
interface AuthProvider {
  isLoaded: boolean
  isSignedIn: boolean
  user: AuthUser | null
  signIn(): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<{ user: AuthUser | null; isSignedIn: boolean }>
  getUser(): Promise<AuthUser | null>
  reloadUser(): Promise<void>
}
```

## Error Handling

The package includes built-in error handling for common authentication scenarios:

```typescript
try {
  await signIn()
} catch (error) {
  // Error is properly typed and includes authentication-specific information
  console.error('Authentication failed:', error)
}
```

## Security Considerations

1. Always use environment variables for Clerk credentials
2. Implement proper CORS policies
3. Use middleware to protect sensitive routes
4. Keep authentication tokens secure
5. Implement proper session management

## Testing

For testing environments, you can use the `FallbackProvider`:

```tsx
import { FallbackProvider } from '@thedaviddias/auth'

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return <FallbackProvider>{children}</FallbackProvider>
}
```
