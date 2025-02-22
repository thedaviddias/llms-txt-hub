import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import { NextResponse } from 'next/server'

const owner = 'your-github-username'
const repo = 'your-repo-name'

export async function POST(req: Request) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider_token = session.provider_token as unknown as { access_token: string }
  const { access_token } = provider_token

  const octokit = new Octokit({ auth: access_token })

  try {
    const body = await req.json()
    const { name, description, website, llmsUrl, llmsFullUrl, githubUsername } = body

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

    return NextResponse.json({ success: true, prUrl: pr.data.html_url })
  } catch (error) {
    console.error('Error creating PR:', error)
    return NextResponse.json({ success: false, error: 'Failed to create PR' }, { status: 500 })
  }
}
