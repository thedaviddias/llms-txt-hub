import { logger } from '@thedaviddias/logging'
import type { Redis } from '@upstash/redis'

/**
 * Upstash Redis client configuration with security and error handling
 * HTTP-based Redis client optimized for serverless environments
 */

// Validate required environment variables
const requiredEnvVars = {
  STORAGE_KV_REST_API_URL: process.env.STORAGE_KV_REST_API_URL,
  STORAGE_KV_REST_API_TOKEN: process.env.STORAGE_KV_REST_API_TOKEN
}

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key)

// Only log in development, not during build
if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'development') {
  logger.warn('Redis environment variables not configured', {
    data: { missingVars: missingEnvVars },
    tags: { type: 'redis', status: 'disabled' }
  })
}

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
  if (requiredEnvVars.STORAGE_KV_REST_API_URL && requiredEnvVars.STORAGE_KV_REST_API_TOKEN) {
    try {
      const { Redis } = require('@upstash/redis')
      redis = new Redis({
        url: requiredEnvVars.STORAGE_KV_REST_API_URL,
        token: requiredEnvVars.STORAGE_KV_REST_API_TOKEN,
        // Keep automatic serialization for convenience
        automaticDeserialization: true
        // Note: Request timeout handled per-operation via AbortController if needed
      })
    } catch (_error) {
      // Silently fail - Redis is optional
      redis = null
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
  MEMBER_DATA: 900, // 15 minutes
  RATE_LIMIT: 3600, // 1 hour
  SESSION: 86400, // 24 hours
  CSRF: 3600 // 1 hour
} as const

/**
 * Get value from cache with error handling
 */
export async function get<T = string>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) {
    return null
  }

  try {
    const result: T | null = await client.get<T>(key)
    return result
  } catch (error) {
    logger.error('Redis GET operation failed', {
      data: {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'redis', operation: 'get' }
    })
    return null
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
    logger.error('Redis SET operation failed', {
      data: {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
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
    logger.error('Redis DEL operation failed', {
      data: {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
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
    logger.error('Redis INCR operation failed', {
      data: {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'redis', operation: 'incr' }
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
  isAvailable,
  getRawClient
}

export default SafeRedis
