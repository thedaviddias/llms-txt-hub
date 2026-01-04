'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
}

/**
 * Navigation link component with active state handling
 * Features: Bold active state, underline animation on hover
 *
 * @param href - The link URL
 * @param children - Link content
 * @param exact - Whether to match exact path
 * @returns JSX.Element - Navigation link
 */
export function NavLink({ href, children, exact = false }: NavLinkProps) {
  const pathname = usePathname()

  // Calculate isActive with proper route matching
  const isActive = exact
    ? pathname === href
    : href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'relative text-sm font-medium transition-colors duration-200',
        'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200',
        'hover:after:scale-x-100',
        isActive
          ? 'text-foreground font-bold after:scale-x-100'
          : 'text-muted-foreground hover:text-foreground',
        'plausible-event-name=External+Link+Click'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
