'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface LLMButtonProps {
  href: string
  type: 'llms' | 'llms-full'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LLMButton({ href, type, size = 'md', className }: LLMButtonProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'size-4',
    lg: 'h-5 w-5'
  }

  if (!href) {
    return null
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center rounded-md bg-muted hover:bg-muted/80 transition-colors z-20 relative',
        sizeClasses[size],
        className
      )}
    >
      {type === 'llms' ? 'llms.txt' : 'llms-full.txt'}
      <ExternalLink className={cn('ml-1', iconSizes[size])} />
    </Link>
  )
}
