import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RegistryEntry } from '../types/index.js'
import {
  type AgentConfig,
  assertPathContainment,
  CANONICAL_DIR,
  createAgentSymlink,
  detectInstalledAgents,
  removeAgentSkill,
  sanitizeSlug
} from './agents.js'

const LLMS_DIR = '.llms'
const LARGE_FILE_THRESHOLD = 500 // lines

// ── Canonical storage (.agents/skills/) ─────────────────────────

/**
 * Generate SKILL.md content and optional reference.md for large files.
 */
function generateSkillMd(
  entry: RegistryEntry,
  content: string,
  format: 'llms.txt' | 'llms-full.txt'
): { skillMd: string; referenceMd?: string } {
  const lineCount = content.split('\n').length
  const isLarge = lineCount > LARGE_FILE_THRESHOLD
  const formatLabel = format === 'llms-full.txt' ? 'full ' : ''

  const frontmatter = [
    '---',
    `name: ${entry.slug}-docs`,
    `description: Official ${entry.name} ${formatLabel}documentation. Reference when working with ${entry.name}.`,
    'user-invocable: false',
    '---'
  ].join('\n')

  const sourceUrl =
    format === 'llms-full.txt' ? (entry.llmsFullTxtUrl ?? entry.llmsTxtUrl) : entry.llmsTxtUrl

  if (isLarge) {
    const skillMd = [
      frontmatter,
      '',
      `# ${entry.name} Documentation`,
      '',
      `${entry.description}`,
      '',
      `Source: ${sourceUrl}`,
      '',
      'For complete documentation, see [reference.md](reference.md).'
    ].join('\n')

    return { skillMd, referenceMd: content }
  }

  const skillMd = [
    frontmatter,
    '',
    `# ${entry.name} Documentation`,
    '',
    `${entry.description}`,
    '',
    `Source: ${sourceUrl}`,
    '',
    '---',
    '',
    content
  ].join('\n')

  return { skillMd }
}

// ── Multi-target write ──────────────────────────────────────────

export interface InstallResult {
  checksum: string
  size: number
  agents: string[]
}

export interface InstallToAgentsInput {
  projectDir: string
  slug: string
  entry: RegistryEntry
  content: string
  format: 'llms.txt' | 'llms-full.txt'
  targetAgents?: AgentConfig[]
}

/**
 * Install a skill to the canonical directory and selected agents.
 * If targetAgents is provided, only those agents get symlinks.
 * Otherwise falls back to all detected agents.
 */
export function installToAgents({
  projectDir,
  slug,
  entry,
  content,
  format,
  targetAgents
}: InstallToAgentsInput): InstallResult {
  const checksum = createHash('sha256').update(content).digest('hex')
  const size = Buffer.byteLength(content, 'utf-8')
  const installedAgents: string[] = []

  // 1. Write canonical copy to .agents/skills/<slug>/
  sanitizeSlug(slug)
  const canonicalDir = join(projectDir, CANONICAL_DIR, slug)
  assertPathContainment(canonicalDir, join(projectDir, CANONICAL_DIR))
  mkdirSync(canonicalDir, { recursive: true })

  const { skillMd, referenceMd } = generateSkillMd(entry, content, format)
  writeFileSync(join(canonicalDir, 'SKILL.md'), skillMd, 'utf-8')
  if (referenceMd) {
    writeFileSync(join(canonicalDir, 'reference.md'), referenceMd, 'utf-8')
  }
  installedAgents.push('universal')

  // 2. For each target agent, create symlink to canonical
  const agentsToLink = targetAgents ?? detectInstalledAgents()

  for (const agent of agentsToLink) {
    if (agent.isUniversal) {
      if (!installedAgents.includes(agent.name)) {
        installedAgents.push(agent.name)
      }
      continue
    }

    const linked = createAgentSymlink({ projectDir, slug, agent })
    if (linked) {
      installedAgents.push(agent.name)
    }
  }

  // 3. Keep lockfile metadata dir
  mkdirSync(join(projectDir, LLMS_DIR), { recursive: true })

  return { checksum, size, agents: installedAgents }
}

// ── Multi-target remove ─────────────────────────────────────────

export interface RemoveFromAgentsInput {
  projectDir: string
  slug: string
}

/**
 * Remove a skill from the canonical directory and all agent directories.
 */
export function removeFromAgents({ projectDir, slug }: RemoveFromAgentsInput): void {
  sanitizeSlug(slug)
  // Remove canonical
  const canonicalDir = join(projectDir, CANONICAL_DIR, slug)
  assertPathContainment(canonicalDir, join(projectDir, CANONICAL_DIR))
  if (existsSync(canonicalDir)) {
    rmSync(canonicalDir, { recursive: true, force: true })
  }

  // Remove from all agents
  for (const agent of detectInstalledAgents()) {
    removeAgentSkill({ projectDir, slug, agent })
  }
}

// ── Status checks ───────────────────────────────────────────────

export interface IsInstalledInput {
  projectDir: string
  slug: string
}

/**
 * Check whether a skill is installed in the canonical location.
 */
export function isInstalled({ projectDir, slug }: IsInstalledInput): boolean {
  sanitizeSlug(slug)
  return existsSync(join(projectDir, CANONICAL_DIR, slug, 'SKILL.md'))
}
