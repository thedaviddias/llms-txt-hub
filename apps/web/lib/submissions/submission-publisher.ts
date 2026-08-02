import { createHash } from 'node:crypto'

import type { Octokit } from '@octokit/rest'
import { logger } from '@thedaviddias/logging'
import { createAssessmentAttestation } from '@thedaviddias/submission-trust/attestation'
import type { SubmissionAssessment, SubmissionFields } from '@thedaviddias/submission-trust/types'
import yaml from 'js-yaml'

import {
  type SubmissionPublicationState,
  submissionPublicationState
} from './submission-publication-state'

const OWNER = 'thedaviddias'
const REPO = 'llms-txt-hub'
const REPOSITORY = `${OWNER}/${REPO}`
const FILE_PREFIX = 'packages/content/data/websites/'
const GITHUB_TIMEOUT_MS = 10_000
const ATTESTATION_LIFETIME_MS = 10 * 60 * 1000
const SHA1 = /^[a-f0-9]{40}$/
const SUBMISSION_ID = /^[A-Za-z0-9_-]{1,128}$/
/** Rollout modes for trusted automatic publication. */
export type SubmissionAutopublishMode = 'disabled' | 'enabled' | 'shadow'

interface PullRequestSnapshot {
  readonly body: string
  readonly headSha: string
  readonly number: number
  readonly url: string
}

interface StoredFile {
  readonly content: string
  readonly sha: string
}
/** Narrow GitHub operations required for idempotent publication. */
export interface SubmissionPublisherGithub {
  readonly addLabels: (prNumber: number, labels: readonly string[]) => Promise<void>
  readonly createBranch: (branch: string, baseSha: string) => Promise<void>
  readonly createFile: (input: {
    readonly branch: string
    readonly content: string
    readonly message: string
    readonly path: string
  }) => Promise<string>
  readonly createPullRequest: (input: {
    readonly base: string
    readonly body: string
    readonly branch: string
    readonly title: string
  }) => Promise<PullRequestSnapshot>
  readonly getBranchHead: (branch: string) => Promise<string | null>
  readonly getDefaultBranch: () => Promise<{ readonly branch: string; readonly headSha: string }>
  readonly getFile: (path: string, branch: string) => Promise<StoredFile | null>
  readonly listPullRequests: (branch: string) => Promise<readonly PullRequestSnapshot[]>
  readonly updatePullRequestBody: (prNumber: number, body: string) => Promise<void>
}
/** Injectable boundaries used by deterministic publisher tests. */
export interface SubmissionPublisherDependencies {
  readonly github: SubmissionPublisherGithub
  readonly now: () => Date
  readonly secret: string
  readonly state: SubmissionPublicationState
}
/** Result of idempotent GitHub publication. */
export type SubmissionPublisherResult =
  | { readonly ok: true; readonly outcome: 'automatic' | 'manual'; readonly prUrl: string }
  | {
      readonly code: 'publication_unavailable'
      readonly ok: false
      readonly recovery: 'fresh_preflight' | 'same_submission'
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNotFound = (error: unknown): boolean => isRecord(error) && error.status === 404

const decodeFile = (value: unknown): StoredFile => {
  if (
    !isRecord(value) ||
    value.type !== 'file' ||
    value.encoding !== 'base64' ||
    typeof value.content !== 'string' ||
    typeof value.sha !== 'string' ||
    !SHA1.test(value.sha)
  ) {
    throw new Error('Unsupported GitHub file response')
  }
  const encoded = value.content.replace(/\s/g, '')
  if (encoded.length > 200_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error('Malformed GitHub file response')
  }
  return { content: Buffer.from(encoded, 'base64').toString('utf8'), sha: value.sha }
}

const parsePullRequest = (value: unknown): PullRequestSnapshot => {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.number) ||
    typeof value.number !== 'number' ||
    value.number < 1 ||
    typeof value.html_url !== 'string' ||
    !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+$/.test(value.html_url) ||
    !isRecord(value.head) ||
    typeof value.head.sha !== 'string' ||
    !SHA1.test(value.head.sha) ||
    (value.body !== null && typeof value.body !== 'string') ||
    (typeof value.body === 'string' && value.body.length > 100_000)
  ) {
    throw new Error('Malformed GitHub pull request response')
  }
  return {
    body: typeof value.body === 'string' ? value.body : '',
    headSha: value.head.sha,
    number: value.number,
    url: value.html_url
  }
}

