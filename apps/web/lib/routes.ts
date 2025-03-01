/**
 * Application route constants
 * Use these constants instead of hardcoding routes in components
 */

export const routes = {
  home: '/',
  llmsTxt: '/llms.txt',
  website: {
    list: '/website',
    detail: '/website/[slug]',
    featured: '/website',
    latest: '/website?sort=latest',
    withCategory: '/website?category=[category]'
  },
  about: '/about',
  guides: {
    list: '/guides',
    guide: '/guides/[slug]'
  },
  faq: '/faq',
  login: '/login',
  news: '/news',
  privacy: '/privacy',
  projects: '/projects',
  search: '/search',
  submit: '/submit',
  terms: '/terms',
  rss: '/rss.xml'
} as const

type ParentRoutes = 'guides'

type StaticRoutes =
  | 'home'
  | 'llmsTxt'
  | 'website.list'
  | 'website.featured'
  | 'website.latest'
  | 'about'
  | 'guides.list'
  | 'faq'
  | 'login'
  | 'news'
  | 'privacy'
  | 'projects'
  | 'search'
  | 'submit'
  | 'terms'
  | 'rss'

type DynamicRoutes = 'website.detail' | 'website.withCategory' | 'guides.guide'

type Routes = StaticRoutes | DynamicRoutes

type DynamicRouteParams = {
  'website.detail': { slug: string }
  'website.withCategory': { category: string }
  'guides.guide': { slug: string }
}

/**
 * Get the URL for a route
 * @param route - Route name
 * @param params - Route parameters (for dynamic routes)
 */
export function getRoute<T extends Routes>(
  route: T,
  params?: T extends keyof DynamicRouteParams ? DynamicRouteParams[T] : never
): string {
  const parts = route.split('.')
  let current: any = routes

  for (const part of parts) {
    current = current[part]
  }

  if (typeof current === 'string' && params) {
    const param = Object.entries(params)[0]
    return current.replace(`[${param[0]}]`, param[1])
  }

  return current
}
