import { Button } from '@thedaviddias/design-system/button'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
      <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      {onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : actionHref ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
