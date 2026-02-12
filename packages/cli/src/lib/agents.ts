import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative } from 'node:path'

export interface AgentConfig {
  name: string
  displayName: string
  /** Relative path from project root for project-scope skills */
  skillsDir: string
  /** Whether this agent uses the canonical .agents/skills/ location directly */
  isUniversal: boolean
  /** Check if the agent is installed on this machine */
  detectInstalled: () => boolean
}

const home = homedir()

export const CANONICAL_DIR = '.agents/skills'

export const agents: AgentConfig[] = [
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.claude'))
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.cursor'))
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () =>
      existsSync(join(home, '.config', 'opencode')) || existsSync(join(home, '.agents'))
  },
  {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(home, '.codex'))
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    skillsDir: '.windsurf/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.codeium', 'windsurf'))
  },
  {
    name: 'cline',
    displayName: 'Cline',
    skillsDir: '.cline/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.cline'))
  }
]

/**
 * Return the list of AI agents detected on this machine.
 */
export function detectInstalledAgents(): AgentConfig[] {
  return agents.filter(a => a.detectInstalled())
}

/**
 * Create a relative symlink from an agent's skills dir to the canonical location.
 * E.g., .claude/skills/<slug>/ → ../../.agents/skills/<slug>/
 */
export function createAgentSymlink(projectDir: string, slug: string, agent: AgentConfig): boolean {
  if (agent.isUniversal) {
    return false
  }

  const canonicalPath = join(projectDir, CANONICAL_DIR, slug)
  const agentSkillPath = join(projectDir, agent.skillsDir, slug)

  // Don't create symlink if canonical doesn't exist
  if (!existsSync(canonicalPath)) return false

  // Create parent directory
  mkdirSync(dirname(agentSkillPath), { recursive: true })

  // Remove existing symlink/directory if present
  if (existsSync(agentSkillPath)) {
    try {
      const target = readlinkSync(agentSkillPath)
      // Already a symlink — check if it points to the right place
      const expectedTarget = relative(dirname(agentSkillPath), canonicalPath)
      if (target === expectedTarget) return true
      unlinkSync(agentSkillPath)
    } catch {
      // Not a symlink — remove the directory
      rmSync(agentSkillPath, { recursive: true, force: true })
    }
  }

  const relTarget = relative(dirname(agentSkillPath), canonicalPath)
  try {
    symlinkSync(relTarget, agentSkillPath, 'dir')
    return true
  } catch {
    // Symlink failed (e.g., Windows without dev mode) — skip
    return false
  }
}

/**
 * Remove an agent's symlink or skill directory for a given slug.
 */
export function removeAgentSkill(projectDir: string, slug: string, agent: AgentConfig): void {
  const skillPath = join(projectDir, agent.skillsDir, slug)
  // Use lstatSync to detect entries including dangling symlinks
  try {
    const stat = lstatSync(skillPath)
    if (stat.isSymbolicLink()) {
      unlinkSync(skillPath)
    } else {
      rmSync(skillPath, { recursive: true, force: true })
    }
  } catch {
    // Path doesn't exist at all — nothing to remove
  }
}
