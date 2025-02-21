'use client'

import { SignIn } from '@/components/auth/sign-in'

type LoginButtonProps = Parameters<typeof SignIn>[0]

export function LoginButton({ redirectUrl, onSignIn, ...buttonProps }: LoginButtonProps) {
  return (
    <SignIn redirectUrl={redirectUrl} onSignIn={onSignIn}>
      {buttonProps.children}
    </SignIn>
  )
}
