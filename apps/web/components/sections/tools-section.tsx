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
  }
]

interface ToolsSectionProps {
  layout?: 'default' | 'compact'
  showImages?: boolean
}

/**
 * Section component displaying popular development tools
 */
export function ToolsSection({ layout = 'default', showImages = true }: ToolsSectionProps) {
  return (
    <Section
      title="Developer Tools"
      description="Explore tools created to help you work with llms.txt"
      viewAllHref={getRoute('category.page', { category: 'developer-tools' })}
      viewAllText="All tools"
    >
      <div className="@container">
        <div className="grid gap-4 @[500px]:grid-cols-2 @[800px]:grid-cols-4">
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="h-full flex flex-col transition-all hover:border-primary hover:bg-muted/50">
                <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1">
                  <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                    {tool.title}
                    <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                {layout === 'default' && showImages && (
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
