import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { NextResponse } from 'next/server'

const contentDirectory = path.join(process.cwd(), '../../content')

interface Website {
  name: string
  description: string
  website: string
  llmsUrl?: string
  llmsFullUrl?: string
  category: string
  slug: string
}

interface Resource {
  title: string
  description: string
  link: string
  type: string
  slug: string
}

function getWebsites(): Website[] {
  const websitesPath = path.join(contentDirectory, 'websites')
  const files = fs.readdirSync(websitesPath).filter(file => file.endsWith('.mdx'))

  return files.map(file => {
    const fullPath = path.join(websitesPath, file)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)
    const slug = file.replace('.mdx', '')

    return {
      name: data.name || '',
      description: data.description || '',
      website: data.website || '',
      llmsUrl: data.llmsUrl,
      llmsFullUrl: data.llmsFullUrl,
      category: data.category || 'uncategorized',
      slug
    }
  })
}

function getResources(): Resource[] {
  const resourcesPath = path.join(contentDirectory, 'resources')
  const files = fs.readdirSync(resourcesPath).filter(file => file.endsWith('.mdx'))

  return files.map(file => {
    const fullPath = path.join(resourcesPath, file)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)
    const slug = file.replace('.mdx', '')

    return {
      title: data.title || '',
      description: data.description || '',
      link: data.link || '',
      type: data.type || 'general',
      slug
    }
  })
}

export async function GET(request: Request) {
  try {
    const [websites, resources] = [getWebsites(), getResources()]

    // Get base URL
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `https://${process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000'}`

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
      content += `- [${resource.title}](${resource.link})${resource.description ? `: ${resource.description}` : ''} [${resource.type}]\n`
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
    console.error('Error generating content:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
