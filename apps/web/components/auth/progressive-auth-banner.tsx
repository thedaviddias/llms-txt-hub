'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { Github, Heart, Mail, Users, X, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface ProgressiveAuthBannerProps {
  context?: 'favorites' | 'community' | 'submit' | 'general'
  onDismiss?: () => void
  className?: string
}

export function ProgressiveAuthBanner({
  context = 'general',
  onDismiss,
  className = ''
}: ProgressiveAuthBannerProps) {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([])

  useEffect(() => {
    // Load dismissed banners from localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissed-auth-banners') || '[]')
    setDismissedBanners(dismissed)

    // Show banner logic based on context and auth state
    const shouldShow = !user && !dismissed.includes(context)
    setIsVisible(shouldShow)
  }, [user, context])

  const handleDismiss = () => {
    const newDismissed = [...dismissedBanners, context]
    setDismissedBanners(newDismissed)
    localStorage.setItem('dismissed-auth-banners', JSON.stringify(newDismissed))
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible || user) return null

  const contextConfig = {
    favorites: {
      icon: Heart,
      title: 'Save your discoveries',
      description:
        'Create a free account to sync favorites across devices and never lose track of great AI documentation.',
      benefits: ['Cloud sync', 'Cross-device access', 'Smart collections']
    },
    community: {
      icon: Users,
      title: 'Join our growing community',
      description: 'Connect with 2,000+ developers building AI-ready documentation.',
      benefits: ['Community updates', 'Early access', 'Developer insights']
    },
    submit: {
      icon: Zap,
      title: 'Share your llms.txt',
      description: 'Help grow the ecosystem by sharing your AI-ready documentation.',
      benefits: ['Direct submission', 'GitHub integration', 'Contributor profile']
    },
    general: {
      icon: Mail,
      title: 'Unlock the full experience',
      description:
        'Create a free account to save favorites, get updates, and contribute to the community.',
      benefits: ['Save favorites', 'Get updates', 'Easy contributions']
    }
  }

  const config = contextConfig[context]
  const IconComponent = config.icon

  return (
    <Card
      className={`relative border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5 ${className}`}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 hover:bg-muted rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="p-4 pr-10">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-medium text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            </div>

            {/* Benefits list */}
            <div className="flex flex-wrap gap-2">
              {config.benefits.map((benefit, index) => (
                <span key={index} className="text-xs bg-muted px-2 py-1 rounded-full">
                  {benefit}
                </span>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild size="sm" className="text-sm">
                <Link href="/auth/email-signup">
                  <Mail className="h-4 w-4 mr-2" />
                  Quick Email Signup
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="text-sm">
                <Link href="/login">
                  <Github className="h-4 w-4 mr-2" />
                  Sign in with GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
