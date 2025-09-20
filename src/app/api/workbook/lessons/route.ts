// T027: Workshop Lessons API - Lesson management and content delivery
// GET /api/workbook/lessons - List lessons with filtering and progress tracking

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
  validateLessonsQuery,
  validateModuleAccess,
  validatePrerequisites,
  sanitizeSearchInput,
  validatePagination,
  PaginatedResponseSchema,
  WorkbookErrorResponseSchema,
  WorkshopLessonSchema,
  type WorkshopLesson,
  type GetLessonsQuery,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting configuration
const RATE_LIMITS = {
  LIST_LESSONS: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  GET_LESSON: { limit: 150, windowMs: 60000 }, // 150 requests per minute
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
 * Ensure workbook_user exists and return user info
 */
async function ensureWorkbookUser(session: any): Promise<{
  id: string;
  subscriptionTier: SubscriptionTier;
  workshopAccessGranted: boolean;
}> {
  let workbookUser = await db.queryOne(
    `
    SELECT id, subscription_tier, workshop_access_granted
    FROM workbook_users
    WHERE email = $1
  `,
    [session.email]
  );

  if (!workbookUser) {
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
        'basic',
        true,
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
 * Get user's completed lessons for prerequisite checking
 */
async function getUserCompletedLessons(userId: string): Promise<string[]> {
  const completedLessons = await db.query(
    `
    SELECT lesson_id
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
  `,
    [userId]
  );

  return completedLessons.map((row: any) => row.lesson_id);
}

/**
 * Get lesson progress for user
 */
async function getLessonProgress(userId: string, lessonIds?: string[]): Promise<Map<string, any>> {
  let query = `
    SELECT
      lesson_id,
      progress_percentage,
      completed,
      completed_at,
      time_spent_seconds,
      last_position,
      quiz_score,
      attempts_count,
      notes_count
    FROM lesson_progress
    WHERE user_id = $1
  `;
  const params: any[] = [userId];

  if (lessonIds && lessonIds.length > 0) {
    query += ` AND lesson_id = ANY($2)`;
    params.push(lessonIds);
  }

  const progressRecords = await db.query(query, params);

  const progressMap = new Map();
  progressRecords.forEach((record: any) => {
    progressMap.set(record.lesson_id, record);
  });

  return progressMap;
}

/**
 * Check if user has access to specific module
 */
async function checkModuleAccess(
  userId: string,
  moduleId: string,
  userTier: SubscriptionTier
): Promise<{ hasAccess: boolean; module?: any; error?: string }> {
  const module = await db.queryOne(
    `
    SELECT
      id,
      title,
      is_published,
      prerequisites,
      access_level
    FROM workshop_modules
    WHERE id = $1
  `,
    [moduleId]
  );

  if (!module) {
    return { hasAccess: false, error: 'Module not found' };
  }

  if (!module.is_published) {
    return { hasAccess: false, error: 'Module is not published' };
  }

  // Check subscription tier access
  const hasAccess = validateModuleAccess(userTier, module.access_level);
  if (!hasAccess) {
    return {
      hasAccess: false,
      error: 'Insufficient subscription tier for this module',
      module,
    };
  }

  // Check prerequisites
  const completedModules = await db.query(
    `
    SELECT module_id
    FROM user_progress
    WHERE user_id = $1 AND status = 'completed'
  `,
    [userId]
  );

  const completedModuleIds = completedModules.map((row: any) => row.module_id);
  const prerequisitesMet = validatePrerequisites(
    completedModuleIds,
    module.prerequisites || []
  );

  if (!prerequisitesMet) {
    return {
      hasAccess: false,
      error: 'Module prerequisites not met',
      module,
    };
  }

  return { hasAccess: true, module };
}

/**
 * GET /api/workbook/lessons - List lessons with filtering and progress
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
          timestamp: Date.now()
        },
        { status: auth.status }
      );
    }

    // Check permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to view lessons',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'LIST_LESSONS')) {
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

    let validatedQuery: GetLessonsQuery;
    try {
      validatedQuery = validateLessonsQuery(queryParams);
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
    const { page, limit } = validatePagination(validatedQuery.page, validatedQuery.limit);
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by module ID if specified
    if (validatedQuery.moduleId) {
      // Check if user has access to the module
      const moduleAccess = await checkModuleAccess(
        workbookUser.id,
        validatedQuery.moduleId,
        workbookUser.subscriptionTier
      );

      if (!moduleAccess.hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: moduleAccess.error || 'Access denied to module',
            timestamp: Date.now(),
          },
          { status: 403 }
        );
      }

      conditions.push(`wl.module_id = $${paramIndex}`);
      params.push(validatedQuery.moduleId);
      paramIndex++;
    }

    // Filter by lesson type
    if (validatedQuery.type) {
      conditions.push(`wl.type = $${paramIndex}`);
      params.push(validatedQuery.type);
      paramIndex++;
    }

    // Filter by published status (default to published only unless admin)
    const isAdmin = hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN);
    if (validatedQuery.published !== undefined) {
      conditions.push(`wl.is_published = $${paramIndex}`);
      params.push(validatedQuery.published);
      paramIndex++;
    } else if (!isAdmin) {
      conditions.push(`wl.is_published = true`);
    }

    // Join with modules to check access
    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM workshop_lessons wl
      INNER JOIN workshop_modules wm ON wl.module_id = wm.id
      ${whereClause}
    `;

    const countResult = await db.queryOne(countQuery, params);
    const total = parseInt(countResult?.total || '0');
    const totalPages = Math.ceil(total / limit);

    // Get lessons with module information
    const lessonsQuery = `
      SELECT
        wl.id,
        wl.module_id,
        wl.title,
        wl.type,
        wl.content,
        wl.estimated_minutes,
        wl.sort_order,
        wl.is_published,
        wl.prerequisites,
        wl.created_at,
        wl.updated_at,
        wm.title as module_title,
        wm.difficulty_level as module_difficulty_level,
        wm.is_published as module_is_published
      FROM workshop_lessons wl
      INNER JOIN workshop_modules wm ON wl.module_id = wm.id
      ${whereClause}
      ORDER BY wm.module_order ASC, wl.sort_order ASC, wl.created_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const lessons = await db.query(lessonsQuery, params);

    // Get user progress for lessons if any lessons found
    let progressMap = new Map();
    let completedLessons: string[] = [];

    if (lessons.length > 0) {
      const lessonIds = lessons.map((l: any) => l.id);
      progressMap = await getLessonProgress(workbookUser.id, lessonIds);
      completedLessons = await getUserCompletedLessons(workbookUser.id);
    }

    // Transform lessons to response format
    const transformedLessons = lessons.map((lesson: any) => {
      const progress = progressMap.get(lesson.id);
      const prerequisitesMet = validatePrerequisites(
        completedLessons,
        lesson.prerequisites || []
      );

      // Check if user has access based on subscription tier
      const hasAccess = validateModuleAccess(
        workbookUser.subscriptionTier,
        lesson.access_level
      );

      const lessonItem = {
        id: lesson.id,
        moduleId: lesson.module_id,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        estimatedMinutes: lesson.estimated_minutes,
        sortOrder: lesson.sort_order,
        isPublished: lesson.is_published,
        prerequisites: lesson.prerequisites || [],
        moduleInfo: {
          title: lesson.module_title,
          difficultyLevel: lesson.module_difficulty_level,
          isPublished: lesson.module_is_published,
        },
        progress: progress ? {
          progressPercentage: progress.progress_percentage || 0,
          completed: progress.completed || false,
          completedAt: progress.completed_at,
          timeSpentSeconds: progress.time_spent_seconds || 0,
          lastPosition: progress.last_position || 0,
          quizScore: progress.quiz_score,
          attemptsCount: progress.attempts_count || 0,
          notesCount: progress.notes_count || 0,
        } : {
          progressPercentage: 0,
          completed: false,
          completedAt: null,
          timeSpentSeconds: 0,
          lastPosition: 0,
          quizScore: null,
          attemptsCount: 0,
          notesCount: 0,
        },
        prerequisitesMet,
        accessGranted: hasAccess,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
      };

      return lessonItem;
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
      data: transformedLessons,
      pagination,
      message: `Found ${transformedLessons.length} lessons`,
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Lessons API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Lessons GET error:', error);

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
        error: 'Failed to fetch lessons',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workbook/lessons - Create a new lesson (admin only)
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
          timestamp: Date.now()
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
    if (!checkRateLimit(auth.session.userId, 'GET_LESSON')) {
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
        error: 'Lesson creation endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Lessons POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create lesson',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}