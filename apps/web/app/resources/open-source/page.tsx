import { GitHubProjectCard } from '@/components/github/github-project-card'
import { ResourceCard } from '@/components/resource-card'
import { ResourcesSidebar } from '@/components/resources/sidebar'
import { fetchGitHubProjects } from '@/lib/github'
import { getAllResources } from '@/lib/resources'

export const GithubTopics = () => {
  return (
    <p className="text-sm text-muted-foreground">
      Simply add a the{' '}
      <a href="https://github.com/topics/llms-txt" className="dark:text-white underline">
        llms-txt
      </a>{' '}
      or{' '}
      <a href="https://github.com/topics/llmstxt" className="dark:text-white underline">
        llmstxt
      </a>{' '}
      topic to your Github repository to automatically be featured here.
    </p>
  )
}

export default async function OpenSourcePage() {
  const { openSourceProjects } = await getAllResources()

  const githubProjects1 = await fetchGitHubProjects('llms-txt')
  const githubProjects2 = await fetchGitHubProjects('llmstxt')

  const githubProjects = [...githubProjects1, ...githubProjects2]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <main className="grow space-y-6">
          <h1 className="text-3xl font-bold">Open Source Projects</h1>
          <GithubTopics />
          <div className="grid gap-6">
            {openSourceProjects.map(project => (
              <ResourceCard key={project.slug} resource={project} />
            ))}
            {githubProjects.map(project => (
              <GitHubProjectCard key={project.fullName} project={project} />
            ))}
          </div>
        </main>

        <ResourcesSidebar />
      </div>
    </div>
  )
}
