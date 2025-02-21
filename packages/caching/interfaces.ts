/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number
  /** Namespace for the cache key */
  namespace?: string
}

/**
 * Core caching interface that all implementations must follow
 */
export interface CacheInterface {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<void>

  /**
   * Check if a key exists in cache
   */
  has(key: string): Promise<boolean>

  /**
   * Clear all values in cache
   */
  clear(): Promise<void>

  /**
   * Get multiple values from cache
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>

  /**
   * Set multiple values in cache
   */
  mset<T>(entries: [string, T][], options?: CacheOptions): Promise<void>
}
