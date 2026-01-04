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

/**
 * Sanitizes and validates a redirect URL to prevent open redirect vulnerabilities
 *
 * @param redirectUrl - The redirect URL from query parameters
 * @returns A safe relative path or '/' as fallback
 */
function sanitizeRedirectUrl(redirectUrl: string | null): string {
  if (!redirectUrl) return '/'

  // Remove leading/trailing whitespace
  const trimmed = redirectUrl.trim()
  if (!trimmed) return '/'

  // Reject URLs with protocols (http:, https:, etc.)
  if (/^[a-zA-Z]+:/.test(trimmed)) {
    logger.warn('Redirect URL contains protocol, rejecting:', { data: { url: trimmed } })
    return '/'
  }

  // Reject URLs starting with // (protocol-relative URLs)
  if (trimmed.startsWith('//')) {
    logger.warn('Redirect URL is protocol-relative, rejecting:', { data: { url: trimmed } })
    return '/'
  }

  // Only allow relative paths starting with /
  if (!trimmed.startsWith('/')) {
    logger.warn('Redirect URL is not a relative path, rejecting:', { data: { url: trimmed } })
    return '/'
  }

  // Normalize the path: resolve dot segments and remove duplicate slashes
  try {
    // Use URL constructor to normalize the path (relative to current origin)
    const normalized = new URL(trimmed, 'http://localhost').pathname

    // Ensure it still starts with / after normalization
    if (!normalized.startsWith('/')) {
      return '/'
    }

    return normalized
  } catch (error) {
    logger.warn('Failed to normalize redirect URL, using fallback:', {
      data: { url: trimmed, error }
    })
    return '/'
  }
}

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

  // Get and sanitize redirect URL from query params
  const redirectTo = sanitizeRedirectUrl(searchParams.get('redirect'))

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
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to llms.txt hub!</h2>
          <p className="text-muted-foreground">Redirecting you to the homepage...</p>
        </div>
      </div>
    )
  }

  // Show verification code input
  if (pendingVerification) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500 text-white mb-2">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            <p className="text-muted-foreground">We sent a verification code to</p>
            <p className="font-bold text-foreground">{email}</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 rounded-none border-2 focus:border-foreground"
                maxLength={6}
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 rounded-none font-bold"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setPendingVerification(false)
                setVerificationCode('')
                setError('')
                setAuthMode(null)
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              ← Use Different Email
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Main sign in/up form - Minimal bold design
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Sign in to llms.txt hub</h1>
          <p className="text-muted-foreground">Manage your submissions, favorites, and profile</p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="github" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 p-0 bg-transparent gap-2">
            <TabsTrigger
              value="github"
              className="rounded-none text-sm font-bold border border-border data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground transition-all h-full"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="rounded-none text-sm font-bold border border-border data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground transition-all h-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* GitHub Tab */}
          <TabsContent value="github" className="mt-6 space-y-4">
            <Card className="p-6 space-y-5 border-2 border-foreground/10">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  <h3 className="font-bold">GitHub Authentication</h3>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary">
                    Recommended
                  </span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Automated PR submissions
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Verified contributor badge
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Direct repository integration
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleGitHubSignIn}
                className="w-full h-11 rounded-none font-bold"
                disabled={!signInLoaded}
              >
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Connect your GitHub for the full experience
              </p>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="mt-6 space-y-4">
            <Card className="p-6 space-y-5 border-2 border-foreground/10">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <h3 className="font-bold">Email Authentication</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    No password required
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Submit projects via form
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Sync favorites across devices
                  </li>
                </ul>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    required
                    disabled={isLoading}
                    autoFocus
                    className="h-11 rounded-none border-2 focus:border-foreground"
                    aria-invalid={!!error}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-none font-bold"
                  disabled={isLoading || !signInLoaded || !signUpLoaded}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isLoading ? 'Sending code...' : 'Continue with Email'}
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
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              or
            </span>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href="https://github.com/thedaviddias/llms-txt-hub"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Submit via GitHub →
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Continue browsing →
          </Link>
        </div>
      </div>
    </div>
  )
}
