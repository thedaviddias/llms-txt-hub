import { ResourceCard } from '@/components/resource-card'
import { ResourcesSidebar } from '@/components/resources/sidebar'
import { getAllResources } from '@/lib/resources'

export default async function ArticlesPage() {
  const { articles } = await getAllResources()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ResourcesSidebar />
        <main className="grow space-y-6">
          <h1 className="text-3xl font-bold">Articles</h1>
          <div className="grid gap-6">
            {articles
              .filter(article => article.type === 'Article')
              .map(article => (
                <ResourceCard key={article.slug} resource={article} />
              ))}
          </div>
        </main>
      </div>
    </div>
  )
}
