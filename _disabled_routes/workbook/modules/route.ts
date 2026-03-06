// T026: Workshop Modules API - Core module management and content delivery
// GET /api/workbook/modules - List all workshop modules with metadata and progress tracking

import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
import {
  validateModulesQuery,
  validateModuleAccess,
  validatePrerequisites,
  sanitizeSearchInput,
  validatePagination,
  PaginatedResponseSchema,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ModuleListItemSchema,
  GetModulesQuery,
  type ModuleListItem,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';
import { optimizedQueries } from '@/lib/optimized-queries';
import { rateLimiter } from '@/lib/redis-cache';

// Rate limiting configuration
const RATE_LIMITS = {
  LIST_MODULES: { limit: 60, windowMs: 60000 }, // 60 requests per minute
  GET_MODULE: { limit: 100, windowMs: 60000 }, // 100 requests per minute
};

/**
 * Check rate limit using Redis-based rate limiter
 */
async function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<boolean> {
  const config = RATE_LIMITS[operation];
  const result = await rateLimiter.checkLimit(
    userId,
    config.limit,
    config.windowMs,
    operation
  );
  return result.allowed;
}

/**
 * Authenticate and validate request
 */
async function authenticateRequest(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return { error: 'Authentication token required', status: 401 };
  }

  const session = verifyToken(token);
  const validation = validateSession(session);

  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 };
  }

  return { session: session! };
}

/**
 * Ensure workbook_user exists and return UUID
 */
async function ensureWorkbookUser(session: any): Promise<{
  id: string;
  subscriptionTier: SubscriptionTier;
  workshopAccessGranted: boolean;
}> {
  // Check if workbook_user exists by email
  let workbookUser = await db.queryOne(
    `
    SELECT id, subscription_tier, workshop_access_granted
    FROM workbook_users
    WHERE email = $1
  `,
    [session.email]
  );

  if (!workbookUser) {
    // Create workbook_user record
    workbookUser = await db.queryOne(
      `
      INSERT INTO workbook_users (
        email, first_name, last_name, subscription_tier, workshop_access_granted
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, subscription_tier, workshop_access_granted
    `,
      [
        session.email,
        session.name?.split(' ')[0] || 'User',
        session.name?.split(' ').slice(1).join(' ') || '',
        'basic', // Default tier
        true, // Grant workshop access
      ]
    );
  }

  return {
    id: workbookUser.id,
    subscriptionTier: workbookUser.subscription_tier,
    workshopAccessGranted: workbookUser.workshop_access_granted,
  };
}

/**
 * Get user's completed modules for prerequisite checking
 */
async function getUserCompletedModules(userId: string): Promise<string[]> {
  const completedModules = await db.query(
    `
    SELECT module_id
    FROM user_progress
    WHERE user_id = $1 AND completed = true
  `,
    [userId]
  );

  return completedModules.map((row: any) => row.module_id);
}

/**
 * Get user progress for modules
 */
async function getUserProgress(
  userId: string,
  moduleIds?: string[]
): Promise<Map<string, any>> {
  let query = `
    SELECT module_id, progress_percentage, completed, last_accessed, completed_at
    FROM user_progress
    WHERE user_id = $1
  `;
  const params: any[] = [userId];

  if (moduleIds && moduleIds.length > 0) {
    query += ` AND module_id = ANY($2)`;
    params.push(moduleIds);
  }

  const progressRecords = await db.query(query, params);

  const progressMap = new Map();
  progressRecords.forEach((record: any) => {
    progressMap.set(record.module_id, record);
  });

  return progressMap;
}

/**
 * GET /api/workbook/modules - List all workshop modules with metadata and progress
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          timestamp: Date.now(),
        },
        { status: auth.status }
      );
    }

    // Check permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to view modules',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitAllowed = await checkRateLimit(auth.session.userId, 'LIST_MODULES');
    if (!rateLimitAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    let validatedQuery: GetModulesQuery;
    try {
      validatedQuery = validateModulesQuery(queryParams);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid query parameters: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Ensure workbook_user exists and get user info
    const workbookUser = await ensureWorkbookUser(auth.session);

    // Check workshop access
    if (!workbookUser.workshopAccessGranted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workshop access not granted. Please contact support.',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Validate and sanitize pagination
    const { page, limit } = validatePagination(
      validatedQuery.page,
      validatedQuery.limit
    );

    // Use optimized query service with caching
    const result = await optimizedQueries.getUserModulesWithProgress(
      workbookUser.id,
      {
        page,
        limit,
        publishedOnly: validatedQuery.published !== false,
        includeProgress: validatedQuery.includeProgress !== false,
        tag: validatedQuery.tag,
        difficulty: validatedQuery.difficulty,
      }
    );

    // Build successful response
    const response = {
      success: true as const,
      data: result.modules,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
      message: `Found ${result.modules.length} modules`,
      timestamp: Date.now(),
    };

    // Validate response schema
    try {
      const validatedResponse =
        PaginatedResponseSchema(ModuleListItemSchema).parse(response);

      // Add performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        const responseTime = Date.now() - startTime;
        console.log(`Modules API response time: ${responseTime}ms`);
      }

      return NextResponse.json(validatedResponse);
    } catch (error) {
      console.error('Response validation error:', error);
      throw new Error('Failed to validate response format');
    }
  } catch (error) {
    console.error('Modules GET error:', error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
          timestamp: Date.now(),
        },
        { status: 500 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch modules',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workbook/modules - Create a new module (admin only)
 * This endpoint would be used by administrators to create new modules
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          timestamp: Date.now(),
        },
        { status: auth.status }
      );
    }

    // Check admin permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Administrative permissions required',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting for admin operations
    const rateLimitAllowed = await checkRateLimit(auth.session.userId, 'GET_MODULE');
    if (!rateLimitAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Module creation endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Modules POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create module',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
