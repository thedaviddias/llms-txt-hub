import { spawnSync } from 'node:child_process'

import {
  ACQUIRE_SUBMISSION_LOCKS_SCRIPT,
  FINAL_ASSESSMENT_SCRIPT,
  SUBMISSION_RATE_LIMIT_SCRIPT
} from './submission-state-security'

const LUA_BINARY = 'lua'
const LUA_PROBE = spawnSync(LUA_BINARY, ['-v'], { encoding: 'utf8' })
const isLuaUnavailable =
  LUA_PROBE.error instanceof Error && 'code' in LUA_PROBE.error && LUA_PROBE.error.code === 'ENOENT'
const LUA_HARNESS = `
local script = assert(os.getenv('SUBMISSION_LUA_SCRIPT'))
local scenario = assert(os.getenv('SUBMISSION_LUA_SCENARIO'))
local store = {}
local ttl = {}

redis = {
  call = function(command, ...)
    local args = {...}
    if command == 'GET' then return store[args[1]] end
    if command == 'PTTL' then return ttl[args[1]] or -1 end
    if command == 'INCR' then
      local nextValue = tonumber(store[args[1]] or '0') + 1
      store[args[1]] = tostring(nextValue)
      return nextValue
    end
    if command == 'EXPIRE' then
      ttl[args[1]] = tonumber(args[2]) * 1000
      return 1
    end
    if command == 'SET' then
      store[args[1]] = args[2]
      if args[3] == 'EX' then ttl[args[1]] = tonumber(args[4]) * 1000 end
      if args[3] == 'PX' then ttl[args[1]] = tonumber(args[4]) end
      return 'OK'
    end
    error('Unsupported Redis command: ' .. command)
  end
}

local compiled = assert(load(script))
local function run(keys, arguments)
  KEYS = keys
  ARGV = arguments
  return compiled()
end

if scenario == 'rate' then
  for index = 1, 5 do
    assert(run({'account', 'source-' .. index, 'domain-' .. index}, {'5','20','3','3600','3600','86400'}) == 'allowed')
  end
  assert(run({'account', 'source-6', 'domain-6'}, {'5','20','3','3600','3600','86400'}) == 'account')
  assert(ttl.account == 3600000)

  for index = 1, 20 do
    assert(run({'account-' .. index, 'source', 'domain-source-' .. index}, {'5','20','3','3600','3600','86400'}) == 'allowed')
  end
  assert(run({'account-21', 'source', 'domain-source-21'}, {'5','20','3','3600','3600','86400'}) == 'source_ip')
  assert(ttl.source == 3600000)

  for index = 1, 3 do
    assert(run({'domain-account-' .. index, 'domain-source-' .. index, 'domain'}, {'5','20','3','3600','3600','86400'}) == 'allowed')
  end
  assert(run({'domain-account-4', 'domain-source-4', 'domain'}, {'5','20','3','3600','3600','86400'}) == 'domain')
  assert(ttl.domain == 86400000)
elseif scenario == 'locks' then
  store.llms = 'other-submission'
  assert(run({'website', 'llms'}, {'sub_123', '172800'}) == 'conflict')
  assert(store.website == nil)
  assert(store.llms == 'other-submission')

  store.llms = nil
  assert(run({'website', 'llms'}, {'sub_123', '172800'}) == 'acquired')
  assert(store.website == 'sub_123' and store.llms == 'sub_123')
  assert(ttl.website == 172800000 and ttl.llms == 172800000)
  assert(run({'website', 'llms'}, {'sub_123', '172800'}) == 'acquired')
elseif scenario == 'cas' then
  local record = {
    state = 'support_required',
    userId = 'user_123',
    fieldsHash = 'fields-hash',
    expiresAt = '2026-08-03T12:00:00.000Z'
  }
  cjson = {
    decode = function(_) return record end,
    encode = function(value) record = value return 'encoded-record' end
  }
  store.submission = 'encoded-record'
  ttl.submission = 169200123

  assert(run({'submission'}, {'user_123', 'fields-hash', '2026-08-01T13:00:00.000Z'}) == 'transitioned')
  assert(record.state == 'final_assessing')
  assert(ttl.submission == 169200123)
  assert(run({'submission'}, {'user_123', 'fields-hash', '2026-08-01T13:00:00.000Z'}) == 'state_mismatch')
else
  error('Unknown scenario')
end
`

const executeLua = (script: string, scenario: string) =>
  spawnSync(LUA_BINARY, ['-e', LUA_HARNESS], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SUBMISSION_LUA_SCENARIO: scenario,
      SUBMISSION_LUA_SCRIPT: script
    },
    timeout: 5_000
  })

describe('submission Redis Lua contracts', () => {
  it('retains the required Redis script contracts without a local Lua runtime', () => {
    expect(FINAL_ASSESSMENT_SCRIPT).toContain("redis.call('PTTL', KEYS[1])")
    expect(ACQUIRE_SUBMISSION_LOCKS_SCRIPT).toContain("return 'conflict'")
    expect(SUBMISSION_RATE_LIMIT_SCRIPT).toContain("return 'source_ip'")
  })

  const runtimeTest = isLuaUnavailable ? it.skip : it
  runtimeTest.each([
    ['rate limits', SUBMISSION_RATE_LIMIT_SCRIPT, 'rate'],
    ['dual locks', ACQUIRE_SUBMISSION_LOCKS_SCRIPT, 'locks'],
    ['concurrent continuation CAS serialization', FINAL_ASSESSMENT_SCRIPT, 'cas']
  ])('executes valid Lua for %s with the required atomic semantics', (_label, script, scenario) => {
    const result = executeLua(script, scenario)

    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
  })
})
