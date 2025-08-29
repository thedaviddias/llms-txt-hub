import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export function generateMetadata(): Metadata {
  const baseUrl = getBaseUrl()

  return {
    title: 'Websites - llms.txt hub',
    description: 'Discover a curated list of websites that implement the llms.txt standard.',
    alternates: {
      canonical: `${baseUrl}/`
    }
  }
}

export default function ProjectsPage() {
  // Redirect to homepage where all websites are now displayed
  redirect('/')
}
