'use client'

import type React from 'react'

import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { MailIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Newsletter subscription form component
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to subscribe')
      }

      toast.success('Thank you for subscribing to our newsletter.')

      setEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe to newsletter')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <MailIcon className="h-5 w-5" />
        </div>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="pl-10 h-11 bg-muted/50 border-input focus-visible:ring-2"
          required
          disabled={isLoading}
          aria-label="Email address"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 px-6 font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20"
      >
        {isLoading ? 'Subscribing...' : 'Subscribe'}
      </Button>
    </form>
  )
}
