// T027: Workshop Lessons API - Lesson completion tracking
// POST /api/workbook/lessons/[id]/complete - Mark lesson as complete with progress tracking

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
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
  validateCompleteLessonBody,
  validateModuleAccess,
  validatePrerequisites,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  type CompleteLessonRequest,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for lesson completion
 */
function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `lesson_complete_${userId}`;
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
 * Validate lesson access and get lesson details
 */
async function validateLessonAccess(
  userId: string,
  lessonId: string,
  userTier: SubscriptionTier
): Promise<{
  isValid: boolean;
  lesson?: any;
  error?: string;
  code?: string;
}> {
  const lesson = await db.queryOne(
    `
    SELECT
      wl.id,
      wl.module_id,
      wl.title,
      wl.type,
      wl.estimated_minutes,
      wl.is_published,
      wl.prerequisites,
      wm.title as module_title,
      wm.is_published as module_is_published,
      wm.prerequisites as module_prerequisites,
      wm.access_level as module_access_level
    FROM workshop_lessons wl
    INNER JOIN workshop_modules wm ON wl.module_id = wm.id
    WHERE wl.id = $1
  `,
    [lessonId]
  );

  if (!lesson) {
    return {
      isValid: false,
      error: 'Lesson not found',
      code: 'LESSON_NOT_FOUND',
    };
  }

  if (!lesson.is_published || !lesson.module_is_published) {
    return {
      isValid: false,
      error: 'Lesson or module is not currently available',
      code: 'CONTENT_NOT_AVAILABLE',
      lesson,
    };
  }

  // Check subscription tier access
  const hasAccess = validateModuleAccess(userTier, lesson.module_access_level);
  if (!hasAccess) {
    return {
      isValid: false,
      error: 'Insufficient subscription tier for this lesson',
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
      isValid: false,
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
      isValid: false,
      error: 'Lesson prerequisites not met',
      code: 'LESSON_PREREQUISITES_NOT_MET',
      lesson,
    };
  }

  return {
    isValid: true,
    lesson,
  };
}

/**
 * Update or create lesson progress
 */
async function updateLessonProgress(
  userId: string,
  lessonId: string,
  moduleId: string,
  completionData: CompleteLessonRequest
): Promise<any> {
  const now = new Date();

  // Check if progress record exists
  const existingProgress = await db.queryOne(
    `
    SELECT id, progress_percentage, completed, time_spent_seconds, attempts_count
    FROM lesson_progress
    WHERE user_id = $1 AND lesson_id = $2
  `,
    [userId, lessonId]
  );

  let progressRecord;

  if (existingProgress) {
    // Update existing progress
    progressRecord = await db.queryOne(
      `
      UPDATE lesson_progress
      SET
        progress_percentage = 100,
        completed = true,
        completed_at = $1,
        time_spent_seconds = time_spent_seconds + $2,
        quiz_score = COALESCE($3, quiz_score),
        attempts_count = attempts_count + 1,
        updated_at = $1
      WHERE user_id = $4 AND lesson_id = $5
      RETURNING *
    `,
      [
        now,
        completionData.timeSpentMinutes ? completionData.timeSpentMinutes * 60 : 0,
        completionData.score,
        userId,
        lessonId,
      ]
    );
  } else {
    // Create new progress record
    const progressId = uuidv4();
    progressRecord = await db.queryOne(
      `
      INSERT INTO lesson_progress (
        id, user_id, lesson_id, module_id, progress_percentage,
        completed, completed_at, time_spent_seconds, quiz_score,
        attempts_count, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 100, true, $5, $6, $7, 1, $5, $5)
      RETURNING *
    `,
      [
        progressId,
        userId,
        lessonId,
        moduleId,
        now,
        completionData.timeSpentMinutes ? completionData.timeSpentMinutes * 60 : 0,
        completionData.score,
      ]
    );
  }

  return progressRecord;
}

/**
 * Update module progress when lesson is completed
 */
async function updateModuleProgress(
  userId: string,
  moduleId: string,
  timeSpentMinutes: number = 0
): Promise<void> {
  // Get total lessons in module and completed lessons
  const moduleStats = await db.queryOne(
    `
    SELECT
      COUNT(wl.id) as total_lessons,
      COUNT(lp.lesson_id) as completed_lessons
    FROM workshop_lessons wl
    LEFT JOIN lesson_progress lp ON wl.id = lp.lesson_id
      AND lp.user_id = $1 AND lp.completed = true
    WHERE wl.module_id = $2 AND wl.is_published = true
  `,
    [userId, moduleId]
  );

  const totalLessons = parseInt(moduleStats?.total_lessons || '0');
  const completedLessons = parseInt(moduleStats?.completed_lessons || '0');
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isModuleCompleted = progressPercent === 100;

  // Update or create module progress
  const now = new Date();
  await db.query(
    `
    INSERT INTO user_progress (
      id, user_id, module_id, progress_percent, status,
      time_spent_minutes, last_accessed_at, completed_at,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $7, $7
    )
    ON CONFLICT (user_id, module_id)
    DO UPDATE SET
      progress_percent = $4,
      status = $5,
      time_spent_minutes = user_progress.time_spent_minutes + $6,
      last_accessed_at = $7,
      completed_at = CASE WHEN $5 = 'completed' THEN $7 ELSE user_progress.completed_at END,
      updated_at = $7
  `,
    [
      uuidv4(),
      userId,
      moduleId,
      progressPercent,
      isModuleCompleted ? 'completed' : 'in_progress',
      timeSpentMinutes,
      now,
      isModuleCompleted ? now : null,
    ]
  );
}

