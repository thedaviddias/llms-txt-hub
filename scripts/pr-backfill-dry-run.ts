import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { assessPublicationFields } from '@thedaviddias/submission-trust/assessment'
import {
  type AssessmentAttestationVerificationResult,
  verifyAssessmentAttestation
} from '@thedaviddias/submission-trust/attestation'
import {
  SUBMISSION_POLICY_VERSION,
  WEB_RISK_FRESHNESS_MS
} from '@thedaviddias/submission-trust/constants'
import { createNetworkInspector } from '@thedaviddias/submission-trust/network-inspector'
import type {
  PublicationAssessmentDependencies,
  SubmissionAssessment,
  SubmissionFields
} from '@thedaviddias/submission-trust/types'
import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'
import { checkWebRiskUrl } from '@thedaviddias/submission-trust/web-risk'
import { glob } from 'glob'
import matter from 'gray-matter'
import { categories } from '../apps/web/lib/categories.ts'
import {
  classifyPullRequest,
  type PullRequestClassification,
  type PullRequestCommit,
  type PullRequestContext,
  type PullRequestFile
} from './pr-triage.ts'

const execFileAsync = promisify(execFile)

const DEFAULT_REPO = 'thedaviddias/llms-txt-hub'
const DEFAULT_CONCURRENCY = 8
const PAGE_SIZE = 100
const PR_REVIEW_WORKFLOW_NAME = 'PR Review'
const MAX_MDX_BYTES = 100_000
const MAX_BASE_MDX_FILES = 5000
const MAX_BASE_MDX_AGGREGATE_BYTES = 256 * 1024 * 1024
const BASE_SCAN_DEADLINE_MS = 20_000
const WEBSITE_PATH_PREFIX = 'packages/content/data/websites/'
const MAX_OPEN_PULL_REQUESTS = 300
const MAX_OPEN_PULL_REQUEST_FILES = 300
const EXACT_MANAGED_LABELS = [
  'area:content',
  'automerge:candidate',
  'generated:websites-json'
] as const
const MANAGED_LABEL_PREFIXES = [
  'guideline:',
  'lane:',
  'needs:',
  'policy:',
  'risk:',
  'status:'
] as const
const COLUMN_WIDTHS = {
  guidelines: 10,
  lane: 8,
  labels: 46,
  merge: 7,
  policy: 6,
  pr: 4,
  reason: 60,
  review: 15,
  risk: 4,
  title: 52
} as const

const editorialCategories = categories.map(category => ({
  description: category.description,
  name: category.name,
  slug: category.slug
}))

/**
 * Create the hardened inspector used by trusted PR moderation.
 */
const createReviewInspector = () =>
  createNetworkInspector({
    checkReputation: url => checkWebRiskUrl(url, { apiKey: process.env.GOOGLE_WEB_RISK_API_KEY })
  })
const managedLabelSet = new Set<string>(EXACT_MANAGED_LABELS)

const LABEL_DEFINITIONS = [
  {
    color: '0E8A16',
    description: 'Touches content website entries or generated website data.',
    name: 'area:content'
  },
  {
    color: '0E8A16',
    description: 'Eligible for auto-merge after required checks pass.',
    name: 'automerge:candidate'
  },
  {
    color: 'FBCA04',
    description: 'Touches generated data/websites.json.',
    name: 'generated:websites-json'
  },
  {
    color: 'D876E3',
    description: 'Manual review required before merging.',
    name: 'needs:manual-review'
  },
  {
    color: 'D876E3',
    description:
      'Manual review required because data/websites.json was changed outside automation.',
    name: 'needs:generated-file-review'
  },
  {
    color: '1D76DB',
    description: 'Eligible for the MDX auto-merge fast lane.',
    name: 'lane:mdx-fast'
  },
  {
    color: '5319E7',
    description: 'Requires standard human review.',
    name: 'lane:standard'
  },
  {
    color: 'B60205',
    description: 'Blocked from fast-lane processing.',
    name: 'lane:blocked'
  },
  {
    color: '0E8A16',
    description: 'Low-risk change based on deterministic intake rules.',
    name: 'risk:low'
  },
  {
    color: 'B60205',
    description: 'High-risk or mixed change based on deterministic intake rules.',
    name: 'risk:high'
  },
  {
    color: 'D93F0B',
    description: 'Needs manual intervention before review.',
    name: 'status:blocked'
  }
] as const

type GuidelineStatus = 'pass' | 'warn' | 'fail' | 'skipped'
/** Normalized conclusion of the required PR Review workflow. */
export type ReviewConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'neutral'
  | 'skipped'
  | 'in_progress'
  | 'missing'
  | 'unknown'

interface DryRunOptions {
  concurrency: number
  dryRun: boolean
  json: boolean
  limit?: number
  pullRequestNumber?: number
  repo: string
}

interface GitHubContentResponse {
  content: string
  encoding: string
}

interface GitHubPullRequestCommit {
  author?: {
    login?: string
  } | null
  committer?: {
    login?: string
  } | null
}

interface GitHubPullRequestDetails {
  base?: {
    ref?: string
    repo?: {
      full_name?: string
    } | null
    sha?: string
  }
  body?: string | null
  draft: boolean
  head: {
    ref: string
    sha: string
    user?: {
      login?: string
    }
  }
  labels?: {
    name: string
  }[]
  mergeable: boolean | null
  number: number
  state: string
  title: string
  user: {
    login?: string
  }
}

interface GitHubPullRequestFile {
  additions?: number
  changes?: number
  deletions?: number
  filename: string
  previous_filename?: string | null
  status: string
}

interface GitHubPullRequestListItem {
  head?: {
    repo?: {
      full_name?: string
    } | null
    sha: string
  }
  number: number
}

interface GitHubWorkflowRun {
  conclusion: string | null
  created_at: string
  name: string
  status: string
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRun[]
}

export interface SubmissionFrontmatter {
  category: string
  description: string
  llmsFullUrl?: string | null
  llmsUrl: string
  name: string
  publishedAt?: string
  website: string
}

interface GuidelineAssessment {
  guidelineReasons: string[]
  guidelineStatus: GuidelineStatus
  policyEligible: boolean
}

interface ModeratedSubmissionFile {
  assessment: SubmissionAssessment
  bytes: Uint8Array
  frontmatter: SubmissionFrontmatter
  path: string
}

interface ModerationResult extends GuidelineAssessment {
  files: ModeratedSubmissionFile[]
}

interface PullRequestReviewSnapshot {
  classification: PullRequestClassification
  guidelineReasons: string[]
  guidelineStatus: GuidelineStatus
  labelSync: LabelSyncResult
  mergeAction: MergeAction
  number: number
  policyEligible: boolean
  reviewStatus: ReviewConclusion
  structurallyEligible: boolean
  title: string
  wouldMerge: boolean
  wouldMergeReason: string
}

interface DryRunSummary {
  labelsApplied: number
  labelsPlanned: number
  blockedManualWebsitesJsonChanges: number
  guidelineConcerns: number
  mergeFailures: number
  mergesCompleted: number
  mergesPlanned: number
  mdxFast: number
  policyEligible: number
  scanned: number
  waitingOnReview: number
  wouldMerge: number
}

interface LabelSyncPlan {
  added: string[]
  desired: string[]
  removed: string[]
}

interface LabelSyncResult extends LabelSyncPlan {
  mode: 'applied' | 'dry-run'
}

interface MergeAction {
  attempted: boolean
  mode: 'applied' | 'dry-run'
  reason: string
  status: 'failed' | 'merged' | 'planned' | 'skipped'
}

interface MergeRevalidationContext {
  baseDuplicateStatus: DuplicateStatus
  duplicateFields: DuplicateCandidate
  file: ModeratedSubmissionFile
  freshAssessment: SubmissionAssessment
  trustedBaseSha: string
}

type DuplicateStatus = 'unique' | 'duplicate' | 'unavailable'
type TrustedBaseStatus = 'current' | 'moved' | 'unavailable'
type AuthorizationDisposition = 'manual_review' | 'wait'

/** A fail-closed decision produced from all trusted merge gates. */
export type MergeAuthorization =
  | { readonly authorized: true; readonly reason: 'Signed exact-head assessment passed.' }
  | {
      readonly authorized: false
      readonly disposition: AuthorizationDisposition
      readonly reason: string
    }

/** Inputs required to verify the PR-body attestation against exact GitHub bytes. */
export interface MergeAttestationVerificationInput {
  readonly addedMdxBytes: Uint8Array
  readonly addedMdxPath: string
  readonly body: string
  readonly currentHeadSha: string
  readonly now?: () => Date
  readonly prNumber: number
  readonly repository: string
  readonly secret: string
}

