# Caching Package

A flexible caching solution that provides a unified interface for different caching implementations.

## Features

- 🚀 Type-safe caching interface
- 🔄 Support for TTL (Time-To-Live)
- 📦 Namespace support for key isolation
- 📝 Batch operations (mget, mset)
- ⚡ Upstash Redis implementation

## Installation

```bash
pnpm add @thedaviddias/caching
```

## Usage

### Upstash Redis

```typescript
import { UpstashCache } from "@thedaviddias/caching/upstash";
import { env } from "@thedaviddias/config-environment";

const cache = new UpstashCache({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
}, "my-namespace"); // Optional namespace

// Basic operations
await cache.set("key", "value");
const value = await cache.get("key");
await cache.delete("key");
const exists = await cache.has("key");

// With TTL
await cache.set("key", "value", { ttl: 3600 }); // Expires in 1 hour

// Batch operations
await cache.mset([
  ["key1", "value1"],
  ["key2", "value2"]
], { ttl: 3600 });

const values = await cache.mget(["key1", "key2"]);

// Clear cache
await cache.clear(); // Clears only keys in the namespace if specified
```

### Custom Namespace

You can use different namespaces to isolate cache keys:

```typescript
import { env } from "@thedaviddias/config-environment";

const config = {
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
};

const userCache = new UpstashCache(config, "users");
const postCache = new UpstashCache(config, "posts");

await userCache.set("123", { name: "John" });  // Stored as "users:123"
await postCache.set("456", { title: "Hello" }); // Stored as "posts:456"
```

### Environment Variables

Required environment variables for Upstash Redis:

```bash
KV_REST_API_URL=your-redis-url
KV_REST_API_TOKEN=your-redis-token
```

## API Reference

### CacheInterface

```typescript
interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
}

interface CacheOptions {
  ttl?: number;      // Time-to-live in seconds
  namespace?: string; // Override default namespace
}
```

## Best Practices

1. **Use Namespaces**: Always use namespaces to prevent key collisions between different parts of your application.
2. **Set TTL**: Set appropriate TTL values to prevent stale data and manage memory usage.
3. **Batch Operations**: Use `mget` and `mset` for better performance when dealing with multiple keys.
4. **Type Safety**: Leverage TypeScript generics for type-safe caching operations.
5. **Environment Variables**: Always use `env` from `@thedaviddias/config-environment` instead of `process.env`.

## Contributing

If you need to implement a new caching provider, implement the `CacheInterface` interface and follow the existing patterns.
