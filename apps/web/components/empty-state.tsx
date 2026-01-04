import { Button } from '@thedaviddias/design-system/button'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

/**
 * Display an empty state with optional action button
 * @param props - Component props
 * @param props.title - The title to display
 * @param props.description - The description text
 * @param props.actionLabel - Optional label for the action button
 * @param props.actionHref - Optional href for link-based action
 * @param props.onAction - Optional click handler for button action
 * @returns React component
 */
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
      {onAction && actionLabel ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