/** Inputs that cannot be trusted from labels or PR-authored content alone. */
export interface MergeAuthorizationInput {
  readonly attestation: AssessmentAttestationVerificationResult
  readonly baseDuplicateStatus: DuplicateStatus
  readonly baseSnapshotStatus: TrustedBaseStatus
  readonly freshAssessment: SubmissionAssessment
  readonly now?: () => Date
  readonly openPullRequestDuplicateStatus: DuplicateStatus
  readonly requiredCheckStatus: ReviewConclusion
}

/** Trusted workflow event context derived from a bounded GitHub event payload. */
export type AutomergeEventContext =
  | { readonly mode: 'single'; readonly prNumber: number }
  | { readonly mode: 'scan_all' }
  | { readonly mode: 'skip' }

const invalidAttestation = (): AssessmentAttestationVerificationResult => ({
  code: 'invalid_expectation',
  ok: false
})

const unavailableAssessment = (): SubmissionAssessment => ({
  checkedAt: new Date(0).toISOString(),
  decision: 'retry_later',
  evidence: [],
  policyVersion: SUBMISSION_POLICY_VERSION,
  publicMessage: 'Trusted reassessment is unavailable.',
  reasonCode: 'publication_unavailable'
})

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readEventPrNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

/** Derive a safe processing scope from a trusted GitHub Actions event payload. */
export function deriveAutomergeEventContext(
  eventName: string,
  payload: unknown
): AutomergeEventContext {
  if (!isUnknownRecord(payload)) return { mode: 'skip' }
  if (eventName === 'pull_request_target') {
    const pullRequest = payload.pull_request
    const prNumber = isUnknownRecord(pullRequest) ? readEventPrNumber(pullRequest.number) : null
    return prNumber ? { mode: 'single', prNumber } : { mode: 'skip' }
  }
  if (eventName === 'workflow_run') {
    const workflowRun = payload.workflow_run
    if (!isUnknownRecord(workflowRun) || workflowRun.name !== PR_REVIEW_WORKFLOW_NAME) {
      return { mode: 'skip' }
    }
    const pullRequests = workflowRun.pull_requests
    if (!Array.isArray(pullRequests) || pullRequests.length !== 1) return { mode: 'skip' }
    const pullRequest = pullRequests[0]
    const prNumber = isUnknownRecord(pullRequest) ? readEventPrNumber(pullRequest.number) : null
    return prNumber ? { mode: 'single', prNumber } : { mode: 'skip' }
  }
  if (eventName === 'workflow_dispatch') {
    const inputs = payload.inputs
    if (!isUnknownRecord(inputs) || typeof inputs.pr_number !== 'string') return { mode: 'skip' }
    const value = inputs.pr_number.trim()
    if (value === '') return { mode: 'scan_all' }
    if (!/^[1-9][0-9]*$/.test(value)) return { mode: 'skip' }
    const prNumber = Number(value)
    return readEventPrNumber(prNumber) ? { mode: 'single', prNumber } : { mode: 'skip' }
  }
  return { mode: 'skip' }
}

/** Prove that the checked-out base is the exact current base used by the pull request. */
export function deriveTrustedBaseStatus(input: {
  readonly checkedOutSha: string
  readonly currentBaseSha: string
  readonly pullRequestBaseSha: string
}): TrustedBaseStatus {
  const shas = [input.checkedOutSha, input.currentBaseSha, input.pullRequestBaseSha]
  if (!shas.every(sha => /^[a-f0-9]{40}$/.test(sha))) return 'unavailable'
  return shas.every(sha => sha === input.checkedOutSha) ? 'current' : 'moved'
}

const manualReviewAuthorization = (reason: string): MergeAuthorization => ({
  authorized: false,
  disposition: 'manual_review',
  reason
})

const waitAuthorization = (reason: string): MergeAuthorization => ({
  authorized: false,
  disposition: 'wait',
  reason
})

/** Read a caller-provided clock without allowing exceptions or invalid dates to authorize. */
const safeClock = (clock: (() => Date) | undefined): Date | null => {
  try {
    const value = clock?.() ?? new Date()
    return value instanceof Date && Number.isFinite(value.getTime()) ? value : null
  } catch {
    return null
  }
}

const isFreshTimestamp = (value: string, nowMs: number): boolean => {
  const timestamp = Date.parse(value)
  return (
    Number.isFinite(timestamp) && timestamp <= nowMs && nowMs - timestamp < WEB_RISK_FRESHNESS_MS
  )
}

const hasFreshSafeAssessmentEvidence = (
  assessment: SubmissionAssessment,
  includesOptionalResource: boolean,
  nowMs: number
): boolean => {
  if (
    assessment.decision !== 'auto_publish' ||
    assessment.reasonCode !== 'passed' ||
    assessment.policyVersion !== SUBMISSION_POLICY_VERSION ||
    !isFreshTimestamp(assessment.checkedAt, nowMs)
  ) {
    return false
  }

  const requiredResources: readonly ('homepage' | 'llms' | 'llms_full')[] = includesOptionalResource
    ? ['homepage', 'llms', 'llms_full']
    : ['homepage', 'llms']
  return requiredResources.every(resource =>
    assessment.evidence.some(
      entry =>
        entry.check === 'resource' &&
        entry.resource === resource &&
        entry.decision === 'auto_publish' &&
        entry.reasonCode === 'passed' &&
        entry.details?.providerStatus === 'safe' &&
        typeof entry.details.checkedAt === 'string' &&
        isFreshTimestamp(entry.details.checkedAt, nowMs)
    )
  )
}

/**
 * Verify a signed assessment against the exact current PR head and MDX bytes.
 */
export function verifyMergeAttestation(
  input: MergeAttestationVerificationInput
): AssessmentAttestationVerificationResult {
  try {
    if (
      !(input.addedMdxBytes instanceof Uint8Array) ||
      input.addedMdxBytes.byteLength === 0 ||
      input.addedMdxBytes.byteLength > MAX_MDX_BYTES
    ) {
      return invalidAttestation()
    }
    const content = new TextDecoder('utf-8', { fatal: true }).decode(input.addedMdxBytes)
    const frontmatter = parseSubmissionFrontmatter(content)
    const expected = {
      headSha: input.currentHeadSha,
      llmsUrl: frontmatter.llmsUrl,
      mdxContentSha256: createHash('sha256').update(input.addedMdxBytes).digest('hex'),
      mdxPath: input.addedMdxPath,
      policyVersion: SUBMISSION_POLICY_VERSION,
      prNumber: input.prNumber,
      repository: input.repository,
      website: frontmatter.website
    }
    return verifyAssessmentAttestation({
      body: input.body,
      expected: frontmatter.llmsFullUrl
        ? { ...expected, llmsFullUrl: frontmatter.llmsFullUrl }
        : expected,
      now: input.now,
      secret: input.secret
    })
  } catch {
    return invalidAttestation()
  }
}

/**
 * Derive merge authorization only from verified provenance and fresh trusted evidence.
 */
export function deriveMergeAuthorization(input: MergeAuthorizationInput): MergeAuthorization {
  if (input.requiredCheckStatus === 'missing' || input.requiredCheckStatus === 'in_progress') {
    return waitAuthorization('PR Review is still pending for the exact head.')
  }
  if (input.baseSnapshotStatus !== 'current') {
    return waitAuthorization('The trusted base snapshot is no longer current.')
  }
  const now = safeClock(input.now)
  if (!now) return manualReviewAuthorization('Trusted assessment clock is unavailable.')
  if (!input.attestation.ok) {
    return manualReviewAuthorization('A valid signed assessment is required.')
  }

  const payload = input.attestation.payload
  const nowMs = now.getTime()
  if (
    payload.decision !== 'auto_publish' ||
    payload.policyVersion !== SUBMISSION_POLICY_VERSION ||
    !isFreshTimestamp(payload.webRiskCheckedAt, nowMs) ||
    nowMs < Date.parse(payload.issuedAt) ||
    nowMs >= Date.parse(payload.expiresAt)
  ) {
    return manualReviewAuthorization('The signed assessment is no longer fresh.')
  }
  if (input.baseDuplicateStatus !== 'unique' || input.openPullRequestDuplicateStatus !== 'unique') {
    return manualReviewAuthorization('Unique publication could not be confirmed.')
  }
  if (!hasFreshSafeAssessmentEvidence(input.freshAssessment, Boolean(payload.llmsFullUrl), nowMs)) {
    return manualReviewAuthorization('Fresh trusted reassessment did not authorize publication.')
  }
  if (input.requiredCheckStatus !== 'success') {
    return manualReviewAuthorization('PR Review did not succeed for the exact head.')
  }
  return { authorized: true, reason: 'Signed exact-head assessment passed.' }
}

