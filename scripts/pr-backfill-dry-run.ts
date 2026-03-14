import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
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
const FETCH_TIMEOUT_MS = 8_000
const MAX_FETCH_TEXT_LENGTH = 20_000
const PAGE_SIZE = 100
const PR_REVIEW_WORKFLOW_NAME = 'PR Review'
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

const SUSPICIOUS_FAIL_TERMS = ['casino', 'gambling', 'malware', 'porn', 'viagra']

const categoryBySlug = new Map(categories.map(category => [category.slug, category]))
const managedLabelSet = new Set<string>(EXACT_MANAGED_LABELS)

const LABEL_DEFINITIONS = [
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
  }
] as const

type GuidelineStatus = 'pass' | 'warn' | 'fail' | 'skipped'
type ReviewConclusion =
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
  draft: boolean
  head: {
    ref: string
    sha: string
    user?: {
      login?: string
    }
  }
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

interface UrlInspection {
  contentType: string | null
  error?: string
  ok: boolean
  status?: number
  text: string
  url: string
}

interface GuidelineAssessment {
  guidelineReasons: string[]
  guidelineStatus: GuidelineStatus
  policyEligible: boolean
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
  const parsed = matter(content)
  const data = ensureRecord(parsed.data)
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

  return {
    attempted: true,
    mode: input.dryRun ? 'dry-run' : 'applied',
    reason: input.dryRun ? 'Would merge now.' : 'Merge queued.',
    status: input.dryRun ? 'planned' : 'skipped'
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
  const labels = new Set<string>()

  if (snapshot.classification.labels.includes('generated:websites-json')) {
    labels.add('generated:websites-json')
  }

  if (snapshot.structurallyEligible && snapshot.policyEligible) {
    labels.add('automerge:candidate')
  } else {
    labels.add('needs:manual-review')
  }

  return [...labels].sort()
}

/**
 * Calculate the add/remove delta between current and desired managed labels.
 */
export function calculateManagedLabelSync(
  currentLabels: string[],
  desiredLabels: string[]
): LabelSyncPlan {
  const currentManaged = currentLabels.filter(label => isManagedLabel(label)).sort()
  const desired = [...new Set(desiredLabels)].sort()
  const added = desired.filter(label => !currentManaged.includes(label))
  const removed = currentManaged.filter(label => !desired.includes(label))

  return {
    added,
    desired,
    removed
  }
}

/**
 * Assess a submission against moderation and guideline heuristics.
 */
export function assessSubmissionGuidelines(input: {
  frontmatter: SubmissionFrontmatter
  homepageInspection: UrlInspection
  llmsFullInspection?: UrlInspection | null
  llmsInspection: UrlInspection
}): GuidelineAssessment {
  const reasons: string[] = []
  let guidelineStatus: GuidelineStatus = 'pass'

  if (!categoryBySlug.has(input.frontmatter.category)) {
    addGuidelineReason(reasons, 'Invalid category slug in frontmatter.', 'fail')
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'fail')
  }

  if (!sameWebsiteFamily(input.frontmatter.website, input.frontmatter.llmsUrl)) {
    addGuidelineReason(
      reasons,
      'Website URL and llms.txt URL do not appear to belong to the same site.',
      'warn'
    )
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'warn')
  }

  if (!input.homepageInspection.ok) {
    addGuidelineReason(
      reasons,
      `Website homepage could not be inspected (${input.homepageInspection.error ?? `HTTP ${input.homepageInspection.status ?? 'unknown'}`}).`,
      'warn'
    )
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'warn')
  }

  if (!input.llmsInspection.ok) {
    addGuidelineReason(
      reasons,
      `llms.txt is not accessible (${input.llmsInspection.error ?? `HTTP ${input.llmsInspection.status ?? 'unknown'}`}).`,
      'fail'
    )
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'fail')
  } else {
    if (looksLikeHtmlResponse(input.llmsInspection)) {
      addGuidelineReason(
        reasons,
        'llms.txt URL appears to return HTML instead of plain text.',
        'fail'
      )
      guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'fail')
    }

    if (input.llmsInspection.text.trim().length < 80) {
      addGuidelineReason(reasons, 'llms.txt content is unusually short.', 'warn')
      guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'warn')
    }
  }

  if (input.frontmatter.llmsFullUrl && input.llmsFullInspection && !input.llmsFullInspection.ok) {
    addGuidelineReason(
      reasons,
      `llms-full.txt could not be inspected (${input.llmsFullInspection.error ?? `HTTP ${input.llmsFullInspection.status ?? 'unknown'}`}).`,
      'warn'
    )
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'warn')
  }

  const combinedText = normalizeText(
    [
      input.frontmatter.name,
      input.frontmatter.description,
      input.homepageInspection.text,
      input.llmsInspection.text,
      input.llmsFullInspection?.text ?? ''
    ].join(' ')
  )

  const failTerm = findMatchedTerm(combinedText, SUSPICIOUS_FAIL_TERMS)
  if (failTerm) {
    addGuidelineReason(
      reasons,
      `Content contains suspicious term "${failTerm}" and requires manual review.`,
      'fail'
    )
    guidelineStatus = mergeGuidelineStatus(guidelineStatus, 'fail')
  }

  return {
    guidelineReasons: reasons.length > 0 ? reasons : ['No guideline concerns detected.'],
    guidelineStatus,
    policyEligible: guidelineStatus === 'pass'
  }
}

