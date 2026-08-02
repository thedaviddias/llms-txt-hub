import type { Octokit } from '@octokit/rest'
import { logger } from '@thedaviddias/logging'
import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'
import yaml from 'js-yaml'

import { getWebsites } from '@/lib/content-loader'

const MAX_OPEN_PULL_REQUESTS = 100
const MAX_PULL_REQUEST_FILES = 100
const MAX_AGGREGATE_PULL_REQUEST_FILES = 250
const MAX_PR_BODY_CHARACTERS = 100_000
const MAX_MDX_BYTES = 100_000
const GITHUB_TIMEOUT_MS = 5_000
const WEBSITE_PATH_PREFIX = 'packages/content/data/websites/'

interface CatalogueWebsite {
  readonly llmsUrl: string
  readonly website: string
}

interface OpenPullRequest {
  readonly body: string | null
  readonly headRef: string
  readonly headSha: string
  readonly number: number
}

interface PullRequestFile {
  readonly path: string
  readonly status: string
}

interface DuplicateGitHubOperations {
  readonly getFileContent: (
    owner: string,
    repo: string,
    path: string,
    ref: string
  ) => Promise<string>
  readonly listOpenPullRequests: (
    owner: string,
    repo: string
  ) => Promise<readonly OpenPullRequest[]>
  readonly listPullRequestFiles: (
    owner: string,
    repo: string,
    pullNumber: number
  ) => Promise<readonly PullRequestFile[]>
}

interface DuplicateDependencies {
  readonly getWebsites: () => readonly CatalogueWebsite[]
  readonly github: DuplicateGitHubOperations
}

/** Fail-closed result of catalogue and open-PR duplicate inspection. */
export type SubmissionDuplicateResult =
  | { readonly status: 'unique' }
  | { readonly source: 'catalogue'; readonly status: 'duplicate' }
  | { readonly prNumber: number; readonly source: 'open_pr'; readonly status: 'duplicate' }
  | {
      readonly branch: string
      readonly headSha: string
      readonly prNumber: number
      readonly status: 'reconcile'
    }
  | { readonly reasonCode: 'publication_unavailable'; readonly status: 'retry_later' }

let octokitPromise: Promise<Octokit> | null = null

const getOctokit = (): Promise<Octokit> => {
  octokitPromise ??= import('@octokit/rest').then(
    module => new module.Octokit({ auth: process.env.GITHUB_TOKEN })
  )
  return octokitPromise
}

const DEFAULT_GITHUB: DuplicateGitHubOperations = {
  async getFileContent(owner, repo, path, ref) {
    const octokit = await getOctokit()
    const response = await octokit.repos.getContent({
      owner,
      path,
      ref,
      repo,
      request: { timeout: GITHUB_TIMEOUT_MS }
    })
    const data = response.data
    if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64') {
      throw new Error('Unsupported GitHub content response')
    }
    const encoded = data.content.replace(/\s/g, '')
    if (encoded.length > Math.ceil((MAX_MDX_BYTES * 4) / 3) + 4) {
      throw new Error('GitHub content response too large')
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
      throw new Error('Malformed GitHub content response')
    }
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.byteLength > MAX_MDX_BYTES) throw new Error('GitHub content response too large')
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  },
  async listOpenPullRequests(owner, repo) {
    const octokit = await getOctokit()
    const response = await octokit.pulls.list({
      owner,
      per_page: MAX_OPEN_PULL_REQUESTS,
      repo,
      request: { timeout: GITHUB_TIMEOUT_MS },
      state: 'open'
    })
    return response.data.map(pullRequest => ({
      body: pullRequest.body,
      headRef: pullRequest.head.ref,
      headSha: pullRequest.head.sha,
      number: pullRequest.number
    }))
  },
  async listPullRequestFiles(owner, repo, pullNumber) {
    const octokit = await getOctokit()
    const response = await octokit.pulls.listFiles({
      owner,
      per_page: MAX_PULL_REQUEST_FILES,
      pull_number: pullNumber,
      repo,
      request: { timeout: GITHUB_TIMEOUT_MS }
    })
    return response.data.map(file => ({ path: file.filename, status: file.status }))
  }
}

const DEFAULT_DEPENDENCIES: DuplicateDependencies = {
  getWebsites,
  github: DEFAULT_GITHUB
}