/**
 * Reconfirm the exact head and required check after authorization and immediately before merge.
 */
export function deriveExactHeadMergeDecision(input: {
  readonly authorization: MergeAuthorization
  readonly baseSnapshotStatus: TrustedBaseStatus
  readonly currentHeadSha: string
  readonly expectedHeadSha: string
  readonly requiredCheckStatus: ReviewConclusion
}): MergeAuthorization {
  if (!input.authorization.authorized) return input.authorization
  if (input.baseSnapshotStatus !== 'current') {
    return waitAuthorization('The trusted base moved before merge.')
  }
  if (input.currentHeadSha !== input.expectedHeadSha) {
    return waitAuthorization('The pull request head changed before merge.')
  }
  if (input.requiredCheckStatus === 'missing' || input.requiredCheckStatus === 'in_progress') {
    return waitAuthorization('PR Review is still pending before merge.')
  }
  if (input.requiredCheckStatus !== 'success') {
    return manualReviewAuthorization('PR Review changed before merge.')
  }
  return input.authorization
}

/**
 * Build the classifier input from GitHub pull request API payloads.
 */
export function buildClassifierContext(input: {
  commits: GitHubPullRequestCommit[]
  details: GitHubPullRequestDetails
  files: GitHubPullRequestFile[]
}): PullRequestContext {
  return {
    authorLogin: input.details.user.login ?? 'unknown',
    commits: input.commits.map<PullRequestCommit>(commit => ({
      authorLogin: commit.author?.login ?? null,
      committerLogin: commit.committer?.login ?? null
    })),
    files: input.files.map<PullRequestFile>(file => ({
      additions: file.additions,
      changes: file.changes,
      deletions: file.deletions,
      filename: file.filename,
      previousFilename: file.previous_filename ?? null,
      status: file.status
    })),
    headRefName: input.details.head.ref,
    title: input.details.title
  }
}

/**
 * Parse submission frontmatter from a PR-added MDX file.
 */
export function parseSubmissionFrontmatter(content: string): SubmissionFrontmatter {
  if (
    Buffer.byteLength(content, 'utf8') === 0 ||
    Buffer.byteLength(content, 'utf8') > MAX_MDX_BYTES
  ) {
    throw new Error('Submission MDX is empty or too large.')
  }
  const parsed = matter(content)
  const data = ensureRecord(parsed.data)
  const allowedKeys = new Set([
    'category',
    'description',
    'llmsFullUrl',
    'llmsUrl',
    'name',
    'publishedAt',
    'website'
  ])
  if (Object.keys(data).some(key => !allowedKeys.has(key))) {
    throw new Error('Submission frontmatter contains an unsupported field.')
  }
  const frontmatter: SubmissionFrontmatter = {
    category: readRequiredString(data, 'category'),
    description: readRequiredString(data, 'description'),
    llmsFullUrl: readOptionalString(data, 'llmsFullUrl'),
    llmsUrl: readRequiredString(data, 'llmsUrl'),
    name: readRequiredString(data, 'name'),
    publishedAt: readOptionalString(data, 'publishedAt') ?? undefined,
    website: readRequiredString(data, 'website')
  }

  return frontmatter
}

/**
 * Determine whether the structural auto-merge gates are satisfied.
 */
export function deriveStructuralDecision(input: {
  classification: PullRequestClassification
  isDraft: boolean
  mergeable: boolean | null
  state: string
}): { reason: string; structurallyEligible: boolean } {
  if (input.classification.lane !== 'mdx-fast') {
    return {
      reason: 'Not in the MDX fast lane.',
      structurallyEligible: false
    }
  }

  if (!input.classification.automergeEligible) {
    return {
      reason: 'Classifier did not mark the PR as auto-merge eligible.',
      structurallyEligible: false
    }
  }

  if (input.classification.manualWebsitesJsonChange) {
    return {
      reason: 'Manual data/websites.json change requires human review.',
      structurallyEligible: false
    }
  }

  if (input.state !== 'open') {
    return {
      reason: `PR state is ${input.state}, not open.`,
      structurallyEligible: false
    }
  }

  if (input.isDraft) {
    return {
      reason: 'PR is still a draft.',
      structurallyEligible: false
    }
  }

  if (input.mergeable !== true) {
    return {
      reason: 'GitHub does not currently mark the PR as mergeable.',
      structurallyEligible: false
    }
  }

  return {
    reason: 'Structural checks passed.',
    structurallyEligible: true
  }
}

/**
 * Decide whether a PR would merge after structural and guideline gates.
 */
export function deriveWouldMergeDecision(input: {
  guidelineReasons: string[]
  guidelineStatus: GuidelineStatus
  structuralDecision: { reason: string; structurallyEligible: boolean }
}): {
  policyEligible: boolean
  reason: string
  wouldMerge: boolean
} {
  if (!input.structuralDecision.structurallyEligible) {
    return {
      policyEligible: false,
      reason: input.structuralDecision.reason,
      wouldMerge: false
    }
  }

  if (input.guidelineStatus !== 'pass') {
    return {
      policyEligible: false,
      reason: `Manual review: ${input.guidelineReasons[0] ?? 'guideline concern detected.'}`,
      wouldMerge: false
    }
  }

  return {
    policyEligible: true,
    reason: 'Would auto-merge now.',
    wouldMerge: true
  }
}

/**
 * Determine whether the local operator should attempt a merge.
 */
export function deriveMergeAction(input: {
  authorization?: MergeAuthorization
  desiredLabels: string[]
  dryRun: boolean
  wouldMerge: boolean
  wouldMergeReason: string
}): MergeAction {
  if (!input.wouldMerge) {
    return {
      attempted: false,
      mode: input.dryRun ? 'dry-run' : 'applied',
      reason: input.wouldMergeReason,
      status: 'skipped'
    }
  }

  if (
    input.desiredLabels.includes('generated:websites-json') ||
    input.desiredLabels.includes('needs:manual-review')
  ) {
    return {
      attempted: false,
      mode: input.dryRun ? 'dry-run' : 'applied',
      reason: 'Merge skipped because the PR is labeled for manual review.',
      status: 'skipped'
    }
  }

  if (input.authorization?.authorized) {
    return {
      attempted: !input.dryRun,
      mode: input.dryRun ? 'dry-run' : 'applied',
      reason: input.authorization.reason,
      status: 'planned'
    }
  }

  return {
    attempted: false,
    mode: input.dryRun ? 'dry-run' : 'applied',
    reason:
      input.authorization?.reason ??
      'Automatic merge is disabled until signed attestation verification is available.',
    status: 'skipped'
  }
}

/**
 * Derive the managed triage labels that should be present on a pull request.
 */
export function deriveManagedLabels(snapshot: {
  classification: PullRequestClassification
  guidelineStatus: GuidelineStatus
  policyEligible: boolean
  structurallyEligible: boolean
}): string[] {
  const labels = new Set<string>(snapshot.classification.labels)

  if (snapshot.classification.labels.includes('generated:websites-json')) {
    labels.add('generated:websites-json')
  }

  if (snapshot.structurallyEligible && snapshot.policyEligible) {
    labels.add('automerge:candidate')
    labels.delete('needs:manual-review')
  } else {
    labels.delete('automerge:candidate')
    labels.add('needs:manual-review')
  }

  return [...labels].sort()
}

/** Apply the authorization outcome to policy labels without trusting existing labels. */
export function deriveAuthorizationManagedLabels(input: {
  readonly authorization: MergeAuthorization
  readonly policyLabels: readonly string[]
}): string[] {
  const labels = new Set(input.policyLabels)
  if (input.authorization.authorized) {
    labels.add('automerge:candidate')
    labels.delete('needs:manual-review')
  } else {
    labels.delete('automerge:candidate')
    if (input.authorization.disposition === 'manual_review') {
      labels.add('needs:manual-review')
    } else {
      labels.delete('needs:manual-review')
    }
  }
  return [...labels].sort()
}

/**
 * Calculate the add/remove delta between current and desired managed labels.
 */
export function calculateManagedLabelSync(
  currentLabels: string[],
  desiredLabels: string[],
  options: { readonly allowManualReviewRemoval?: boolean } = {}
): LabelSyncPlan {
  const currentManaged = currentLabels.filter(label => isManagedLabel(label)).sort()
  const desiredSet = new Set(desiredLabels)
  if (currentLabels.includes('needs:manual-review') && !options.allowManualReviewRemoval) {
    desiredSet.add('needs:manual-review')
    desiredSet.delete('automerge:candidate')
  }
  const desired = [...desiredSet].sort()
  const added = desired.filter(label => !currentManaged.includes(label))
  const removed = currentManaged.filter(label => !desired.includes(label))

  return {
    added,
    desired,
    removed
  }
}

