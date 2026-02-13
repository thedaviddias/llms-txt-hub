import type { ReactNode } from 'react'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { getDocs } from '@/lib/content-loader'

export default function DocsLayout({ children }: { children: ReactNode }) {
  const docs = getDocs()

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-12">
        <DocsSidebar docs={docs} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
