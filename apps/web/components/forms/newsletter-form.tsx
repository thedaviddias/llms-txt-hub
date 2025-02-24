'use client'

import type React from 'react'

import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { useState } from 'react'

/**
 * Newsletter subscription form component
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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

      toast({
        title: 'Success!',
        description: 'Thank you for subscribing to our newsletter.',
        variant: 'default'
      })

      setEmail('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to subscribe to newsletter',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className=""
        required
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Subscribing...' : 'Subscribe'}
      </Button>
    </form>
  )
}
