import { ResourcesSidebar } from "@/components/resources/sidebar"
import { getAllResources } from "@/lib/resources"
import { fetchGitHubProjects } from "@/lib/github"
import { ResourceCard } from "@/components/resource-card"
import { GitHubProjectCard } from "@/components/github-project-card"

export default async function OpenSourcePage() {
  const { openSourceProjects } = await getAllResources()
  const githubProjects = await fetchGitHubProjects("llms-txt")

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ResourcesSidebar />
        <main className="flex-grow space-y-6">
          <h1 className="text-3xl font-bold">Open Source Projects</h1>
          <div className="grid gap-6">
            {openSourceProjects.map((project) => (
              <ResourceCard key={project.slug} resource={project} />
            ))}
            {githubProjects.map((project) => (
              <GitHubProjectCard key={project.fullName} project={project} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