/**
 * Assess a submission with the shared fail-closed publication policy.
 */
export async function assessSubmissionGuidelines(input: {
  frontmatter: SubmissionFrontmatter
  inspectResource?: PublicationAssessmentDependencies['inspectResource']
  now?: () => Date
}): Promise<GuidelineAssessment> {
  return toGuidelineAssessment(await assessSubmission(input))
}

const assessSubmission = async (input: {
  frontmatter: SubmissionFrontmatter
  inspectResource?: PublicationAssessmentDependencies['inspectResource']
  now?: () => Date
}): Promise<SubmissionAssessment> => {
  const fields: SubmissionFields = {
    category: input.frontmatter.category,
    description: input.frontmatter.description,
    llmsUrl: input.frontmatter.llmsUrl,
    name: input.frontmatter.name,
    publishedAt: input.frontmatter.publishedAt ?? '',
    website: input.frontmatter.website
  }
  if (input.frontmatter.llmsFullUrl) {
    fields.llmsFullUrl = input.frontmatter.llmsFullUrl
  }
  const dependencies: PublicationAssessmentDependencies = {
    categories: editorialCategories,
    inspectResource: input.inspectResource ?? createReviewInspector().inspect
  }
  if (input.now) dependencies.now = input.now
  return assessPublicationFields(fields, dependencies)
}

const toGuidelineAssessment = (assessment: SubmissionAssessment): GuidelineAssessment => {
  const guidelineStatus: GuidelineStatus =
    assessment.decision === 'auto_publish'
      ? 'pass'
      : assessment.decision === 'reject'
        ? 'fail'
        : 'warn'

  return {
    guidelineReasons:
      assessment.decision === 'auto_publish'
        ? ['No guideline concerns detected.']
        : [assessment.publicMessage],
    guidelineStatus,
    policyEligible: assessment.decision === 'auto_publish'
  }
}

interface NormalizedDuplicateFields {
  readonly llmsUrl?: string
  readonly website?: string
}

interface DuplicateCandidate {
  readonly llmsUrl: string
  readonly website: string
}

/** Injectable local-base seams used to enforce complete bounded duplicate scans. */
export interface TrustedBaseInspectionDependencies {
  readonly listFiles: () => Promise<{ complete: boolean; paths: string[] }>
  readonly now: () => number
  readonly readFile: (path: string) => Promise<Uint8Array>
  readonly statFile: (path: string) => Promise<{ size: number }>
}

/** A normalized open pull request head used by duplicate inspection. */
export interface OpenPullRequestSnapshot {
  readonly headRepository: string
  readonly headSha: string
  readonly number: number
}

/** A normalized open pull request file used by duplicate inspection. */
export interface OpenPullRequestFileSnapshot {
  readonly path: string
  readonly status: string
}

/** Injectable GitHub seams used for bounded open-PR duplicate inspection. */
export interface OpenPullRequestInspectionDependencies {
  readonly getFileContent: (repo: string, path: string, sha: string) => Promise<string>
  readonly listOpenPullRequests: (page: number) => Promise<OpenPullRequestSnapshot[]>
  readonly listPullRequestFiles: (
    pullRequestNumber: number,
    page: number
  ) => Promise<OpenPullRequestFileSnapshot[]>
}

const normalizeDuplicateFields = (
  frontmatter: SubmissionFrontmatter
): DuplicateCandidate | null => {
  const website = validateSubmissionUrl(frontmatter.website)
  const llmsUrl = validateSubmissionUrl(frontmatter.llmsUrl)
  if (!website.ok || !llmsUrl.ok) return null
  return { llmsUrl: llmsUrl.normalizedUrl, website: website.normalizedUrl }
}

const parseDuplicateFields = (content: string): NormalizedDuplicateFields | null => {
  try {
    if (
      Buffer.byteLength(content, 'utf8') === 0 ||
      Buffer.byteLength(content, 'utf8') > MAX_MDX_BYTES
    ) {
      return null
    }
    const data = ensureRecord(matter(content).data)
    const website = normalizeExistingDuplicateUrl(readRequiredString(data, 'website'))
    const llmsUrl = normalizeExistingDuplicateUrl(readRequiredString(data, 'llmsUrl'))
    if (!website && !llmsUrl) return null
    return {
      ...(llmsUrl ? { llmsUrl } : {}),
      ...(website ? { website } : {})
    }
  } catch {
    return null
  }
}

const normalizeExistingDuplicateUrl = (value: string): string | null => {
  const direct = validateSubmissionUrl(value)
  if (direct.ok) return direct.normalizedUrl
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:') return null
    url.protocol = 'https:'
    const upgraded = validateSubmissionUrl(url.toString())
    return upgraded.ok ? upgraded.normalizedUrl : null
  } catch {
    return null
  }
}

const isDuplicate = (
  candidate: NormalizedDuplicateFields,
  existing: NormalizedDuplicateFields
): boolean =>
  Boolean(
    (candidate.website && existing.website && candidate.website === existing.website) ||
      (candidate.llmsUrl && existing.llmsUrl && candidate.llmsUrl === existing.llmsUrl)
  )

const defaultTrustedBaseDependencies: TrustedBaseInspectionDependencies = {
  listFiles: async () => ({
    complete: true,
    paths: await glob(`${WEBSITE_PATH_PREFIX}**/*.mdx`, { nodir: true })
  }),
  now: () => Date.now(),
  readFile: async path => readFile(path),
  statFile: async path => stat(path)
}

/** Inspect the proven trusted base with file, byte, completeness, and time bounds. */
export async function inspectTrustedBaseDuplicate(
  candidate: DuplicateCandidate,
  dependencies: TrustedBaseInspectionDependencies = defaultTrustedBaseDependencies
): Promise<DuplicateStatus> {
  try {
    const startedAt = dependencies.now()
    const withinDeadline = (): boolean => {
      const elapsed = dependencies.now() - startedAt
      return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= BASE_SCAN_DEADLINE_MS
    }
    const listing = await dependencies.listFiles()
    if (
      !withinDeadline() ||
      !listing.complete ||
      listing.paths.length === 0 ||
      listing.paths.length > MAX_BASE_MDX_FILES ||
      new Set(listing.paths).size !== listing.paths.length ||
      listing.paths.some(path => !path.startsWith(WEBSITE_PATH_PREFIX) || !path.endsWith('.mdx'))
    ) {
      return 'unavailable'
    }
    let aggregateBytes = 0
    const sizes = new Map<string, number>()
    for (const path of listing.paths) {
      if (!withinDeadline()) return 'unavailable'
      const metadata = await dependencies.statFile(path)
      if (
        !withinDeadline() ||
        !Number.isSafeInteger(metadata.size) ||
        metadata.size <= 0 ||
        metadata.size > MAX_MDX_BYTES
      ) {
        return 'unavailable'
      }
      aggregateBytes += metadata.size
      if (aggregateBytes > MAX_BASE_MDX_AGGREGATE_BYTES) return 'unavailable'
      sizes.set(path, metadata.size)
    }
    for (const path of listing.paths) {
      if (!withinDeadline()) return 'unavailable'
      const bytes = await dependencies.readFile(path)
      if (
        !withinDeadline() ||
        !(bytes instanceof Uint8Array) ||
        bytes.byteLength !== sizes.get(path)
      ) {
        return 'unavailable'
      }
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const normalized = parseDuplicateFields(content)
      if (!normalized) return 'unavailable'
      if (isDuplicate(candidate, normalized)) return 'duplicate'
    }
    return 'unique'
  } catch {
    return 'unavailable'
  }
}

const isOpenPullRequestWebsiteFile = (file: OpenPullRequestFileSnapshot): boolean =>
  (file.status === 'added' || file.status === 'modified' || file.status === 'renamed') &&
  file.path.startsWith(WEBSITE_PATH_PREFIX) &&
  file.path.endsWith('.mdx')

const collectBoundedPages = async <T>(
  loader: (page: number) => Promise<T[]>,
  maxItems: number
): Promise<T[] | null> => {
  const items: T[] = []
  for (let page = 1; ; page += 1) {
    const batch = await loader(page)
    if (
      !Array.isArray(batch) ||
      batch.length > PAGE_SIZE ||
      items.length + batch.length > maxItems
    ) {
      return null
    }
    items.push(...batch)
    if (batch.length < PAGE_SIZE) return items
  }
}

