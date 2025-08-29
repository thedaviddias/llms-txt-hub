import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Section } from '@/components/layout/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRoute } from '@/lib/routes'

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
        <div className="grid gap-4 sm:gap-6 @[600px]:grid-cols-2 @[900px]:grid-cols-4 @[1200px]:grid-cols-5">
          <Link
            href="https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-all hover:border-primary hover:bg-muted/50">
              <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1.5 sm:space-y-2">
                <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                  LLMs.txt Checker Chrome Extension
                  <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Check if websites implement llms.txt and llms-full.txt files
                </CardDescription>
              </CardHeader>
              {layout === 'default' && showImages && (
                <CardContent className="flex h-full flex-col justify-end p-2 sm:p-2.5 md:p-3 pt-0">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src="/tools/llmstxt-checker.png"
                      alt="LLMs.txt Checker Screenshot"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </Link>

          <Link
            href="https://marketplace.visualstudio.com/items?itemName=TheDavidDias.vscode-llms-txt"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-all hover:border-primary hover:bg-muted/50">
              <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1.5 sm:space-y-2">
                <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                  LLMS.txt VSCode Extension
                  <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Search and explore llms.txt files directly in VS Code
                </CardDescription>
              </CardHeader>
              {layout === 'default' && showImages && (
                <CardContent className="flex h-full flex-col justify-end p-2 sm:p-2.5 md:p-3 pt-0">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src="/tools/vscode-extension.png"
                      alt="VS Code Extension Screenshot"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </Link>

          <Link
            href="https://github.com/thedaviddias/mcp-llms-txt-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-all hover:border-primary hover:bg-muted/50">
              <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1.5 sm:space-y-2">
                <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                  MCP LLMS.txt Explorer
                  <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Explore and analyze llms.txt files using MCP
                </CardDescription>
              </CardHeader>
              {layout === 'default' && showImages && (
                <CardContent className="flex h-full flex-col justify-end p-2 sm:p-2.5 md:p-3 pt-0">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src="/tools/mcp-llms-txt-explorer.png"
                      alt="MCP LLMS.txt Explorer Screenshot"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </Link>

          <Link
            href="https://www.raycast.com/thedaviddias/llms-txt"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full transition-all hover:border-primary hover:bg-muted/50">
              <CardHeader className="p-2 sm:p-2.5 md:p-3 space-y-1.5 sm:space-y-2">
                <CardTitle className="flex items-center gap-2 leading-5 text-base sm:text-lg">
                  LLMs Txt Raycast Extension
                  <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Search and explore llms.txt files directly in Raycast
                </CardDescription>
              </CardHeader>
              {layout === 'default' && showImages && (
                <CardContent className="flex h-full flex-col justify-end p-2 sm:p-2.5 md:p-3 pt-0">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src="/tools/llms-txt-raycast-extension.png"
                      alt="Raycast Extension Screenshot"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </Link>

          {/* Placeholder cards for future tools
          <Card className="h-full border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground">LLMs Txt Raycast Extension</CardTitle>
              <CardDescription>Coming soon...</CardDescription>
            </CardHeader>
            {layout === 'default' && showImages && (
              <CardContent className="flex h-full flex-col justify-end">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted" />
              </CardContent>
            )}
          </Card> */}
        </div>
      </div>
    </Section>
  )
}
