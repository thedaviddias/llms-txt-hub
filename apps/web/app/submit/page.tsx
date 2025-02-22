'use client'

import { SubmitForm } from '@/components/submit-form'
import { getRoute } from '@/lib/routes'
import { useAuth } from '@thedaviddias/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SubmitPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push(`${getRoute('login')}?redirectTo=${getRoute('submit')}`)
    }
  }, [user, router])

  if (!user) {
    return null // or a loading spinner
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Submit your llms.txt</h1>
        <p className="text-muted-foreground">
          Enter your website's domain to automatically fetch your llms.txt information. You'll have
          a chance to review and edit the details before submitting.
        </p>
        <SubmitForm />
      </div>
    </div>
  )
}
