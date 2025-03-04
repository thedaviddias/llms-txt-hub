'use client'

import { LoginButton } from '@/components/buttons/login-button'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Sign in to llms.txt hub</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            To submit your llms.txt or favorite projects, please sign in with your GitHub account.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            If you don't want to sign in, you can always directly submit your llms.txt file to the{' '}
            <Link
              href="https://github.com/thedaviddias/llms-txt-hub?tab=readme-ov-file#adding-your-project"
              className="text-blue-500 hover:text-blue-600"
            >
              GitHub repository
            </Link>
            .
          </p>
        </div>
        <div className="mt-8">
          <LoginButton>Sign in with GitHub</LoginButton>
        </div>
      </div>
    </div>
  )
}
