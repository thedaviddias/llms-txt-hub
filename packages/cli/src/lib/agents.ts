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
import { dirname, join, relative, resolve } from 'node:path'

export interface AgentConfig {
  name: string
  displayName: string
  /**
   * Relative path from project root for project-scope skills
   */
  skillsDir: string
  /**
   * Whether this agent uses the canonical .agents/skills/ location directly
   */
  isUniversal: boolean
  /**
   * Check if the agent is installed on this machine
   */
  detectInstalled: () => boolean
}

const home = homedir()
const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(home, '.config')
const codexHome = process.env.CODEX_HOME?.trim() || join(home, '.codex')
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')

export const CANONICAL_DIR = '.agents/skills'

/**
 * Validate and sanitize a slug before using it in filesystem paths.
 * Rejects path traversal attempts and non-alphanumeric characters.
 */
export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Invalid slug: empty or non-string')
  }
  // Only allow lowercase alphanumeric, hyphens, dots, and underscores
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug) || slug.includes('..')) {
    throw new Error(`Invalid slug: "${slug}" contains disallowed characters`)
  }
  return slug
}

/**
 * Verify a resolved path stays within the expected parent directory.
 */
export function assertPathContainment(fullPath: string, parentDir: string): void {
  const resolved = resolve(fullPath)
  const expectedParent = resolve(parentDir)
  if (!resolved.startsWith(`${expectedParent}/`)) {
    throw new Error(`Path traversal detected: "${fullPath}" escapes "${parentDir}"`)
  }
}

export const agents: AgentConfig[] = [
  {
    name: 'adal',
    displayName: 'AdaL',
    skillsDir: '.adal/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.adal'))
  },
  {
    name: 'amp',
    displayName: 'Amp',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(configHome, 'amp'))
  },
  {
    name: 'antigravity',
    displayName: 'Antigravity',
    skillsDir: '.agent/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.gemini/antigravity'))
  },
  {
    name: 'augment',
    displayName: 'Augment',
    skillsDir: '.augment/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.augment'))
  },
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(claudeHome)
  },
  {
    name: 'cline',
    displayName: 'Cline',
    skillsDir: '.cline/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.cline'))
  },
  {
    name: 'codebuddy',
    displayName: 'CodeBuddy',
    skillsDir: '.codebuddy/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.codebuddy'))
  },
  {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(codexHome) || existsSync('/etc/codex')
  },
  {
    name: 'command-code',
    displayName: 'Command Code',
    skillsDir: '.commandcode/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.commandcode'))
  },
  {
    name: 'continue',
    displayName: 'Continue',
    skillsDir: '.continue/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.continue'))
  },
  {
    name: 'crush',
    displayName: 'Crush',
    skillsDir: '.crush/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(configHome, 'crush'))
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.cursor'))
  },
  {
    name: 'droid',
    displayName: 'Droid',
    skillsDir: '.factory/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.factory'))
  },
  {
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(home, '.gemini'))
  },
  {
    name: 'github-copilot',
    displayName: 'GitHub Copilot',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(home, '.copilot'))
  },
  {
    name: 'goose',
    displayName: 'Goose',
    skillsDir: '.goose/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(configHome, 'goose'))
  },
  {
    name: 'iflow-cli',
    displayName: 'iFlow CLI',
    skillsDir: '.iflow/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.iflow'))
  },
  {
    name: 'junie',
    displayName: 'Junie',
    skillsDir: '.junie/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.junie'))
  },
  {
    name: 'kilo',
    displayName: 'Kilo Code',
    skillsDir: '.kilocode/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.kilocode'))
  },
  {
    name: 'kimi-cli',
    displayName: 'Kimi Code CLI',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(home, '.kimi'))
  },
  {
    name: 'kiro-cli',
    displayName: 'Kiro CLI',
    skillsDir: '.kiro/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.kiro'))
  },
  {
    name: 'kode',
    displayName: 'Kode',
    skillsDir: '.kode/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.kode'))
  },
  {
    name: 'mcpjam',
    displayName: 'MCPJam',
    skillsDir: '.mcpjam/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.mcpjam'))
  },
  {
    name: 'mistral-vibe',
    displayName: 'Mistral Vibe',
    skillsDir: '.vibe/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.vibe'))
  },
  {
    name: 'mux',
    displayName: 'Mux',
    skillsDir: '.mux/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.mux'))
  },
  {
    name: 'neovate',
    displayName: 'Neovate',
    skillsDir: '.neovate/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.neovate'))
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    skillsDir: 'skills',
    isUniversal: false,
    detectInstalled: () =>
      existsSync(join(home, '.openclaw')) ||
      existsSync(join(home, '.clawdbot')) ||
      existsSync(join(home, '.moltbot'))
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    skillsDir: '.agents/skills',
    isUniversal: true,
    detectInstalled: () => existsSync(join(configHome, 'opencode'))
  },
  {
    name: 'openhands',
    displayName: 'OpenHands',
    skillsDir: '.openhands/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.openhands'))
  },
  {
    name: 'pi',
    displayName: 'Pi',
    skillsDir: '.pi/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.pi/agent'))
  },
  {
    name: 'pochi',
    displayName: 'Pochi',
    skillsDir: '.pochi/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.pochi'))
  },
  {
    name: 'qoder',
    displayName: 'Qoder',
    skillsDir: '.qoder/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.qoder'))
  },
  {
    name: 'qwen-code',
    displayName: 'Qwen Code',
    skillsDir: '.qwen/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.qwen'))
  },
  {
    name: 'roo',
    displayName: 'Roo Code',
    skillsDir: '.roo/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.roo'))
  },
  {
    name: 'trae',
    displayName: 'Trae',
    skillsDir: '.trae/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.trae'))
  },
  {
    name: 'trae-cn',
    displayName: 'Trae CN',
    skillsDir: '.trae/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.trae-cn'))
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    skillsDir: '.windsurf/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.codeium/windsurf'))
  },
  {
    name: 'zencoder',
    displayName: 'Zencoder',
    skillsDir: '.zencoder/skills',
    isUniversal: false,
    detectInstalled: () => existsSync(join(home, '.zencoder'))
  }
]

