'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { ExternalLink, Github, Star } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

interface Project {
  name: string
  description: string
  url: string
  githubUrl?: string
  stars?: number
  tags: string[]
  featured?: boolean
}

// TODO: Update star counts quarterly - last updated: January 2025
const projects: Project[] = [
  {
    name: 'Front-End Checklist',
    description: 'The perfect Front-End Checklist for modern websites and meticulous developers.',
    url: 'https://frontendchecklist.io',
    githubUrl: 'https://github.com/thedaviddias/Front-End-Checklist',
    stars: 71100,
    tags: ['Frontend', 'Checklist', 'Best Practices']
  },
  {
    name: 'UX Patterns for Developers',
    description:
      'Collection of UX patterns for everyone but specially towards developers who want to understand how to build effective UI components accessible and usable.',
    url: 'https://github.com/thedaviddias/ux-patterns-for-developers',
    githubUrl: 'https://github.com/thedaviddias/ux-patterns-for-developers',
    stars: 111,
    tags: ['UX', 'Design Patterns', 'Accessibility']
  },
  {
    name: 'Indie Dev Toolkit',
    description:
      'A curated list of tools and resources for indie hackers, solo founders, and bootstrapped startups.',
    url: 'https://github.com/thedaviddias/indie-dev-toolkit',
    githubUrl: 'https://github.com/thedaviddias/indie-dev-toolkit',
    stars: 180,
    tags: ['Toolkit', 'Indie Hacking', 'Resources']
  }
]

export function CreatorProjectsSection() {
  return (
    <Section
      title="More Projects by the Creator"
      description="Explore other open-source projects and resources by David Dias"
    >
      <div className="space-y-6">
        {/* Projects Grid - 3 columns on desktop */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Card
              key={project.name}
              className="relative group hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <CardHeader className="pb-3 flex-1">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {project.stars && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{project.stars.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {project.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 mt-auto">
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5"
                      onClick={() => {
                        analytics.creatorProjectClick(project.name, project.url, 'visit-site')
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit Site
                    </a>
                  </Button>
                  {project.githubUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5"
                        onClick={() => {
                          analytics.creatorProjectClick(project.name, project.githubUrl!, 'github')
                        }}
                      >
                        <Github className="h-3 w-3" />
                        GitHub
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">
            Like these projects? Check out David's GitHub for more open-source contributions.
          </p>
          <Button variant="outline" asChild>
            <a
              href="https://github.com/thedaviddias"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
              onClick={() => {
                analytics.creatorProjectClick(
                  'David Dias Profile',
                  'https://github.com/thedaviddias',
                  'github',
                  'follow-cta'
                )
              }}
            >
              <Github className="h-4 w-4" />
              Follow on GitHub
            </a>
          </Button>
        </div>
      </div>
    </Section>
  )
}
