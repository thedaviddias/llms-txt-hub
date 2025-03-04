'use server'

import { categories } from '@/lib/categories'
import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import yaml from 'js-yaml'
import { revalidatePath } from 'next/cache'

const owner = 'thedaviddias'
const repo = 'llms-txt-hub'

/**
 * Submits a new LLMs entry via GitHub PR
 *
 * @param formData - Form data containing the entry details
 * @returns Object containing success status and PR URL or error message
 */
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

    // Handle different possible token structures
    let access_token: string
    const provider_token = session.provider_token

    if (typeof provider_token === 'string') {
      access_token = provider_token
    } else if (typeof provider_token === 'object' && provider_token !== null) {
      const tokenObj = provider_token as { access_token?: string; token?: string }
      access_token = tokenObj.access_token || tokenObj.token || ''
    } else {
      throw new Error('Invalid provider token format')
    }

    if (!access_token) {
      throw new Error('Invalid provider token: No access token found')
    }

    const octokit = new Octokit({ auth: access_token })

    // Validate form data
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const website = formData.get('website') as string
    const llmsUrl = formData.get('llmsUrl') as string
    const llmsFullUrl = formData.get('llmsFullUrl') as string
    const categorySlug = formData.get('category') as string
    const publishedAt = formData.get('publishedAt') as string
    const githubUsername = session.user.user_metadata.user_name

    if (!name || !description || !website || !llmsUrl || !categorySlug || !publishedAt) {
      throw new Error('Missing required form fields')
    }

    // Validate category
    if (!categories.some(category => category.slug === categorySlug)) {
      throw new Error('Invalid category selected')
    }

    // Create the content for the new MDX file
    const frontmatterData = {
      name,
      description,
      website,
      llmsUrl,
      llmsFullUrl: llmsFullUrl || '',
      category: categorySlug,
      publishedAt
    }

    const yamlContent = yaml.dump(frontmatterData, {
      quotingType: "'",
      forceQuotes: true,
      indent: 2,
      lineWidth: -1
    })

    const content = `---
${yamlContent}---

# ${name}

${description}
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

      // Create or get fork
      console.log('Creating fork...')
      const fork = await octokit.repos
        .createFork({
          owner,
          repo
        })
        .catch(async error => {
          // If fork already exists, get it
          if (error.status === 422) {
            const forks = await octokit.repos.listForks({
              owner,
              repo
            })
            const existingFork = forks.data.find(f => f.owner.login === githubUsername)
            if (existingFork) {
              return { data: existingFork }
            }
          }
          throw new Error(`Failed to create fork: ${error.message}`)
        })

      // Wait for fork to be ready
      const waitForFork = async (retries = 5, delay = 2000): Promise<void> => {
        if (retries === 0) throw new Error('Fork not ready after maximum retries')
        try {
          await octokit.repos.get({
            owner: githubUsername,
            repo
          })
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, delay))
          await waitForFork(retries - 1, delay)
        }
      }
      await waitForFork()

      // Create a new branch in the fork
      const branchName = `submit-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
      const filePath = `content/websites/${name.toLowerCase().replace(/\s+/g, '-')}.mdx`

      // Get the reference from the original repo
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

      // Create branch in fork
      await octokit.git
        .createRef({
          owner: githubUsername,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: mainRef.data.object.sha
        })
        .catch(error => {
          throw new Error(`Failed to create new branch in fork: ${error.message}`)
        })

      // Create file in fork
      console.log('Creating new file:', filePath)
      await octokit.repos
        .createOrUpdateFileContents({
          owner: githubUsername,
          repo,
          path: filePath,
          message: `Add ${name} to llms.txt directory`,
          content: Buffer.from(content).toString('base64'),
          branch: branchName
        })
        .catch(error => {
          throw new Error(`Failed to create file in fork: ${error.message}`)
        })

      // Create pull request from fork
      console.log('Creating pull request')
      const pr = await octokit.pulls
        .create({
          owner,
          repo,
          title: `feat: add ${name} to llms.txt Hub`,
          head: `${githubUsername}:${branchName}`,
          base: defaultBranch,
          body: `This PR adds ${name} to the llms.txt Hub.

Submitted by: @${githubUsername}

Website: ${website}
llms.txt: ${llmsUrl}
${llmsFullUrl ? `llms-full.txt: ${llmsFullUrl}` : ''}
${categorySlug ? `Category: ${categorySlug}` : ''}


Please review your PR, a reviewer will merge it if appropriate.`
        })
        .catch(error => {
          throw new Error(`Failed to create pull request: ${error.message}`)
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
