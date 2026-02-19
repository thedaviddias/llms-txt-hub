import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { Users } from 'lucide-react'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { getCachedMembers } from '@/lib/member-server-utils'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
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

  return generateBaseMetadata({
    title: `Members (${totalCount})`,
    description: `Browse ${totalCount} members of the llms.txt Hub community. Connect with developers, creators, and contributors building AI-ready documentation.`,
    path: '/members',
    keywords: [
      'llms.txt community',
      'AI documentation contributors',
      'developer community',
      'llms.txt members'
    ]
  })
}

/**
 * Empty state component for when no members are found
 */
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">No members found</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery
              ? `No members found matching "${searchQuery}". Try a different search term.`
              : 'Be the first to join the community!'}
          </p>
        </div>
      </div>
    </Card>
  )
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
    <div className="container mx-auto py-8">
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'Members', href: '/members' }]} baseUrl={getBaseUrl()} />

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <span className="size-2 bg-primary rounded-full" />
            Community Members
          </h1>
          <p className="text-lg text-muted-foreground">
            {searchQuery
              ? `${initialMembers.length} of ${totalCount} members`
              : `${totalCount} members and growing`}
          </p>
        </div>

        {/* Client-side search */}
        <MembersSearch />

        {/* Members list with pagination */}
        {initialMembers.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <section className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {searchQuery ? `Search Results (${totalCount})` : `All Members (${totalCount})`}
            </h2>
            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
              <MembersList
                initialMembers={initialMembers}
                initialTotalCount={totalCount}
                initialPage={page}
                initialSearchQuery={searchQuery}
              />
            </Suspense>
          </section>
        )}
      </div>
    </div>
  )
}
