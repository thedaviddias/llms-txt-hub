import { getCachedMembers } from '@/lib/member-server-utils'
import { MembersList } from './members-list'
import { MembersSearch } from './members-search'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

/**
 * Generate metadata for the members page
 *
 * @returns Metadata object for Next.js
 */
export async function generateMetadata() {
  const allMembers = await getCachedMembers()
  const totalCount = allMembers.length

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
  const limit = 24

  // Get all members and filter/search them server-side
  const allMembers = await getCachedMembers()
  let filteredMembers = allMembers

  // Apply search filter if provided
  if (searchQuery.trim()) {
    const lowerCaseSearchQuery = searchQuery.toLowerCase().trim()
    filteredMembers = allMembers.filter(member => {
      const displayName =
        member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`.toLowerCase()
          : (member.firstName || member.lastName || member.username || '').toLowerCase()
      const username = (
        member.username ||
        member.publicMetadata?.github_username ||
        ''
      ).toLowerCase()

      return displayName.includes(lowerCaseSearchQuery) || username.includes(lowerCaseSearchQuery)
    })
  }

  // Calculate pagination
  const totalCount = filteredMembers.length
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const initialMembers = filteredMembers.slice(startIndex, endIndex)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Members</h1>
        <p className="text-muted-foreground">
          {searchQuery
            ? `${initialMembers.length} of ${totalCount} members`
            : `${totalCount} members and growing`}
        </p>
      </div>

      {/* Client-side search */}
      <MembersSearch />

      {/* Members list with pagination */}
      <div className="mt-8">
        {initialMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? `No members found matching "${searchQuery}"` : 'No members found'}
            </p>
          </div>
        ) : (
          <MembersList
            initialMembers={initialMembers}
            initialTotalCount={totalCount}
            initialPage={page}
            initialSearchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  )
}
