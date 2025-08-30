'use client'

import { analytics } from '@/lib/analytics'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface AnalyticsLinkProps {
  href: string
  children: ReactNode
  className?: string
  target?: string
  rel?: string
  analyticsEvent?: string
  analyticsProps?: Record<string, string | number>
  onClick?: () => void
}

/**
 * Link component that automatically tracks clicks with Plausible
 */
export function AnalyticsLink({
  href,
  children,
  className,
  target,
  rel,
  analyticsEvent,
  analyticsProps,
  onClick,
  ...props
}: AnalyticsLinkProps) {
  const handleClick = () => {
    // Custom onClick handler
    if (onClick) {
      onClick()
    }

    // Track with analytics if event provided
    if (analyticsEvent) {
      if (window.plausible) {
        window.plausible(analyticsEvent, { props: analyticsProps })
      }
    } else {
      // Default tracking based on href
      if (href.startsWith('http')) {
        analytics.externalLink(href, typeof children === 'string' ? children : href)
      }
    }
  }

  return (
    <Link
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  )
}

// Convenience components for common link types
export function ExternalAnalyticsLink({
  children,
  href,
  className,
  source
}: {
  children: ReactNode
  href: string
  className?: string
  source?: string
}) {
  return (
    <AnalyticsLink
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        analytics.externalLink(href, typeof children === 'string' ? children : href, source)
      }
    >
      {children}
    </AnalyticsLink>
  )
}

export function GitHubAnalyticsLink({
  username,
  children,
  className,
  source
}: {
  username: string
  children: ReactNode
  className?: string
  source?: string
}) {
  return (
    <AnalyticsLink
      href={`https://github.com/${username}`}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.githubLink(username, source)}
    >
      {children}
    </AnalyticsLink>
  )
}
