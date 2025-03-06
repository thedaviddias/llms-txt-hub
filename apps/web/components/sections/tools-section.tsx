import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@thedaviddias/design-system/card'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Section } from '../layout/section'

export function ToolsSection() {
  return (
    <Section
      title="Developer Tools"
      description="Explore tools created to help you work with llms.txt"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej"
          target="_blank"
          className="group"
        >
          <Card className="h-full transition-all hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 leading-5">
                LLMs.txt Checker Chrome Extension
                <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardTitle>
              <CardDescription>
                Check if websites implement llms.txt and llms-full.txt files
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-end">
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
          </Card>
        </Link>

        <Link
          href="https://marketplace.visualstudio.com/items?itemName=TheDavidDias.vscode-llms-txt"
          target="_blank"
          className="group"
        >
          <Card className="h-full transition-all hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 leading-5">
                LLMS.txt VSCode Extension
                <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardTitle>
              <CardDescription>
                Search and explore llms.txt files directly in VS Code
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-end">
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
          </Card>
        </Link>

        <Link
          href="https://github.com/thedaviddias/mcp-llms-txt-explorer"
          target="_blank"
          className="group"
        >
          <Card className="h-full transition-all hover:border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 leading-5">
                MCP LLMS.txt Explorer
                <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </CardTitle>
              <CardDescription>Explore and analyze llms.txt files using MCP</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col justify-end">
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
          </Card>
        </Link>

        {/* Placeholder cards for future tools */}
        <Card className="h-full border-dashed">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Raycast Extension</CardTitle>
            <CardDescription>Coming soon...</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-end">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted" />
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
