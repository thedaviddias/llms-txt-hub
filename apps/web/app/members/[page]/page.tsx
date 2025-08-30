import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export function generateMetadata(): Metadata {
  return {
    title: 'Redirected Page | llms.txt hub',
    description: 'This page has been redirected.',
    robots: {
      index: false,
      follow: false
    }
  }
}

export default async function MembersPageRoute() {
  // All paginated routes now redirect to main members page with load more
  redirect('/members')
}
