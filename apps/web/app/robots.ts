import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmstxthub.com'

  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/404', '/500', '/submit', '/login', '/api/', '/u/', '/search']
    },
    sitemap: `${baseUrl}/sitemap.xml`
  }
}
