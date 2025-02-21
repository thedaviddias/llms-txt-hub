'use server'

import { getAllWebsites } from '@/lib/mdx'
import {
  calculateProjectScores,
  getFeaturedProjects,
  getRecentlyUpdatedProjects
} from '@/lib/project-utils'
import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import Fuse from 'fuse.js'
import { revalidatePath } from 'next/cache'

const owner = 'your-github-username'
const repo = 'your-repo-name'

export async function submitLlmsTxt(formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const provider_token = session.provider_token as unknown as { access_token: string }
  const { access_token } = provider_token

  const octokit = new Octokit({ auth: access_token })

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const website = formData.get('website') as string
  const llmsUrl = formData.get('llmsUrl') as string
  const llmsFullUrl = formData.get('llmsFullUrl') as string
  const githubUsername = session.user.user_metadata.user_name

  const now = new Date().toISOString()

  // Create the content for the new MDX file
  const content = `---
name: ${name}
description: ${description}
website: ${website}
llmsUrl: ${llmsUrl}
llmsFullUrl: ${llmsFullUrl || ''}
lastUpdated: "${now}"
score: 0
---

# ${name}

${description}

## Links

- Website: [${website}](${website})
- llms.txt: [View llms.txt](${llmsUrl})
${llmsFullUrl ? `- llms-full.txt: [View llms-full.txt](${llmsFullUrl})` : ''}

## About

Add any additional information about ${name} here.
`

  try {
    // Create a new branch
    const branchName = `submit-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    const mainRef = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    })

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainRef.data.object.sha
    })

    // Create the new MDX file in the new branch
    const filePath = `content/websites/${name.toLowerCase().replace(/\s+/g, '-')}.mdx`
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add ${name} to llms.txt directory`,
      content: Buffer.from(content).toString('base64'),
      branch: branchName
    })

    // Create a pull request
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `Add ${name} to llms.txt directory`,
      head: branchName,
      base: 'main',
      body: `This PR adds ${name} to the llms.txt directory.

Submitted by: @${githubUsername}

Website: ${website}
llms.txt: ${llmsUrl}
${llmsFullUrl ? `llms-full.txt: ${llmsFullUrl}` : ''}

Please review and merge if appropriate.`
    })

    revalidatePath('/')
    return { success: true, prUrl: pr.data.html_url }
  } catch (error) {
    console.error('Error creating PR:', error)
    return { success: false, error: 'Failed to create PR' }
  }
}

export async function getHomePageData() {
  const allProjects = await calculateProjectScores()
  const featuredProjects = getFeaturedProjects(allProjects, 4)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 5)

  return {
    allProjects,
    featuredProjects,
    recentlyUpdatedProjects
  }
}

export async function searchProjects(query: string) {
  const websites = await getAllWebsites()
  const fuse = new Fuse(websites, {
    keys: ['name', 'description', 'category'],
    threshold: 0.3
  })

  const results = query ? fuse.search(query).map(result => result.item) : []
  return results
}
