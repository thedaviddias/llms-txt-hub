// import { env } from '@thedaviddias/config-environment'
import type { MetadataRoute } from 'next'

// const BASE_URL = env.NEXT_PUBLIC_WEB_URL

// Define static routes and their properties
const staticRoutes = [
  {
    route: '/',
    priority: 1.0,
    changeFrequency: 'weekly' as const,
  },
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = []

  // Add static routes
  // staticRoutes.forEach((route) => {
  //   routes.push({
  //     url: `${BASE_URL}${route.route}`,
  //     lastModified: new Date(),
  //     changeFrequency: route.changeFrequency,
  //     priority: route.priority,
  //   })
  // })

  // // Add chart type routes
  // VALID_CHART_TYPES.forEach((type) => {
  //   routes.push({
  //     url: `${BASE_URL}/charts/${type}`,
  //     lastModified: new Date(),
  //     changeFrequency: 'daily',
  //     priority: 0.8,
  //   })
  // })

  // You could add more dynamic routes here
  // For example, if you have user-generated content or other dynamic pages
  // const dynamicRoutes = await fetchDynamicRoutes();
  // routes.push(...dynamicRoutes);

  return routes
}
