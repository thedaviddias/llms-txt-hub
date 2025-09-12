import type { Member } from '@/lib/member-server-utils'
import { MembersSearch } from './members-search'
import { MembersList } from './members-list'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

/**
 * Generate metadata for the members page
 *
 * @returns Metadata object for Next.js
 */
export async function generateMetadata() {
  // Fetch total count for metadata
  const membersResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/members/paginated?page=1&limit=1`,
    { cache: 'no-store' }
  )

  let totalCount = 0
  if (membersResponse.ok) {
    const data = await membersResponse.json()
    totalCount = data.totalCount
  }

  return {
    title: `Members (${totalCount}) | LLMs.txt Hub`,
    description: `Browse ${totalCount} members of the LLMs.txt Hub community. Connect with developers, creators, and contributors.`,
    openGraph: {
      title: `${totalCount} Members | LLMs.txt Hub`,
      description:
        'Join our growing community of developers and creators sharing their LLMs.txt files'
    }
  }
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  // Await search params in Next.js 15
  const params = await searchParams
  const searchQuery = params.search || ''
  const page = Number.parseInt(params.page || '1', 10)

  // Fetch initial page of members
  const membersResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/members/paginated?page=${page}&limit=24${
      searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
    }`,
    { cache: 'no-store' }
  )

  let initialMembers: Member[] = []
  let initialTotalCount = 0

  if (membersResponse.ok) {
    const data = await membersResponse.json()
    initialMembers = data.members
    initialTotalCount = data.totalCount
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Members</h1>
        <p className="text-muted-foreground">
          {searchQuery
            ? `${initialMembers.length} of ${initialTotalCount} members`
            : `${initialTotalCount} members and growing`}
        </p>
      </div>

      {/* Client-side search */}
      <MembersSearch />

      {/* Members list with pagination */}
      <div className="mt-8">
        {initialMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? `No members found matching "${searchQuery}"`
                : 'No members found'}
            </p>
          </div>
        ) : (
          <MembersList
            initialMembers={initialMembers}
            initialTotalCount={initialTotalCount}
            initialPage={page}
            initialSearchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  )
}