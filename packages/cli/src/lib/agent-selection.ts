import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentConfig } from './agents.js'

const PREFS_DIR = '.llms'
const PREFS_FILE = 'agent-prefs.json'

/**
 * Default agents to pre-select when no saved preferences exist.
 */
export const DEFAULT_AGENTS = ['claude-code', 'cursor', 'codex']

/**
 * Detect which agents have config directories in the project.
 * Checks for the parent dir of each agent's skillsDir (e.g., `.cursor/` for `.cursor/skills`).
 * Skips universal agents since they all share `.agents/skills/`.
 */
export function detectProjectAgents(opts: {
  projectDir: string
  allAgents: AgentConfig[]
}): string[] {
  const detected: string[] = []
  for (const agent of opts.allAgents) {
    if (agent.isUniversal) continue
    const configDir = agent.skillsDir.split('/')[0]
    if (configDir && configDir !== 'skills' && existsSync(join(opts.projectDir, configDir))) {
      detected.push(agent.name)
    }
  }
  return detected
}

/**
 * Compute which agents should be pre-selected (initialValues) for the multiselect.
 * Priority:
 *   1. Saved preferences (user already told us what they want).
 *   2. Project-level detection (agent config dirs like .cursor/, .claude/ exist).
 *   3. Hardcoded defaults (claude-code, cursor, codex).
 */
export function getInitialAgents(opts: {
  allAgents: AgentConfig[]
  savedPrefs: string[] | null
  projectDir?: string
}): string[] {
  const validNames = new Set(opts.allAgents.map(a => a.name))

  if (opts.savedPrefs && opts.savedPrefs.length > 0) {
    const filtered = opts.savedPrefs.filter(name => validNames.has(name))
    if (filtered.length > 0) return filtered
  }

  if (opts.projectDir) {
    const detected = detectProjectAgents({ projectDir: opts.projectDir, allAgents: opts.allAgents })
    if (detected.length > 0) return detected
  }

  return DEFAULT_AGENTS.filter(name => validNames.has(name))
}

/**
 * Ensure universal agents are always included in the final selection.
 * Universal agents read from .agents/skills/ directly, so they must always be present.
 */
export function ensureUniversalAgents(opts: {
  selected: string[]
  allAgents: AgentConfig[]
}): string[] {
  const result = [...opts.selected]
  for (const agent of opts.allAgents) {
    if (agent.isUniversal && !result.includes(agent.name)) {
      result.push(agent.name)
    }
  }
  return result
}

/**
 * Read saved agent preferences from the project lockfile directory.
 */
export function loadSavedAgentPrefs(projectDir: string): string[] | null {
  try {
    const filePath = join(projectDir, PREFS_DIR, PREFS_FILE)
    if (!existsSync(filePath)) return null
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (Array.isArray(data.agents)) return data.agents
    return null
  } catch {
    return null
  }
}

/**
 * Save agent preferences for next run.
 */
export function saveAgentPrefs(projectDir: string, agentNames: string[]): void {
  try {
    const dir = join(projectDir, PREFS_DIR)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, PREFS_FILE),
      JSON.stringify({ agents: agentNames }, null, 2) + '\n',
      'utf-8'
    )
  } catch {
    // Non-critical — silently ignore
  }
}
