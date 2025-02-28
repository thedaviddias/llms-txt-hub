'use client'

import { SubmitForm } from '@/components/forms/submit-form'
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
        <SubmitForm />
      </div>
    </div>
  )
}
