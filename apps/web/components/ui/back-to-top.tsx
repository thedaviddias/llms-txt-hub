'use client'

import { Button } from '@thedaviddias/design-system/button'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Back to top button component that automatically shows when page is scrollable
 * and user has scrolled past a threshold
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    /**
     * Check if page should show back to top button
     * Shows when user scrolls past 400px and page is long enough
     */
    const toggleVisibility = () => {
      const scrolled = window.scrollY
      const pageHeight = document.documentElement.scrollHeight
      const viewportHeight = window.innerHeight

      // Only show if page is significantly longer than viewport and user has scrolled
      const isPageLongEnough = pageHeight > viewportHeight * 1.5
      const hasScrolledEnough = scrolled > 400

      setIsVisible(isPageLongEnough && hasScrolledEnough)
    }

    // Add scroll listener
    window.addEventListener('scroll', toggleVisibility, { passive: true })

    // Check initially in case page is already scrolled
    toggleVisibility()

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  /**
   * Scroll to top of page with smooth animation
   */
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <Button
      onClick={scrollToTop}
      size="sm"
      variant="outline"
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full p-0 shadow-lg transition-all duration-200 hover:shadow-xl"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
