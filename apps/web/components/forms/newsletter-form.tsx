'use client'

import type React from 'react'

import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { useState } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement newsletter subscription logic
    console.log('Subscribing email:', email)
    toast({
      title: 'Subscribed!',
      description: 'Thank you for subscribing to our newsletter.',
    })
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit">Subscribe</Button>
    </form>
  )
}
