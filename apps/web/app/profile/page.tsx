import { Suspense } from 'react'
import ProfileContent from './profile-content'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

function ProfileLoading() {
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  )
}
