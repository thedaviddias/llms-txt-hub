import { LLMButton } from '@/components/llm-button'
import { LLMGrid } from '@/components/llm-grid'
import { ProjectNavigation } from '@/components/project-navigation'
import { getAllWebsites, getWebsiteBySlug } from '@/lib/mdx'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface ProjectPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = (await getWebsiteBySlug(params.slug)) as WebsiteMetadata & {
    content: string
    relatedProjects: WebsiteMetadata[]
    previousProject: WebsiteMetadata | null
    nextProject: WebsiteMetadata | null
  }

  if (!project) {
    return {}
  }

  return {
    title: `${project.name} | llms.txt hub`,
    description: project.description
  }
}

export async function generateStaticParams() {
  const websites = await getAllWebsites()
  return websites.map(website => ({
    slug: website.slug
  }))
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = (await getWebsiteBySlug(params.slug)) as WebsiteMetadata & {
    content: string
    relatedProjects: WebsiteMetadata[]
    previousProject: WebsiteMetadata | null
    nextProject: WebsiteMetadata | null
  }

  if (!project) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Image
            src={getFaviconUrl(project.website) || '/placeholder.svg'}
            alt={`${project.name} favicon`}
            width={32}
            height={32}
            className="rounded-sm"
          />
          <h1 className="text-3xl font-bold">{project.name}</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <LLMButton href={project.llmsUrl} type="llms" size="lg" />
          {project.llmsFullUrl && (
            <LLMButton href={project.llmsFullUrl} type="llms-full" size="lg" />
          )}
        </div>
        <div
          className="prose dark:prose-invert max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: project.content }}
        />
        <ProjectNavigation
          previousProject={project.previousProject}
          nextProject={project.nextProject}
        />
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Related Projects</h2>
          <LLMGrid items={project.relatedProjects || []} variant="compact" />
        </div>
      </div>
    </div>
  )
}
