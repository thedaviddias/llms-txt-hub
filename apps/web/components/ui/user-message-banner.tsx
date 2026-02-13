'use client'

import { Button } from '@thedaviddias/design-system/button'
import { AlertCircle, AlertTriangle, CheckCircle, Github, Info, Mail, User, X } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'

type IconName =
  | 'user'
  | 'alert-circle'
  | 'github'
  | 'mail'
  | 'info'
  | 'check-circle'
  | 'alert-triangle'

const iconMap = {
  user: User,
  'alert-circle': AlertCircle,
  github: Github,
  mail: Mail,
  info: Info,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle
}

interface UserMessageBannerProps {
  icon: IconName
  title: string
  description: string
  variant?: 'info' | 'success' | 'warning' | 'neutral'
  dismissible?: boolean
  onDismiss?: () => void
  actions?: Array<{
    label: string
    href?: string
    onClick?: () => void
    variant?: 'default' | 'outline' | 'ghost'
    icon?: IconName
  }>
  className?: string
}

const variantStyles = {
  info: 'border-blue-200 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-950/20',
  success: 'border-green-200 bg-green-50/50 dark:border-green-800/30 dark:bg-green-950/20',
  warning: 'border-orange-200 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20',
  neutral: 'border-border bg-muted/30'
}

const iconStyles = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  neutral: 'bg-primary/10 text-primary'
}

/**
 * Renders a styled banner with icon, message, and optional action buttons
 */
export function UserMessageBanner({
  icon,
  title,
  description,
  variant = 'neutral',
  dismissible = false,
  onDismiss,
  actions,
  className = ''
}: UserMessageBannerProps) {
  const IconComponent = iconMap[icon]

  return (
    <Card className={`relative ${variantStyles[variant]} ${className}`}>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-background/80 rounded-full transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className={`px-3 py-2 ${dismissible ? 'pr-10' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-md ${iconStyles[variant]}`}>
            <IconComponent className="h-4 w-4" />
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            {actions && actions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                {actions.map((action, index) => {
                  const ActionIcon = action.icon ? iconMap[action.icon] : null

                  if (action.href) {
                    return (
                      <Button
                        key={index}
                        asChild
                        size="sm"
                        variant={action.variant || 'default'}
                        className="text-sm"
                      >
                        <Link href={action.href} className="cursor-pointer">
                          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                          {action.label}
                        </Link>
                      </Button>
                    )
                  }

                  return (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'default'}
                      onClick={action.onClick}
                      className="text-sm cursor-pointer"
                    >
                      {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