const defaultOpenPullRequestDependencies = (
  repo: string
): OpenPullRequestInspectionDependencies => ({
  getFileContent: fetchRepositoryFileContent,
  listOpenPullRequests: async page => {
    const values = await ghApiJson<GitHubPullRequestListItem[]>([
      `repos/${repo}/pulls?state=open&page=${page}&per_page=${PAGE_SIZE}`
    ])
    return values.map(value => ({
      headRepository: value.head?.repo?.full_name ?? '',
      headSha: value.head?.sha ?? '',
      number: value.number
    }))
  },
  listPullRequestFiles: async (pullRequestNumber, page) => {
    const values = await ghApiJson<GitHubPullRequestFile[]>([
      `repos/${repo}/pulls/${pullRequestNumber}/files?page=${page}&per_page=${PAGE_SIZE}`
    ])
    return values.map(value => ({ path: value.filename, status: value.status }))
  }
})

/** Inspect all bounded open PR heads, including forks, for duplicate entries. */
export async function inspectOpenPullRequestDuplicates(
  input: {
    candidate: DuplicateCandidate
    currentPrNumber: number
  },
  dependencies: OpenPullRequestInspectionDependencies
): Promise<DuplicateStatus> {
  try {
    const pullRequests = await collectBoundedPages(
      dependencies.listOpenPullRequests,
      MAX_OPEN_PULL_REQUESTS
    )
    if (!pullRequests) return 'unavailable'
    let fileCount = 0
    for (const pullRequest of pullRequests) {
      if (pullRequest.number === input.currentPrNumber) continue
      const headSha = pullRequest.headSha
      const headRepository = pullRequest.headRepository
      if (
        !headSha ||
        !/^[a-f0-9]{40}$/.test(headSha) ||
        !headRepository ||
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(headRepository)
      ) {
        return 'unavailable'
      }
      const files = await collectBoundedPages(
        page => dependencies.listPullRequestFiles(pullRequest.number, page),
        MAX_OPEN_PULL_REQUEST_FILES - fileCount
      )
      if (!files) return 'unavailable'
      fileCount += files.length
      for (const file of files) {
        if (!isOpenPullRequestWebsiteFile(file)) continue
        const content = await dependencies.getFileContent(headRepository, file.path, headSha)
        const normalized = parseDuplicateFields(content)
        if (!normalized) return 'unavailable'
        if (isDuplicate(input.candidate, normalized)) return 'duplicate'
      }
    }
    return 'unique'
  } catch {
    return 'unavailable'
  }
}

const inspectOpenPullRequestDuplicate = async (input: {
  candidate: DuplicateCandidate
  currentPrNumber: number
  repo: string
}): Promise<DuplicateStatus> =>
  inspectOpenPullRequestDuplicates(input, defaultOpenPullRequestDependencies(input.repo))

/**
 * CLI entrypoint for the local PR review dry-run.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args[0] === '--derive-event-context') {
    await printAutomergeEventContext(args[1], args[2] ?? process.env.GITHUB_EVENT_NAME)
    return
  }
  const options = parseArgs(args)

  await ensureGitHubAuth()

  if (!options.dryRun) {
    await ensureManagedLabelsExist(options.repo)
  }

  const openPullRequests = await fetchOpenPullRequests(options)
  const total = openPullRequests.length

  if (!options.json) {
    const modeLabel = options.dryRun ? 'dry-run' : 'apply-labels'
    process.stderr.write(
      `Scanning ${total} open PR${total === 1 ? '' : 's'} with concurrency ${options.concurrency} (${modeLabel})...\n`
    )
    printTableHeader()
  }

  const snapshots = await analyzePullRequests(openPullRequests, options, progress => {
    if (options.json) {
      return
    }

    process.stderr.write(
      `[${progress.completed}/${progress.total}] #${progress.snapshot.number} ${progress.snapshot.classification.lane} guidelines=${progress.snapshot.guidelineStatus} merge=${progress.snapshot.mergeAction.status} labels=${formatLabelSync(progress.snapshot.labelSync)}\n`
    )
    printSnapshotRow(progress.snapshot)
  })

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          pullRequests: snapshots,
          summary: summarizeSnapshots(snapshots)
        },
        null,
        2
      )}\n`
    )
    return
  }

  printSummary(summarizeSnapshots(snapshots))
}

/** Read a bounded event payload and print GitHub step outputs. */
async function printAutomergeEventContext(
  eventPath: string | undefined,
  eventName: string | undefined
): Promise<void> {
  if (!eventPath || !eventName) throw new Error('Missing GitHub event context.')
  const metadata = await stat(eventPath)
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > 1024 * 1024) {
    throw new Error('GitHub event payload is unavailable or too large.')
  }
  const payload: unknown = JSON.parse(await readFile(eventPath, 'utf8'))
  const context = deriveAutomergeEventContext(eventName, payload)
  const outputs =
    context.mode === 'single'
      ? { prNumber: String(context.prNumber), scanAll: 'false', shouldProcess: 'true' }
      : context.mode === 'scan_all'
        ? { prNumber: '', scanAll: 'true', shouldProcess: 'true' }
        : { prNumber: '', scanAll: 'false', shouldProcess: 'false' }
  process.stdout.write(
    `pr_number=${outputs.prNumber}\nscan_all=${outputs.scanAll}\nshould_process=${outputs.shouldProcess}\n`
  )
}

/**
 * Parse supported CLI flags for the local dry-run command.
 */
