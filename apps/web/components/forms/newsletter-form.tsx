'use client'

import type React from 'react'

import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'

/**
 * Newsletter subscription form component
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  return (
    <Button asChild>
      <Link href="https://thedaviddias.substack.com/">Subscribe</Link>
    </Button>
  )
}
