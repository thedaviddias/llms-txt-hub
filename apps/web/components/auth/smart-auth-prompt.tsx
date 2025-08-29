'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@thedaviddias/design-system/dialog'
import { ArrowRight, Github, Heart, Users, X, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface SmartAuthPromptProps {
  trigger: 'favorite' | 'search' | 'browse-time' | 'engagement'
  onComplete?: () => void
}

type PromptContext = {
  title: string
  description: string
  icon: any
  benefits: string[]
  primaryCTA: {
    text: string
    href: string
    variant: 'default' | 'outline'
  }
  secondaryCTA: {
    text: string
    href: string
    variant: 'default' | 'outline'
  }
}

function getPromptContext(trigger: SmartAuthPromptProps['trigger']): PromptContext {
  const contexts: Record<SmartAuthPromptProps['trigger'], PromptContext> = {
    favorite: {
      title: 'Want to save this?',
      description:
        'Create a free account to save your favorite AI documentation and access them from anywhere.',
      icon: Heart,
      benefits: ['Sync across devices', 'Never lose bookmarks', 'Quick access dashboard'],
      primaryCTA: {
        text: 'Quick Email Signup',
        href: '/auth/email-signup',
        variant: 'default'
      },
      secondaryCTA: {
        text: 'Sign in with GitHub',
        href: '/login',
        variant: 'outline'
      }
    },
    search: {
      title: 'Finding great resources?',
      description:
        'Save your discoveries and get personalized recommendations based on your interests.',
      icon: Zap,
      benefits: ['Smart recommendations', 'Search history', 'Curated collections'],
      primaryCTA: {
        text: 'Start Saving Discoveries',
        href: '/auth/email-signup',
        variant: 'default'
      },
      secondaryCTA: {
        text: 'GitHub Sign In',
        href: '/login',
        variant: 'outline'
      }
    },
    'browse-time': {
      title: 'Enjoying your exploration?',
      description: 'Join our community of developers building the future of AI documentation.',
      icon: Users,
      benefits: ['Community updates', 'Early access', 'Connect with builders'],
      primaryCTA: {
        text: 'Create Free Account',
        href: '/auth/email-signup',
        variant: 'default'
      },
      secondaryCTA: {
        text: 'Sign in with GitHub',
        href: '/login',
        variant: 'outline'
      }
    },
    engagement: {
      title: 'Ready to contribute?',
      description: 'Help grow the ecosystem by sharing your llms.txt or curating great resources.',
      icon: Github,
      benefits: ['Direct submissions', 'Contributor profile', 'Community recognition'],
      primaryCTA: {
        text: 'Connect GitHub',
        href: '/login',
        variant: 'default'
      },
      secondaryCTA: {
        text: 'Email Signup First',
        href: '/auth/email-signup',
        variant: 'outline'
      }
    }
  }

  return contexts[trigger]
}

export function SmartAuthPrompt({ trigger, onComplete }: SmartAuthPromptProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [, setShowCount] = useState(0)

  const context = getPromptContext(trigger)
  const IconComponent = context.icon

  useEffect(() => {
    if (user) return // Don't show if already authenticated

    // Get interaction counts from localStorage
    const interactionKey = `auth-prompt-${trigger}`
    const interactionCount = Number.parseInt(localStorage.getItem(interactionKey) || '0', 10)

    // Smart timing based on trigger type
    const shouldShow = () => {
      switch (trigger) {
        case 'favorite':
          return interactionCount === 0 // Show immediately on first favorite attempt
        case 'search':
          return interactionCount >= 2 // Show after 3rd search
        case 'browse-time':
          return interactionCount >= 5 // Show after browsing multiple pages
        case 'engagement':
          return interactionCount >= 3 // Show after several interactions
        default:
          return false
      }
    }

    if (shouldShow()) {
      setIsOpen(true)
      setShowCount(interactionCount + 1)
    } else {
      // Increment counter
      localStorage.setItem(interactionKey, String(interactionCount + 1))
    }
  }, [trigger, user])

  const handleClose = () => {
    setIsOpen(false)

    // Mark as dismissed for this session
    const dismissedKey = `auth-prompt-dismissed-${trigger}`
    localStorage.setItem(dismissedKey, Date.now().toString())

    onComplete?.()
  }

  const handleCTAClick = () => {
    // Track conversion
    const conversionKey = `auth-prompt-conversion-${trigger}`
    localStorage.setItem(conversionKey, Date.now().toString())

    onComplete?.()
  }

  if (!isOpen || user) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{context.title}</DialogTitle>
          <DialogDescription className="text-base">{context.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Benefits */}
          <div className="space-y-2">
            {context.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              asChild
              className="w-full"
              variant={context.primaryCTA.variant}
              onClick={handleCTAClick}
            >
              <Link href={context.primaryCTA.href} className="flex items-center justify-center">
                {context.primaryCTA.text}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              className="w-full"
              variant={context.secondaryCTA.variant}
              onClick={handleCTAClick}
            >
              <Link href={context.secondaryCTA.href}>{context.secondaryCTA.text}</Link>
            </Button>
          </div>

          {/* Skip option */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue browsing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