function parseArgs(args: string[]): DryRunOptions {
  const options: DryRunOptions = {
    concurrency: DEFAULT_CONCURRENCY,
    dryRun: false,
    json: false,
    repo: DEFAULT_REPO
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') {
      continue
    }

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--pr') {
      const value = args[index + 1]

      if (!value) {
        throw new Error('Missing value for --pr')
      }

      options.pullRequestNumber = parseIntegerFlag(value, '--pr')
      index += 1
      continue
    }

    if (arg === '--limit') {
      const value = args[index + 1]

      if (!value) {
        throw new Error('Missing value for --limit')
      }

      options.limit = parseIntegerFlag(value, '--limit')
      index += 1
      continue
    }

    if (arg === '--concurrency') {
      const value = args[index + 1]

      if (!value) {
        throw new Error('Missing value for --concurrency')
      }

      options.concurrency = parseIntegerFlag(value, '--concurrency')
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

/**
 * Ensure the local GitHub CLI session is available before running the scan.
 */
async function ensureGitHubAuth(): Promise<void> {
  try {
    await execGh(['auth', 'status'])
  } catch {
    throw new Error('GitHub CLI is not authenticated. Run gh auth login and try again.')
  }
}

/**
 * Ensure all locally managed triage labels exist in the repository.
 */
async function ensureManagedLabelsExist(repo: string): Promise<void> {
  const existingLabels = await paginateGhApi<{
    color: string
    description?: string | null
    name: string
  }>(`repos/${repo}/labels`)
  const existingByName = new Map(existingLabels.map(label => [label.name, label]))

  for (const definition of LABEL_DEFINITIONS) {
    const existing = existingByName.get(definition.name)

    if (!existing) {
      await execGh([
        'api',
        `repos/${repo}/labels`,
        '--method',
        'POST',
        '-f',
        `name=${definition.name}`,
        '-f',
        `color=${definition.color}`,
        '-f',
        `description=${definition.description}`
      ])
      continue
    }

    if (
      existing.color.toLowerCase() !== definition.color.toLowerCase() ||
      (existing.description ?? '') !== definition.description
    ) {
      await execGh([
        'api',
        `repos/${repo}/labels/${encodeURIComponent(definition.name)}`,
        '--method',
        'PATCH',
        '-f',
        `new_name=${definition.name}`,
        '-f',
        `color=${definition.color}`,
        '-f',
        `description=${definition.description}`
      ])
    }
  }
}

/**
 * Analyze a single pull request from GitHub and combine structural and guideline decisions.
 */
async function analyzePullRequest(
  repo: string,
  pullRequestNumber: number,
  options: DryRunOptions
): Promise<PullRequestReviewSnapshot> {
  try {
    const details = await fetchPullRequestDetails(repo, pullRequestNumber)
    const files = await paginateGhApi<GitHubPullRequestFile>(
      `repos/${repo}/pulls/${pullRequestNumber}/files`
    )
    const commits = await paginateGhApi<GitHubPullRequestCommit>(
      `repos/${repo}/pulls/${pullRequestNumber}/commits`
    )
    const classifierContext = buildClassifierContext({
      commits,
      details,
      files
    })
    const classification = classifyPullRequest(classifierContext)
    const reviewStatus = await fetchReviewStatus(repo, details.head.sha)
    const structuralDecision = deriveStructuralDecision({
      classification,
      isDraft: details.draft,
      mergeable: details.mergeable,
      state: details.state
    })
    const moderation = await moderatePullRequest({
      classification,
      files,
      repo,
      sha: details.head.sha
    })
    const moderatedFile = moderation.files.length === 1 ? moderation.files[0] : undefined
    const trustedBaseSha = process.env.TRUSTED_BASE_SHA ?? ''
    const baseSnapshotStatus = await fetchTrustedBaseStatus(repo, details, trustedBaseSha)
    const attestation = moderatedFile
      ? verifyMergeAttestation({
          addedMdxBytes: moderatedFile.bytes,
          addedMdxPath: moderatedFile.path,
          body: typeof details.body === 'string' ? details.body : '',
          currentHeadSha: details.head.sha,
          prNumber: details.number,
          repository: repo,
          secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
        })
      : invalidAttestation()
    const duplicateFields = moderatedFile
      ? normalizeDuplicateFields(moderatedFile.frontmatter)
      : null
    const [baseDuplicateStatus, openPullRequestDuplicateStatus] = duplicateFields
      ? await Promise.all([
          baseSnapshotStatus === 'current'
            ? inspectTrustedBaseDuplicate(duplicateFields)
            : Promise.resolve<DuplicateStatus>('unavailable'),
          inspectOpenPullRequestDuplicate({
            candidate: duplicateFields,
            currentPrNumber: details.number,
            repo
          })
        ])
      : (['unavailable', 'unavailable'] satisfies [DuplicateStatus, DuplicateStatus])
    const authorization = deriveMergeAuthorization({
      attestation,
      baseDuplicateStatus,
      baseSnapshotStatus,
      freshAssessment: moderatedFile?.assessment ?? unavailableAssessment(),
      openPullRequestDuplicateStatus,
      requiredCheckStatus: reviewStatus
    })
    const decision = deriveWouldMergeDecision({
      guidelineReasons: moderation.guidelineReasons,
      guidelineStatus: moderation.guidelineStatus,
      structuralDecision
    })
    const policyLabels = deriveManagedLabels({
      classification,
      guidelineStatus: moderation.guidelineStatus,
      policyEligible: decision.policyEligible,
      structurallyEligible: structuralDecision.structurallyEligible
    })
    const desiredLabels = deriveAuthorizationManagedLabels({ authorization, policyLabels })
    const labelSync = await syncManagedLabels({
      allowManualReviewRemoval: authorization.authorized,
      desiredLabels,
      dryRun: options.dryRun,
      prNumber: details.number,
      repo
    })
    const mergePlan = deriveMergeAction({
      authorization,
      desiredLabels: labelSync.desired,
      dryRun: options.dryRun,
      wouldMerge: decision.wouldMerge,
      wouldMergeReason: decision.reason
    })
    const mergeAction = await executeMergeAction({
      authorization,
      headSha: details.head.sha,
      mergePlan,
      prNumber: details.number,
      revalidation:
        moderatedFile && duplicateFields
          ? {
              baseDuplicateStatus,
              duplicateFields,
              file: moderatedFile,
              freshAssessment: moderatedFile.assessment,
              trustedBaseSha
            }
          : undefined,
      repo
    })

    return {
      classification,
      guidelineReasons: moderation.guidelineReasons,
      guidelineStatus: moderation.guidelineStatus,
      labelSync,
      mergeAction,
      number: details.number,
      policyEligible: decision.policyEligible,
      reviewStatus,
      structurallyEligible: structuralDecision.structurallyEligible,
      title: details.title,
      wouldMerge: decision.wouldMerge,
      wouldMergeReason: decision.reason
    }
  } catch {
    const message = 'Trusted merge authorization is unavailable.'
    if (!options.dryRun) {
      await syncAuthorizationFailureLabels(repo, pullRequestNumber).catch(() => undefined)
    }

    return {
      classification: {
        automergeEligible: false,
        labels: ['lane:blocked', 'risk:high', 'status:blocked'],
        lane: 'blocked',
        manualWebsitesJsonChange: false,
        reason: `Failed to analyze PR: ${message}`,
        risk: 'high',
        stats: {
          fileCount: 0,
          totalChanges: 0,
          touchesWebsitesJson: false
        },
        summary: 'Failed to analyze PR.'
      },
      guidelineReasons: [`Failed to analyze PR: ${message}`],
      guidelineStatus: 'warn',
      labelSync: {
        added: [],
        desired: [],
        mode: options.dryRun ? 'dry-run' : 'applied',
        removed: []
      },
      mergeAction: {
        attempted: false,
        mode: options.dryRun ? 'dry-run' : 'applied',
        reason: `Analysis failed: ${message}`,
        status: 'failed'
      },
      number: pullRequestNumber,
      policyEligible: false,
      reviewStatus: 'unknown',
      structurallyEligible: false,
      title: 'Unavailable',
      wouldMerge: false,
      wouldMergeReason: `Analysis failed: ${message}`
    }
  }
}

/**
 * Analyze multiple pull requests with bounded concurrency and progress callbacks.
 */
async function analyzePullRequests(
  pullRequests: GitHubPullRequestListItem[],
  options: DryRunOptions,
  onProgress: (progress: {
    completed: number
    snapshot: PullRequestReviewSnapshot
    total: number
  }) => void
): Promise<PullRequestReviewSnapshot[]> {
  const snapshots: PullRequestReviewSnapshot[] = []
  const queue = [...pullRequests]
  let completed = 0
  const workerCount = Math.min(options.concurrency, Math.max(queue.length, 1))

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const pullRequest = queue.shift()

      if (!pullRequest) {
        return
      }

      const snapshot = await analyzePullRequest(options.repo, pullRequest.number, options)
      snapshots.push(snapshot)
      completed += 1
      onProgress({
        completed,
        snapshot,
        total: pullRequests.length
      })
    }
  })

  await Promise.all(workers)

  return snapshots.sort((left, right) => right.number - left.number)
}

/**
 * Sync the managed label set for a pull request, optionally in read-only mode.
 */
async function syncManagedLabels(input: {
  allowManualReviewRemoval?: boolean
  desiredLabels: string[]
  dryRun: boolean
  prNumber: number
  repo: string
}): Promise<LabelSyncResult> {
  const currentLabels = await paginateGhApi<{ name: string }>(
    `repos/${input.repo}/issues/${input.prNumber}/labels`
  )
  const plan = calculateManagedLabelSync(
    currentLabels.map(label => label.name),
    input.desiredLabels,
    { allowManualReviewRemoval: input.allowManualReviewRemoval }
  )

  if (input.dryRun) {
    return {
      ...plan,
      mode: 'dry-run'
    }
  }

  for (const label of plan.removed) {
    await execGh([
      'api',
      `repos/${input.repo}/issues/${input.prNumber}/labels/${encodeURIComponent(label)}`,
      '--method',
      'DELETE'
    ])
  }

  if (plan.added.length > 0) {
    const args = ['api', `repos/${input.repo}/issues/${input.prNumber}/labels`, '--method', 'POST']

    for (const label of plan.added) {
      args.push('-f', `labels[]=${label}`)
    }

    await execGh(args)
  }

  return {
    ...plan,
    mode: 'applied'
  }
}

/**
 * Apply only the fail-closed authorization labels while preserving all other labels.
 */
async function syncAuthorizationFailureLabels(
  repo: string,
  prNumber: number,
  disposition: AuthorizationDisposition = 'manual_review'
): Promise<void> {
  const labels = await paginateGhApi<{ name: string }>(`repos/${repo}/issues/${prNumber}/labels`)
  const names = labels.map(label => label.name)
  if (names.includes('automerge:candidate')) {
    await execGh([
      'api',
      `repos/${repo}/issues/${prNumber}/labels/automerge%3Acandidate`,
      '--method',
      'DELETE'
    ])
  }
  if (disposition === 'manual_review' && !names.includes('needs:manual-review')) {
    await execGh([
      'api',
      `repos/${repo}/issues/${prNumber}/labels`,
      '--method',
      'POST',
      '-f',
      'labels[]=needs:manual-review'
    ])
  }
}

/**
 * Execute the planned merge action against GitHub.
 */
