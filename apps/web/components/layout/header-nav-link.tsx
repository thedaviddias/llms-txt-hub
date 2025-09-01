'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
}

/**
 * Navigation link component with active state handling
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
      className={`text-[15px] transition-colors ${
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
      } plausible-event-name=External+Link+Click`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