/**
 * Return the list of AI agents detected on this machine.
 */
export function detectInstalledAgents(): AgentConfig[] {
  return agents.filter(a => a.detectInstalled())
}

export interface CreateAgentSymlinkInput {
  projectDir: string
  slug: string
  agent: AgentConfig
}

/**
 * Create a relative symlink from an agent's skills dir to the canonical location.
 * E.g., .claude/skills/<slug>/ → ../../.agents/skills/<slug>/
 */
export function createAgentSymlink({ projectDir, slug, agent }: CreateAgentSymlinkInput): boolean {
  if (agent.isUniversal) {
    return false
  }

  sanitizeSlug(slug)
  const canonicalPath = join(projectDir, CANONICAL_DIR, slug)
  const agentSkillPath = join(projectDir, agent.skillsDir, slug)
  assertPathContainment(canonicalPath, join(projectDir, CANONICAL_DIR))
  assertPathContainment(agentSkillPath, join(projectDir, agent.skillsDir))

  // Don't create symlink if canonical doesn't exist
  if (!existsSync(canonicalPath)) return false

  // Create parent directory
  mkdirSync(dirname(agentSkillPath), { recursive: true })

  // Remove existing symlink/directory if present (use lstat to detect dangling symlinks)
  try {
    const stat = lstatSync(agentSkillPath)
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(agentSkillPath)
      const expectedTarget = relative(dirname(agentSkillPath), canonicalPath)
      if (target === expectedTarget) return true
      unlinkSync(agentSkillPath)
    } else {
      rmSync(agentSkillPath, { recursive: true, force: true })
    }
  } catch {
    // Path doesn't exist — proceed to create symlink
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

export interface RemoveAgentSkillInput {
  projectDir: string
  slug: string
  agent: AgentConfig
}

/**
 * Remove an agent's symlink or skill directory for a given slug.
 */
export function removeAgentSkill({ projectDir, slug, agent }: RemoveAgentSkillInput): void {
  sanitizeSlug(slug)
  const skillPath = join(projectDir, agent.skillsDir, slug)
  assertPathContainment(skillPath, join(projectDir, agent.skillsDir))
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
