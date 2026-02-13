const TELEMETRY_ENDPOINT = 'https://llmstxt.directory/api/cli/telemetry'
const CLI_VERSION = __CLI_VERSION__

const CI_ENV_VARS = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'TRAVIS']

/**
 * Check if telemetry is disabled via environment variables.
 */
function isDisabled(): boolean {
  return process.env.DO_NOT_TRACK === '1' || process.env.LLMSTXT_TELEMETRY_DISABLED === '1'
}

/**
 * Detect if running in a CI environment.
 */
function isCI(): boolean {
  return CI_ENV_VARS.some(v => process.env[v])
}

interface TrackParams {
  event: 'install' | 'remove' | 'init' | 'update' | 'search'
  skills?: string
  agents?: string
}

/**
 * Fire-and-forget telemetry. Never blocks, never throws.
 */
export function track(params: TrackParams): void {
  if (isDisabled()) return

  fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      version: CLI_VERSION,
      ci: isCI() || undefined
    }),
    signal: AbortSignal.timeout(5000)
  }).catch(() => {})
}