let octokitPromise: Promise<Octokit> | null = null
const client = (): Promise<Octokit> => {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GitHub publication unavailable')
  octokitPromise ??= import('@octokit/rest').then(module => new module.Octokit({ auth: token }))
  return octokitPromise
}

const githubRequest = { timeout: GITHUB_TIMEOUT_MS }

const defaultGithub: SubmissionPublisherGithub = {
  async addLabels(prNumber, labels) {
    await (await client()).issues.addLabels({
      owner: OWNER,
      repo: REPO,
      issue_number: prNumber,
      labels: [...labels],
      request: githubRequest
    })
  },
  async createBranch(branch, baseSha) {
    await (await client()).git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
      request: githubRequest
    })
  },
  async createFile(input) {
    const response = await (await client()).repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      branch: input.branch,
      content: Buffer.from(input.content).toString('base64'),
      message: input.message,
      path: input.path,
      request: githubRequest
    })
    const commit: unknown = response.data.commit
    if (!isRecord(commit) || typeof commit.sha !== 'string' || !SHA1.test(commit.sha)) {
      throw new Error('Malformed GitHub commit response')
    }
    return commit.sha
  },
  async createPullRequest(input) {
    const response = await (await client()).pulls.create({
      owner: OWNER,
      repo: REPO,
      base: input.base,
      body: input.body,
      head: input.branch,
      title: input.title,
      request: githubRequest
    })
    return parsePullRequest(response.data)
  },
  async getBranchHead(branch) {
    try {
      const response = await (await client()).git.getRef({
        owner: OWNER,
        repo: REPO,
        ref: `heads/${branch}`,
        request: githubRequest
      })
      return SHA1.test(response.data.object.sha) ? response.data.object.sha : null
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  },
  async getDefaultBranch() {
    const repository = await (await client()).repos.get({
      owner: OWNER,
      repo: REPO,
      request: githubRequest
    })
    const branch = repository.data.default_branch
    const reference = await (await client()).git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${branch}`,
      request: githubRequest
    })
    if (!branch || !SHA1.test(reference.data.object.sha))
      throw new Error('Malformed GitHub repository response')
    return { branch, headSha: reference.data.object.sha }
  },
  async getFile(path, branch) {
    try {
      const response = await (await client()).repos.getContent({
        owner: OWNER,
        repo: REPO,
        path,
        ref: branch,
        request: githubRequest
      })
      return decodeFile(response.data)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  },
  async listPullRequests(branch) {
    const response = await (await client()).pulls.list({
      owner: OWNER,
      repo: REPO,
      base: 'main',
      head: `${OWNER}:${branch}`,
      per_page: 3,
      state: 'open',
      request: githubRequest
    })
    if (response.data.length > 1) throw new Error('Ambiguous publication pull request')
    return response.data.map(parsePullRequest)
  },
  async updatePullRequestBody(prNumber, body) {
    await (await client()).pulls.update({
      owner: OWNER,
      repo: REPO,
      pull_number: prNumber,
      body,
      request: githubRequest
    })
  }
}

const defaults = (): SubmissionPublisherDependencies => ({
  github: defaultGithub,
  now: () => new Date(),
  secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? '',
  state: submissionPublicationState
})
const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const escapeMdxText = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')

const renderMdx = (
  fields: SubmissionFields
): { readonly content: string; readonly path: string } | null => {
  const slug = slugify(fields.name)
  if (!slug) return null
  const frontmatter = yaml.dump(
    {
      category: fields.category,
      description: fields.description,
      llmsFullUrl: fields.llmsFullUrl ?? '',
      llmsUrl: fields.llmsUrl,
      name: fields.name,
      publishedAt: fields.publishedAt,
      website: fields.website
    },
    { forceQuotes: true, indent: 2, lineWidth: -1, quotingType: "'", sortKeys: true }
  )
  return {
    content: `---\n${frontmatter}---\n\n# ${escapeMdxText(fields.name)}\n\n${escapeMdxText(fields.description)}\n`,
    path: `${FILE_PREFIX}${slug}-llms-txt.mdx`
  }
}

