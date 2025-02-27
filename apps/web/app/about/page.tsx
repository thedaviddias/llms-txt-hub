import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { Card, CardContent, CardHeader, CardTitle } from '@thedaviddias/design-system/card'
import { Code, FileText, Zap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About llms.txt hub',
  description:
    'Learn about the llms.txt hub, its mission, and how it helps AI models better understand documentation.'
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <section className="space-y-4">
          <h1 className="text-4xl font-bold">About llms.txt hub</h1>
          <p className="text-xl text-muted-foreground">
            Discover how llms.txt is revolutionizing AI-ready documentation and enhancing AI model
            interactions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What is llms.txt?</h2>
          <p>
            llms.txt is a standard file that helps AI models better understand and interact with
            your website's documentation and content structure. Similar to how robots.txt guides
            search engines, llms.txt provides a structured format for AI models to navigate and
            comprehend your site's information architecture.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Our Mission</h2>
          <p>
            Created by{' '}
            <a
              href="https://ddias.link/blog"
              className="font-bold underline dark:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              David Dias
            </a>
            , llms.txt hub has the mission to create a central directory and resource center for
            websites and tools implementing the llms.txt standard. It aim to:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Promote the adoption of the llms.txt standard across the web</li>
            <li>Provide resources and tools for developers to implement llms.txt effectively</li>
            <li>Foster a community of AI-ready documentation enthusiasts</li>
            <li>Improve the interaction between AI models and web content</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How it Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create llms.txt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Add an llms.txt file to your website's root directory to define your content
                  structure.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Implement Standard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Follow the llms.txt specification to describe your site's content and AI
                  interaction preferences.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Enhance AI Interactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Improve how AI tools understand and interact with your website's content and
                  documentation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Join the Community</h2>
          <p>
            Whether you're a developer, content creator, or AI enthusiast, there are many ways to
            get involved with the llms.txt hub community:
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <Link href={getRoute('submit')}>Submit Your llms.txt</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={getRoute('projects')}>Explore Resources</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={getRoute('blog')}>Read Our Blog</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            Have questions or suggestions? We'd love to hear from you! Reach out to us at{' '}
            <a href="mailto:contact@llmstxthub.com" className="text-primary hover:underline">
              contact@llmstxthub.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
