import type { Metadata } from 'next'
import { CommunityDashboard } from '@/components/community/community-dashboard'

export const metadata: Metadata = {
  title: 'Community - llms.txt hub',
  description:
    'Join our growing community of developers building AI-ready documentation. Connect, contribute, and discover the latest in llms.txt projects.'
}

export default function CommunityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground mt-2">
            Connect with developers building the future of AI documentation
          </p>
        </div>

        <CommunityDashboard />
      </div>
    </div>
  )
}