const pullRequestBody = (
  fields: SubmissionFields,
  assessment: SubmissionAssessment,
  submissionId: string,
  mode: SubmissionAutopublishMode
): string => {
  const shadow = mode === 'shadow' && assessment.decision === 'auto_publish'
  const assessmentLabel =
    mode === 'disabled' && assessment.decision === 'auto_publish'
      ? 'manual_review'
      : shadow
        ? 'would_auto_publish'
        : assessment.decision
  return `<!-- llms-hub-submission:${submissionId} -->\n\nThis PR adds ${escapeMdxText(fields.name)} to the llms.txt hub.\n\n**Assessment:** ${assessmentLabel}\n**Policy:** ${assessment.policyVersion}\n**Website:** ${fields.website}\n**llms.txt:** ${fields.llmsUrl}\n${fields.llmsFullUrl ? `**llms-full.txt:** ${fields.llmsFullUrl}\n` : ''}`
}

const webRiskCheckedAt = (assessment: SubmissionAssessment): string | null => {
  const timestamps: number[] = []
  for (const entry of assessment.evidence) {
    const checkedAt = entry.details?.checkedAt
    if (entry.details?.providerStatus !== 'safe' || !checkedAt) continue
    const time = Date.parse(checkedAt)
    if (Number.isFinite(time)) timestamps.push(time)
  }
  if (timestamps.length === 0) return null
  return new Date(Math.min(...timestamps)).toISOString()
}

const publicationOutcome = (
  assessment: SubmissionAssessment,
  mode: SubmissionAutopublishMode
): 'automatic' | 'manual' =>
  mode === 'enabled' && assessment.decision === 'auto_publish' ? 'automatic' : 'manual'

const publicationResultCode = (
  assessment: SubmissionAssessment,
  mode: SubmissionAutopublishMode
): string => {
  if (assessment.decision === 'manual_review') return 'manual_review'
  if (mode === 'shadow') return 'would_auto_publish'
  if (mode === 'disabled') return 'disabled_auto_publish'
  return 'auto_publish'
}

/**
 * Idempotently publish one completed, security-cleared assessment through a
 * deterministic branch and pull request.
 */
