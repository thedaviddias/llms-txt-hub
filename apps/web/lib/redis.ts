import { logger } from '@thedaviddias/logging'
import type { Redis } from '@upstash/redis'

/**
 * Upstash Redis client configuration with security and error handling
 * HTTP-based Redis client optimized for serverless environments
 */

// Validate required environment variables
const requiredEnvVars = {
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN
}

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key)

const REDIS_OPERATION_TIMEOUT_MS = 1_500
let redisUnavailableLogged = false

/** Create a fresh deadline signal for one Upstash HTTP operation. */
const createRedisOperationSignal = (): AbortSignal => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REDIS_OPERATION_TIMEOUT_MS)
  if (typeof timeout === 'object') timeout.unref()
  return controller.signal
}

/** Report one safe production diagnostic when Redis cannot initialize. */
const reportRedisUnavailable = (reason: 'initialization_failed' | 'missing_configuration') => {
  if (redisUnavailableLogged || process.env.NODE_ENV !== 'production') return
  redisUnavailableLogged = true
  logger.error('Redis unavailable', {
    data: { reason, status: 'unavailable' },
    tags: { operation: 'initialize', type: 'redis' }
  })
}

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'development') {
  logger.warn('Redis environment variables not configured', {
    data: { missingVars: missingEnvVars },
    tags: { type: 'redis', status: 'disabled' }
  })
}
if (missingEnvVars.length > 0) reportRedisUnavailable('missing_configuration')

// Initialize Redis client with lazy loading
let redis: Redis | null = null
let redisInitialized = false

/**
 * Get or initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redisInitialized) return redis

  redisInitialized = true

  // Only initialize Redis if environment variables are present
  if (requiredEnvVars.KV_REST_API_URL && requiredEnvVars.KV_REST_API_TOKEN) {
    try {
      const { Redis } = require('@upstash/redis')
      redis = new Redis({
        url: requiredEnvVars.KV_REST_API_URL,
        token: requiredEnvVars.KV_REST_API_TOKEN,
        // Keep automatic serialization for convenience
        automaticDeserialization: true,
        retry: { retries: 0 },
        signal: createRedisOperationSignal
      })
    } catch (_error) {
      redis = null
      reportRedisUnavailable('initialization_failed')
    }
  }

  return redis
}

/**
 * Cache key prefixes for different data types
 * Helps organize and identify cached data
 */
export const CACHE_KEYS = {
  GITHUB_API: 'gh:api:',
  GITHUB_USER: 'gh:user:',
  GITHUB_CONTRIBUTIONS: 'gh:contrib:',
  WEBSITE_METADATA: 'web:meta:',
  MEMBER_DATA: 'member:',
  RATE_LIMIT: 'rl:',
  SESSION: 'sess:',
  CSRF: 'csrf:'
} as const

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  GITHUB_API: 300, // 5 minutes
  GITHUB_USER: 600, // 10 minutes
  GITHUB_CONTRIBUTIONS: 3600, // 1 hour
  WEBSITE_METADATA: 1800, // 30 minutes
  MEMBER_DATA: 86400, // 24 hours
  RATE_LIMIT: 3600, // 1 hour
  SESSION: 86400, // 24 hours
  CSRF: 3600 // 1 hour
} as const

/** Extract safe diagnostic details from an unknown thrown value. */
const describeError = (error: unknown): { name: string; message: string } =>
  error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'UnknownError', message: String(error) }

/**
 * Get value from cache with error handling.
 *
 * Retries once on failure: each attempt goes through the signal factory, so
 * the retry gets a fresh deadline. The Upstash client cannot retry aborted
 * requests itself — with a signal factory it rethrows aborts immediately,
 * bypassing its retry loop.
 */
export async function get<T = string>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) {
    return null
  }

  try {
    return await client.get<T>(key)
  } catch {
    try {
      return await client.get<T>(key)
    } catch (error) {
      logger.warn('Redis GET operation failed', {
        data: { key, error: describeError(error) },
        tags: { type: 'redis', operation: 'get' }
      })
      return null
    }
  }
}

/**
 * Set value in cache with TTL and error handling
 */
export async function set(key: string, value: unknown, ttl?: number): Promise<boolean> {
  const client = getRedisClient()
  if (!client) {
    return false
  }

  try {
    if (ttl) {
      await client.setex(key, ttl, value)
    } else {
      await client.set(key, value)
    }
    return true
  } catch (error) {
    logger.warn('Redis SET operation failed', {
      data: { key, ttl, error: describeError(error) },
      tags: { type: 'redis', operation: 'set' }
    })
    return false
  }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) {
    return false
  }

  try {
    await client.del(key)
    return true
  } catch (error) {
    logger.warn('Redis DEL operation failed', {
      data: { key, error: describeError(error) },
      tags: { type: 'redis', operation: 'del' }
    })
    return false
  }
}

/**
 * Increment counter (useful for rate limiting)
 */
export async function incr(key: string, ttl?: number): Promise<number | null> {
  const client = getRedisClient()
  if (!client) {
    return null
  }

  try {
    const count = await client.incr(key)
    if (ttl && count === 1) {
      // Only set TTL on first increment
      await client.expire(key, ttl)
    }
    return count
  } catch (error) {
    logger.warn('Redis INCR operation failed', {
      data: { key, ttl, error: describeError(error) },
      tags: { type: 'redis', operation: 'incr' }
    })
    return null
  }
}

/**
 * Atomically set a value only when the key does not already exist.
 *
 * @param key - Redis key
 * @param value - Serializable value
 * @param ttl - Required expiry in seconds
 * @returns `true` when acquired, `false` when already present, or `null` when Redis is unavailable
 */
export async function setNx(key: string, value: unknown, ttl: number): Promise<boolean | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const result = await client.set(key, value, { ex: ttl, nx: true })
    return result === 'OK'
  } catch (error) {
    logger.warn('Redis SET NX operation failed', {
      data: { key, error: describeError(error) },
      tags: { type: 'redis', operation: 'set_nx' }
    })
    return null
  }
}

/**
 * Execute a bounded, caller-owned Lua script without exposing raw Redis errors.
 *
 * Callers must use fixed scripts and bounded keys/arguments. A `null` result is
 * reserved for Redis unavailability; scripts used by publication state must
 * return an explicit non-null value for every application outcome.
 *
 * @param script - Fixed Lua source owned by the application
 * @param keys - Bounded Redis keys supplied to the script
 * @param args - Bounded string arguments supplied to the script
 * @returns Script response, or `null` when Redis is unavailable
 */
export async function evalRedis<T>(
  script: string,
  keys: readonly string[],
  args: readonly string[]
): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    return await client.eval<string[], T>(script, [...keys], [...args])
  } catch (error) {
    logger.warn('Redis EVAL operation failed', {
      data: { error: describeError(error) },
      tags: { type: 'redis', operation: 'eval' }
    })
    return null
  }
}

/**
 * Check if Redis is available
 */
export function isAvailable(): boolean {
  return getRedisClient() !== null
}

/**
 * Get raw Redis client for advanced operations
 * Use with caution - prefer the safe methods above
 */
export function getRawClient(): Redis | null {
  return getRedisClient()
}

/**
 * Safe Redis operations with error handling
 * Returns null on error to allow graceful fallback
 */
export const SafeRedis = {
  get,
  set,
  del,
  incr,
  setNx,
  eval: evalRedis,
  isAvailable,
  getRawClient
}

export default SafeRedis