async function executeMergeAction(input: {
  authorization: MergeAuthorization
  headSha: string
  mergePlan: MergeAction
  prNumber: number
  revalidation?: MergeRevalidationContext
  repo: string
}): Promise<MergeAction> {
  if (!input.mergePlan.attempted || input.mergePlan.mode === 'dry-run') {
    return input.mergePlan
  }

  try {
    if (!input.revalidation) throw new Error('Missing trusted revalidation context.')
    const latest = await fetchPullRequestDetails(input.repo, input.prNumber)
    const [baseSnapshotStatus, openPullRequestDuplicateStatus, reviewStatus] = await Promise.all([
      fetchTrustedBaseStatus(input.repo, latest, input.revalidation.trustedBaseSha),
      inspectOpenPullRequestDuplicate({
        candidate: input.revalidation.duplicateFields,
        currentPrNumber: input.prNumber,
        repo: input.repo
      }),
      fetchReviewStatus(input.repo, latest.head.sha)
    ])
    const latestAttestation = verifyMergeAttestation({
      addedMdxBytes: input.revalidation.file.bytes,
      addedMdxPath: input.revalidation.file.path,
      body: typeof latest.body === 'string' ? latest.body : '',
      currentHeadSha: latest.head.sha,
      prNumber: latest.number,
      repository: input.repo,
      secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
    })
    const latestAuthorization = deriveMergeAuthorization({
      attestation: latestAttestation,
      baseDuplicateStatus: input.revalidation.baseDuplicateStatus,
      baseSnapshotStatus,
      freshAssessment: input.revalidation.freshAssessment,
      openPullRequestDuplicateStatus,
      requiredCheckStatus: reviewStatus
    })
    const exactHeadDecision = deriveExactHeadMergeDecision({
      authorization: latestAuthorization,
      baseSnapshotStatus,
      currentHeadSha: latest.head.sha,
      expectedHeadSha: input.headSha,
      requiredCheckStatus: reviewStatus
    })
    if (
      !input.authorization.authorized ||
      !exactHeadDecision.authorized ||
      latest.state !== 'open' ||
      latest.draft ||
      latest.mergeable !== true
    ) {
      await syncAuthorizationFailureLabels(
        input.repo,
        input.prNumber,
        exactHeadDecision.authorized ? 'manual_review' : exactHeadDecision.disposition
      )
      return {
        attempted: false,
        mode: 'applied',
        reason: exactHeadDecision.authorized
          ? 'Pull request state changed before merge.'
          : exactHeadDecision.reason,
        status: 'skipped'
      }
    }
    await execGh([
      'api',
      `repos/${input.repo}/pulls/${input.prNumber}/merge`,
      '--method',
      'PUT',
      '-f',
      `sha=${input.headSha}`,
      '-f',
      'merge_method=squash'
    ])

    return {
      attempted: true,
      mode: 'applied',
      reason: 'Merged successfully.',
      status: 'merged'
    }
  } catch {
    await syncAuthorizationFailureLabels(input.repo, input.prNumber).catch(() => undefined)

    return {
      attempted: true,
      mode: 'applied',
      reason: 'Trusted merge failed closed.',
      status: 'failed'
    }
  }
}

/**
 * Fetch the set of open pull requests or a single requested PR.
 */
async function fetchOpenPullRequests(options: DryRunOptions): Promise<GitHubPullRequestListItem[]> {
  if (options.pullRequestNumber) {
    return [{ number: options.pullRequestNumber }]
  }

  const pullRequests: GitHubPullRequestListItem[] = []
  let page = 1

  while (true) {
    const batch = await ghApiJson<GitHubPullRequestListItem[]>([
      `repos/${options.repo}/pulls?state=open&page=${page}&per_page=${PAGE_SIZE}`
    ])

    if (batch.length === 0) {
      break
    }

    pullRequests.push(...batch)

    if ((options.limit && pullRequests.length >= options.limit) || batch.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return options.limit ? pullRequests.slice(0, options.limit) : pullRequests
}

/**
 * Fetch pull request details and retry until GitHub computes mergeability.
 */
async function fetchPullRequestDetails(
  repo: string,
  pullRequestNumber: number
): Promise<GitHubPullRequestDetails> {
  let details = await ghApiJson<GitHubPullRequestDetails>([
    `repos/${repo}/pulls/${pullRequestNumber}`
  ])

  for (let attempt = 0; attempt < 3 && details.mergeable === null; attempt += 1) {
    await sleep(1000)
    details = await ghApiJson<GitHubPullRequestDetails>([
      `repos/${repo}/pulls/${pullRequestNumber}`
    ])
  }

  return details
}

/** Fetch and compare the live base branch to the trusted checkout and PR base snapshot. */
async function fetchTrustedBaseStatus(
  repo: string,
  details: GitHubPullRequestDetails,
  checkedOutSha: string
): Promise<TrustedBaseStatus> {
  const baseRef = details.base?.ref
  const pullRequestBaseSha = details.base?.sha
  const baseRepository = details.base?.repo?.full_name
  if (
    typeof baseRef !== 'string' ||
    baseRef.length === 0 ||
    baseRef.length > 255 ||
    typeof pullRequestBaseSha !== 'string' ||
    baseRepository !== repo
  ) {
    return 'unavailable'
  }
  try {
    const branch = await ghApiJson<{ commit?: { sha?: string } }>([
      `repos/${repo}/branches/${encodeURIComponent(baseRef)}`
    ])
    return deriveTrustedBaseStatus({
      checkedOutSha,
      currentBaseSha: branch.commit?.sha ?? '',
      pullRequestBaseSha
    })
  } catch {
    return 'unavailable'
  }
}

/**
 * Fetch the latest PR Review workflow conclusion for a head SHA.
 */
async function fetchReviewStatus(repo: string, headSha: string): Promise<ReviewConclusion> {
  const workflowRuns = await ghApiJson<GitHubWorkflowRunsResponse>([
    `repos/${repo}/actions/runs?head_sha=${headSha}&event=pull_request&per_page=100`
  ])

  const latestReviewRun = workflowRuns.workflow_runs
    .filter(run => run.name === PR_REVIEW_WORKFLOW_NAME)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0]

  if (!latestReviewRun) {
    return 'missing'
  }

  if (latestReviewRun.status !== 'completed') {
    return 'in_progress'
  }

  return normalizeConclusion(latestReviewRun.conclusion)
}

/**
 * Normalize workflow run conclusions into the local review-status enum.
 */
function normalizeConclusion(conclusion: string | null): ReviewConclusion {
  switch (conclusion) {
    case 'success':
    case 'failure':
    case 'cancelled':
    case 'timed_out':
    case 'action_required':
    case 'neutral':
    case 'skipped':
      return conclusion
    case null:
      return 'in_progress'
    default:
      return 'unknown'
  }
}

/**
 * Run guideline moderation for each added MDX file in a structurally safe PR.
 */
async function moderatePullRequest(input: {
  classification: PullRequestClassification
  files: GitHubPullRequestFile[]
  repo: string
  sha: string
}): Promise<ModerationResult> {
  if (input.classification.lane !== 'mdx-fast') {
    return {
      files: [],
      guidelineReasons: ['Guideline checks skipped because the PR is not structurally eligible.'],
      guidelineStatus: 'skipped',
      policyEligible: false
    }
  }

  const mdxFiles = input.files.filter(file => {
    return file.status === 'added' && file.filename.endsWith('.mdx')
  })

  if (mdxFiles.length === 0) {
    return {
      files: [],
      guidelineReasons: ['No added MDX files were available for guideline review.'],
      guidelineStatus: 'warn',
      policyEligible: false
    }
  }

  let mergedStatus: GuidelineStatus = 'pass'
  const mergedReasons = new Set<string>()
  const moderatedFiles: ModeratedSubmissionFile[] = []

  for (const file of mdxFiles) {
    const bytes = await fetchRepositoryFileBytes(input.repo, file.filename, input.sha)
    const fileContent = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const frontmatter = parseSubmissionFrontmatter(fileContent)
    const fullAssessment = await assessSubmission({ frontmatter })
    const assessment = toGuidelineAssessment(fullAssessment)
    moderatedFiles.push({ assessment: fullAssessment, bytes, frontmatter, path: file.filename })

    mergedStatus = mergeGuidelineStatus(mergedStatus, assessment.guidelineStatus)
    for (const reason of assessment.guidelineReasons) {
      mergedReasons.add(reason)
    }
  }

  return {
    files: moderatedFiles,
    guidelineReasons:
      mergedReasons.size > 0 ? [...mergedReasons] : ['No guideline concerns detected.'],
    guidelineStatus: mergedStatus,
    policyEligible: mergedStatus === 'pass'
  }
}

/**
 * Fetch repository file contents for a PR head SHA through the GitHub contents API.
 */
async function fetchRepositoryFileContent(
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const bytes = await fetchRepositoryFileBytes(repo, path, ref)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

/**
 * Fetch exact bounded repository file bytes for a PR head SHA.
 */
async function fetchRepositoryFileBytes(
  repo: string,
  path: string,
  ref: string
): Promise<Uint8Array> {
  const response = await ghApiJson<GitHubContentResponse>([
    `repos/${repo}/contents/${encodePathForGitHub(path)}?ref=${encodeURIComponent(ref)}`
  ])

  if (
    response.encoding !== 'base64' ||
    typeof response.content !== 'string' ||
    response.content.length > 150_000
  ) {
    throw new Error('Unsupported GitHub content response.')
  }
  const encoded = response.content.replace(/\s/g, '')
  if (
    encoded.length > Math.ceil((MAX_MDX_BYTES * 4) / 3) + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  ) {
    throw new Error('Malformed GitHub content response.')
  }
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_MDX_BYTES) {
    throw new Error('GitHub content response is empty or too large.')
  }
  return bytes
}

/**
 * Paginate any GitHub REST array endpoint through the gh CLI.
 */
async function paginateGhApi<T>(endpoint: string): Promise<T[]> {
  const items: T[] = []
  let page = 1

  while (true) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const batch = await ghApiJson<T[]>([
      `${endpoint}${separator}page=${page}&per_page=${PAGE_SIZE}`
    ])

    items.push(...batch)

    if (batch.length < PAGE_SIZE) {
      return items
    }

    page += 1
  }
}

