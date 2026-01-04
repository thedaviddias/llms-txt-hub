import { Button } from '@thedaviddias/design-system/button'
import { cn } from '@thedaviddias/design-system/lib/utils'
import { FolderOpen, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  icon?: LucideIcon
  iconClassName?: string
  iconContainerClassName?: string
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

/**
 * Display an empty state with optional action button
 * @param props - Component props
 * @param props.title - The title to display
 * @param props.description - The description text
 * @param props.actionLabel - Optional label for the action button
 * @param props.actionHref - Optional href for link-based action
 * @param props.onAction - Optional click handler for button action
 * @param props.icon - Optional custom icon component
 * @param props.iconClassName - Optional className for the icon
 * @param props.iconContainerClassName - Optional className for the icon container
 * @param props.className - Optional className for the container
 * @param props.titleClassName - Optional className for the title
 * @param props.descriptionClassName - Optional className for the description
 * @returns React component
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon: Icon = FolderOpen,
  iconClassName,
  iconContainerClassName,
  className,
  titleClassName,
  descriptionClassName
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-[50vh] text-center',
        className
      )}
    >
      <div className={iconContainerClassName}>
        <Icon className={cn('h-16 w-16 text-muted-foreground mb-4', iconClassName)} />
      </div>
      <h2 className={cn('text-2xl font-bold mb-2', titleClassName)}>{title}</h2>
      <p className={cn('text-muted-foreground mb-4 max-w-md', descriptionClassName)}>
        {description}
      </p>
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
