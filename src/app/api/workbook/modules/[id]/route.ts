// T026: Workshop Modules API - Specific module details endpoint
// GET /api/workbook/modules/[id] - Get detailed module information with progress and lessons

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
  validateUuidParam,
  validateModuleAccess,
  validatePrerequisites,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  WorkshopModuleSchema,
  type WorkshopModule,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for module details access
 */
function checkRateLimit(
  userId: string,
  limit: number = 30,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `module_details_${userId}`;
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
 * Get module progress for the user
 */
async function getModuleProgress(
  userId: string,
  moduleId: string
): Promise<any> {
  const progress = await db.queryOne(
    `
    SELECT
      progress_percent,
      status,
      time_spent_minutes,
      last_accessed_at,
      completed_at,
      created_at,
      updated_at
    FROM user_progress
    WHERE user_id = $1 AND module_id = $2
  `,
    [userId, moduleId]
  );

  return progress;
}

/**
 * Get lessons for the module
 */
async function getModuleLessons(moduleId: string): Promise<any[]> {
  const lessons = await db.query(
    `
    SELECT
      id,
      title,
      type,
      estimated_minutes,
      sort_order,
      is_published,
      prerequisites,
      created_at,
      updated_at
    FROM workshop_lessons
    WHERE module_id = $1 AND is_published = true
    ORDER BY sort_order ASC, created_at ASC
  `,
    [moduleId]
  );

  return lessons;
}

/**
 * Get lesson progress for the user
 */
async function getLessonProgress(
  userId: string,
  moduleId: string
): Promise<Map<string, any>> {
  const lessonProgress = await db.query(
    `
    SELECT
      lesson_id,
      progress_percentage,
      completed,
      completed_at,
      time_spent_seconds,
      last_position,
      quiz_score
    FROM lesson_progress
    WHERE user_id = $1 AND module_id = $2
  `,
    [userId, moduleId]
  );

  const progressMap = new Map();
  lessonProgress.forEach((progress: any) => {
    progressMap.set(progress.lesson_id, progress);
  });

  return progressMap;
}

/**
 * Record module access for analytics
 */
async function recordModuleAccess(
  userId: string,
  moduleId: string
): Promise<void> {
  try {
    await db.query(
      `
      INSERT INTO module_access_log (user_id, module_id, accessed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, module_id, DATE(accessed_at))
      DO UPDATE SET access_count = module_access_log.access_count + 1
    `,
      [userId, moduleId]
    );
  } catch (error) {
    // Log but don't fail the request if analytics logging fails
    console.warn('Failed to record module access:', error);
  }
}

/**
 * GET /api/workbook/modules/[id] - Get detailed module information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // Validate module ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid module ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const moduleId = validatedParams.id;

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
          error: 'Insufficient permissions to view module details',
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

    // Get module details
    const module = await db.queryOne(
      `
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
      WHERE id = $1
    `,
      [moduleId]
    );

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          error: 'Module not found',
          timestamp: Date.now(),
        },
        { status: 404 }
      );
    }

    // Check if module is published (unless user is admin)
    if (
      !module.is_published &&
      !hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Module is not currently available',
          timestamp: Date.now(),
        },
        { status: 404 }
      );
    }

    // Check subscription tier access
    const hasAccess = validateModuleAccess(
      workbookUser.subscriptionTier,
      module.access_level // This could be added to the database schema
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Your subscription tier does not include access to this module. Please upgrade your subscription.',
          code: 'SUBSCRIPTION_REQUIRED',
          details: {
            currentTier: workbookUser.subscriptionTier,
            requiredTier: module.access_level || 'premium',
          },
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Check prerequisites
    const completedModules = await getUserCompletedModules(workbookUser.id);
    const prerequisitesMet = validatePrerequisites(
      completedModules,
      module.prerequisites || []
    );

    if (
      !prerequisitesMet &&
      !hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN)
    ) {
      const missingPrerequisites = (module.prerequisites || []).filter(
        (prereq: string) => !completedModules.includes(prereq)
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Prerequisites not met for this module',
          code: 'PREREQUISITES_REQUIRED',
          details: {
            missingPrerequisites,
            completedModules,
          },
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Get user progress for this module
    const progress = await getModuleProgress(workbookUser.id, moduleId);

    // Get module lessons
    const lessons = await getModuleLessons(moduleId);

    // Get lesson progress if user has progress
    let lessonProgressMap = new Map();
    if (progress) {
      lessonProgressMap = await getLessonProgress(workbookUser.id, moduleId);
    }

    // Add progress information to lessons
    const lessonsWithProgress = lessons.map((lesson: any) => {
      const lessonProgress = lessonProgressMap.get(lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        estimatedMinutes: lesson.estimated_minutes,
        sortOrder: lesson.sort_order,
        isPublished: lesson.is_published,
        prerequisites: lesson.prerequisites || [],
        progress: lessonProgress
          ? {
              progressPercentage: lessonProgress.progress_percentage || 0,
              completed: lessonProgress.completed || false,
              completedAt: lessonProgress.completed_at,
              timeSpentSeconds: lessonProgress.time_spent_seconds || 0,
              lastPosition: lessonProgress.last_position || 0,
              quizScore: lessonProgress.quiz_score,
            }
          : {
              progressPercentage: 0,
              completed: false,
              completedAt: null,
              timeSpentSeconds: 0,
              lastPosition: 0,
              quizScore: null,
            },
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
      };
    });

    // Build detailed module response
    const moduleWithDetails: WorkshopModule & {
      progress?: any;
      lessons: any[];
      prerequisitesMet: boolean;
      accessGranted: boolean;
    } = {
      id: module.id,
      title: module.title,
      description: module.description,
      moduleOrder: module.module_order,
      durationMinutes: module.duration_minutes,
      content: module.content,
      prerequisites: module.prerequisites || [],
      isPublished: module.is_published,
      difficultyLevel: module.difficulty_level,
      tags: module.tags || [],
      createdAt: module.created_at,
      updatedAt: module.updated_at,
      progress: progress
        ? {
            progressPercent: progress.progress_percent || 0,
            status: progress.status || 'not_started',
            timeSpentMinutes: progress.time_spent_minutes || 0,
            lastAccessedAt: progress.last_accessed_at,
            completedAt: progress.completed_at,
            createdAt: progress.created_at,
            updatedAt: progress.updated_at,
          }
        : null,
      lessons: lessonsWithProgress,
      prerequisitesMet,
      accessGranted: hasAccess,
    };

    // Validate response against schema
    try {
      // We'll validate just the core module data
      WorkshopModuleSchema.parse({
        id: moduleWithDetails.id,
        title: moduleWithDetails.title,
        description: moduleWithDetails.description,
        moduleOrder: moduleWithDetails.moduleOrder,
        durationMinutes: moduleWithDetails.durationMinutes,
        content: moduleWithDetails.content,
        prerequisites: moduleWithDetails.prerequisites,
        isPublished: moduleWithDetails.isPublished,
        difficultyLevel: moduleWithDetails.difficultyLevel,
        tags: moduleWithDetails.tags,
        createdAt: moduleWithDetails.createdAt,
        updatedAt: moduleWithDetails.updatedAt,
      });
    } catch (error) {
      console.error('Module validation error:', error, module);
      throw new Error('Invalid module data structure');
    }

    // Record access for analytics (async, don't wait)
    recordModuleAccess(workbookUser.id, moduleId).catch(console.warn);

    // Build successful response
    const response = {
      success: true as const,
      data: moduleWithDetails,
      message: 'Module details retrieved successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Module details API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Module details GET error:', error);

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
        error: 'Failed to fetch module details',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workbook/modules/[id] - Update module (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate module ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid module ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
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

    return NextResponse.json(
      {
        success: false,
        error: 'Module update endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Module PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update module',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workbook/modules/[id] - Delete module (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate module ID parameter
    let validatedParams;
    try {
      validatedParams = validateUuidParam({ id: params.id });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid module ID format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
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

    return NextResponse.json(
      {
        success: false,
        error: 'Module deletion endpoint not yet implemented',
        message: 'This feature is planned for future release',
        timestamp: Date.now(),
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Module DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete module',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
