'use client'

import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { logger } from '@thedaviddias/logging'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'cookie-consent'
const COOKIE_CONSENT_VERSION = '1.0'

interface CookieConsent {
  version: string
  essential: boolean
  analytics: boolean
  functional: boolean
  timestamp: number
}

/**
 * Cookie consent banner component that provides GDPR-compliant cookie consent management
 */
export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has already provided consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)

    if (savedConsent) {
      try {
        const consent: CookieConsent = JSON.parse(savedConsent)
        // Check if consent is for current version and not older than 1 year
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000

        if (consent.version === COOKIE_CONSENT_VERSION && consent.timestamp > oneYearAgo) {
          setIsVisible(false)
          setIsLoading(false)
          return
        }
      } catch (error) {
        logger.error('Error parsing cookie consent:', { data: error, tags: { type: 'component' } })
      }
    }

    // Show banner if no valid consent found
    setIsVisible(true)
    setIsLoading(false)
  }, [])

  const saveConsent = (analyticsConsent: boolean, functionalConsent: boolean) => {
    const consent: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      essential: true, // Essential cookies are always accepted
      analytics: analyticsConsent,
      functional: functionalConsent,
      timestamp: Date.now()
    }

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))

    // Dispatch custom event for other parts of the app to listen to
    window.dispatchEvent(
      new CustomEvent('cookieConsentUpdated', {
        detail: consent
      })
    )

    setIsVisible(false)
  }

  const acceptAll = () => {
    saveConsent(true, true)
  }

  const acceptEssentialOnly = () => {
    saveConsent(false, false)
  }

  const dismiss = () => {
    // Same as accepting essential only
    acceptEssentialOnly()
  }

  if (isLoading || !isVisible) {
    return null
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg"
      role="banner"
      aria-label="Cookie consent banner"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">
              We use cookies to enhance your experience
            </p>
            <p className="leading-relaxed">
              We use essential cookies to make our website work and analytics cookies to understand
              how you interact with our website. Functional cookies help us remember your
              preferences. You can manage your preferences or learn more in our{' '}
              <Link
                href={getRoute('cookies')}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link
                href={getRoute('privacy')}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={acceptEssentialOnly}
              className="text-xs sm:text-sm"
            >
              Required Cookies Only
            </Button>
            <Button size="sm" onClick={acceptAll} className="text-xs sm:text-sm">
              Accept All Cookies
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              className="p-2"
              aria-label="Dismiss cookie banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to get current cookie consent preferences
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    const getConsent = () => {
      const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (savedConsent) {
        try {
          return JSON.parse(savedConsent)
        } catch {
          return null
        }
      }
      return null
    }

    setConsent(getConsent())

    const handleConsentUpdate = (event: CustomEvent<CookieConsent>) => {
      setConsent(event.detail)
    }

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener)

    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener)
    }
  }, [])

  return consent
}

/**
 * Utility function to check if a specific cookie category is consented to
 */
export function hasCookieConsent(category: 'essential' | 'analytics' | 'functional'): boolean {
  if (typeof window === 'undefined') return false

  const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!savedConsent) return category === 'essential' // Essential cookies don't need consent

  try {
    const consent: CookieConsent = JSON.parse(savedConsent)
    return consent[category] === true
  } catch {
    return category === 'essential'
  }
}
