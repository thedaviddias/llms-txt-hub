import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: [
        '/404',
        '/500',
        '/submit',
        '/login',
        '/api/*',
        '/sort=*',
        '/search=*',
        '/category=*',
        '/members?search=*',
        '/members?page=*',
        '/search?q=*'
      ]
    }
  }
}
