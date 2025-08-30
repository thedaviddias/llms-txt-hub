'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { Button } from '@thedaviddias/design-system/button'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

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
  const { user } = useUser()
  const { redirectToSignIn } = useClerk()
  const router = useRouter()
  const searchParams = useSearchParams()

  // If user is already signed in, redirect them
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
      // Redirect to our custom login page
      router.push('/login')
    }
  }

  // Fallback to Button if children is just text or other non-element
  return (
    <Button onClick={handleSignIn} className="w-full">
      {children}
    </Button>
  )
}
