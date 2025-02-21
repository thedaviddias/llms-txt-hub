import { Redis } from '@upstash/redis'
import type { CacheInterface, CacheOptions } from './interfaces'

export interface UpstashConfig {
  url: string
  token: string
}

export class UpstashCache implements CacheInterface {
  private client: Redis
  private defaultNamespace?: string

  constructor(config: UpstashConfig, defaultNamespace?: string) {
    this.client = new Redis({
      url: config.url,
      token: config.token
    })
    this.defaultNamespace = defaultNamespace
  }

  private getNamespacedKey(key: string, namespace?: string): string {
    const ns = namespace || this.defaultNamespace
    return ns ? `${ns}:${key}` : key
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get<T>(this.getNamespacedKey(key))
    return value
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, options?.namespace)
    if (options?.ttl) {
      await this.client.set(namespacedKey, value, { ex: options.ttl })
    } else {
      await this.client.set(namespacedKey, value)
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.getNamespacedKey(key))
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(this.getNamespacedKey(key))
    return exists === 1
  }

  async clear(): Promise<void> {
    if (this.defaultNamespace) {
      const keys = await this.client.keys(`${this.defaultNamespace}:*`)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } else {
      await this.client.flushall()
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const namespacedKeys = keys.map(key => this.getNamespacedKey(key))
    const values = await this.client.mget<T[]>(...namespacedKeys)
    return values
  }

  async mset<T>(entries: [string, T][], options?: CacheOptions): Promise<void> {
    const namespacedEntries = entries.map(([key, value]) => [
      this.getNamespacedKey(key, options?.namespace),
      value
    ])

    await this.client.mset(namespacedEntries as [string, unknown][])

    if (options?.ttl) {
      await Promise.all(
        namespacedEntries.map(([key]) =>
          this.client.expire(key as string, options.ttl as number)
        )
      )
    }
  }
}
