import { Ratelimit, type RatelimitConfig } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { keys } from './keys'

let redisClient: Redis | null = null

const getRedisClient = (): Redis => {
  if (!redisClient) {
    const config = keys()
    if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        'Upstash Redis configuration is missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      )
    }

    redisClient = new Redis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN
    })
  }
  return redisClient
}

export const createRateLimiter = (props: Omit<RatelimitConfig, 'redis'>) =>
  new Ratelimit({
    redis: getRedisClient(),
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, '10 s'),
    prefix: props.prefix ?? 'next-forge'
  })

export const { slidingWindow } = Ratelimit
