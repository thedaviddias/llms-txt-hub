'use server'

import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import { revalidatePath } from 'next/cache'

const owner = 'thedaviddias'
const repo = 'llms-txt-hub'

export async function submitLlmsTxt(formData: FormData) {
  try {
    const session = await auth()

    if (!session) {
      throw new Error('Unauthorized: No session found')
    }

    if (!session.provider_token) {
      throw new Error('Unauthorized: No provider token found')
    }

    // Validate session structure
    if (!session.user?.user_metadata?.user_name) {
      throw new Error('Invalid session: Missing user metadata')
    }

    const provider_token = session.provider_token as unknown as { access_token: string }

    if (!provider_token.access_token) {
      throw new Error('Invalid provider token: No access token found')
    }

    const { access_token } = provider_token
    const octokit = new Octokit({ auth: access_token })

    // Validate form data
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const website = formData.get('website') as string
    const llmsUrl = formData.get('llmsUrl') as string
    const llmsFullUrl = formData.get('llmsFullUrl') as string
    const githubUsername = session.user.user_metadata.user_name

    if (!name || !description || !website || !llmsUrl) {
      throw new Error('Missing required form fields')
    }

    // Create the content for the new MDX file
    const content = `---
name: ${name}
description: ${description}
website: ${website}
llmsUrl: ${llmsUrl}
llmsFullUrl: ${llmsFullUrl || ''}
score: 0
---

# ${name}

${description}

## About

Add any additional information about ${name} here.
`

    try {
      // First verify repository access and get default branch
      console.log('Verifying repository access...')
      const repo_info = await octokit.repos
        .get({
          owner,
          repo
        })
        .catch(error => {
          throw new Error(
            `Repository access error: ${error.message}. Please ensure you have access to ${owner}/${repo}`
          )
        })

      const defaultBranch = repo_info.data.default_branch
      console.log('Default branch:', defaultBranch)

      // Create a new branch
      const branchName = `submit-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
      const filePath = `content/websites/${name.toLowerCase().replace(/\s+/g, '-')}.mdx`

      console.log('Attempting GitHub operations with username:', githubUsername)
      console.log('Creating new branch:', branchName)

      const mainRef = await octokit.git
        .getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`
        })
        .catch(error => {
          throw new Error(
            `Failed to get default branch reference: ${error.message}. Branch: ${defaultBranch}`
          )
        })

      await octokit.git
        .createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: mainRef.data.object.sha
        })
        .catch(error => {
          throw new Error(
            `Failed to create new branch: ${error.message}. This might be due to insufficient permissions.`
          )
        })

      console.log('Creating new file:', filePath)
      await octokit.repos
        .createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: `Add ${name} to llms.txt directory`,
          content: Buffer.from(content).toString('base64'),
          branch: branchName
        })
        .catch(error => {
          throw new Error(
            `Failed to create file: ${error.message}. This might be due to insufficient permissions.`
          )
        })

      console.log('Creating pull request')
      const pr = await octokit.pulls
        .create({
          owner,
          repo,
          title: `Add ${name} to llms.txt directory`,
          head: branchName,
          base: defaultBranch,
          body: `This PR adds ${name} to the llms.txt directory.

Submitted by: @${githubUsername}

Website: ${website}
llms.txt: ${llmsUrl}
${llmsFullUrl ? `llms-full.txt: ${llmsFullUrl}` : ''}

Please review and merge if appropriate.`
        })
        .catch(error => {
          throw new Error(
            `Failed to create pull request: ${error.message}. This might be due to insufficient permissions.`
          )
        })

      revalidatePath('/')
      return { success: true, prUrl: pr.data.html_url }
    } catch (error) {
      throw new Error(
        `GitHub API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  } catch (error) {
    console.error('Error in submitLlmsTxt:', error)
    let errorMessage = 'Failed to create PR'

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }
}
