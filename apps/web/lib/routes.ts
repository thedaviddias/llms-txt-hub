/**
 * Application route constants
 * Use these constants instead of hardcoding routes in components
 */

export const routes = {
  home: '/',
  project: {
    list: '/project',
    detail: (slug: string) => `/project/${slug}`,
    featured: '/project?filter=featured',
    latest: '/project?filter=latest'
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
  docs: {
    gettingStarted: '/docs/getting-started'
  },
  rss: '/rss.xml'
} as const

type ParentRoutes = 'category' | 'resources'

type StaticRoutes =
  | 'home'
  | 'project.list'
  | 'project.featured'
  | 'project.latest'
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
  | 'docs.gettingStarted'
  | 'rss'

type DynamicRoutes = 'project.detail' | 'category.detail'

type RoutePaths = StaticRoutes | DynamicRoutes | ParentRoutes

/**
 * Type-safe route getter
 * @param path - Dot notation path to the route (e.g. 'project.detail')
 * @param params - Optional parameters for dynamic routes
 */
export function getRoute(path: RoutePaths, params?: Record<string, string>): string {
  const parts = path.split('.')
  let route: any = routes

  // Handle parent routes, but not for 'project'
  if (parts.length === 1 && parts[0] !== 'project' && route[parts[0]]?.list) {
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
