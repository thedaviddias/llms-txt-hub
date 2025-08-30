import { MembersWithLoadMore } from '@/components/examples/members-with-load-more'

interface MembersServerProps {
  searchParams?: {
    search?: string
    filter?: string
    page?: string
  }
}

/**
 * Server component wrapper for the members page
 * Uses API-based data fetching through the MembersWithLoadMore component
 */
export async function MembersServer(_: MembersServerProps) {
  return <MembersWithLoadMore variant="scroll" />
}
