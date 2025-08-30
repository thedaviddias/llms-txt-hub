'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to account settings as default
    router.replace('/settings/account')
  }, [router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-muted-foreground">Redirecting to account settings...</div>
    </div>
  )
}
