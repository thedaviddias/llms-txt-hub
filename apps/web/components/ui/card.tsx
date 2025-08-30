import * as DesignSystemCard from '@thedaviddias/design-system/card'
import { cn } from '@/lib/utils'

// Custom Card components with consistent styling

/**
 * Custom Card component with consistent styling
 *
 * @param props - Card component props
 * @returns Card component
 */
export function Card({ className, ...props }: React.ComponentProps<typeof DesignSystemCard.Card>) {
  return <DesignSystemCard.Card className={cn('rounded-none', className)} {...props} />
}

/**
 * Card header component
 *
 * @param props - CardHeader component props
 * @returns CardHeader component
 */
export function CardHeader({
  className,
  ...props
}: React.ComponentProps<typeof DesignSystemCard.CardHeader>) {
  return <DesignSystemCard.CardHeader className={className} {...props} />
}

/**
 * Card title component
 *
 * @param props - CardTitle component props
 * @returns CardTitle component
 */
export function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof DesignSystemCard.CardTitle>) {
  return <DesignSystemCard.CardTitle className={className} {...props} />
}

/**
 * Card description component
 *
 * @param props - CardDescription component props
 * @returns CardDescription component
 */
export function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof DesignSystemCard.CardDescription>) {
  return <DesignSystemCard.CardDescription className={className} {...props} />
}

/**
 * Card content component
 *
 * @param props - CardContent component props
 * @returns CardContent component
 */
export function CardContent({
  className,
  ...props
}: React.ComponentProps<typeof DesignSystemCard.CardContent>) {
  return <DesignSystemCard.CardContent className={className} {...props} />
}
