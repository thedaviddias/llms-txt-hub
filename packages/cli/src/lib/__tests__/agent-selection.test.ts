import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENTS,
  detectProjectAgents,
  ensureUniversalAgents,
  getInitialAgents
} from '../agent-selection.js'
import type { AgentConfig } from '../agents.js'

const makeAgent = (name: string, isUniversal = false, skillsDir?: string): AgentConfig => ({
  name,
  displayName: name,
  skillsDir: skillsDir ?? `.${name}/skills`,
  isUniversal,
  detectInstalled: () => false
})

const allAgents: AgentConfig[] = [
  makeAgent('claude-code'),
  makeAgent('cursor'),
  makeAgent('cline'),
  makeAgent('windsurf'),
  makeAgent('roo'),
  makeAgent('amp', true, '.agents/skills'),
  makeAgent('codex', true, '.agents/skills'),
  makeAgent('gemini-cli', true, '.agents/skills')
]

describe('detectProjectAgents', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agent-test-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('detects agents whose config dir exists in the project', () => {
    mkdirSync(join(tmpDir, '.cursor'), { recursive: true })
    mkdirSync(join(tmpDir, '.claude-code'), { recursive: true })

    const result = detectProjectAgents({ projectDir: tmpDir, allAgents })
    expect(result).toContain('cursor')
    expect(result).toContain('claude-code')
  })

  it('returns empty array when no agent dirs exist', () => {
    const result = detectProjectAgents({ projectDir: tmpDir, allAgents })
    expect(result).toEqual([])
  })

  it('does not include universal agents in detection', () => {
    mkdirSync(join(tmpDir, '.agents'), { recursive: true })

    const result = detectProjectAgents({ projectDir: tmpDir, allAgents })
    // .agents/ is for universal agents — should not be returned
    expect(result).not.toContain('amp')
    expect(result).not.toContain('codex')
    expect(result).not.toContain('gemini-cli')
  })

  it('only detects non-universal agents with matching project dirs', () => {
    mkdirSync(join(tmpDir, '.windsurf'), { recursive: true })

    const result = detectProjectAgents({ projectDir: tmpDir, allAgents })
    expect(result).toEqual(['windsurf'])
  })

  it('detects multiple agents in a real project', () => {
    mkdirSync(join(tmpDir, '.cursor'), { recursive: true })
    mkdirSync(join(tmpDir, '.cline'), { recursive: true })
    mkdirSync(join(tmpDir, '.roo'), { recursive: true })

    const result = detectProjectAgents({ projectDir: tmpDir, allAgents })
    expect(result).toContain('cursor')
    expect(result).toContain('cline')
    expect(result).toContain('roo')
    expect(result).toHaveLength(3)
  })
})

describe('getInitialAgents', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agent-test-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns saved preferences first (highest priority)', () => {
    // Even with project dirs present, saved prefs win
    mkdirSync(join(tmpDir, '.cursor'), { recursive: true })

    const result = getInitialAgents({
      allAgents,
      savedPrefs: ['claude-code', 'windsurf'],
      projectDir: tmpDir
    })
    expect(result).toEqual(['claude-code', 'windsurf'])
  })

  it('detects from project dirs when no saved prefs', () => {
    mkdirSync(join(tmpDir, '.cursor'), { recursive: true })
    mkdirSync(join(tmpDir, '.claude-code'), { recursive: true })

    const result = getInitialAgents({
      allAgents,
      savedPrefs: null,
      projectDir: tmpDir
    })
    expect(result).toContain('cursor')
    expect(result).toContain('claude-code')
  })

  it('falls back to DEFAULT_AGENTS when no prefs and no project dirs', () => {
    const result = getInitialAgents({
      allAgents,
      savedPrefs: null,
      projectDir: tmpDir
    })
    expect(result).toEqual(DEFAULT_AGENTS.filter(n => allAgents.some(a => a.name === n)))
  })

  it('falls back to DEFAULT_AGENTS when no projectDir provided', () => {
    const result = getInitialAgents({ allAgents, savedPrefs: null })
    expect(result).toEqual(DEFAULT_AGENTS.filter(n => allAgents.some(a => a.name === n)))
  })

  it('returns DEFAULT_AGENTS when saved preferences is empty array', () => {
    const result = getInitialAgents({ allAgents, savedPrefs: [] })
    expect(result).toEqual(DEFAULT_AGENTS.filter(n => allAgents.some(a => a.name === n)))
  })

  it('filters out invalid agent names from saved preferences', () => {
    const result = getInitialAgents({
      allAgents,
      savedPrefs: ['claude-code', 'nonexistent-agent', 'cursor']
    })
    expect(result).toEqual(['claude-code', 'cursor'])
  })

  it('falls back to project detection when all saved prefs are invalid', () => {
    mkdirSync(join(tmpDir, '.windsurf'), { recursive: true })

    const result = getInitialAgents({
      allAgents,
      savedPrefs: ['nonexistent-1', 'nonexistent-2'],
      projectDir: tmpDir
    })
    expect(result).toEqual(['windsurf'])
  })

  it('falls back to defaults when all saved prefs invalid and no project dirs', () => {
    const result = getInitialAgents({
      allAgents,
      savedPrefs: ['nonexistent-1', 'nonexistent-2'],
      projectDir: tmpDir
    })
    expect(result).toEqual(DEFAULT_AGENTS.filter(n => allAgents.some(a => a.name === n)))
  })

  it('defaults include claude-code, cursor, and codex', () => {
    expect(DEFAULT_AGENTS).toContain('claude-code')
    expect(DEFAULT_AGENTS).toContain('cursor')
    expect(DEFAULT_AGENTS).toContain('codex')
  })
})

describe('ensureUniversalAgents', () => {
  it('adds universal agents that are not already selected', () => {
    const result = ensureUniversalAgents({
      selected: ['claude-code', 'cursor'],
      allAgents
    })
    expect(result).toContain('claude-code')
    expect(result).toContain('cursor')
    expect(result).toContain('amp')
    expect(result).toContain('codex')
    expect(result).toContain('gemini-cli')
  })

  it('does not duplicate universal agents already selected', () => {
    const result = ensureUniversalAgents({
      selected: ['claude-code', 'codex'],
      allAgents
    })
    const codexCount = result.filter(n => n === 'codex').length
    expect(codexCount).toBe(1)
  })

  it('returns only universal agents when nothing is selected', () => {
    const result = ensureUniversalAgents({
      selected: [],
      allAgents
    })
    expect(result).toEqual(['amp', 'codex', 'gemini-cli'])
  })

  it('preserves order: user selection first, then appended universals', () => {
    const result = ensureUniversalAgents({
      selected: ['windsurf', 'cline'],
      allAgents
    })
    expect(result[0]).toBe('windsurf')
    expect(result[1]).toBe('cline')
    // Universal agents appended after
    expect(result).toContain('amp')
    expect(result).toContain('codex')
    expect(result).toContain('gemini-cli')
  })
})
