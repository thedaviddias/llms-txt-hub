import { ResourceCard } from '@/components/resource-card'
import { ResourcesSidebar } from '@/components/resources/sidebar'
import { getAllResources } from '@/lib/resources'

export default async function AllResourcesPage() {
  const { articles, openSourceProjects } = await getAllResources()
  const allResources = [...articles, ...openSourceProjects]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ResourcesSidebar />
        <main className="grow space-y-6">
          <h1 className="text-3xl font-bold">All Resources</h1>
          <div className="grid gap-6">
            {allResources.map(resource => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
