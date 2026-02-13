'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface CopyButtonProps {
  text: string
  variant?: 'default' | 'terminal'
}

/**
 * Renders a button that copies text to the clipboard
 */
export function CopyButton({ text, variant = 'default' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  /**
   * Copies the text to the clipboard and shows a confirmation
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'shrink-0 rounded-lg p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'terminal'
          ? 'border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700'
          : 'border border-border/50 bg-muted hover:bg-muted/80'
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" />
      ) : (
        <Copy
          className={cn(
            'size-4',
            variant === 'terminal' ? 'text-zinc-600 dark:text-zinc-400' : 'text-muted-foreground'
          )}
        />
      )}
    </button>
  )
}
