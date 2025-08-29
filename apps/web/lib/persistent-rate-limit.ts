import { logger } from '@thedaviddias/logging'
import { sql } from '@vercel/postgres'
import { hashSensitiveData } from "@/lib/server-crypto"

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests allowed in the window
  identifier: string // Unique identifier (IP, user ID, etc.)
  resource?: string // Optional resource identifier for granular limits
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number // Seconds until the rate limit resets
}

/**
 * Persistent rate limiting using Vercel Postgres
 * Falls back to in-memory storage in development
 */
export class PersistentRateLimit {
  private static instance: PersistentRateLimit
  private inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly isDevelopment = process.env.NODE_ENV === 'development'

  private constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60000)
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PersistentRateLimit {
    if (!PersistentRateLimit.instance) {
      PersistentRateLimit.instance = new PersistentRateLimit()
    }
    return PersistentRateLimit.instance
  }

  /**
   * Check and update rate limit
   */
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const key = this.generateKey(options.identifier, options.resource)
    const now = Date.now()

    try {
      // Use database in production, in-memory in development
      if (this.isDevelopment || !process.env.POSTGRES_URL) {
        return this.checkInMemoryRateLimit(key, options, now)
      }

      return await this.checkDatabaseRateLimit(key, options, now)
    } catch (error) {
      // Fall back to in-memory if database fails
      logger.error('Rate limit database error, falling back to in-memory', {
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          keyHash: hashSensitiveData(key)
        },
        tags: { type: 'security', component: 'rate-limit' }
      })

      return this.checkInMemoryRateLimit(key, options, now)
    }
  }

  /**
   * Check rate limit using database storage
   */
  private async checkDatabaseRateLimit(
    key: string,
    options: RateLimitOptions,
    now: number
  ): Promise<RateLimitResult> {
    const resetTime = new Date(now + options.windowMs)

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        reset_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Clean up expired entries
    await sql`
      DELETE FROM rate_limits 
      WHERE reset_time < CURRENT_TIMESTAMP
    `

    // Get current rate limit data
    const result = await sql`
      SELECT count, reset_time 
      FROM rate_limits 
      WHERE key = ${key} AND reset_time > CURRENT_TIMESTAMP
    `

    let count = 0
    let dbResetTime = resetTime

    if (result.rows.length > 0) {
      count = result.rows[0].count
      dbResetTime = new Date(result.rows[0].reset_time)
    }

    // Check if limit exceeded
    if (count >= options.maxRequests) {
      const retryAfter = Math.ceil((dbResetTime.getTime() - now) / 1000)

      logger.warn('Rate limit exceeded', {
        data: {
          keyHash: hashSensitiveData(key),
          resource: options.resource,
          remaining: 0,
          retryAfter
        },
        tags: { type: 'security', component: 'rate-limit', action: 'blocked' }
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: dbResetTime,
        retryAfter
      }
    }

    // Increment counter
    if (result.rows.length > 0) {
      await sql`
        UPDATE rate_limits 
        SET count = count + 1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ${key}
      `
    } else {
      await sql`
        INSERT INTO rate_limits (key, count, reset_time)
        VALUES (${key}, 1, ${resetTime.toISOString()})
      `
    }

    return {
      allowed: true,
      remaining: options.maxRequests - count - 1,
      resetTime: dbResetTime
    }
  }

  /**
   * Check rate limit using in-memory storage
   */
  private checkInMemoryRateLimit(
    key: string,
    options: RateLimitOptions,
    now: number
  ): Promise<RateLimitResult> {
    const entry = this.inMemoryStore.get(key)
    const resetTime = new Date(now + options.windowMs)

    // Check if entry exists and is still valid
    if (entry && entry.resetTime > now) {
      if (entry.count >= options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

        logger.warn('Rate limit exceeded (in-memory)', {
          data: {
            keyHash: hashSensitiveData(key),
            resource: options.resource,
            remaining: 0,
            retryAfter
          },
          tags: { type: 'security', component: 'rate-limit', action: 'blocked' }
        })

        return Promise.resolve({
          allowed: false,
          remaining: 0,
          resetTime: new Date(entry.resetTime),
          retryAfter
        })
      }

      // Increment counter
      entry.count++
      return Promise.resolve({
        allowed: true,
        remaining: options.maxRequests - entry.count,
        resetTime: new Date(entry.resetTime)
      })
    }

    // Create new entry
    this.inMemoryStore.set(key, {
      count: 1,
      resetTime: resetTime.getTime()
    })

    return Promise.resolve({
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime
    })
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(identifier: string, resource?: string): string {
    const hashedId = hashSensitiveData(identifier)
    return resource ? `ratelimit:${hashedId}:${resource}` : `ratelimit:${hashedId}`
  }

  /**
   * Clean up expired in-memory entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.inMemoryStore) {
      if (entry.resetTime <= now) {
        this.inMemoryStore.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired rate limit entries', {
        data: { cleaned, remaining: this.inMemoryStore.size },
        tags: { type: 'security', component: 'rate-limit', action: 'cleanup' }
      })
    }
  }

  /**
   * Reset rate limit for a specific identifier (for testing)
   */
  async resetRateLimit(identifier: string, resource?: string): Promise<void> {
    const key = this.generateKey(identifier, resource)

    // Clear from in-memory store
    this.inMemoryStore.delete(key)

    // Clear from database if available
    if (!this.isDevelopment && process.env.POSTGRES_URL) {
      try {
        await sql`DELETE FROM rate_limits WHERE key = ${key}`
      } catch (error) {
        logger.error('Failed to reset rate limit in database', {
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            keyHash: hashSensitiveData(key)
          },
          tags: { type: 'security', component: 'rate-limit', action: 'reset' }
        })
      }
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    identifier: string,
    resource?: string
  ): Promise<{ count: number; resetTime: Date } | null> {
    const key = this.generateKey(identifier, resource)

    // Check in-memory first
    const inMemoryEntry = this.inMemoryStore.get(key)
    if (inMemoryEntry && inMemoryEntry.resetTime > Date.now()) {
      return {
        count: inMemoryEntry.count,
        resetTime: new Date(inMemoryEntry.resetTime)
      }
    }

    // Check database if available
    if (!this.isDevelopment && process.env.POSTGRES_URL) {
      try {
        const result = await sql`
          SELECT count, reset_time 
          FROM rate_limits 
          WHERE key = ${key} AND reset_time > CURRENT_TIMESTAMP
        `

        if (result.rows.length > 0) {
          return {
            count: result.rows[0].count,
            resetTime: new Date(result.rows[0].reset_time)
          }
        }
      } catch (error) {
        logger.error('Failed to get rate limit status from database', {
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            keyHash: hashSensitiveData(key)
          },
          tags: { type: 'security', component: 'rate-limit', action: 'status' }
        })
      }
    }

    return null
  }

  /**
   * Cleanup and destroy the instance
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.inMemoryStore.clear()
  }
}

/**
 * Helper function to extract IP address from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    // Take the first IP from the forwarded chain
    return forwardedFor.split(',')[0].trim()
  }

  return cfConnectingIp || realIp || 'unknown'
}

/**
 * Standard rate limit configurations
 */
export const RateLimitConfigs = {
  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per 15 minutes
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 searches per minute
  },

  // GitHub API proxy
  github: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // 20 requests per minute
  },

  // User actions (submissions, updates)
  userAction: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 actions per minute
  }
}
