import { ResourceCard } from '@/components/resource-card'
import { ResourcesSidebar } from '@/components/resources/sidebar'
import { getAllResources } from '@/lib/resources'

export default async function TutorialsPage() {
  const { articles } = await getAllResources()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <main className="grow space-y-6">
          <h1 className="text-3xl font-bold">Tutorials</h1>
          <div className="grid gap-6">
            {articles
              .filter(article => article.type === 'Tutorial')
              .map(tutorial => (
                <ResourceCard key={tutorial.slug} resource={tutorial} />
              ))}
          </div>
        </main>

        <ResourcesSidebar />
      </div>
    </div>
  )
}
