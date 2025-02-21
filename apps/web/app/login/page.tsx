'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@thedaviddias/design-system/button'
import { Github } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { user, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirectTo') || '/'
      router.push(redirectTo)
    }
  }, [user, router, searchParams])

  const handleSignIn = async () => {
    await signIn()
    // The redirection will be handled by the useEffect hook above once the user is signed in
  }

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Sign in to llms.txt hub</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            To submit your llms.txt or favorite projects, please sign in with your GitHub account.
          </p>
        </div>
        <div className="mt-8">
          <Button onClick={handleSignIn} className="w-full" size="lg">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        </div>
      </div>
    </div>
  )
}