const retryLater = (): SubmissionDuplicateResult => ({
  reasonCode: 'publication_unavailable',
  status: 'retry_later'
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseFrontmatterUrls = (
  content: string
): { readonly llmsUrl: string; readonly website: string } | null => {
  if (content.length === 0 || content.length > MAX_MDX_BYTES || !content.startsWith('---\n')) {
    return null
  }
  const closingIndex = content.indexOf('\n---\n', 4)
  if (closingIndex < 0) return null
  const frontmatter = content.slice(4, closingIndex)
  let parsed: unknown
  try {
    parsed = yaml.load(frontmatter, { schema: yaml.JSON_SCHEMA })
  } catch {
    return null
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.website !== 'string' ||
    typeof parsed.llmsUrl !== 'string'
  ) {
    return null
  }
  return { llmsUrl: parsed.llmsUrl, website: parsed.website }
}

const normalizePair = (
  website: string,
  llmsUrl: string
): { readonly llmsUrl: string; readonly website: string } | null => {
  const websiteResult = validateSubmissionUrl(website)
  const llmsResult = validateSubmissionUrl(llmsUrl)
  if (!websiteResult.ok || !llmsResult.ok) return null
  return { llmsUrl: llmsResult.normalizedUrl, website: websiteResult.normalizedUrl }
}

const matchesInput = (
  candidate: { readonly llmsUrl: string; readonly website: string },
  input: { readonly llmsUrl: string; readonly website: string }
): boolean => candidate.website === input.website || candidate.llmsUrl === input.llmsUrl

const inspectCatalogue = (
  entries: readonly CatalogueWebsite[],
  input: { readonly llmsUrl: string; readonly website: string }
): SubmissionDuplicateResult | null => {
  for (const entry of entries) {
    const normalized = normalizePair(entry.website, entry.llmsUrl)
    if (!normalized) return retryLater()
    if (matchesInput(normalized, input)) return { source: 'catalogue', status: 'duplicate' }
  }
  return null
}

const validPullRequest = (pullRequest: OpenPullRequest): boolean =>
  Number.isSafeInteger(pullRequest.number) &&
  pullRequest.number > 0 &&
  typeof pullRequest.body !== 'undefined' &&
  (pullRequest.body === null || typeof pullRequest.body === 'string') &&
  typeof pullRequest.headRef === 'string' &&
  pullRequest.headRef.length <= 255 &&
  /^[a-f0-9]{40}$/.test(pullRequest.headSha)

const isWebsiteMdx = (file: PullRequestFile): boolean =>
  (file.status === 'added' || file.status === 'modified' || file.status === 'renamed') &&
  file.path.startsWith(WEBSITE_PATH_PREFIX) &&
  file.path.endsWith('.mdx')

const inspectOpenPullRequests = async (
  input: {
    readonly llmsUrl: string
    readonly owner: string
    readonly repo: string
    readonly submissionId: string
    readonly website: string
  },
  github: DuplicateGitHubOperations
): Promise<SubmissionDuplicateResult> => {
  const pullRequests = await github.listOpenPullRequests(input.owner, input.repo)
  const marker = `<!-- llms-hub-submission:${input.submissionId} -->`

  for (const pullRequest of pullRequests) {
    if (!validPullRequest(pullRequest)) return retryLater()
    if (pullRequest.body !== null && pullRequest.body.length > MAX_PR_BODY_CHARACTERS) {
      return retryLater()
    }
    if (pullRequest.body?.includes(marker)) {
      return {
        branch: pullRequest.headRef,
        headSha: pullRequest.headSha,
        prNumber: pullRequest.number,
        status: 'reconcile'
      }
    }
  }
  if (pullRequests.length >= MAX_OPEN_PULL_REQUESTS) return retryLater()

  let examinedFileCount = 0
  for (const pullRequest of pullRequests) {
    const files = await github.listPullRequestFiles(input.owner, input.repo, pullRequest.number)
    if (files.length >= MAX_PULL_REQUEST_FILES) return retryLater()
    examinedFileCount += files.length
    if (examinedFileCount > MAX_AGGREGATE_PULL_REQUEST_FILES) return retryLater()
    for (const file of files) {
      if (file.path.length > 1024 || file.status.length > 32) return retryLater()
      if (!isWebsiteMdx(file)) continue
      const content = await github.getFileContent(
        input.owner,
        input.repo,
        file.path,
        pullRequest.headSha
      )
      const frontmatter = parseFrontmatterUrls(content)
      if (!frontmatter) return retryLater()
      const normalized = normalizePair(frontmatter.website, frontmatter.llmsUrl)
      if (!normalized) return retryLater()
      if (matchesInput(normalized, input)) {
        return { prNumber: pullRequest.number, source: 'open_pr', status: 'duplicate' }
      }
    }
  }
  return { status: 'unique' }
}

/**
 * Check normalized catalogue data and every bounded open submission PR.
 *
 * The check never assumes uniqueness after malformed local data, truncated
 * GitHub results, malformed frontmatter, or an upstream failure.
 *
 * @param input - Canonical duplicate dimensions and repository identity
 * @param dependencies - Catalogue and GitHub readers
 * @returns Unique, duplicate, reconciliation, or fail-closed retry outcome
 */
export async function checkSubmissionDuplicates(
  input: {
    readonly llmsUrl: string
    readonly owner: string
    readonly repo: string
    readonly submissionId: string
    readonly website: string
  },
  dependencies: DuplicateDependencies = DEFAULT_DEPENDENCIES
): Promise<SubmissionDuplicateResult> {
  const normalizedInput = normalizePair(input.website, input.llmsUrl)
  if (
    !normalizedInput ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(input.owner) ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(input.repo) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.submissionId)
  ) {
    return retryLater()
  }

  try {
    const catalogueResult = inspectCatalogue(dependencies.getWebsites(), normalizedInput)
    if (catalogueResult) return catalogueResult
    return await inspectOpenPullRequests({ ...input, ...normalizedInput }, dependencies.github)
  } catch (_error) {
    logger.error('Submission duplicate check unavailable', {
      data: { status: 'unavailable' },
      tags: { type: 'submission', operation: 'duplicate_check' }
    })
    return retryLater()
  }
}
