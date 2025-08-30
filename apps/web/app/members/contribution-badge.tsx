'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getUserContributions } from '@/lib/github-contributions'

interface ContributionBadgeProps {
  username: string
}

export function ContributionBadge({ username }: ContributionBadgeProps) {
  const [isContributor, setIsContributor] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  // Use Intersection Observer to lazy load contribution data
  useEffect(() => {
    // Check if IntersectionObserver is available (not in SSR/jsdom)
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: set visibility immediately if IntersectionObserver is not available
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting && !isLoading && isContributor === null) {
          setIsVisible(true)
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading slightly before the element is visible
        threshold: 0.01
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      // Clean up observer to prevent memory leaks
      observer.disconnect()
    }
  }, [isLoading, isContributor])

  // Fetch contribution data when visible
  useEffect(() => {
    if (!isVisible || isLoading || isContributor !== null) return

    const fetchContributions = async () => {
      setIsLoading(true)
      try {
        const contributions = await getUserContributions(username)
        setIsContributor(contributions.total > 0)
      } catch (error) {
        // On error, assume not a contributor
        setIsContributor(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContributions()
  }, [isVisible, username, isLoading, isContributor])

  return (
    <div ref={elementRef} className="inline-block">
      {isLoading && (
        <Badge variant="secondary" className="text-xs opacity-50">
          <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Checking...
        </Badge>
      )}
      {isContributor === true && (
        <Badge variant="secondary" className="text-xs">
          <Star className="mr-1 h-3 w-3" />
          Contributor
        </Badge>
      )}
    </div>
  )
}
