'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { analytics } from '@/lib/analytics'

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
 * Link component that automatically tracks clicks with analytics
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
  /** Sends analytics events to all configured providers on click */
  const handleClick = () => {
    if (onClick) {
      onClick()
    }

    if (analyticsEvent) {
      if (process.env.NODE_ENV === 'production') {
        window.op?.track(analyticsEvent, analyticsProps)
      }
    } else if (href.startsWith('http')) {
      analytics.externalLink(href, typeof children === 'string' ? children : href)
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
/**
 * Renders an external link that opens in a new tab with analytics tracking
 */
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

/**
 * Renders a GitHub profile link with analytics tracking
 */
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
