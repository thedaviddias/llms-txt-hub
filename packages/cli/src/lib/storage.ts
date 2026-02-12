import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RegistryEntry } from '../types/index.js'
import {
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

  if (isLarge) {
    const skillMd = [
      frontmatter,
      '',
      `# ${entry.name} Documentation`,
      '',
      `${entry.description}`,
      '',
      `Source: ${format === 'llms-full.txt' ? entry.llmsFullTxtUrl : entry.llmsTxtUrl}`,
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
    `Source: ${format === 'llms-full.txt' ? entry.llmsFullTxtUrl : entry.llmsTxtUrl}`,
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

/**
 * Install a skill to the canonical directory and all detected agents.
 */
export function installToAgents(
  projectDir: string,
  slug: string,
  entry: RegistryEntry,
  content: string,
  format: 'llms.txt' | 'llms-full.txt'
): InstallResult {
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

  // 2. For each detected agent, create symlink to canonical
  const detectedAgents = detectInstalledAgents()

  for (const agent of detectedAgents) {
    if (agent.isUniversal) {
      if (!installedAgents.includes(agent.name)) {
        installedAgents.push(agent.name)
      }
      continue
    }

    const linked = createAgentSymlink(projectDir, slug, agent)
    if (linked) {
      installedAgents.push(agent.name)
    }
  }

  // 3. Keep lockfile metadata dir
  mkdirSync(join(projectDir, LLMS_DIR), { recursive: true })

  return { checksum, size, agents: installedAgents }
}

// ── Multi-target remove ─────────────────────────────────────────

/**
 * Remove a skill from the canonical directory and all agent directories.
 */
export function removeFromAgents(projectDir: string, slug: string): void {
  sanitizeSlug(slug)
  // Remove canonical
  const canonicalDir = join(projectDir, CANONICAL_DIR, slug)
  assertPathContainment(canonicalDir, join(projectDir, CANONICAL_DIR))
  if (existsSync(canonicalDir)) {
    rmSync(canonicalDir, { recursive: true, force: true })
  }

  // Remove from all agents
  for (const agent of detectInstalledAgents()) {
    removeAgentSkill(projectDir, slug, agent)
  }
}

// ── Status checks ───────────────────────────────────────────────

/**
 * Check whether a skill is installed in the canonical location.
 */
export function isInstalled(projectDir: string, slug: string): boolean {
  sanitizeSlug(slug)
  return existsSync(join(projectDir, CANONICAL_DIR, slug, 'SKILL.md'))
}

// ── Gitignore ───────────────────────────────────────────────────

/**
 * Append llms.txt entries to .gitignore if not already present.
 */
export function addToGitignore(projectDir: string): boolean {
  try {
    const gitignorePath = join(projectDir, '.gitignore')
    const gitignoreEntries = [
      '.llms/',
      '.agents/skills/',
      '.claude/skills/',
      '.cursor/skills/',
      '.windsurf/skills/',
      '.cline/skills/'
    ]

    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8')
      const missing = gitignoreEntries.filter(e => !content.includes(e))
      if (missing.length === 0) return false

      appendFileSync(gitignorePath, `\n# llms.txt documentation\n${missing.join('\n')}\n`)
    } else {
      writeFileSync(gitignorePath, `# llms.txt documentation\n${gitignoreEntries.join('\n')}\n`)
    }
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Import dynamically to avoid circular — or just use console since this is non-critical
    console.warn(`Could not update .gitignore: ${msg}`)
    return false
  }
}
