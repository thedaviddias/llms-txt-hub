import { Redis } from '@upstash/redis'
import type { CacheInterface, CacheOptions } from './interfaces'
import { keys } from './keys'

export class UpstashCache implements CacheInterface {
  private client: Redis | null = null
  private defaultNamespace?: string

  constructor(defaultNamespace?: string) {
    this.defaultNamespace = defaultNamespace
  }

  private getClient(): Redis {
    if (!this.client) {
      const config = keys()
      if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error(
          'Upstash Redis configuration is missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
        )
      }

      this.client = new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN
      })
    }
    return this.client
  }

  private getNamespacedKey(key: string, namespace?: string): string {
    const ns = namespace || this.defaultNamespace
    return ns ? `${ns}:${key}` : key
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient()
    const value = await client.get<T>(this.getNamespacedKey(key))
    return value
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const client = this.getClient()
    const namespacedKey = this.getNamespacedKey(key, options?.namespace)
    if (options?.ttl) {
      await client.set(namespacedKey, value, { ex: options.ttl })
    } else {
      await client.set(namespacedKey, value)
    }
  }

  async delete(key: string): Promise<void> {
    const client = this.getClient()
    await client.del(this.getNamespacedKey(key))
  }

  async has(key: string): Promise<boolean> {
    const client = this.getClient()
    const exists = await client.exists(this.getNamespacedKey(key))
    return exists === 1
  }

  async clear(): Promise<void> {
    const client = this.getClient()
    if (this.defaultNamespace) {
      const keys = await client.keys(`${this.defaultNamespace}:*`)
      if (keys.length > 0) {
        await client.del(...keys)
      }
    } else {
      await client.flushall()
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const client = this.getClient()
    const namespacedKeys = keys.map(key => this.getNamespacedKey(key))
    const values = await client.mget<T[]>(...namespacedKeys)
    return values
  }

  async mset<T>(entries: [string, T][], options?: CacheOptions): Promise<void> {
    const client = this.getClient()
    const namespacedEntries = entries.map(([key, value]) => [
      this.getNamespacedKey(key, options?.namespace),
      value
    ])

    // Convert array of tuples to Record<string, unknown>
    const record = Object.fromEntries(namespacedEntries)
    await client.mset(record)

    if (options?.ttl) {
      await Promise.all(
        namespacedEntries.map(([key]) => client.expire(key as string, options.ttl as number))
      )
    }
  }
}
