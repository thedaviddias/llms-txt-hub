'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { ArrowLeft, Bell, Github, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

const settingsNavigation = [
  {
    name: 'Account',
    href: '/settings/account',
    icon: User,
    description: 'Personal info and security'
  },
  {
    name: 'Integrations',
    href: '/settings/integrations',
    icon: Github,
    description: 'Connected services'
  },
  {
    name: 'Privacy',
    href: '/settings/privacy',
    icon: Shield,
    description: 'Data and privacy controls'
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Email and alert preferences'
  }
]

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { user, isLoaded } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect if not authenticated (but only after auth has loaded)
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login?message=Please sign in to access settings')
    }
  }, [isLoaded, user, router])

  // Show loading state while auth is loading or user is not yet available
  if (!isLoaded || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            onClick={() => analytics.backToProfileClick('settings')}
          >
            <Link href="/profile" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2 sticky top-8">
              {settingsNavigation.map(item => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() =>
                      !isActive &&
                      analytics.settingsTabClick(pathname, item.href, 'settings-sidebar')
                    }
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="hidden sm:block">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
            </nav>

            {/* Mobile Navigation Cards */}
            <div className="lg:hidden mt-8">
              <div className="grid grid-cols-2 gap-3">
                {settingsNavigation.map(item => {
                  const isActive = pathname.startsWith(item.href)
                  const Icon = item.icon

                  return (
                    <Card key={item.name} className={`${isActive ? 'ring-2 ring-primary' : ''}`}>
                      <Link
                        href={item.href}
                        onClick={() =>
                          !isActive &&
                          analytics.settingsTabClick(pathname, item.href, 'settings-mobile')
                        }
                        className="block p-4 text-center space-y-2"
                      >
                        <Icon
                          className={`w-5 h-5 mx-auto ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                        <div
                          className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}
                        >
                          {item.name}
                        </div>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
