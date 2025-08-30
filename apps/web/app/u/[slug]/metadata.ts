import type { Metadata } from 'next'

interface GenerateMetadataProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  // Extract name from slug (before the last dash and ID)
  const namePart = params.slug.replace(/-[a-zA-Z0-9]{5}$/, '').replace(/-/g, ' ')
  const displayName = namePart
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${displayName} | llms.txt hub`,
    description: `View ${displayName}'s profile on llms.txt hub. Discover their submitted llms.txt files and contributions to the community.`,
    openGraph: {
      title: `${displayName} | llms.txt hub`,
      description: `View ${displayName}'s profile on llms.txt hub`,
      type: 'profile'
    },
    robots: {
      index: true,
      follow: true
    }
  }
}