/**
 * CLI entrypoint for the local PR review dry-run.
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

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
    const decision = deriveWouldMergeDecision({
      guidelineReasons: moderation.guidelineReasons,
      guidelineStatus: moderation.guidelineStatus,
      structuralDecision
    })
    const desiredLabels = deriveManagedLabels({
      classification,
      guidelineStatus: moderation.guidelineStatus,
      policyEligible: decision.policyEligible,
      structurallyEligible: structuralDecision.structurallyEligible
    })
    const labelSync = await syncManagedLabels({
      desiredLabels,
      dryRun: options.dryRun,
      prNumber: details.number,
      repo
    })
    const mergePlan = deriveMergeAction({
      desiredLabels,
      dryRun: options.dryRun,
      wouldMerge: decision.wouldMerge,
      wouldMergeReason: decision.reason
    })
    const mergeAction = await executeMergeAction({
      mergePlan,
      prNumber: details.number,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

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
    input.desiredLabels
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
 * Execute the planned merge action against GitHub.
 */
async function executeMergeAction(input: {
  mergePlan: MergeAction
  prNumber: number
  repo: string
}): Promise<MergeAction> {
  if (!input.mergePlan.attempted || input.mergePlan.mode === 'dry-run') {
    return input.mergePlan
  }

  try {
    await execGh([
      'api',
      `repos/${input.repo}/pulls/${input.prNumber}/merge`,
      '--method',
      'PUT',
      '-f',
      'merge_method=squash'
    ])

    return {
      attempted: true,
      mode: 'applied',
      reason: 'Merged successfully.',
      status: 'merged'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      attempted: true,
      mode: 'applied',
      reason: `Merge failed: ${message}`,
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
}): Promise<GuidelineAssessment> {
  if (input.classification.lane !== 'mdx-fast') {
    return {
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
      guidelineReasons: ['No added MDX files were available for guideline review.'],
      guidelineStatus: 'warn',
      policyEligible: false
    }
  }

  let mergedStatus: GuidelineStatus = 'pass'
  const mergedReasons = new Set<string>()

  for (const file of mdxFiles) {
    const fileContent = await fetchRepositoryFileContent(input.repo, file.filename, input.sha)
    const frontmatter = parseSubmissionFrontmatter(fileContent)
    const [homepageInspection, llmsInspection, llmsFullInspection] = await Promise.all([
      inspectUrl(frontmatter.website, 'html'),
      inspectUrl(frontmatter.llmsUrl, 'text'),
      frontmatter.llmsFullUrl ? inspectUrl(frontmatter.llmsFullUrl, 'text') : Promise.resolve(null)
    ])
    const assessment = assessSubmissionGuidelines({
      frontmatter,
      homepageInspection,
      llmsFullInspection,
      llmsInspection
    })

    mergedStatus = mergeGuidelineStatus(mergedStatus, assessment.guidelineStatus)
    for (const reason of assessment.guidelineReasons) {
      mergedReasons.add(reason)
    }
  }

  return {
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
  const response = await ghApiJson<GitHubContentResponse>([
    `repos/${repo}/contents/${encodePathForGitHub(path)}?ref=${encodeURIComponent(ref)}`
  ])

  if (response.encoding !== 'base64') {
    throw new Error(`Unsupported content encoding for ${path}: ${response.encoding}`)
  }

  return Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

/**
 * Fetch a URL with a timeout and return a bounded text snapshot for moderation heuristics.
 */
async function inspectUrl(url: string, expectedKind: 'html' | 'text'): Promise<UrlInspection> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers:
        expectedKind === 'html'
          ? { Accept: 'text/html,application/xhtml+xml' }
          : { Accept: 'text/plain,text/markdown,text/*,*/*;q=0.1' },
      redirect: 'follow',
      signal: controller.signal
    })
    const contentType = response.headers.get('content-type')
    const text = truncate(await response.text(), MAX_FETCH_TEXT_LENGTH)

    return {
      contentType,
      ok: response.ok,
      status: response.status,
      text,
      url
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      contentType: null,
      error: message,
      ok: false,
      text: '',
      url
    }
  } finally {
    clearTimeout(timeout)
  }
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

  if (typeof value !== 'string') {
    return null
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
 * Append a unique guideline reason.
 */
function addGuidelineReason(
  reasons: string[],
  reason: string,
  _severity: Extract<GuidelineStatus, 'warn' | 'fail'>
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason)
  }
}

/**
 * Return true when the fetched llms.txt payload appears to be HTML.
 */
function looksLikeHtmlResponse(result: UrlInspection): boolean {
  const contentType = result.contentType?.toLowerCase() ?? ''
  return contentType.includes('text/html') || /<html[\s>]/i.test(result.text)
}

/**
 * Return the first matched moderation term, if any.
 */
function findMatchedTerm(text: string, terms: string[]): string | null {
  return terms.find(term => text.includes(term)) ?? null
}

/**
 * Normalize free text for heuristic matching.
 */
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Return true when the website and llms URLs appear to belong to the same site family.
 */
function sameWebsiteFamily(website: string, llmsUrl: string): boolean {
  try {
    const websiteHost = new URL(website).hostname.toLowerCase()
    const llmsHost = new URL(llmsUrl).hostname.toLowerCase()
    return (
      websiteHost === llmsHost ||
      websiteHost.endsWith(`.${llmsHost}`) ||
      llmsHost.endsWith(`.${websiteHost}`)
    )
  } catch {
    return false
  }
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
    return value
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
