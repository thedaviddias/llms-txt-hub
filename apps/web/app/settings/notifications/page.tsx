'use client'

import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NewsletterModal } from '@/components/newsletter-modal'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

export default function NotificationsSettingsPage() {
  const { user } = useAuth()
  const [showNewsletterModal, setShowNewsletterModal] = useState(false)
  const [_settings, setSettings] = useState({
    emailNewsletter: false,
    emailUpdates: true,
    emailSubmissions: true,
    emailSecurity: true,
    pushNotifications: false,
    weeklyDigest: true,
    communityUpdates: false
  })

  const _hasGitHubAuth =
    user && (user.user_metadata?.github_username || user.user_metadata?.user_name)

  useEffect(() => {
    analytics.settingsPageView('notifications', 'settings')
  }, [])

  /**
   * Updates a notification setting preference
   */
  const _handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    analytics.settingsToggleChange(key, value, 'notifications')
    toast.success('Notification preference updated')
  }

  /**
   * Opens the newsletter subscription modal
   */
  const handleNewsletterSubscribe = () => {
    analytics.newsletterSignup('settings-notifications')
    setShowNewsletterModal(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Notifications</h2>
        <p className="text-muted-foreground">Choose what updates you'd like to receive</p>
      </div>

      {/* Newsletter */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Newsletter</h3>
              <p className="text-sm text-muted-foreground">
                Updates on new projects, trends, and community highlights
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Stay in the loop!</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Get curated updates about the latest AI documentation trends, featured projects, and
            community insights delivered to your inbox via Substack.
          </p>

          <div className="flex items-center space-x-3">
            <Button onClick={handleNewsletterSubscribe} size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Subscribe on Substack
            </Button>
            <span className="text-xs text-muted-foreground">Free • Unsubscribe anytime</span>
          </div>
        </div>
      </Card>

      <NewsletterModal isOpen={showNewsletterModal} onClose={() => setShowNewsletterModal(false)} />
    </div>
  )
}
