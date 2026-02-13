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

/**
 * Renders a styled button linking to an llms.txt or llms-full.txt file
 */
export function LLMButton({ href, type, size = 'md', className }: LLMButtonProps) {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-w-[120px]',
    md: 'text-sm px-4 py-2 min-w-[140px]',
    lg: 'text-base px-5 py-2.5 min-w-[180px]'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'size-4',
    lg: 'h-4 w-4'
  }

  const typeConfig = {
    llms: {
      label: 'llms.txt',
      description: 'Basic information',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300'
    },
    'llms-full': {
      label: 'llms-full.txt',
      description: 'Complete documentation',
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-700 dark:text-purple-300'
    }
  }

  if (!href) {
    return null
  }

  const config = typeConfig[type]

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group inline-flex items-center justify-between rounded-xl bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        config.gradient,
        config.border,
        'border backdrop-blur-sm',
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col items-start">
        <span className={cn('font-mono font-semibold', config.text)}>{config.label}</span>
        {size === 'lg' && (
          <span className="text-xs text-muted-foreground mt-0.5">{config.description}</span>
        )}
      </div>
      <ExternalLink
        className={cn(
          'ml-3 transition-transform group-hover:scale-110 group-hover:translate-x-0.5',
          iconSizes[size],
          config.text
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%] transform" />
    </Link>
  )
}
