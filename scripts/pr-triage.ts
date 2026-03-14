import { appendFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ALLOWED_MDX_PREFIX = 'packages/content/data/websites/'
const PROTECTED_WEBSITES_JSON_PATH = 'data/websites.json'
const AUTOMATED_WEBSITES_JSON_BRANCH = 'update-websites-json'
const AUTOMATED_WEBSITES_JSON_TITLE = 'chore: update websites.json'
const AUTOMATED_WEBSITES_JSON_ACTOR = 'github-actions[bot]'
const MAX_FAST_LANE_FILES = 15
const MAX_FAST_LANE_CHANGES = 3000

const AUTOMERGE_LABEL = 'automerge:candidate'
const NEEDS_GENERATED_REVIEW_LABEL = 'needs:generated-file-review'

export type PullRequestLane = 'mdx-fast' | 'standard' | 'blocked'
export type PullRequestRisk = 'low' | 'high'

export interface PullRequestFile {
  additions?: number
  changes?: number
  deletions?: number
  filename: string
  previousFilename?: string | null
  status: string
}

export interface PullRequestCommit {
  authorLogin: string | null
  committerLogin: string | null
}

export interface PullRequestContext {
  authorLogin: string
  commits: PullRequestCommit[]
  files: PullRequestFile[]
  headRefName: string
  title: string
}

export interface ClassificationStats {
  fileCount: number
  totalChanges: number
  touchesWebsitesJson: boolean
}

export interface PullRequestClassification {
  automergeEligible: boolean
  labels: string[]
  lane: PullRequestLane
  manualWebsitesJsonChange: boolean
  reason: string
  risk: PullRequestRisk
  stats: ClassificationStats
  summary: string
}

/**
 * Classify a pull request into the MDX fast lane, standard lane, or blocked lane.
 */
export function classifyPullRequest(context: PullRequestContext): PullRequestClassification {
  const stats = buildStats(context.files)
  const fileNames = context.files.map(file => file.filename)
  const automatedWebsitesJsonPr = isAutomatedWebsitesJsonPullRequest(context)

  if (stats.fileCount === 0) {
    return buildClassification({
      lane: 'blocked',
      manualWebsitesJsonChange: false,
      fileNames,
      reason: 'PR has no changed files to classify.',
      risk: 'high',
      stats
    })
  }

  if (stats.touchesWebsitesJson && !automatedWebsitesJsonPr) {
    return buildClassification({
      lane: 'blocked',
      manualWebsitesJsonChange: true,
      fileNames,
      reason: 'PR touches data/websites.json outside the approved automation flow.',
      risk: 'high',
      stats
    })
  }

  if (automatedWebsitesJsonPr) {
    return buildClassification({
      lane: 'standard',
      manualWebsitesJsonChange: false,
      fileNames,
      reason: 'Approved automated websites.json update PR.',
      risk: 'low',
      stats
    })
  }

  const hasOnlyAllowedAddedMdxFiles = context.files.every(file => isFastLaneMdxFile(file))

  if (!hasOnlyAllowedAddedMdxFiles) {
    return buildClassification({
      lane: 'standard',
      manualWebsitesJsonChange: false,
      fileNames,
      reason:
        'PR includes files outside packages/content/data/websites/** or modifies existing files.',
      risk: 'high',
      stats
    })
  }

  if (stats.fileCount > MAX_FAST_LANE_FILES) {
    return buildClassification({
      lane: 'blocked',
      manualWebsitesJsonChange: false,
      fileNames,
      reason: `PR exceeds the fast-lane file cap of ${MAX_FAST_LANE_FILES} files.`,
      risk: 'high',
      stats
    })
  }

  if (stats.totalChanges > MAX_FAST_LANE_CHANGES) {
    return buildClassification({
      lane: 'blocked',
      manualWebsitesJsonChange: false,
      fileNames,
      reason: `PR exceeds the fast-lane change cap of ${MAX_FAST_LANE_CHANGES} lines.`,
      risk: 'high',
      stats
    })
  }

  return buildClassification({
    lane: 'mdx-fast',
    manualWebsitesJsonChange: false,
    fileNames,
    reason: 'PR only adds new .mdx entries under packages/content/data/websites/**.',
    risk: 'low',
    stats
  })
}

/**
 * Format a classifier result for GitHub Actions step outputs.
 */
export function formatGitHubOutputs(classification: PullRequestClassification): string {
  const outputs: [string, string][] = [
    ['lane', classification.lane],
    ['automerge_eligible', String(classification.automergeEligible)],
    ['manual_websites_json_change', String(classification.manualWebsitesJsonChange)],
    ['risk', classification.risk],
    ['reason', classification.reason],
    ['summary', classification.summary],
    ['labels', JSON.stringify(classification.labels)],
    ['classification', JSON.stringify(classification)]
  ]

  return outputs.map(([key, value]) => `${key}<<EOF\n${value}\nEOF`).join('\n')
}

/**
 * Build the final classifier object and human-readable summary.
 */
function buildClassification(input: {
  fileNames: string[]
  lane: PullRequestLane
  manualWebsitesJsonChange: boolean
  reason: string
  risk: PullRequestRisk
  stats: ClassificationStats
}): PullRequestClassification {
  const labels = buildLabels(input)

  return {
    automergeEligible: input.lane === 'mdx-fast',
    labels,
    lane: input.lane,
    manualWebsitesJsonChange: input.manualWebsitesJsonChange,
    reason: input.reason,
    risk: input.risk,
    stats: input.stats,
    summary: buildSummary({
      ...input,
      labels
    })
  }
}

/**
 * Derive the label set associated with a classifier outcome.
 */
function buildLabels(input: {
  lane: PullRequestLane
  manualWebsitesJsonChange: boolean
  risk: PullRequestRisk
  stats: ClassificationStats
}): string[] {
  const labels = [`lane:${input.lane}`, `risk:${input.risk}`]

  if (input.lane === 'blocked') {
    labels.push('status:blocked')
  }

  if (input.lane === 'mdx-fast') {
    labels.push(AUTOMERGE_LABEL)
  }

  if (input.manualWebsitesJsonChange) {
    labels.push(NEEDS_GENERATED_REVIEW_LABEL)
  }

  if (input.stats.touchesWebsitesJson) {
    labels.push('generated:websites-json')
  }

  if (
    input.lane === 'mdx-fast' ||
    input.stats.touchesWebsitesJson ||
    input.manualWebsitesJsonChange
  ) {
    labels.push('area:content')
  }

  return labels
}

/**
 * Summarize the changed-file footprint for classifier decisions.
 */
function buildStats(files: PullRequestFile[]): ClassificationStats {
  const totalChanges = files.reduce((sum, file) => {
    const fileChanges = file.changes ?? (file.additions ?? 0) + (file.deletions ?? 0)

    return sum + fileChanges
  }, 0)

  return {
    fileCount: files.length,
    totalChanges,
    touchesWebsitesJson: files.some(file => file.filename === PROTECTED_WEBSITES_JSON_PATH)
  }
}

/**
 * Render a concise markdown summary for PR comments and logs.
 */
function buildSummary(input: {
  fileNames: string[]
  labels: string[]
  lane: PullRequestLane
  manualWebsitesJsonChange: boolean
  reason: string
  risk: PullRequestRisk
  stats: ClassificationStats
}): string {
  const summaryLines = [
    '## PR intake summary',
    '',
    `- Lane: \`${input.lane}\``,
    `- Risk: \`${input.risk}\``,
    `- Automerge eligible: \`${input.lane === 'mdx-fast' ? 'yes' : 'no'}\``,
    `- data/websites.json touched: \`${input.stats.touchesWebsitesJson ? 'yes' : 'no'}\``,
    `- Manual websites.json change: \`${input.manualWebsitesJsonChange ? 'yes' : 'no'}\``,
    `- File count: \`${input.stats.fileCount}\``,
    `- Total changes: \`${input.stats.totalChanges}\``,
    `- Labels: ${input.labels.map(label => `\`${label}\``).join(', ')}`,
    `- Reason: ${input.reason}`,
    '- Inspected files:',
    ...input.fileNames.map(fileName => `  - \`${fileName}\``)
  ]

  return summaryLines.join('\n')
}

