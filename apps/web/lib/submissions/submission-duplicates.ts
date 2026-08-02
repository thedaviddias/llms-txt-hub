import type { Octokit } from '@octokit/rest'
import { logger } from '@thedaviddias/logging'
import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'
import yaml from 'js-yaml'

import { getWebsitesStrict } from './strict-website-loader'
import {
  createSubmissionInspectionBudget,
  type SubmissionInspectionBudget
} from './submission-inspection-budget'

const GITHUB_PAGE_SIZE = 50
const MAX_GITHUB_PAGES = 3
const MAX_AGGREGATE_PULL_REQUEST_FILES = 250
const MAX_PR_BODY_CHARACTERS = 100_000
const MAX_MDX_BYTES = 100_000
const MAX_RAW_BASE64_CHARACTERS = 150_000
const GITHUB_TIMEOUT_MS = 5_000
const DUPLICATE_INSPECTION_DEADLINE_MS = 8_000
const DUPLICATE_INSPECTION_REQUEST_BUDGET = 450
const WEBSITE_PATH_PREFIX = 'packages/content/data/websites/'

interface OpenPullRequest {
  readonly baseRef: string
  readonly baseRepoFullName: string
  readonly body: string | null
  readonly headOwnerLogin: string
  readonly headRef: string
  readonly headRepoFullName: string
  readonly headSha: string
  readonly number: number
}

interface PullRequestFile {
  readonly path: string
  readonly status: string
}

interface CatalogueWebsite {
  readonly llmsUrl: string
  readonly website: string
}

type DuplicateCatalogueResult =
  | { readonly status: 'available'; readonly websites: readonly CatalogueWebsite[] }
  | { readonly status: 'unavailable' }

interface DuplicateGitHubOperations {
  readonly getFileContent: (
    owner: string,
    repo: string,
    path: string,
    ref: string,
    signal: AbortSignal
  ) => Promise<string>
  readonly listOpenPullRequests: (
    owner: string,
    repo: string,
    page: number,
    signal: AbortSignal
  ) => Promise<readonly OpenPullRequest[]>
  readonly listPullRequestFiles: (
    owner: string,
    repo: string,
    pullNumber: number,
    page: number,
    signal: AbortSignal
  ) => Promise<readonly PullRequestFile[]>
}

interface DuplicateDependencies {
  readonly deadlineMs?: number
  readonly getWebsitesStrict: () => DuplicateCatalogueResult
  readonly github: DuplicateGitHubOperations
  readonly now?: () => number
  readonly requestBudget?: number
}