/**
 * Execute a GitHub API request and parse its JSON response.
 */
async function ghApiJson<T>(args: string[]): Promise<T> {
  const { stdout } = await execGh(['api', ...args])
  const parsed: T = JSON.parse(stdout)
  return parsed
}

/**
 * Run the gh CLI with a large output buffer and normalized errors.
 */
async function execGh(args: string[]): Promise<{ stdout: string }> {
  try {
    const result = await execFileAsync('gh', args, {
      maxBuffer: 10 * 1024 * 1024
    })

    return {
      stdout: result.stdout
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('GitHub CLI is not installed. Install gh and try again.')
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message)
  }
}

/**
 * Summarize the dry-run results for the footer and JSON output.
 */
function summarizeSnapshots(snapshots: PullRequestReviewSnapshot[]): DryRunSummary {
  return {
    labelsApplied: snapshots.filter(
      snapshot =>
        snapshot.labelSync.mode === 'applied' &&
        (snapshot.labelSync.added.length > 0 || snapshot.labelSync.removed.length > 0)
    ).length,
    labelsPlanned: snapshots.filter(
      snapshot => snapshot.labelSync.added.length > 0 || snapshot.labelSync.removed.length > 0
    ).length,
    blockedManualWebsitesJsonChanges: snapshots.filter(
      snapshot => snapshot.classification.manualWebsitesJsonChange
    ).length,
    guidelineConcerns: snapshots.filter(
      snapshot => snapshot.guidelineStatus === 'warn' || snapshot.guidelineStatus === 'fail'
    ).length,
    mergeFailures: snapshots.filter(snapshot => snapshot.mergeAction.status === 'failed').length,
    mergesCompleted: snapshots.filter(snapshot => snapshot.mergeAction.status === 'merged').length,
    mergesPlanned: snapshots.filter(snapshot => snapshot.mergeAction.status === 'planned').length,
    mdxFast: snapshots.filter(snapshot => snapshot.classification.lane === 'mdx-fast').length,
    policyEligible: snapshots.filter(snapshot => snapshot.policyEligible).length,
    scanned: snapshots.length,
    waitingOnReview: snapshots.filter(
      snapshot => snapshot.classification.automergeEligible && snapshot.reviewStatus !== 'success'
    ).length,
    wouldMerge: snapshots.filter(snapshot => snapshot.wouldMerge).length
  }
}

/**
 * Print the streaming table header for non-JSON output.
 */
function printTableHeader(): void {
  const columns: Array<keyof typeof COLUMN_WIDTHS> = [
    'pr',
    'lane',
    'risk',
    'review',
    'guidelines',
    'policy',
    'merge',
    'labels',
    'title',
    'reason'
  ]
  const headers: Record<(typeof columns)[number], string> = {
    guidelines: 'Guideline',
    lane: 'Lane',
    labels: 'Labels',
    merge: 'Merge',
    policy: 'Policy',
    pr: 'PR',
    reason: 'Reason',
    review: 'PR Review',
    risk: 'Risk',
    title: 'Title'
  }
  const headerLine = columns.map(column => headers[column].padEnd(COLUMN_WIDTHS[column])).join('  ')
  const divider = columns.map(column => '-'.repeat(COLUMN_WIDTHS[column])).join('  ')
  process.stdout.write(`${headerLine}\n${divider}\n`)
}

/**
 * Print one completed PR snapshot as a single table row.
 */
function printSnapshotRow(snapshot: PullRequestReviewSnapshot): void {
  const row = {
    guidelines: snapshot.guidelineStatus,
    lane: snapshot.classification.lane,
    labels: truncate(formatLabelSync(snapshot.labelSync), COLUMN_WIDTHS.labels),
    merge: snapshot.mergeAction.status,
    policy: snapshot.policyEligible ? 'yes' : 'no',
    pr: `#${snapshot.number}`,
    reason: truncate(snapshot.mergeAction.reason, COLUMN_WIDTHS.reason),
    review: snapshot.reviewStatus,
    risk: snapshot.classification.risk,
    title: truncate(snapshot.title, COLUMN_WIDTHS.title)
  }

  const line = [
    row.pr.padEnd(COLUMN_WIDTHS.pr),
    row.lane.padEnd(COLUMN_WIDTHS.lane),
    row.risk.padEnd(COLUMN_WIDTHS.risk),
    row.review.padEnd(COLUMN_WIDTHS.review),
    row.guidelines.padEnd(COLUMN_WIDTHS.guidelines),
    row.policy.padEnd(COLUMN_WIDTHS.policy),
    row.merge.padEnd(COLUMN_WIDTHS.merge),
    row.labels.padEnd(COLUMN_WIDTHS.labels),
    row.title.padEnd(COLUMN_WIDTHS.title),
    row.reason.padEnd(COLUMN_WIDTHS.reason)
  ].join('  ')

  process.stdout.write(`${line}\n`)
}

/**
 * Print the aggregate dry-run summary footer.
 */
function printSummary(summary: DryRunSummary): void {
  const lines = [
    '',
    'Summary',
    `- Scanned: ${summary.scanned}`,
    `- PRs with label changes: ${summary.labelsPlanned}`,
    `- PRs labeled now: ${summary.labelsApplied}`,
    `- PRs planned for merge: ${summary.mergesPlanned}`,
    `- PRs merged now: ${summary.mergesCompleted}`,
    `- Merge failures: ${summary.mergeFailures}`,
    `- MDX fast lane: ${summary.mdxFast}`,
    `- Policy eligible: ${summary.policyEligible}`,
    `- Would merge now: ${summary.wouldMerge}`,
    `- Guideline warnings/failures: ${summary.guidelineConcerns}`,
    `- Manual websites.json changes: ${summary.blockedManualWebsitesJsonChanges}`,
    `- Waiting on PR Review: ${summary.waitingOnReview}`
  ]

  process.stdout.write(`${lines.join('\n')}\n`)
}

/**
 * Read an optional string frontmatter field.
 */
function readOptionalString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]

  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid optional frontmatter field "${key}". Expected a string.`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Read a required string frontmatter field or throw.
 */
function readRequiredString(data: Record<string, unknown>, key: string): string {
  const value = readOptionalString(data, key)

  if (!value) {
    throw new Error(`Missing required frontmatter field "${key}".`)
  }

  return value
}

/**
 * Return the highest-severity guideline status between two states.
 */
function mergeGuidelineStatus(current: GuidelineStatus, next: GuidelineStatus): GuidelineStatus {
  const priority: Record<GuidelineStatus, number> = {
    fail: 3,
    pass: 0,
    skipped: -1,
    warn: 2
  }

  return priority[next] > priority[current] ? next : current
}

/**
 * Return true when a label is managed by the local triage command.
 */
function isManagedLabel(label: string): boolean {
  return (
    managedLabelSet.has(label) || MANAGED_LABEL_PREFIXES.some(prefix => label.startsWith(prefix))
  )
}

/**
 * Format a label sync result for streaming terminal output.
 */
function formatLabelSync(result: LabelSyncResult): string {
  const added = result.added.length > 0 ? `+${result.added.join(',')}` : ''
  const removed = result.removed.length > 0 ? `-${result.removed.join(',')}` : ''
  const combined = [added, removed].filter(Boolean).join(' ')

  if (combined.length === 0) {
    return result.mode === 'dry-run' ? 'no-change' : 'unchanged'
  }

  return result.mode === 'dry-run' ? `plan ${combined}` : `applied ${combined}`
}

/**
 * Encode a repository path for the GitHub contents API.
 */
function encodePathForGitHub(path: string): string {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

/**
 * Parse a positive integer CLI flag.
 */
function parseIntegerFlag(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} expects a positive integer.`)
  }

  return parsed
}

/**
 * Truncate long output fields for the streaming table.
 */
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}

/**
 * Ensure an unknown value is an object record.
 */
function ensureRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value))
  }

  throw new Error('Frontmatter payload is not an object.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
