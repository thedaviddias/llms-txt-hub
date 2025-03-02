'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { keys } from '@thedaviddias/supabase/keys'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import type { PropsWithChildren } from 'react'

interface SignInProps extends PropsWithChildren {
  /**
   * URL to redirect to after successful sign in
   * @default '/'
   */
  redirectUrl?: string
  /**
   * Callback when sign in is requested
   */
  onSignIn?: () => Promise<void>
}

/**
 * SignIn component that handles authentication and redirect logic
 *
 * @param props - Component properties
 * @returns React component with sign-in functionality
 *
 * @example
 * ```tsx
 * <SignIn redirectUrl="/dashboard" onSignIn={() => handleSignIn()}>
 *   Sign in with GitHub
 * </SignIn>
 * ```
 */
export function SignIn({ redirectUrl = '/', onSignIn, children }: SignInProps) {
  const { user, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasSupabaseConfig = Boolean(
    keys().NEXT_PUBLIC_SUPABASE_URL && keys().NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // We don't need the useEffect redirect anymore since it's handled by Supabase OAuth
  // The only case we need to handle is if the user is already signed in
  useEffect(() => {
    if (user) {
      const finalRedirect = searchParams.get('redirectTo') || redirectUrl
      router.replace(finalRedirect)
    }
  }, [user, router, searchParams, redirectUrl])

  const handleSignIn = async () => {
    if (onSignIn) {
      await onSignIn()
    } else {
      await signIn()
    }
  }

  // If no auth is configured, just render children
  if (!hasSupabaseConfig) {
    return <>{children}</>
  }

  // Fallback to Button if children is just text or other non-element
  return (
    <Button onClick={handleSignIn} className="w-full">
      {children}
    </Button>
  )
}
