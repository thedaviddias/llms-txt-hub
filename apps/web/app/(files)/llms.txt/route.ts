import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { getResources, getWebsites } from '@/lib/content-loader'

/**
 * GET /llms.txt - Generates a text file listing all websites implementing llms.txt
 * @returns Text response with website directory and resources
 */
export async function GET() {
  try {
    const websites = getWebsites()
    const resources = getResources()

    // Generate the text content
    let content = `# LLMs.txt Hub Directory

## Overview
This is an automatically generated list of all websites implementing llms.txt, along with related blog posts and resources.

## Websites
The following websites have implemented llms.txt:\n\n`

    // Add websites
    for (const website of websites) {
      content += `- [${website.name}](${website.website})${website.description ? `: ${website.description}` : ''}\n`
      if (website.llmsUrl) {
        content += `  - llms.txt: ${website.llmsUrl}\n`
      }
      if (website.llmsFullUrl) {
        content += `  - Full Documentation: ${website.llmsFullUrl}\n`
      }
    }

    // Add resources
    content += '\n## Resources\n'
    for (const resource of resources) {
      const link = resource.url || '#'
      const category = resource.category || 'general'
      content += `- [${resource.title}](${link})${resource.description ? `: ${resource.description}` : ''} [${category}]\n`
    }

    content += `\n## Contributing
- Want to add your website? Submit a PR to our GitHub repository
- Found a bug? Open an issue
- Have questions? Join our community`

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  } catch (error) {
    logger.error('Error generating content:', { data: error, tags: { type: 'page' } })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
