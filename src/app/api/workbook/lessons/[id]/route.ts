// T027: Workshop Lessons API - Specific lesson details and content delivery
// GET /api/workbook/lessons/[id] - Get detailed lesson content with progress tracking

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
  validateLessonIdParam,
  validateModuleAccess,
  validatePrerequisites,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  WorkshopLessonSchema,
  type WorkshopLesson,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for lesson access
 */
function checkRateLimit(
  userId: string,
  limit: number = 50,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `lesson_access_${userId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
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
 * Check lesson and module access permissions
 */
async function checkLessonAccess(
  userId: string,
  lessonId: string,
  userTier: SubscriptionTier
): Promise<{
  hasAccess: boolean;
  lesson?: any;
  module?: any;
  error?: string;
  code?: string;
}> {
  // Get lesson with module information
  const lesson = await db.queryOne(
    `
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
      wm.is_published as module_is_published,
      wm.prerequisites as module_prerequisites,
      wm.access_level as module_access_level,
      wm.difficulty_level as module_difficulty_level
    FROM workshop_lessons wl
    INNER JOIN workshop_modules wm ON wl.module_id = wm.id
    WHERE wl.id = $1
  `,
    [lessonId]
  );

  if (!lesson) {
    return {
      hasAccess: false,
      error: 'Lesson not found',
      code: 'LESSON_NOT_FOUND',
    };
  }

  // Check if lesson is published (unless user is admin)
  if (!lesson.is_published) {
    return {
      hasAccess: false,
      error: 'Lesson is not currently available',
      code: 'LESSON_NOT_PUBLISHED',
      lesson,
    };
  }

  // Check if module is published
  if (!lesson.module_is_published) {
    return {
      hasAccess: false,
      error: 'Module is not currently available',
      code: 'MODULE_NOT_PUBLISHED',
      lesson,
    };
  }

  // Check subscription tier access for module
  const hasModuleAccess = validateModuleAccess(userTier, lesson.module_access_level);
  if (!hasModuleAccess) {
    return {
      hasAccess: false,
      error: 'Your subscription tier does not include access to this module',
      code: 'SUBSCRIPTION_REQUIRED',
      lesson,
    };
  }

  // Check module prerequisites
  const completedModules = await db.query(
    `
    SELECT module_id
    FROM user_progress
    WHERE user_id = $1 AND status = 'completed'
  `,
    [userId]
  );

  const completedModuleIds = completedModules.map((row: any) => row.module_id);
  const modulePrerequisitesMet = validatePrerequisites(
    completedModuleIds,
    lesson.module_prerequisites || []
  );

  if (!modulePrerequisitesMet) {
    return {
      hasAccess: false,
      error: 'Module prerequisites not met',
      code: 'MODULE_PREREQUISITES_NOT_MET',
      lesson,
    };
  }

  // Check lesson prerequisites
  const completedLessons = await db.query(
    `
    SELECT lesson_id
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
  `,
    [userId]
  );

  const completedLessonIds = completedLessons.map((row: any) => row.lesson_id);
  const lessonPrerequisitesMet = validatePrerequisites(
    completedLessonIds,
    lesson.prerequisites || []
  );

  if (!lessonPrerequisitesMet) {
    return {
      hasAccess: false,
      error: 'Lesson prerequisites not met',
      code: 'LESSON_PREREQUISITES_NOT_MET',
      lesson,
    };
  }

  return {
    hasAccess: true,
    lesson,
    module: {
      id: lesson.module_id,
      title: lesson.module_title,
      difficultyLevel: lesson.module_difficulty_level,
      isPublished: lesson.module_is_published,
    },
  };
}

/**
 * Get lesson progress for user
 */
async function getLessonProgress(userId: string, lessonId: string): Promise<any> {
  const progress = await db.queryOne(
    `
    SELECT
      progress_percentage,
      completed,
      completed_at,
      time_spent_seconds,
      last_position,
      quiz_score,
      attempts_count,
      notes_count,
      created_at,
      updated_at
    FROM lesson_progress
    WHERE user_id = $1 AND lesson_id = $2
  `,
    [userId, lessonId]
  );

  return progress;
}

/**
 * Record lesson access for analytics
 */
async function recordLessonAccess(userId: string, lessonId: string): Promise<void> {
  try {
    await db.query(
      `
      INSERT INTO lesson_access_log (user_id, lesson_id, accessed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, lesson_id, DATE(accessed_at))
      DO UPDATE SET access_count = lesson_access_log.access_count + 1
    `,
      [userId, lessonId]
    );
  } catch (error) {
    // Log but don't fail the request if analytics logging fails
    console.warn('Failed to record lesson access:', error);
  }
}

/**
 * GET /api/workbook/lessons/[id] - Get detailed lesson content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // Validate lesson ID parameter
    let validatedParams;
    try {
      validatedParams = validateLessonIdParam({ lessonId: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid lesson ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const lessonId = validatedParams.lessonId;

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
          error: 'Insufficient permissions to view lesson content',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        { status: 429 }
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

    // Check lesson access
    const accessCheck = await checkLessonAccess(
      workbookUser.id,
      lessonId,
      workbookUser.subscriptionTier
    );

    if (!accessCheck.hasAccess) {
      const statusCode = accessCheck.code === 'LESSON_NOT_FOUND' ? 404 : 403;
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.error || 'Access denied',
          code: accessCheck.code,
          timestamp: Date.now(),
        },
        { status: statusCode }
      );
    }

    const lesson = accessCheck.lesson!;
    const module = accessCheck.module!;

    // Get user progress for this lesson
    const progress = await getLessonProgress(workbookUser.id, lessonId);

    // Build detailed lesson response
    const lessonWithDetails = {
      id: lesson.id,
      moduleId: lesson.module_id,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      estimatedMinutes: lesson.estimated_minutes,
      sortOrder: lesson.sort_order,
      isPublished: lesson.is_published,
      prerequisites: lesson.prerequisites || [],
      module: module,
      progress: progress ? {
        progressPercentage: progress.progress_percentage || 0,
        completed: progress.completed || false,
        completedAt: progress.completed_at,
        timeSpentSeconds: progress.time_spent_seconds || 0,
        lastPosition: progress.last_position || 0,
        quizScore: progress.quiz_score,
        attemptsCount: progress.attempts_count || 0,
        notesCount: progress.notes_count || 0,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at,
      } : null,
      accessGranted: true,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
    };

    // Validate response against schema (core lesson data)
    try {
      WorkshopLessonSchema.parse({
        id: lessonWithDetails.id,
        moduleId: lessonWithDetails.moduleId,
        title: lessonWithDetails.title,
        type: lessonWithDetails.type,
        content: lessonWithDetails.content,
        estimatedMinutes: lessonWithDetails.estimatedMinutes,
        sortOrder: lessonWithDetails.sortOrder,
        isPublished: lessonWithDetails.isPublished,
        prerequisites: lessonWithDetails.prerequisites,
        createdAt: lessonWithDetails.createdAt,
        updatedAt: lessonWithDetails.updatedAt,
      });
    } catch (error) {
      console.error('Lesson validation error:', error, lesson);
      throw new Error('Invalid lesson data structure');
    }

    // Record access for analytics (async, don't wait)
    recordLessonAccess(workbookUser.id, lessonId).catch(console.warn);

    // Build successful response
    const response = {
      success: true as const,
      data: lessonWithDetails,
      message: 'Lesson content retrieved successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Lesson details API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Lesson details GET error:', error);

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
        error: 'Failed to fetch lesson content',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workbook/lessons/[id] - Update lesson (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate lesson ID parameter
    let validatedParams;
    try {
      validatedParams = validateLessonIdParam({ lessonId: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid lesson ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      {
        success: false,
        error: 'Lesson update endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Lesson PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update lesson',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workbook/lessons/[id] - Delete lesson (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate lesson ID parameter
    let validatedParams;
    try {
      validatedParams = validateLessonIdParam({ lessonId: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid lesson ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      {
        success: false,
        error: 'Lesson deletion endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Lesson DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete lesson',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}