interface NormalizedDuplicateFields {
  readonly llmsFullUrl?: string
  readonly llmsUrl: string
  readonly website: string
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePullRequest = (value: unknown): OpenPullRequest | null => {
  if (!isRecord(value) || !isRecord(value.head) || !isRecord(value.base)) return null
  const head = value.head
  const base = value.base
  if (!isRecord(head.repo) || !isRecord(base.repo)) return null
  const headRepo = head.repo
  const baseRepo = base.repo
  if (
    !Number.isSafeInteger(value.number) ||
    typeof value.number !== 'number' ||
    value.number <= 0 ||
    (value.body !== null && typeof value.body !== 'string') ||
    (typeof value.body === 'string' && value.body.length > MAX_PR_BODY_CHARACTERS) ||
    typeof head.ref !== 'string' ||
    head.ref.length === 0 ||
    head.ref.length > 255 ||
    typeof head.sha !== 'string' ||
    !/^[a-f0-9]{40}$/.test(head.sha) ||
    typeof headRepo.full_name !== 'string' ||
    headRepo.full_name.length === 0 ||
    headRepo.full_name.length > 201 ||
    !isRecord(headRepo.owner) ||
    typeof headRepo.owner.login !== 'string' ||
    headRepo.owner.login.length === 0 ||
    headRepo.owner.login.length > 100 ||
    typeof base.ref !== 'string' ||
    base.ref.length === 0 ||
    base.ref.length > 255 ||
    typeof baseRepo.full_name !== 'string' ||
    baseRepo.full_name.length === 0 ||
    baseRepo.full_name.length > 201
  ) {
    return null
  }
  return {
    baseRef: base.ref,
    baseRepoFullName: baseRepo.full_name,
    body: value.body,
    headOwnerLogin: headRepo.owner.login,
    headRef: head.ref,
    headRepoFullName: headRepo.full_name,
    headSha: head.sha,
    number: value.number
  }
}

const parsePullRequestFile = (value: unknown): PullRequestFile | null => {
  if (
    !isRecord(value) ||
    typeof value.filename !== 'string' ||
    value.filename.length === 0 ||
    value.filename.length > 1024 ||
    typeof value.status !== 'string' ||
    value.status.length === 0 ||
    value.status.length > 32
  ) {
    return null
  }
  return { path: value.filename, status: value.status }
}

const DEFAULT_GITHUB: DuplicateGitHubOperations = {
  async getFileContent(owner, repo, path, ref, signal) {
    const octokit = await getOctokit()
    const response = await octokit.repos.getContent({
      owner,
      path,
      ref,
      repo,
      request: { signal, timeout: GITHUB_TIMEOUT_MS }
    })
    const data: unknown = response.data
    if (
      !isRecord(data) ||
      data.type !== 'file' ||
      data.encoding !== 'base64' ||
      typeof data.content !== 'string' ||
      data.content.length > MAX_RAW_BASE64_CHARACTERS
    ) {
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
  async listOpenPullRequests(owner, repo, page, signal) {
    const octokit = await getOctokit()
    const response = await octokit.pulls.list({
      owner,
      page,
      per_page: GITHUB_PAGE_SIZE,
      repo,
      request: { signal, timeout: GITHUB_TIMEOUT_MS },
      state: 'open'
    })
    const data: unknown = response.data
    if (!Array.isArray(data) || data.length > GITHUB_PAGE_SIZE) {
      throw new Error('Malformed GitHub pull request page')
    }
    const pullRequests: OpenPullRequest[] = []
    for (const value of data) {
      const pullRequest = parsePullRequest(value)
      if (!pullRequest) throw new Error('Malformed GitHub pull request')
      pullRequests.push(pullRequest)
    }
    return pullRequests
  },
  async listPullRequestFiles(owner, repo, pullNumber, page, signal) {
    const octokit = await getOctokit()
    const response = await octokit.pulls.listFiles({
      owner,
      page,
      per_page: GITHUB_PAGE_SIZE,
      pull_number: pullNumber,
      repo,
      request: { signal, timeout: GITHUB_TIMEOUT_MS }
    })
    const data: unknown = response.data
    if (!Array.isArray(data) || data.length > GITHUB_PAGE_SIZE) {
      throw new Error('Malformed GitHub pull request files page')
    }
    const files: PullRequestFile[] = []
    for (const value of data) {
      const file = parsePullRequestFile(value)
      if (!file) throw new Error('Malformed GitHub pull request file')
      files.push(file)
    }
    return files
  }
}

const DEFAULT_DEPENDENCIES: DuplicateDependencies = {
  getWebsitesStrict,
  github: DEFAULT_GITHUB
}

const retryLater = (): SubmissionDuplicateResult => ({
  reasonCode: 'publication_unavailable',
  status: 'retry_later'
})

const parseFrontmatterUrls = (content: string): NormalizedDuplicateFields | null => {
  if (content.length === 0 || content.length > MAX_MDX_BYTES || !content.startsWith('---\n')) {
    return null
  }
  const closingIndex = content.indexOf('\n---\n', 4)
  if (closingIndex < 0) return null
  let parsed: unknown
  try {
    parsed = yaml.load(content.slice(4, closingIndex), { schema: yaml.JSON_SCHEMA })
  } catch {
    return null
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.website !== 'string' ||
    typeof parsed.llmsUrl !== 'string' ||
    (parsed.llmsFullUrl !== undefined &&
      parsed.llmsFullUrl !== null &&
      typeof parsed.llmsFullUrl !== 'string')
  ) {
    return null
  }
  return normalizeFields(parsed.website, parsed.llmsUrl, parsed.llmsFullUrl ?? undefined)
}

const normalizeFields = (
  website: string,
  llmsUrl: string,
  llmsFullUrl?: string
): NormalizedDuplicateFields | null => {
  const websiteResult = validateSubmissionUrl(website)
  const llmsResult = validateSubmissionUrl(llmsUrl)
  const fullResult = llmsFullUrl ? validateSubmissionUrl(llmsFullUrl) : undefined
  if (!websiteResult.ok || !llmsResult.ok || (fullResult && !fullResult.ok)) return null
  return fullResult?.ok
    ? {
        llmsFullUrl: fullResult.normalizedUrl,
        llmsUrl: llmsResult.normalizedUrl,
        website: websiteResult.normalizedUrl
      }
    : { llmsUrl: llmsResult.normalizedUrl, website: websiteResult.normalizedUrl }
}

const matchesDuplicate = (
  candidate: NormalizedDuplicateFields,
  input: NormalizedDuplicateFields
): boolean => candidate.website === input.website || candidate.llmsUrl === input.llmsUrl

const matchesExactly = (
  candidate: NormalizedDuplicateFields,
  input: NormalizedDuplicateFields
): boolean =>
  candidate.website === input.website &&
  candidate.llmsUrl === input.llmsUrl &&
  (candidate.llmsFullUrl ?? '') === (input.llmsFullUrl ?? '')

const isWebsiteMdx = (file: PullRequestFile): boolean =>
  (file.status === 'added' || file.status === 'modified' || file.status === 'renamed') &&
  file.path.startsWith(WEBSITE_PATH_PREFIX) &&
  file.path.endsWith('.mdx')

const collectPages = async <T>(
  loadPage: (page: number) => Promise<readonly T[]>
): Promise<readonly T[] | null> => {
  const collected: T[] = []
  for (let page = 1; page <= MAX_GITHUB_PAGES; page += 1) {
    const values = await loadPage(page)
    if (!Array.isArray(values) || values.length > GITHUB_PAGE_SIZE) return null
    for (const value of values) collected.push(value)
    if (values.length < GITHUB_PAGE_SIZE) return collected
  }
  return null
}

const markerCount = (body: string | null, marker: string): number => {
  if (body === null || body.length > MAX_PR_BODY_CHARACTERS) return body === null ? 0 : 2
  const first = body.indexOf(marker)
  if (first < 0) return 0
  return body.indexOf(marker, first + marker.length) < 0 ? 1 : 2
}

const inspectOpenPullRequests = async (
  input: NormalizedDuplicateFields & {
    readonly expectedBaseRef: string
    readonly owner: string
    readonly repo: string
    readonly submissionId: string
  },
  github: DuplicateGitHubOperations,
  budget: SubmissionInspectionBudget
): Promise<SubmissionDuplicateResult> => {
  const pullRequests = await collectPages(page =>
    budget.request(signal => github.listOpenPullRequests(input.owner, input.repo, page, signal))
  )
  if (!pullRequests) return retryLater()

  const marker = `<!-- llms-hub-submission:${input.submissionId} -->`
  const candidates: OpenPullRequest[] = []
  for (const pullRequest of pullRequests) {
    const count = markerCount(pullRequest.body, marker)
    if (count > 1) return retryLater()
    if (count === 1) candidates.push(pullRequest)
  }
  if (candidates.length > 1) return retryLater()
  const candidate = candidates[0]
  const expectedRepository = `${input.owner}/${input.repo}`.toLowerCase()
  const trustedCandidate =
    candidate?.headRef === `submit/${input.submissionId}` &&
    candidate.headRepoFullName.toLowerCase() === expectedRepository &&
    candidate.headOwnerLogin.toLowerCase() === input.owner.toLowerCase() &&
    candidate.baseRepoFullName.toLowerCase() === expectedRepository &&
    candidate.baseRef === input.expectedBaseRef

  let examinedFileCount = 0
  let exactCandidate = false
  for (const pullRequest of pullRequests) {
    const files = await collectPages(page =>
      budget.request(signal =>
        github.listPullRequestFiles(input.owner, input.repo, pullRequest.number, page, signal)
      )
    )
    if (!files) return retryLater()
    examinedFileCount += files.length
    if (examinedFileCount > MAX_AGGREGATE_PULL_REQUEST_FILES) return retryLater()
    const websiteFiles = files.filter(isWebsiteMdx)
    if (pullRequest === candidate && trustedCandidate && websiteFiles.length > 1) {
      return retryLater()
    }
    for (const file of websiteFiles) {
      const content = await budget.request(signal =>
        github.getFileContent(input.owner, input.repo, file.path, pullRequest.headSha, signal)
      )
      const frontmatter = parseFrontmatterUrls(content)
      if (!frontmatter) return retryLater()
      const exact =
        pullRequest === candidate && trustedCandidate && matchesExactly(frontmatter, input)
      if (exact) {
        exactCandidate = true
      } else if (matchesDuplicate(frontmatter, input)) {
        return { prNumber: pullRequest.number, source: 'open_pr', status: 'duplicate' }
      }
    }
  }

  if (candidate && trustedCandidate && exactCandidate) {
    return {
      branch: candidate.headRef,
      headSha: candidate.headSha,
      prNumber: candidate.number,
      status: 'reconcile'
    }
  }
  if (candidate && trustedCandidate) return retryLater()
  return { status: 'unique' }
}

/**
 * Check normalized catalogue data and every bounded open submission PR.
 *
 * @param input - Canonical duplicate dimensions and repository identity
 * @param dependencies - Availability-aware catalogue and bounded GitHub readers
 * @returns Unique, duplicate, reconciliation, or fail-closed retry outcome
 */
export async function checkSubmissionDuplicates(
  input: {
    readonly llmsFullUrl?: string
    readonly llmsUrl: string
    readonly expectedBaseRef?: string
    readonly owner: string
    readonly repo: string
    readonly submissionId: string
    readonly website: string
  },
  dependencies: DuplicateDependencies = DEFAULT_DEPENDENCIES
): Promise<SubmissionDuplicateResult> {
  const normalizedInput = normalizeFields(input.website, input.llmsUrl, input.llmsFullUrl)
  if (
    !normalizedInput ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(input.owner) ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(input.repo) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.submissionId)
  ) {
    return retryLater()
  }

  try {
    const catalogue = dependencies.getWebsitesStrict()
    if (catalogue.status !== 'available') return retryLater()
    for (const entry of catalogue.websites) {
      const normalized = normalizeFields(entry.website, entry.llmsUrl)
      if (!normalized) return retryLater()
      if (matchesDuplicate(normalized, normalizedInput)) {
        return { source: 'catalogue', status: 'duplicate' }
      }
    }
    return await inspectOpenPullRequests(
      {
        ...normalizedInput,
        expectedBaseRef: input.expectedBaseRef ?? 'main',
        owner: input.owner,
        repo: input.repo,
        submissionId: input.submissionId
      },
      dependencies.github,
      createSubmissionInspectionBudget({
        deadlineMs: dependencies.deadlineMs ?? DUPLICATE_INSPECTION_DEADLINE_MS,
        now: dependencies.now ?? Date.now,
        requestBudget: dependencies.requestBudget ?? DUPLICATE_INSPECTION_REQUEST_BUDGET
      })
    )
  } catch (_error) {
    logger.error('Submission duplicate check unavailable', {
      data: { status: 'unavailable' },
      tags: { type: 'submission', operation: 'duplicate_check' }
    })
    return retryLater()
  }
}
