import { headers } from 'next/headers'
import Link from 'next/link'
import * as React from 'react'
import * as BreadcrumbPrimitive from '../shadcn/breadcrumb'

const {
  Breadcrumb: BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} = BreadcrumbPrimitive

/**
 * Represents a breadcrumb navigation item data
 */
export interface BreadcrumbItemData {
  name: string
  href: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItemData[]
  homeHref?: string
  baseUrl?: string
}

/**
 * Breadcrumb component for navigation hierarchy with JSON-LD support
 *
 * @param props - Component properties
 * @param props.items - Array of breadcrumb items to display
 * @param props.homeHref - Optional custom home link (defaults to '/')
 * @param props.baseUrl - Optional base URL for JSON-LD (defaults to window.location.origin)
 * @returns React component with breadcrumb navigation and structured data
 */
export async function Breadcrumb({ items, homeHref = '/', baseUrl }: BreadcrumbProps) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <div className="mb-4">
      <BreadcrumbRoot>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={homeHref}>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {items.map((item, index) => (
            <React.Fragment key={item.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === items.length - 1 ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </BreadcrumbRoot>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${baseUrl || ''}${homeHref}`
              },
              ...items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 2,
                name: item.name,
                item: `${baseUrl || ''}${item.href}`
              }))
            ]
          })
        }}
      />
    </div>
  )
}
