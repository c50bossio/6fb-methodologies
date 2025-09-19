/**
 * Workbook Middleware
 * Centralized authentication, rate limiting, and request validation for workbook APIs
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractToken, verifyToken, validateSession, hasPermission, WORKBOOK_PERMISSIONS, WorkbookSession } from './workbook-auth'
import db from './database'
import { Redis } from 'ioredis'

// Redis configuration for rate limiting (fallback to in-memory if Redis not available)
let redisClient: Redis | null = null

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL)
  }
} catch (error) {
  console.warn('Redis not available, using in-memory rate limiting')
}

// In-memory fallback for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest, session: WorkbookSession) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// Middleware configuration
export interface MiddlewareConfig {
  requireAuth: boolean
  requiredPermissions?: string[]
  rateLimit?: RateLimitConfig
  validateUser?: boolean
  logRequests?: boolean
}

// Middleware result
export interface MiddlewareResult {
  success: boolean
  session?: WorkbookSession
  error?: string
  status?: number
  response?: NextResponse
}

// Default rate limit configurations by endpoint type
export const RATE_LIMIT_CONFIGS = {
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 60
  },
  auth: {
    windowMs: 60000,
    maxRequests: 10
  },
  upload: {
    windowMs: 60000,
    maxRequests: 5
  },
  transcription: {
    windowMs: 60000,
    maxRequests: 10
  },
  notes: {
    windowMs: 60000,
    maxRequests: 50
  },
  progress: {
    windowMs: 60000,
    maxRequests: 30
  }
}

/**
 * Rate limiting implementation
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()

  if (redisClient) {
    // Use Redis for distributed rate limiting
    try {
      const multi = redisClient.multi()
      const windowKey = `rate_limit:${key}:${Math.floor(now / config.windowMs)}`

      multi.incr(windowKey)
      multi.expire(windowKey, Math.ceil(config.windowMs / 1000))

      const results = await multi.exec()
      const count = results?.[0]?.[1] as number || 0

      const remaining = Math.max(0, config.maxRequests - count)
      const resetTime = Math.ceil(now / config.windowMs) * config.windowMs + config.windowMs

      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetTime
      }
    } catch (error) {
      console.error('Redis rate limiting error:', error)
      // Fallback to in-memory
    }
  }

  // In-memory rate limiting fallback
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    }
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    }
  }

  record.count++
  rateLimitStore.set(key, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  }
}

/**
 * Ensure user exists in workbook_users table
 */
