import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Section } from '@/components/layout/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRoute } from '@/lib/routes'

interface ToolCardData {
  title: string
  description: string
  href: string
  image: string
  imageAlt: string
}

const TOOLS: ToolCardData[] = [
  {
    title: 'LLMs.txt Checker Chrome Extension',
    description: 'Check if websites implement llms.txt and llms-full.txt files',
    href: 'https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej',
    image: '/tools/llmstxt-checker.png',
    imageAlt: 'LLMs.txt Checker Screenshot'
  },
  {
    title: 'LLMS.txt VSCode Extension',
    description: 'Search and explore llms.txt files directly in VS Code',
    href: 'https://marketplace.visualstudio.com/items?itemName=TheDavidDias.vscode-llms-txt',
    image: '/tools/vscode-extension.png',
    imageAlt: 'VS Code Extension Screenshot'
  },
  {
    title: 'MCP LLMS.txt Explorer',
    description: 'Explore and analyze llms.txt files using MCP',
    href: 'https://github.com/thedaviddias/mcp-llms-txt-explorer',
    image: '/tools/mcp-llms-txt-explorer.png',
    imageAlt: 'MCP LLMS.txt Explorer Screenshot'
  },
  {
    title: 'LLMs Txt Raycast Extension',
    description: 'Search and explore llms.txt files directly in Raycast',
    href: 'https://www.raycast.com/thedaviddias/llms-txt',
    image: '/tools/llms-txt-raycast-extension.png',
    imageAlt: 'Raycast Extension Screenshot'
  },
  {
    title: 'llmstxt CLI',
    description: 'Install llms.txt documentation directly into your AI coding agents',
    href: 'https://www.npmjs.com/package/llmstxt-cli',
    image: '/tools/llmstxt-cli.png',
    imageAlt: 'llmstxt CLI Screenshot'
  }
]

interface ToolsSectionProps {
  layout?: 'default' | 'compact'
  showImages?: boolean
}

/**
 * Section component displaying popular development tools.
 * When showImages=false (e.g. on website detail pages), renders a single card
 * with a compact list of tools to match the page layout.
 */
export function ToolsSection({ layout = 'default', showImages = true }: ToolsSectionProps) {
  if (!showImages) {
    return (
      <Section
        title="Developer Tools"
        description="Explore tools created to help you work with llms.txt"
        viewAllHref={getRoute('category.page', { category: 'developer-tools' })}
        viewAllText="All tools"
        titleId="developer-tools"
      >
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <ul className="divide-y divide-border/50">
            {TOOLS.map((tool, index) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors block truncate">
                      {tool.title}
                    </span>
                    <span className="text-sm text-muted-foreground line-clamp-2 mt-0.5 block">
                      {tool.description}
                    </span>
                  </span>
                  <ExternalLink
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-1"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    )
  }

  return (
    <Section
      title="Developer Tools"
      description="Explore tools created to help you work with llms.txt"
      viewAllHref={getRoute('category.page', { category: 'developer-tools' })}
      viewAllText="All tools"
      titleId="developer-tools"
    >
      <div className="@container">
        <div className="grid gap-4 @[500px]:grid-cols-2 @[800px]:grid-cols-4">
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
            >
              <Card className="h-full flex flex-col transition-all duration-200 hover:border-primary/50 hover:bg-muted/50 rounded-2xl border-border/50">
                <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1">
                  <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                    {tool.title}
                    <ExternalLink
                      className="size-4 opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
                      aria-hidden
                    />
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                {layout === 'default' && (
                  <CardContent className="p-2 sm:p-2.5 md:p-3 pt-0 mt-auto">
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      <Image
                        src={tool.image}
                        alt={tool.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Section>
  )
}
