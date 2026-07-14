import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { install } from '../install.js'

const mocks = vi.hoisted(() => {
  const detectedAgent = {
    name: 'droid',
    displayName: 'Droid',
    skillsDir: '.factory/skills',
    isUniversal: false,
    detectInstalled: () => true
  }
  const selectedAgent = {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    isUniversal: false,
    detectInstalled: () => true
  }

  return {
    detectedAgent,
    selectedAgent,
    installToAgents: vi.fn(() => ({
      checksum: 'checksum',
      size: 12,
      agents: ['cursor']
    })),
    track: vi.fn()
  }
})

vi.mock('@clack/prompts', () => ({
  isCancel: () => false,
  log: {
    info: vi.fn(),
    message: vi.fn(),
    warn: vi.fn()
  },
  multiselect: vi.fn(async () => ['cursor']),
  note: vi.fn(),
  select: vi.fn()
}))

vi.mock('../../lib/agent-selection.js', () => ({
  ensureUniversalAgents: ({ selected }: { selected: string[] }) => selected,
  getInitialAgents: () => [],
  loadSavedAgentPrefs: () => null,
  saveAgentPrefs: vi.fn()
}))

vi.mock('../../lib/agents.js', () => ({
  agents: [mocks.detectedAgent, mocks.selectedAgent],
  detectInstalledAgents: () => [mocks.detectedAgent]
}))

vi.mock('../../lib/context.js', () => ({ syncClaudeMd: vi.fn() }))

vi.mock('../../lib/fetcher.js', () => ({
  fetchLlmsTxt: vi.fn(async () => ({
    content: 'Turbo documentation',
    etag: 'etag',
    lastModified: '2026-07-14'
  }))
}))

vi.mock('../../lib/lockfile.js', () => ({ addEntry: vi.fn() }))

vi.mock('../../lib/logger.js', () => ({
  error: vi.fn(),
  spinner: () => ({
    fail: vi.fn(),
    start: vi.fn(),
    succeed: vi.fn()
  })
}))

vi.mock('../../lib/registry.js', () => ({
  loadRegistry: vi.fn(async () => undefined),
  resolveSlug: () => ({
    slug: 'turbo',
    name: 'Turbo',
    category: 'developer-tools',
    llmsTxtUrl: 'https://turbo.build/llms.txt'
  }),
  searchRegistry: () => []
}))

vi.mock('../../lib/storage.js', () => ({
  installToAgents: mocks.installToAgents,
  isInstalled: () => false
}))

vi.mock('../../lib/telemetry.js', () => ({ track: mocks.track }))

describe('install telemetry', () => {
  const originalIsTTY = process.stdin.isTTY

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true })
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: originalIsTTY
    })
    process.exitCode = undefined
  })

  it('records the selected target agents instead of initially detected agents', async () => {
    await install({ names: ['turbo'], options: {} })

    expect(mocks.installToAgents).toHaveBeenCalledWith(
      expect.objectContaining({ targetAgents: [mocks.selectedAgent] })
    )
    expect(mocks.track).toHaveBeenCalledWith({
      event: 'install',
      skills: 'turbo',
      agents: 'cursor'
    })
  })
})