export async function publishSubmission(
  input: {
    readonly assessment: SubmissionAssessment
    readonly fields: SubmissionFields
    readonly mode: SubmissionAutopublishMode
    readonly submissionId: string
  },
  dependencies: SubmissionPublisherDependencies = defaults()
): Promise<SubmissionPublisherResult> {
  const startedAt = Date.now()
  const outcome = publicationOutcome(input.assessment, input.mode)
  let publicationStarted = false
  let logOutcome: 'automatic' | 'manual' | 'retry_later' = 'retry_later'
  let reasonCode = 'publication_unavailable'
  const unavailable = async (): Promise<SubmissionPublisherResult> => {
    if (!publicationStarted) {
      return { code: 'publication_unavailable', ok: false, recovery: 'fresh_preflight' }
    }
    let stateUpdated = false
    try {
      stateUpdated = await dependencies.state.markFailed(input.submissionId)
    } catch {
      stateUpdated = false
    }
    if (!stateUpdated) {
      logger.error('Submission publication state transition unavailable', {
        data: { reasonCode: 'publication_unavailable' },
        tags: { operation: 'publish_state', type: 'submission' }
      })
    }
    return { code: 'publication_unavailable', ok: false, recovery: 'same_submission' }
  }
  try {
    if (
      !SUBMISSION_ID.test(input.submissionId) ||
      !['disabled', 'enabled', 'shadow'].includes(input.mode) ||
      (input.assessment.decision !== 'auto_publish' &&
        input.assessment.decision !== 'manual_review') ||
      (outcome === 'automatic' && Buffer.byteLength(dependencies.secret, 'utf8') < 32)
    ) {
      return unavailable()
    }
    const rendered = renderMdx(input.fields)
    if (!rendered) return unavailable()
    const branch = `submit/${input.submissionId}`
    const resultCode = publicationResultCode(input.assessment, input.mode)
    if (
      !(await dependencies.state.persistBranch({
        branch,
        outcome,
        resultCode,
        submissionId: input.submissionId
      }))
    ) {
      return unavailable()
    }
    publicationStarted = true

    const base = await dependencies.github.getDefaultBranch()
    let headSha = await dependencies.github.getBranchHead(branch)
    if (!headSha) {
      await dependencies.github.createBranch(branch, base.headSha)
      headSha = base.headSha
    }
    const existingFile = await dependencies.github.getFile(rendered.path, branch)
    if (existingFile && existingFile.content !== rendered.content) {
      return unavailable()
    }
    if (!existingFile) {
      headSha = await dependencies.github.createFile({
        branch,
        content: rendered.content,
        message: `feat(community): add ${input.fields.name}`,
        path: rendered.path
      })
    }

    const body = pullRequestBody(input.fields, input.assessment, input.submissionId, input.mode)
    const marker = `<!-- llms-hub-submission:${input.submissionId} -->`
    const existingPullRequests = await dependencies.github.listPullRequests(branch)
    if (existingPullRequests.length > 1) return unavailable()
    let pullRequest = existingPullRequests[0]
    if (
      pullRequest &&
      (pullRequest.body.split(marker).length !== 2 || pullRequest.headSha !== headSha)
    ) {
      return unavailable()
    }
    pullRequest ??= await dependencies.github.createPullRequest({
      base: base.branch,
      body,
      branch,
      title: `feat(community): add ${input.fields.name} to llms.txt hub`
    })
    if (pullRequest.body.split(marker).length !== 2 || pullRequest.headSha !== headSha) {
      return unavailable()
    }
    if (
      !(await dependencies.state.persistGithub({
        branch,
        headSha,
        prNumber: pullRequest.number,
        submissionId: input.submissionId
      }))
    ) {
      return unavailable()
    }

    if (outcome === 'manual') {
      await dependencies.github.addLabels(pullRequest.number, ['needs:manual-review'])
    } else {
      const checkedAt = webRiskCheckedAt(input.assessment)
      const now = dependencies.now()
      if (!checkedAt || !Number.isFinite(now.getTime())) {
        return unavailable()
      }
      const expiry = Math.min(
        now.getTime() + ATTESTATION_LIFETIME_MS,
        Date.parse(checkedAt) + ATTESTATION_LIFETIME_MS
      )
      const signed = createAssessmentAttestation(
        {
          decision: 'auto_publish',
          expiresAt: new Date(expiry).toISOString(),
          headSha,
          issuedAt: now.toISOString(),
          llmsFullUrl: input.fields.llmsFullUrl,
          llmsUrl: input.fields.llmsUrl,
          mdxContentSha256: createHash('sha256').update(rendered.content).digest('hex'),
          mdxPath: rendered.path,
          policyVersion: input.assessment.policyVersion,
          prNumber: pullRequest.number,
          repository: REPOSITORY,
          submissionId: input.submissionId,
          webRiskCheckedAt: checkedAt,
          website: input.fields.website
        },
        dependencies.secret
      )
      if (!signed.ok) return unavailable()
      await dependencies.github.updatePullRequestBody(
        pullRequest.number,
        `${body}\n${signed.block}`
      )
    }
    logOutcome = outcome
    reasonCode = resultCode
    return { ok: true, outcome, prUrl: pullRequest.url }
  } catch {
    return unavailable()
  } finally {
    logger.info('Submission publication completed', {
      data: { durationMs: Date.now() - startedAt, outcome: logOutcome, reasonCode },
      tags: { operation: 'publish', type: 'submission' }
    })
  }
}
