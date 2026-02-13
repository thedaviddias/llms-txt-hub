'use client'

import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import { Globe } from 'lucide-react'
import { useState } from 'react'

interface FaviconWithFallbackProps {
  website: string
  name: string
  size?: number
  className?: string
}

/**
 * Displays a favicon with automatic fallback to a Globe icon on error
 * @param props - The component props
 * @returns React component that handles favicon loading and errors
 */
export function FaviconWithFallback({
  website,
  name,
  size = 32,
  className = 'rounded-lg'
}: FaviconWithFallbackProps) {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return (
      <div
        className={`${className} flex-shrink-0 flex items-center justify-center bg-muted`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <Globe className="w-4 h-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={getFaviconUrl(website, 256) || '/placeholder.svg'}
      alt={`${name} favicon`}
      width={size}
      height={size}
      className={`${className} flex-shrink-0 object-contain`}
      style={{ width: `${size}px`, height: 'auto', aspectRatio: '1/1' }}
      onError={() => setImageError(true)}
    />
  )
}
