/**
 * Application route constants
 * Use these constants instead of hardcoding routes in components
 */

export const routes = {
  home: '/',
  llmsTxt: '/llms.txt',
  website: {
    list: '/website',
    detail: (slug: string) => `/website/${slug}`,
    featured: '/website',
    latest: '/website'
  },
  about: '/about',
  blog: '/blog',
  category: {
    list: '/category',
    detail: (slug: string) => `/category/${slug}`
  },
  faq: '/faq',
  login: '/login',
  news: '/news',
  privacy: '/privacy',
  resources: {
    list: '/resources',
    articles: '/resources/articles',
    openSource: '/resources/open-source'
  },
  search: '/search',
  submit: '/submit',
  terms: '/terms',
  rss: '/rss.xml'
} as const

type ParentRoutes = 'category' | 'resources'

type StaticRoutes =
  | 'home'
  | 'llmsTxt'
  | 'website.list'
  | 'website.featured'
  | 'website.latest'
  | 'about'
  | 'blog'
  | 'category.list'
  | 'faq'
  | 'login'
  | 'news'
  | 'privacy'
  | 'resources.list'
  | 'resources.articles'
  | 'resources.openSource'
  | 'search'
  | 'submit'
  | 'terms'
  | 'rss'

type DynamicRoutes = 'website.detail' | 'category.detail'

type RoutePaths = StaticRoutes | DynamicRoutes | ParentRoutes

/**
 * Type-safe route getter
 * @param path - Dot notation path to the route (e.g. 'website.detail')
 * @param params - Optional parameters for dynamic routes
 */
export function getRoute(path: RoutePaths, params?: Record<string, string>): string {
  const parts = path.split('.')
  let route: any = routes

  // Handle parent routes, but not for 'website'
  if (parts.length === 1 && parts[0] !== 'website' && route[parts[0]]?.list) {
    return route[parts[0]].list
  }

  for (const part of parts) {
    if (!route || !route[part]) {
      throw new Error(`Invalid route path: ${path}`)
    }
    route = route[part]
  }

  if (typeof route === 'function') {
    if (!params?.slug) {
      throw new Error(`Missing required slug parameter for route: ${path}`)
    }
    return route(params.slug)
  }

  if (typeof route === 'string') {
    return route
  }

  throw new Error(`Invalid route path: ${path}`)
}
