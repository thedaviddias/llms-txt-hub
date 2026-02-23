'use client'

import { logger } from '@thedaviddias/logging'
import { useEffect } from 'react'

/**
 * CSRF Provider component that initializes CSRF token on the client side
 *
 * @returns null - This component doesn't render anything
 */
export function CSRFProvider() {
  useEffect(() => {
    /**
     * Initialize CSRF token by fetching from API and setting meta tag
     */
    const initCSRF = async () => {
      try {
        const response = await fetch('/api/csrf', { method: 'GET' })
        if (response.ok) {
          const data = await response.json()
          if (data.token) {
            // Create or update meta tag
            let metaTag = document.querySelector('meta[name="csrf-token"]')
            if (!metaTag || !(metaTag instanceof HTMLMetaElement)) {
              metaTag = document.createElement('meta')
              if (metaTag instanceof HTMLMetaElement) {
                metaTag.name = 'csrf-token'
                document.head.appendChild(metaTag)
              }
            }
            if (metaTag instanceof HTMLMetaElement) {
              metaTag.content = data.token
            }
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), {
          data: error,
          tags: { type: 'component', component: 'csrf-provider' }
        })
      }
    }

    initCSRF()
  }, [])

  return null
}