async function ensureWorkbookUser(session: WorkbookSession): Promise<void> {
  try {
    const existingUser = await db.queryOne(
      'SELECT id FROM workbook_users WHERE id = $1',
      [session.userId]
    )

    if (!existingUser) {
      // Create user record
      await db.query(`
        INSERT INTO workbook_users (
          id, email, first_name, last_name, subscription_tier,
          workshop_access_granted, daily_transcription_limit_minutes,
          monthly_cost_limit_cents, preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        session.userId,
        session.email,
        session.name?.split(' ')[0] || 'Workshop',
        session.name?.split(' ').slice(1).join(' ') || 'Participant',
        session.role || 'basic',
        true,
        session.role === 'vip' ? 240 : session.role === 'premium' ? 120 : 60,
        session.role === 'vip' ? 10000 : session.role === 'premium' ? 5000 : 2500,
        JSON.stringify({}),
        new Date(),
        new Date()
      ])
    }
  } catch (error) {
    console.error('Error ensuring workbook user:', error)
    throw new Error('Failed to setup user account')
  }
}

/**
 * Log request for monitoring and debugging
 */
async function logRequest(
  request: NextRequest,
  session: WorkbookSession | null,
  status: number,
  error?: string
): Promise<void> {
  try {
    const logData = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userId: session?.userId,
      email: session?.email,
      role: session?.role,
      status,
      error,
      timestamp: new Date().toISOString()
    }

    // In production, send to logging service
    console.log('API Request:', JSON.stringify(logData))

    // Optionally store critical errors in database
    if (status >= 500 && session?.userId) {
      await db.query(`
        INSERT INTO system_health (metric_name, metric_value, tags, timestamp)
        VALUES ($1, $2, $3, $4)
      `, [
        'api_error',
        status,
        JSON.stringify({
          endpoint: new URL(request.url).pathname,
          method: request.method,
          userId: session.userId,
          error: error?.substring(0, 500)
        }),
        new Date()
      ])
    }
  } catch (logError) {
    console.error('Error logging request:', logError)
  }
}

/**
 * Main middleware function
 */
export async function withWorkbookMiddleware(
  request: NextRequest,
  config: MiddlewareConfig
): Promise<MiddlewareResult> {
  const startTime = Date.now()

  try {
    // 1. Authentication
    let session: WorkbookSession | null = null

    if (config.requireAuth) {
      const token = extractToken(request)
      if (!token) {
        const result = {
          success: false,
          error: 'Authentication token required',
          status: 401
        }

        if (config.logRequests) {
          await logRequest(request, null, 401, result.error)
        }

        return result
      }

      session = verifyToken(token)
      const validation = validateSession(session)

      if (!validation.isValid) {
        const result = {
          success: false,
          error: validation.error || 'Invalid session',
          status: 401
        }

        if (config.logRequests) {
          await logRequest(request, null, 401, result.error)
        }

        return result
      }

      // Ensure user exists in workbook database
      if (config.validateUser) {
        try {
          await ensureWorkbookUser(session!)
        } catch (error) {
          const result = {
            success: false,
            error: 'Failed to validate user account',
            status: 500
          }

          if (config.logRequests) {
            await logRequest(request, session, 500, result.error)
          }

          return result
        }
      }
    }

    // 2. Permission checks
    if (config.requiredPermissions && session) {
      for (const permission of config.requiredPermissions) {
        if (!hasPermission(session, permission)) {
          const result = {
            success: false,
            error: `Insufficient permissions: ${permission}`,
            status: 403
          }

          if (config.logRequests) {
            await logRequest(request, session, 403, result.error)
          }

          return result
        }
      }
    }

    // 3. Rate limiting
    if (config.rateLimit && session) {
      const key = config.rateLimit.keyGenerator
        ? config.rateLimit.keyGenerator(request, session)
        : `${session.userId}:${new URL(request.url).pathname}`

      const rateLimitResult = await checkRateLimit(key, config.rateLimit)

      if (!rateLimitResult.allowed) {
        const response = NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', config.rateLimit.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

        const result = {
          success: false,
          error: 'Rate limit exceeded',
          status: 429,
          response
        }

        if (config.logRequests) {
          await logRequest(request, session, 429, result.error)
        }

        return result
      }
    }

    // 4. Success
    const result = {
      success: true,
      session: session || undefined
    }

    if (config.logRequests) {
      await logRequest(request, session, 200)
    }

    return result

  } catch (error) {
    console.error('Middleware error:', error)

    const result = {
      success: false,
      error: 'Internal middleware error',
      status: 500
    }

    if (config.logRequests) {
      await logRequest(
        request,
        null,
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return result
  }
}

/**
 * Helper function to create middleware with common configurations
 */
export function createWorkbookMiddleware(config: MiddlewareConfig) {
  return async (request: NextRequest) => {
    return withWorkbookMiddleware(request, config)
  }
}

/**
 * Predefined middleware configurations
 */
export const MIDDLEWARE_CONFIGS = {
  // Basic authenticated endpoint
  authenticated: {
    requireAuth: true,
    validateUser: true,
    rateLimit: RATE_LIMIT_CONFIGS.default,
    logRequests: true
  },

  // Recording/transcription endpoints
  audioProcessing: {
    requireAuth: true,
    requiredPermissions: [WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO],
    validateUser: true,
    rateLimit: RATE_LIMIT_CONFIGS.transcription,
    logRequests: true
  },

  // Note-taking endpoints
  notesTaking: {
    requireAuth: true,
    requiredPermissions: [WORKBOOK_PERMISSIONS.SAVE_PROGRESS],
    validateUser: true,
    rateLimit: RATE_LIMIT_CONFIGS.notes,
    logRequests: true
  },

  // Progress tracking
  progressTracking: {
    requireAuth: true,
    requiredPermissions: [WORKBOOK_PERMISSIONS.SAVE_PROGRESS],
    validateUser: true,
    rateLimit: RATE_LIMIT_CONFIGS.progress,
    logRequests: true
  },

  // Admin endpoints
  adminOnly: {
    requireAuth: true,
    requiredPermissions: ['admin_access'],
    validateUser: true,
    rateLimit: {
      windowMs: 60000,
      maxRequests: 20
    },
    logRequests: true
  }
} as const

// Export rate limit store for testing
export { rateLimitStore }