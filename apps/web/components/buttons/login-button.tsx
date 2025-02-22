'use client'

import { SignIn } from '@thedaviddias/auth'

type LoginButtonProps = Parameters<typeof SignIn>[0]

export function LoginButton({ redirectUrl, onSignIn, ...buttonProps }: LoginButtonProps) {
  return (
    <SignIn redirectUrl={redirectUrl} onSignIn={onSignIn}>
      {buttonProps.children}
    </SignIn>
  )
}
