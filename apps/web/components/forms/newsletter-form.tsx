'use client'

import { Button } from '@thedaviddias/design-system/button'
import type React from 'react'
import { useState } from 'react'
import { NewsletterModal } from '@/components/newsletter-modal'

/**
 * Newsletter subscription form component
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="plausible-event-name=Newsletter+Click"
      >
        Subscribe
      </Button>
      <NewsletterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
