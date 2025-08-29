/**
 * Application route constants
 * Use these constants instead of hardcoding routes in components
 */

export const routes = {
  home: '/',
  llmsTxt: '/llms.txt',
  website: {
    list: '/websites',
    detail: '/websites/[slug]',
    featured: '/websites',
    latest: '/websites?sort=latest',
    withCategory: '/websites?category=[category]'
  },
  category: {
    page: '/[category]'
  },
  about: '/about',
  favorites: '/favorites',
  guides: {
    list: '/guides',
    guide: '/guides/[slug]'
  },
  faq: '/faq',
  login: '/login',
  news: '/news',
  privacy: '/privacy',
  cookies: '/cookies',
  projects: '/projects',
  search: '/search',
  submit: '/submit',
  terms: '/terms',
  rss: '/rss.xml',
  members: {
    list: '/members',
    page: '/members/[page]'
  },
  profile: {
    detail: '/u/[slug]'
  }
} as const

type StaticRoutes =
  | 'home'
  | 'llmsTxt'
  | 'website.list'
  | 'website.featured'
  | 'website.latest'
  | 'about'
  | 'favorites'
  | 'guides.list'
  | 'faq'
  | 'login'
  | 'news'
  | 'privacy'
  | 'cookies'
  | 'projects'
  | 'search'
  | 'submit'
  | 'terms'
  | 'rss'
  | 'members.list'

type DynamicRoutes =
  | 'website.detail'
  | 'website.withCategory'
  | 'guides.guide'
  | 'category.page'
  | 'profile.detail'
  | 'members.page'

type Routes = StaticRoutes | DynamicRoutes

type DynamicRouteParams = {
  'website.detail': { slug: string }
  'website.withCategory': { category: string }
  'guides.guide': { slug: string }
  'category.page': { category: string }
  'profile.detail': { slug: string }
  'members.page': { page: string }
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
