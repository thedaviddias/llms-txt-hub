'use server'

import crypto from 'node:crypto'
import { Octokit } from '@octokit/rest'
import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import yaml from 'js-yaml'
import { revalidatePath } from 'next/cache'
import { submitActionSchema } from '@/components/forms/submit-form-schemas'
import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { stripHtml } from '@/lib/security-utils-helpers'

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

    // Validate CSRF token using timing-safe comparison (length check required to avoid RangeError)
    const storedBuf = Buffer.from(storedToken.token)
    const submittedBuf = Buffer.from(submittedCSRFToken)
    const isValidCSRF =
      storedBuf.length === submittedBuf.length && crypto.timingSafeEqual(storedBuf, submittedBuf)

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

    // Parse and validate form data with Zod
    const raw = {
      name: formData.get('name'),
      description: formData.get('description'),
      website: formData.get('website'),
      llmsUrl: formData.get('llmsUrl'),
      llmsFullUrl: formData.get('llmsFullUrl') ?? '',
      category: formData.get('category'),
      publishedAt: formData.get('publishedAt')
    }
    const parsed = submitActionSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      const message = firstError?.message ?? 'Invalid form data'
      throw new Error(message)
    }

    const { website, llmsUrl, llmsFullUrl, category: categorySlug, publishedAt } = parsed.data

    // Sanitize text fields for XSS (no HTML, normalize whitespace)
    const sanitizeText = (input: string): string =>
      stripHtml(input)
        .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const name = sanitizeText(parsed.data.name)
    const description = sanitizeText(parsed.data.description)

    if (!name || !description) {
      throw new Error('Name and description are required after sanitization')
    }

    // Get user info for attribution
    const githubUsername = session.user.user_metadata?.user_name
    const userEmail = session.user.email
    const displayName = githubUsername || userEmail?.split('@')[0] || 'Anonymous'

    const accessToken = process.env.GITHUB_TOKEN || null
    if (!accessToken) {
      throw new Error('GitHub token not configured')
    }

    // The server action uses a single server-side admin token.
    // User OAuth tokens are intentionally not accepted through this flow.
    const useUserToken = false

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90_000)
    const octokit = new Octokit({
      auth: accessToken,
      request: { signal: controller.signal }
    })

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
        title: `feat(llmstxt): add ${name} to llms.txt hub`,
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
    } finally {
      clearTimeout(timeoutId)
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
