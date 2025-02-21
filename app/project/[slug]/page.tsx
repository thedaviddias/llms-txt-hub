import Image from "next/image"
import { notFound } from "next/navigation"
import { getAllWebsites, getWebsiteBySlug } from "@/lib/mdx"
import { LLMGrid } from "@/components/llm-grid"
import type { Metadata } from "next"
import { LLMButton } from "@/components/llm-button"
import { FavoriteButton } from "@/components/favorite-button"
import { ProjectNavigation } from "@/components/project-navigation"

function getFaviconUrl(website: string) {
  const domain = new URL(website).hostname
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

interface ProjectPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = await getWebsiteBySlug(params.slug)

  if (!project) {
    return {
      title: "Project Not Found",
    }
  }

  return {
    title: `${project.name} - llms.txt Directory`,
    description: project.description,
  }
}

export async function generateStaticParams() {
  const websites = await getAllWebsites()
  return websites.map((website) => ({
    slug: website.slug,
  }))
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getWebsiteBySlug(params.slug)

  if (!project) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={getFaviconUrl(project.website) || "/placeholder.svg"}
              alt={`${project.name} favicon`}
              width={32}
              height={32}
              className="rounded-sm"
            />
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <FavoriteButton projectSlug={project.slug} initialFavorites={project.favorites} showText={true} />
        </div>
        <div className="flex flex-wrap gap-4">
          <LLMButton href={project.llmsUrl} type="llms" size="lg" />
          {project.llmsFullUrl && <LLMButton href={project.llmsFullUrl} type="llms-full" size="lg" />}
        </div>
        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.content }} />
        <ProjectNavigation previousProject={project.previousProject} nextProject={project.nextProject} />
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Related Projects</h2>
          <LLMGrid items={project.relatedProjects || []} variant="compact" />
        </div>
      </div>
    </div>
  )
}

