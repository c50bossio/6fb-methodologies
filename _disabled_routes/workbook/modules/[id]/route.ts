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
    WHERE user_id = $1 AND completed = true
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
      progress_percentage,
      completed,
      time_spent_seconds,
      last_accessed,
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
 * Get lessons for the module from the content JSONB field
 * Since there's no workshop_lessons table, lessons are stored in module.content
 */
async function getModuleLessons(content: any): Promise<any[]> {
  // Extract lessons from the module content structure
  // Return empty array if no lessons structure exists
  if (!content || !content.lessons || !Array.isArray(content.lessons)) {
    return [];
  }

  // Transform the lessons data to match expected structure
  return content.lessons.map((lesson: any, index: number) => ({
    id: lesson.id || `lesson-${index + 1}`,
    title: lesson.title || `Lesson ${index + 1}`,
    type: lesson.type || 'text',
    estimated_minutes: lesson.estimatedMinutes || lesson.estimated_minutes || 0,
    sort_order: lesson.sortOrder || lesson.sort_order || index + 1,
    is_published: lesson.isPublished !== false, // Default to published
    prerequisites: lesson.prerequisites || [],
    created_at: new Date(),
    updated_at: new Date(),
  }));
}

/**
 * Get lesson progress for the user
 * TODO: Implement when lesson_progress table is created
 */
/*
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
*/

/**
 * Record module access for analytics
 */
async function recordModuleAccess(
  userId: string,
  moduleId: string
): Promise<void> {
  try {
    // Check if the module_access_log table exists first
    const tableExists = await db.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'module_access_log'
      )
    `
    );

    // If table doesn't exist, skip analytics logging gracefully
    if (!tableExists || tableExists.length === 0 || !tableExists[0].exists) {
      console.warn('module_access_log table does not exist, skipping analytics logging');
      return;
    }

    // Check if user accessed this module today
    const todayAccess = await db.query(
      `
      SELECT id, access_count FROM module_access_log
      WHERE user_id = $1 AND module_id = $2
      AND DATE(accessed_at) = CURRENT_DATE
    `,
      [userId, moduleId]
    );

    // Fix: todayAccess is already the rows array, not a result object with .rows property
    if (todayAccess && todayAccess.length > 0) {
      // Update today's access count
      await db.query(
        `
        UPDATE module_access_log
        SET access_count = access_count + 1
        WHERE id = $1
      `,
        [todayAccess[0].id]
      );
    } else {
      // Insert new access record for today
      await db.query(
        `
        INSERT INTO module_access_log (user_id, module_id, accessed_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, module_id)
        DO UPDATE SET
          accessed_at = CURRENT_TIMESTAMP,
          access_count = 1
      `,
        [userId, moduleId]
      );
    }
  } catch (error) {
    // Enhanced error logging for better debugging
    console.warn('Failed to record module access:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      moduleId,
      timestamp: new Date().toISOString(),
    });
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

    // Get module lessons from content
    const lessons = await getModuleLessons(module.content);

    // Get lesson progress if user has progress
    // TODO: Implement when lesson_progress table is created
    let lessonProgressMap = new Map();
    /*
    if (progress) {
      lessonProgressMap = await getLessonProgress(workbookUser.id, moduleId);
    }
    */

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

    // Ensure content has required fields and transform dates
    const transformedContent = {
      overview: module.content?.overview || '',
      learningObjectives: module.content?.learningObjectives?.length > 0
        ? module.content.learningObjectives
        : ['Learn the foundational concepts and principles'],
      keyTakeaways: module.content?.keyTakeaways || [],
      practicalExercises: module.content?.practicalExercises || [],
      resources: module.content?.resources || [],
      coreTopics: module.content?.coreTopics || [],
      practicalApplication: module.content?.practicalApplication || [],
      casestudies: module.content?.casestudies || [],
      systemsAndProcesses: module.content?.systemsAndProcesses || [],
    };

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
      content: transformedContent,
      prerequisites: module.prerequisites || [],
      isPublished: module.is_published,
      difficultyLevel: module.difficulty_level,
      tags: module.tags || [],
      createdAt: module.created_at instanceof Date ? module.created_at.toISOString() : module.created_at,
      updatedAt: module.updated_at instanceof Date ? module.updated_at.toISOString() : module.updated_at,
      progress: progress
        ? {
            progressPercent: progress.progress_percentage || 0,
            status: progress.completed ? 'completed' : (progress.progress_percentage > 0 ? 'in_progress' : 'not_started'),
            timeSpentMinutes: Math.round((progress.time_spent_seconds || 0) / 60),
            lastAccessedAt: progress.last_accessed,
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
      // Validate the properly transformed module data
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
      console.error('Module validation error:', error);
      console.error('Attempted to validate:', JSON.stringify({
        id: moduleWithDetails.id,
        title: moduleWithDetails.title,
        content: moduleWithDetails.content,
        createdAt: moduleWithDetails.createdAt,
        updatedAt: moduleWithDetails.updatedAt,
      }, null, 2));
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
