'use client'

import { useSignIn, useSignUp, useUser } from '@clerk/nextjs'
import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@thedaviddias/design-system/tabs'
import { logger } from '@thedaviddias/logging'
import { CheckCircle, Github, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const { user } = useUser()
  const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn()
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/'

  // If user is already signed in, redirect
  useEffect(() => {
    if (user) {
      router.replace(redirectTo)
    }
  }, [user, router, redirectTo])

  /**
   * Handle email submission for authentication
   *
   * @param e - Form event
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn || !signUp) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Try to sign in first
      const { supportedFirstFactors } = await signIn.create({
        identifier: email
      })

      // Find the email_code factor
      const emailFactor = supportedFirstFactors?.find(factor => factor.strategy === 'email_code')

      if (emailFactor && 'emailAddressId' in emailFactor) {
        // Send the verification code
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId
        })

        setPendingVerification(true)
        setAuthMode('signin')
      } else {
        throw new Error('Unable to sign in. Please try again or use GitHub authentication.')
      }
    } catch (err) {
      // If sign in fails because user doesn't exist, try sign up
      if (
        err &&
        typeof err === 'object' &&
        'errors' in err &&
        Array.isArray(err.errors) &&
        err.errors?.[0]?.code === 'form_identifier_not_found'
      ) {
        try {
          // Create new account with ONLY email (no OAuth requirement)
          await signUp.create({
            emailAddress: email
          })

          // Send verification email
          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code'
          })

          setPendingVerification(true)
          setAuthMode('signup')
        } catch (signUpErr: any) {
          setError(signUpErr.errors?.[0]?.message || 'Failed to create account')
          logger.error('Sign up error:', { data: signUpErr })
        }
      } else {
        setError('Unable to sign in. Please try again.')
        logger.error('Sign in error:', { data: err })
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle verification code submission
   *
   * @param e - Form event
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn || !signUp) return

    setIsLoading(true)
    setError('')

    try {
      if (authMode === 'signup' && signUp) {
        // Complete sign up
        const completeSignUp = await signUp.attemptEmailAddressVerification({
          code: verificationCode
        })

        if (completeSignUp.status === 'complete') {
          // Set the session active
          await setSignUpActive({ session: completeSignUp.createdSessionId })

          setIsRedirecting(true)

          // Update user metadata to track auth level
          setTimeout(async () => {
            try {
              await fetch('/api/auth/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  authLevel: 'email_only',
                  canSubmitPR: false,
                  githubConnected: false
                })
              })
            } catch (error) {
              logger.error('Failed to update user metadata:', { data: error })
            }
          }, 1000)

          router.push(redirectTo)
        }
      } else if (authMode === 'signin' && signIn) {
        // Complete sign in
        const completeSignIn = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: verificationCode
        })

        if (completeSignIn.status === 'complete') {
          await setSignInActive({ session: completeSignIn.createdSessionId })
          setIsRedirecting(true)
          router.push(redirectTo)
        }
      }
    } catch (err) {
      const errorMessage =
        err &&
        typeof err === 'object' &&
        'errors' in err &&
        Array.isArray(err.errors) &&
        err.errors?.[0]?.message
          ? err.errors[0].message
          : 'Invalid verification code'
      setError(errorMessage)
      logger.error('Verification error:', { data: err })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle GitHub sign in
   *
   * @returns Promise<void>
   */
  const handleGitHubSignIn = async () => {
    if (!signIn) return

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_github',
        redirectUrl: '/login/callback',
        redirectUrlComplete: redirectTo
      })
    } catch (error) {
      logger.error('GitHub authentication error:', { data: error })
      setError('Failed to connect with GitHub')
    }
  }

  if (user || isRedirecting) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-pulse">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Welcome to llms.txt hub!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to the homepage...</p>
        </div>
      </div>
    )
  }

  // Show verification code input
  if (pendingVerification) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">We sent a verification code to</p>
            <p className="text-sm font-medium">{email}</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.75em] font-mono h-14"
                maxLength={6}
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setPendingVerification(false)
                setVerificationCode('')
                setError('')
                setAuthMode(null)
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use Different Email
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Main sign in/up form - Minimalist design
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to llms.txt hub</h1>
          <p className="text-sm text-muted-foreground">
            Join our community of developers building AI-ready documentation
          </p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="github" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/30">
            <TabsTrigger
              value="github"
              className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground transition-all"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground transition-all"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* GitHub Tab */}
          <TabsContent value="github" className="mt-6 space-y-4">
            <Card className="p-6 space-y-4 border-2">
              <div className="space-y-2 text-sm">
                <h3 className="font-semibold text-base">GitHub Authentication</h3>
                <ul className="text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Automated PR submissions
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Verified contributor badge
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Direct repository integration
                  </li>
                </ul>
              </div>

              <Button onClick={handleGitHubSignIn} className="w-full h-11" disabled={!signInLoaded}>
                <Github className="mr-2 h-4 w-4" />
                Sign up with GitHub
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Connect your GitHub for enhanced features
              </p>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="mt-6 space-y-4">
            <Card className="p-6 space-y-4 border-2">
              <div className="space-y-2 text-sm">
                <h3 className="font-semibold text-base">Email Authentication</h3>
                <ul className="text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    No password required
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Submit projects via form
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      role="img"
                      aria-label="Checkmark"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Sync favorites across devices
                  </li>
                </ul>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      setError('') // Clear error on change
                    }}
                    required
                    disabled={isLoading}
                    autoFocus
                    className="h-11"
                    aria-invalid={!!error}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading || !signInLoaded || !signUpLoaded}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isLoading ? 'Sending code...' : 'Sign up with Email'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  We'll send you a 6-digit code to verify your email
                </p>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href="https://github.com/thedaviddias/llms-txt-hub"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Submit via GitHub
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  )
}