/**
 * Create completion achievement if applicable
 */
async function createCompletionAchievement(
  userId: string,
  lessonId: string,
  moduleId: string,
  score?: number
): Promise<void> {
  try {
    // Check if this is a significant milestone
    const moduleProgress = await db.queryOne(
      `
      SELECT status FROM user_progress
      WHERE user_id = $1 AND module_id = $2
    `,
      [userId, moduleId]
    );

    if (moduleProgress?.status === 'completed') {
      // Module completed - create achievement
      await db.query(
        `
        INSERT INTO user_achievements (
          id, user_id, achievement_type, achievement_id,
          title, description, earned_at, metadata, created_at
        )
        VALUES ($1, $2, 'module_completed', $3, $4, $5, $6, $7, $6)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `,
        [
          uuidv4(),
          userId,
          `module-${moduleId}-completion`,
          'Module Completed',
          'Successfully completed a workshop module',
          new Date(),
          JSON.stringify({
            moduleId,
            lastLessonId: lessonId,
            score: score || null,
          }),
        ]
      );
    }

    // Check for quiz achievements if score provided
    if (score !== undefined && score >= 90) {
      await db.query(
        `
        INSERT INTO user_achievements (
          id, user_id, achievement_type, achievement_id,
          title, description, earned_at, metadata, created_at
        )
        VALUES ($1, $2, 'high_score', $3, $4, $5, $6, $7, $6)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `,
        [
          uuidv4(),
          userId,
          `lesson-${lessonId}-high-score`,
          'Quiz Master',
          'Achieved 90% or higher on a lesson quiz',
          new Date(),
          JSON.stringify({
            lessonId,
            moduleId,
            score,
          }),
        ]
      );
    }
  } catch (error) {
    // Log but don't fail the request if achievement creation fails
    console.warn('Failed to create completion achievement:', error);
  }
}

/**
 * POST /api/workbook/lessons/[id]/complete - Mark lesson as complete
 */
export async function POST(
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
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to complete lessons',
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

    // Parse and validate request body
    let requestBody: CompleteLessonRequest;
    try {
      const body = await request.json();
      requestBody = validateCompleteLessonBody(body);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request body: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Validate lesson access
    const accessValidation = await validateLessonAccess(
      workbookUser.id,
      lessonId,
      workbookUser.subscriptionTier
    );

    if (!accessValidation.isValid) {
      const statusCode = accessValidation.code === 'LESSON_NOT_FOUND' ? 404 : 403;
      return NextResponse.json(
        {
          success: false,
          error: accessValidation.error || 'Access denied',
          code: accessValidation.code,
          timestamp: Date.now(),
        },
        { status: statusCode }
      );
    }

    const lesson = accessValidation.lesson!;

    // Use database transaction for consistency
    const result = await db.transaction(async (client) => {
      // Update lesson progress
      const progressRecord = await updateLessonProgress(
        workbookUser.id,
        lessonId,
        lesson.module_id,
        requestBody
      );

      // Update module progress
      await updateModuleProgress(
        workbookUser.id,
        lesson.module_id,
        requestBody.timeSpentMinutes || 0
      );

      // Create optional note if provided
      let noteId = null;
      if (requestBody.notes && requestBody.notes.trim()) {
        const noteRecord = await client.query(
          `
          INSERT INTO session_notes (
            id, user_id, lesson_id, module_id, type,
            title, content, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, 'lesson-completion', $5, $6, $7, $7)
          RETURNING id
        `,
          [
            uuidv4(),
            workbookUser.id,
            lessonId,
            lesson.module_id,
            `Completion notes for: ${lesson.title}`,
            requestBody.notes.trim(),
            new Date(),
          ]
        );
        noteId = noteRecord.rows[0]?.id;
      }

      return {
        progress: progressRecord,
        noteId,
      };
    });

    // Create achievements (async, don't wait)
    createCompletionAchievement(
      workbookUser.id,
      lessonId,
      lesson.module_id,
      requestBody.score
    ).catch(console.warn);

    // Build successful response
    const response = {
      success: true as const,
      data: {
        lessonId,
        moduleId: lesson.module_id,
        completed: true,
        completedAt: result.progress.completed_at,
        progressPercentage: 100,
        timeSpentSeconds: result.progress.time_spent_seconds,
        quizScore: result.progress.quiz_score,
        attemptsCount: result.progress.attempts_count,
        noteId: result.noteId,
        achievement: null, // Would be populated if achievement was created
      },
      message: 'Lesson completed successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Lesson completion API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Lesson completion POST error:', error);

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
        error: 'Failed to complete lesson',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}