/**
 * Check whether this PR matches the known automated websites.json update flow.
 */
function isAutomatedWebsitesJsonPullRequest(context: PullRequestContext): boolean {
  if (
    context.authorLogin !== AUTOMATED_WEBSITES_JSON_ACTOR ||
    context.headRefName !== AUTOMATED_WEBSITES_JSON_BRANCH ||
    context.title !== AUTOMATED_WEBSITES_JSON_TITLE
  ) {
    return false
  }

  if (context.files.length !== 1 || context.files[0]?.filename !== PROTECTED_WEBSITES_JSON_PATH) {
    return false
  }

  return context.commits.every(
    commit =>
      commit.authorLogin === AUTOMATED_WEBSITES_JSON_ACTOR &&
      commit.committerLogin === AUTOMATED_WEBSITES_JSON_ACTOR
  )
}

/**
 * Return true when a changed file matches the fast-lane MDX allowlist.
 */
function isFastLaneMdxFile(file: PullRequestFile): boolean {
  return (
    file.status === 'added' &&
    file.filename.startsWith(ALLOWED_MDX_PREFIX) &&
    file.filename.endsWith('.mdx')
  )
}

/**
 * CLI entrypoint for classifying a serialized pull request payload.
 */
async function main(): Promise<void> {
  const inputPath = process.argv[2]

  if (!inputPath) {
    writeError('Usage: pnpm exec tsx scripts/pr-triage.ts <input-json-path>')
    process.exitCode = 1
    return
  }

  const rawInput = await readFile(inputPath, 'utf8')
  const context: PullRequestContext = JSON.parse(rawInput)
  const classification = classifyPullRequest(context)

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${formatGitHubOutputs(classification)}\n`)
  }

  process.stdout.write(`${JSON.stringify(classification, null, 2)}\n`)
}

/**
 * Write a single-line error message to stderr.
 */
function writeError(message: string): void {
  process.stderr.write(`${message}\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    writeError(message)
    process.exitCode = 1
  })
}
