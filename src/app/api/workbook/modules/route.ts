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

// Rate limiting configuration
const RATE_LIMITS = {
  LIST_MODULES: { limit: 60, windowMs: 60000 }, // 60 requests per minute
  GET_MODULE: { limit: 100, windowMs: 60000 }, // 100 requests per minute
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a specific operation
 */
function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): boolean {
  const config = RATE_LIMITS[operation];
  const now = Date.now();
  const key = `${operation}_${userId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  if (record.count >= config.limit) {
    return false;
  }

  record.count++;
  return true;
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
    WHERE user_id = $1 AND status = 'completed'
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
    SELECT module_id, progress_percent, status, last_accessed_at, completed_at
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
    if (!checkRateLimit(auth.session.userId, 'LIST_MODULES')) {
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
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by published status
    if (validatedQuery.published !== undefined) {
      conditions.push(`is_published = $${paramIndex}`);
      params.push(validatedQuery.published);
      paramIndex++;
    }

    // Filter by difficulty level
    if (validatedQuery.difficulty) {
      conditions.push(`difficulty_level = $${paramIndex}`);
      params.push(validatedQuery.difficulty);
      paramIndex++;
    }

    // Filter by tag
    if (validatedQuery.tag) {
      const sanitizedTag = sanitizeSearchInput(validatedQuery.tag);
      conditions.push(`tags @> $${paramIndex}`);
      params.push(JSON.stringify([sanitizedTag]));
      paramIndex++;
    }

    // Build main query
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM workshop_modules
      ${whereClause}
    `;

    const countResult = await db.queryOne(countQuery, params);
    const total = parseInt(countResult?.total || '0');
    const totalPages = Math.ceil(total / limit);

    // Get modules with base information
    const modulesQuery = `
      SELECT
        id,
        title,
        description,
        module_order,
        duration_minutes,
        content,
        prerequisites,
        is_published,
        difficulty_level,
        tags,
        created_at,
        updated_at
      FROM workshop_modules
      ${whereClause}
      ORDER BY module_order ASC, created_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const modules = await db.query(modulesQuery, params);

    // Get user progress if requested
    let progressMap = new Map();
    let completedModules: string[] = [];

    if (validatedQuery.includeProgress && modules.length > 0) {
      const moduleIds = modules.map((m: any) => m.id);
      progressMap = await getUserProgress(workbookUser.id, moduleIds);
      completedModules = await getUserCompletedModules(workbookUser.id);
    }

    // Transform modules to response format
    const transformedModules: ModuleListItem[] = modules.map((module: any) => {
      const progress = progressMap.get(module.id);
      const prerequisitesMet = validatePrerequisites(
        completedModules,
        module.prerequisites || []
      );

      // Check if user has access based on subscription tier
      const hasAccess = validateModuleAccess(
        workbookUser.subscriptionTier,
        module.access_level // This could be added to the database schema
      );

      const moduleItem: ModuleListItem = {
        id: module.id,
        title: module.title,
        description: module.description || undefined,
        moduleOrder: module.module_order,
        durationMinutes: module.duration_minutes,
        difficultyLevel: module.difficulty_level || undefined,
        tags: module.tags || [],
        isPublished: module.is_published,
        prerequisitesMet,
        progressPercentage: progress?.progress_percent || 0,
        progressStatus: progress?.status || 'not_started',
        lastAccessedAt: progress?.last_accessed_at || undefined,
        completedAt: progress?.completed_at || undefined,
      };

      // Validate the transformed module
      try {
        return ModuleListItemSchema.parse(moduleItem);
      } catch (error) {
        console.error('Module transformation validation error:', error, module);
        throw new Error(`Invalid module data for module ${module.id}`);
      }
    });

    // Build pagination metadata
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Build successful response
    const response = {
      success: true as const,
      data: transformedModules,
      pagination,
      message: `Found ${transformedModules.length} modules`,
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
    if (!checkRateLimit(auth.session.userId, 'GET_MODULE')) {
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
