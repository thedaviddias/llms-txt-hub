import Link from 'next/link'
import * as React from 'react'
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as ShadcnBreadcrumb
} from '../shadcn/breadcrumb'

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
export function Breadcrumb({ items, homeHref = '/', baseUrl }: BreadcrumbProps) {
  return (
    <div className="mb-4">
      <ShadcnBreadcrumb>
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
      </ShadcnBreadcrumb>
      <script
        type="application/ld+json"
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
