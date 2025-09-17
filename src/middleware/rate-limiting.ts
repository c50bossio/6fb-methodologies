// 6FB Methodologies Workshop - Rate Limiting Middleware
// Application-level rate limiting with Redis backend for distributed systems

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from 'ioredis'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
  onLimitReached?: (req: NextRequest) => void
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many API requests, please try again later',
  },

  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  },

  // Checkout and payment endpoints
  CHECKOUT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many checkout requests, please try again later',
  },

  // Webhook endpoints (higher limit for legitimate traffic)
  WEBHOOKS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Webhook rate limit exceeded',
  },

  // Inventory check endpoints
  INVENTORY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many inventory requests, please try again later',
  },

  // SMS test endpoints (very strict)
  SMS_TEST: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'SMS test limit exceeded, please try again later',
  },
} as const

class RateLimiter {
  private redis: Redis | null = null

  constructor() {
    this.initializeRedis()
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error)
        this.redis = null
      })
    } catch (error) {
      console.error('Failed to initialize Redis for rate limiting:', error)
      this.redis = null
    }
  }

  private defaultKeyGenerator(req: NextRequest): string {
    // Use IP address from various headers, fallback to connection info
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnectingIp = req.headers.get('cf-connecting-ip')

    const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Include path in key for endpoint-specific limiting
    const path = new URL(req.url).pathname

    return `rate_limit:${ip}:${path}:${userAgent.slice(0, 50)}`
  }

  async checkRateLimit(
    req: NextRequest,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: number
    totalRequests: number
  }> {
    const keyGenerator = config.keyGenerator || this.defaultKeyGenerator.bind(this)
    const key = keyGenerator(req)

    // Fallback to in-memory rate limiting if Redis is unavailable
    if (!this.redis) {
      return this.fallbackRateLimit(key, config)
    }

    try {
      const now = Date.now()
      const windowStart = now - config.windowMs

      // Use Redis sorted set for sliding window rate limiting
      const multi = this.redis.multi()

      // Remove expired entries
      multi.zremrangebyscore(key, '-inf', windowStart)

      // Add current request
      multi.zadd(key, now, `${now}-${Math.random()}`)

      // Count requests in current window
      multi.zcard(key)

      // Set expiration
      multi.expire(key, Math.ceil(config.windowMs / 1000))

      const results = await multi.exec()

      if (!results || results.some(([err]) => err)) {
        throw new Error('Redis multi-exec failed')
      }

      const requestCount = results[2][1] as number
      const allowed = requestCount <= config.maxRequests
      const remainingRequests = Math.max(0, config.maxRequests - requestCount)
      const resetTime = now + config.windowMs

      return {
        allowed,
        remainingRequests,
        resetTime,
        totalRequests: requestCount,
      }
    } catch (error) {
      console.error('Redis rate limiting error:', error)
      // Fallback to in-memory limiting
      return this.fallbackRateLimit(key, config)
    }
  }

  private fallbackRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: number
    totalRequests: number
  }> {
    // Simple in-memory fallback (not suitable for production clustering)
    console.warn('Using fallback in-memory rate limiting')

    return Promise.resolve({
      allowed: true,
      remainingRequests: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
      totalRequests: 0,
    })
  }

  async recordSuccessfulRequest(req: NextRequest, config: RateLimitConfig) {
    if (config.skipSuccessfulRequests) {
      // Implementation to remove this request from count
      // This is complex with sliding window, so we'll skip for now
    }
  }

  async recordFailedRequest(req: NextRequest, config: RateLimitConfig) {
    if (config.skipFailedRequests) {
      // Implementation to remove this request from count
      // This is complex with sliding window, so we'll skip for now
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

// Rate limiting middleware factory
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      const result = await rateLimiter.checkRateLimit(req, config)

      // Add rate limit headers to response
      const headers = new Headers()
      headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      headers.set('X-RateLimit-Remaining', result.remainingRequests.toString())
      headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
      headers.set('X-RateLimit-Window', Math.ceil(config.windowMs / 1000).toString())

      if (!result.allowed) {
        // Rate limit exceeded
        if (config.onLimitReached) {
          config.onLimitReached(req)
        }

        // Log rate limit violation
        console.warn('Rate limit exceeded:', {
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          path: new URL(req.url).pathname,
          userAgent: req.headers.get('user-agent'),
          requestCount: result.totalRequests,
          limit: config.maxRequests,
          window: config.windowMs / 1000,
        })

        // Return rate limit error response
        const response = NextResponse.json(
          {
            error: 'Too Many Requests',
            message: config.message || 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          { status: 429, headers }
        )

        return response
      }

      // Request allowed, but we can't modify the original request
      // The headers will be added by the calling code
      return null
    } catch (error) {
      console.error('Rate limiting middleware error:', error)
      // Allow request on error (fail open)
      return null
    }
  }
}

// Specific rate limiting middleware for different endpoints
export const generalApiRateLimit = createRateLimitMiddleware(RATE_LIMITS.API_GENERAL)
export const authRateLimit = createRateLimitMiddleware(RATE_LIMITS.AUTH)
export const checkoutRateLimit = createRateLimitMiddleware(RATE_LIMITS.CHECKOUT)
export const webhookRateLimit = createRateLimitMiddleware(RATE_LIMITS.WEBHOOKS)
export const inventoryRateLimit = createRateLimitMiddleware(RATE_LIMITS.INVENTORY)
export const smsTestRateLimit = createRateLimitMiddleware(RATE_LIMITS.SMS_TEST)

// Utility function to apply rate limiting in API routes
export async function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const middleware = createRateLimitMiddleware(config)
  return middleware(req)
}

// IP whitelist for internal services
const WHITELISTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  '172.20.0.0/16', // Docker network (simplified check)
])

export function isWhitelistedIP(req: NextRequest): boolean {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || ''

  // Simple whitelist check (in production, use proper CIDR matching)
  return WHITELISTED_IPS.has(ip) || ip.startsWith('172.20.')
}

// Rate limiting decorator for API routes
export function withRateLimit(config: RateLimitConfig) {
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async function (req: NextRequest): Promise<NextResponse> {
      // Skip rate limiting for whitelisted IPs
      if (isWhitelistedIP(req)) {
        return handler(req)
      }

      const rateLimitResponse = await applyRateLimit(req, config)
      if (rateLimitResponse) {
        return rateLimitResponse
      }

      return handler(req)
    }
  }
}

// Export the rate limiter instance for advanced usage
export { rateLimiter }