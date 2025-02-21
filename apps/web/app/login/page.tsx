'use client'

import { LoginButton } from '@/components/buttons/login-button'

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Sign in to llms.txt hub</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            To submit your llms.txt or favorite projects, please sign in with your GitHub account.
          </p>
        </div>
        <div className="mt-8">
          <LoginButton>Sign in with GitHub</LoginButton>
        </div>
      </div>
    </div>
  )
}
