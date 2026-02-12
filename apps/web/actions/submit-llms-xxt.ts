'use server'

import crypto from 'node:crypto'
import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import yaml from 'js-yaml'
import { revalidatePath } from 'next/cache'
import { categories } from '@/lib/categories'
import { getStoredCSRFToken } from '@/lib/csrf-protection'

const owner = 'thedaviddias'
const repo = 'llms-txt-hub'

/**
 * Submits a new LLMs entry by creating a pull request with an MDX file
 *
 * @param formData - Form data containing the entry details
 * @param formData.name - Name of the website/project
 * @param formData.description - Description of the website/project
 * @param formData.website - URL of the website
 * @param formData.llmsUrl - URL of the llms.txt file
 * @param formData.llmsFullUrl - Optional URL of the llms-full.txt file
 * @param formData.category - Category slug for the website
 * @param formData.publishedAt - Publication date
 *
 * @returns Object containing success status and PR URL or error message
 * @throws Error if authentication fails or required fields are missing
 *
 * @example
 * ```ts
 * const result = await submitLlmsTxt(formData);
 * if (result.success) {
 *   console.log('PR created:', result.prUrl);
 * } else {
 *   logger.error('Error:', { data: result.error, tags: { type: 'action' } });
 * }
 * ```
 */
export async function submitLlmsTxt(formData: FormData) {
  try {
    const session = await auth()

    if (!session?.user) {
      throw new Error('Authentication required')
    }

    // Validate CSRF token
    const submittedCSRFToken = formData.get('_csrf') as string
    if (!submittedCSRFToken) {
      logger.error('Server Action CSRF validation failed - no token provided', {
        data: {
          action: 'submitLlmsTxt',
          userId: session.user.id,
          timestamp: new Date().toISOString()
        },
        tags: { type: 'security', component: 'csrf', action: 'missing-token', severity: 'high' }
      })
      throw new Error('Security validation failed')
    }

    // Get stored CSRF token
    const storedToken = await getStoredCSRFToken()
    if (!storedToken) {
      logger.error('Server Action CSRF validation failed - no stored token', {
        data: {
          action: 'submitLlmsTxt',
          userId: session.user.id,
          timestamp: new Date().toISOString()
        },
        tags: { type: 'security', component: 'csrf', action: 'missing-stored', severity: 'high' }
      })
      throw new Error('Security validation failed')
    }

    // Validate CSRF token using timing-safe comparison
    const isValidCSRF = crypto.timingSafeEqual(
      Buffer.from(storedToken.token),
      Buffer.from(submittedCSRFToken)
    )

    if (!isValidCSRF) {
      logger.error('Server Action CSRF validation failed - token mismatch', {
        data: {
          action: 'submitLlmsTxt',
          userId: session.user.id,
          timestamp: new Date().toISOString()
        },
        tags: { type: 'security', component: 'csrf', action: 'invalid-token', severity: 'high' }
      })
      throw new Error('Security validation failed')
    }

    // Validate form data
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const website = formData.get('website') as string
    const llmsUrl = formData.get('llmsUrl') as string
    const llmsFullUrl = formData.get('llmsFullUrl') as string
    const categorySlug = formData.get('category') as string
    const publishedAt = formData.get('publishedAt') as string

    // Get user info for attribution
    const githubUsername = session.user.user_metadata?.user_name
    const userEmail = session.user.email
    const displayName = githubUsername || userEmail?.split('@')[0] || 'Anonymous'

    // Try to get user's GitHub token first, fall back to admin token
    let access_token: string | null = null
    let useUserToken = false

    // Check if user has GitHub auth with token
    if (session.provider_token && githubUsername) {
      const provider_token = session.provider_token

      if (typeof provider_token === 'string') {
        access_token = provider_token
        useUserToken = true
      } else if (typeof provider_token === 'object' && provider_token !== null) {
        const tokenObj = provider_token as { access_token?: string; token?: string }
        access_token = tokenObj.access_token || tokenObj.token || null
        useUserToken = !!access_token
      }
    }

    // Fall back to admin token if user doesn't have one
    if (!access_token) {
      access_token = process.env.GITHUB_TOKEN || null
      useUserToken = false

      if (!access_token) {
        throw new Error('GitHub token not configured')
      }
    }

    const octokit = new Octokit({ auth: access_token })

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
      // Get repository info and default branch
      logger.info('Verifying repository access...')
      const repo_info = await octokit.repos.get({ owner, repo })
      const defaultBranch = repo_info.data.default_branch

      // Sanitize name for use in branch and file names
      const sanitizedName = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^a-z0-9- ]+/g, ' ') // disallow slashes, dots, etc.
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      if (!sanitizedName) throw new Error('Invalid name after sanitization')

      const branchName = `submit-${sanitizedName}-${Date.now()}`
      const filePath = `packages/content/data/websites/${sanitizedName}-llms-txt.mdx`

      // Get the main branch reference
      const mainRef = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`
      })

      let _branchOwner: string
      let headRef: string

      if (useUserToken && githubUsername) {
        // User has GitHub token - create fork and branch in fork
        logger.info('Creating fork for user...')

        try {
          await octokit.repos.createFork({ owner, repo })
        } catch (error: any) {
          // Fork might already exist, that's okay
          if (error.status !== 422) {
            throw new Error(`Failed to create fork: ${error.message}`)
          }
        }

        // Wait for fork to be ready
        const waitForFork = async (retries = 5): Promise<void> => {
          for (let i = 0; i < retries; i++) {
            try {
              await octokit.repos.get({ owner: githubUsername, repo })
              return
            } catch (_error) {
              if (i === retries - 1) throw new Error('Fork not ready after maximum retries')
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          }
        }
        await waitForFork()

        // Create branch in user's fork
        await octokit.git.createRef({
          owner: githubUsername,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: mainRef.data.object.sha
        })

        // Create file in user's fork
        await octokit.repos.createOrUpdateFileContents({
          owner: githubUsername,
          repo,
          path: filePath,
          message: `Add ${name} to llms.txt directory`,
          content: Buffer.from(content).toString('base64'),
          branch: branchName
        })

        _branchOwner = githubUsername
        headRef = `${githubUsername}:${branchName}`
      } else {
        // Use admin token - create branch directly in main repo
        logger.info('Creating branch directly in main repo...')

        // Create branch in main repo
        await octokit.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: mainRef.data.object.sha
        })

        // Create file in main repo branch
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: `Add ${name} to llms.txt directory`,
          content: Buffer.from(content).toString('base64'),
          branch: branchName
        })

        _branchOwner = owner
        headRef = branchName
      }

      // Create appropriate attribution
      const attribution =
        useUserToken && githubUsername
          ? `Submitted by: @${githubUsername}`
          : `Submitted by: ${displayName}`

      // Create pull request
      logger.info('Creating pull request')
      const pr = await octokit.pulls.create({
        owner,
        repo,
        title: `feat: add ${name} to llms.txt hub`,
        head: headRef,
        base: defaultBranch,
        body: `This PR adds ${name} to the llms.txt hub.

${attribution}

**Website:** ${website}
**llms.txt:** ${llmsUrl}
${llmsFullUrl ? `**llms-full.txt:** ${llmsFullUrl}  ` : ''}
**Category:** ${categorySlug}

---
${useUserToken ? 'This PR was created by the submitter.' : 'This PR was created via admin token for a user without GitHub repository access.'}

Please review and merge if appropriate.`
      })

      revalidatePath('/')
      return { success: true, prUrl: pr.data.html_url }
    } catch (error) {
      throw new Error(
        `GitHub API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  } catch (error) {
    logger.error('Error in submitLlmsTxt:', { data: error, tags: { type: 'action' } })
    let errorMessage = 'Failed to create PR'

    if (error instanceof Error) {
      logger.error('Error details:', {
        data: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        tags: { type: 'action' }
      })
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }
}
