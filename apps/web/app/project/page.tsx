import { ClientProjectsList } from '@/components/projects-list'
import { getAllWebsites } from '@/lib/mdx'

export default async function ProjectsPage() {
  const projects = await getAllWebsites()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">All Projects</h1>
      <ClientProjectsList initialProjects={projects} />
    </div>
  )
}
