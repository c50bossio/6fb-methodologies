// T029: Module Completion API - Specific module completion endpoint
// POST /api/workbook/completion/[moduleId] - Mark specific module as complete
// GET /api/workbook/completion/[moduleId] - Get completion status for specific module

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
  validateModuleIdParam,
  validateCompleteModuleBody,
  validateModuleAccess,
  validatePrerequisites,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ModuleCompletionSchema,
  type CompleteModuleRequest,
  type ModuleCompletion,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for module completion
 */
function checkRateLimit(
  userId: string,
  operation: 'GET' | 'POST',
  limit: number = operation === 'GET' ? 30 : 3,
  windowMs: number = operation === 'GET' ? 60000 : 300000
): boolean {
  const now = Date.now();
  const key = `module_completion_${operation}_${userId}`;
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
  email: string;
  firstName: string;
  lastName: string;
}> {
  let workbookUser = await db.queryOne(
    `
    SELECT id, subscription_tier, workshop_access_granted, email, first_name, last_name
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
      RETURNING id, subscription_tier, workshop_access_granted, email, first_name, last_name
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
    email: workbookUser.email,
    firstName: workbookUser.first_name,
    lastName: workbookUser.last_name,
  };
}

/**
 * Check if module can be completed
 */
async function validateModuleCompletion(
  userId: string,
  moduleId: string,
  userTier: SubscriptionTier
): Promise<{
  isValid: boolean;
  module?: any;
  progress?: any;
  lessonStats?: any;
  error?: string;
  code?: string;
}> {
  // Get module details
  const module = await db.queryOne(
    `
    SELECT
      id,
      title,
      description,
      module_order,
      duration_minutes,
      is_published,
      prerequisites,
      access_level,
      difficulty_level
    FROM workshop_modules
    WHERE id = $1
  `,
    [moduleId]
  );

  if (!module) {
    return {
      isValid: false,
      error: 'Module not found',
      code: 'MODULE_NOT_FOUND',
    };
  }

  if (!module.is_published) {
    return {
      isValid: false,
      error: 'Module is not currently available',
      code: 'MODULE_NOT_PUBLISHED',
      module,
    };
  }

  // Check subscription tier access
  const hasAccess = validateModuleAccess(userTier, module.access_level);
  if (!hasAccess) {
    return {
      isValid: false,
      error: 'Your subscription tier does not include access to this module',
      code: 'SUBSCRIPTION_REQUIRED',
      module,
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
  const prerequisitesMet = validatePrerequisites(
    completedModuleIds,
    module.prerequisites || []
  );

  if (!prerequisitesMet) {
    const missingPrerequisites = (module.prerequisites || []).filter(
      (prereq: string) => !completedModuleIds.includes(prereq)
    );

    return {
      isValid: false,
      error: `Prerequisites not met. Missing modules: ${missingPrerequisites.join(', ')}`,
      code: 'PREREQUISITES_NOT_MET',
      module,
    };
  }

  // Get current progress
  const progress = await db.queryOne(
    `
    SELECT
      progress_percent,
      status,
      time_spent_minutes,
      last_accessed_at,
      completed_at
    FROM user_progress
    WHERE user_id = $1 AND module_id = $2
  `,
    [userId, moduleId]
  );

  if (!progress) {
    return {
      isValid: false,
      error: 'No progress found for this module. Please start the module first.',
      code: 'NO_PROGRESS_FOUND',
      module,
    };
  }

  if (progress.status === 'completed') {
    return {
      isValid: false,
      error: 'Module is already completed',
      code: 'ALREADY_COMPLETED',
      module,
      progress,
    };
  }

  // Check lesson completion requirements
  const lessonStats = await db.queryOne(
    `
    SELECT
      COUNT(wl.id) as total_lessons,
      COUNT(lp.lesson_id) as completed_lessons,
      ARRAY_AGG(
        CASE WHEN lp.lesson_id IS NULL THEN wl.id ELSE NULL END
      ) FILTER (WHERE lp.lesson_id IS NULL) as incomplete_lessons
    FROM workshop_lessons wl
    LEFT JOIN lesson_progress lp ON wl.id = lp.lesson_id
      AND lp.user_id = $1 AND lp.completed = true
    WHERE wl.module_id = $2 AND wl.is_published = true
  `,
    [userId, moduleId]
  );

  const totalLessons = parseInt(lessonStats?.total_lessons || '0');
  const completedLessons = parseInt(lessonStats?.completed_lessons || '0');
  const incompleteLessons = lessonStats?.incomplete_lessons?.filter((id: any) => id !== null) || [];

  // Require at least 80% lesson completion for module completion
  const requiredCompletionRate = 0.8;
  const currentCompletionRate = totalLessons > 0 ? completedLessons / totalLessons : 1;

  if (currentCompletionRate < requiredCompletionRate) {
    return {
      isValid: false,
      error: `Module completion requires at least ${Math.round(requiredCompletionRate * 100)}% of lessons to be completed. Current: ${completedLessons}/${totalLessons} lessons (${Math.round(currentCompletionRate * 100)}%)`,
      code: 'INSUFFICIENT_LESSON_COMPLETION',
      module,
      progress,
      lessonStats: {
        totalLessons,
        completedLessons,
        incompleteLessons,
        completionRate: currentCompletionRate,
        requiredRate: requiredCompletionRate,
      },
    };
  }

  return {
    isValid: true,
    module,
    progress,
    lessonStats: {
      totalLessons,
      completedLessons,
      completionRate: currentCompletionRate,
    },
  };
}

/**
 * Get existing completion record
 */
async function getExistingCompletion(userId: string, moduleId: string): Promise<any> {
  return await db.queryOne(
    `
    SELECT
      mc.id,
      mc.user_id,
      mc.module_id,
      mc.completed_at,
      mc.time_spent_minutes,
      mc.completion_score,
      mc.certificate_url,
      mc.notes,
      mc.created_at,
      wm.title as module_title
    FROM module_completions mc
    INNER JOIN workshop_modules wm ON mc.module_id = wm.id
    WHERE mc.user_id = $1 AND mc.module_id = $2
  `,
    [userId, moduleId]
  );
}

/**
 * Generate completion certificate
 */
async function generateCertificate(
  userId: string,
  moduleId: string,
  userName: string,
  moduleName: string,
  completedAt: Date
): Promise<string | null> {
  try {
    // In a real implementation, this would:
    // 1. Generate a PDF certificate with user and module info
    // 2. Upload to secure cloud storage
    // 3. Return the secure, time-limited URL

    // For now, return a placeholder URL
    const certificateId = uuidv4();
    const certificateUrl = `https://certificates.6fbmethodologies.com/modules/${moduleId}/users/${userId}/${certificateId}.pdf`;

    // Store certificate record
    await db.query(
      `
      INSERT INTO completion_certificates (
        id, user_id, module_id, certificate_url,
        issued_at, issued_to, module_title, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $5)
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        certificate_url = $4,
        issued_at = $5,
        issued_to = $6
    `,
      [
        certificateId,
        userId,
        moduleId,
        certificateUrl,
        completedAt,
        userName,
        moduleName,
      ]
    );

    return certificateUrl;
  } catch (error) {
    console.error('Failed to generate certificate:', error);
    return null;
  }
}

/**
 * GET /api/workbook/completion/[moduleId] - Get completion status for specific module
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const startTime = Date.now();

  try {
    // Validate module ID parameter
    let validatedParams;
    try {
      validatedParams = validateModuleIdParam({ moduleId: params.moduleId });
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

    const moduleId = validatedParams.moduleId;

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
          error: 'Insufficient permissions to view completion status',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'GET')) {
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

    // Get existing completion record
    const existingCompletion = await getExistingCompletion(workbookUser.id, moduleId);

    if (!existingCompletion) {
      // Check if module exists and is accessible
      const validationResult = await validateModuleCompletion(
        workbookUser.id,
        moduleId,
        workbookUser.subscriptionTier
      );

      if (!validationResult.module) {
        return NextResponse.json(
          {
            success: false,
            error: validationResult.error || 'Module not found',
            code: validationResult.code,
            timestamp: Date.now(),
          },
          { status: validationResult.code === 'MODULE_NOT_FOUND' ? 404 : 403 }
        );
      }

      // Return not completed status
      return NextResponse.json({
        success: true,
        data: {
          moduleId,
          moduleName: validationResult.module.title,
          isCompleted: false,
          canComplete: validationResult.isValid,
          reason: validationResult.isValid ? null : validationResult.error,
          progress: validationResult.progress,
          lessonStats: validationResult.lessonStats,
        },
        message: 'Module not yet completed',
        timestamp: Date.now(),
      });
    }

    // Validate and return existing completion
    const validatedCompletion = ModuleCompletionSchema.parse({
      id: existingCompletion.id,
      userId: existingCompletion.user_id,
      moduleId: existingCompletion.module_id,
      completedAt: existingCompletion.completed_at,
      timeSpentMinutes: existingCompletion.time_spent_minutes,
      completionScore: existingCompletion.completion_score,
      certificateUrl: existingCompletion.certificate_url,
      notes: existingCompletion.notes,
      createdAt: existingCompletion.created_at,
    });

    // Build successful response
    const response = {
      success: true as const,
      data: {
        moduleId,
        moduleName: existingCompletion.module_title,
        isCompleted: true,
        completion: validatedCompletion,
        certificate: validatedCompletion.certificateUrl ? {
          url: validatedCompletion.certificateUrl,
          issuedAt: validatedCompletion.completedAt,
        } : null,
      },
      message: 'Module completion status retrieved successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Module completion status API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Module completion status GET error:', error);

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
        error: 'Failed to fetch completion status',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workbook/completion/[moduleId] - Mark specific module as complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const startTime = Date.now();

  try {
    // Validate module ID parameter
    let validatedParams;
    try {
      validatedParams = validateModuleIdParam({ moduleId: params.moduleId });
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

    const moduleId = validatedParams.moduleId;

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
          error: 'Insufficient permissions to complete modules',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'POST')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Module completion requests are limited to prevent abuse.',
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let requestBody: CompleteModuleRequest;
    try {
      const body = await request.json();
      requestBody = validateCompleteModuleBody(body);
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

    // Validate module completion eligibility
    const validationResult = await validateModuleCompletion(
      workbookUser.id,
      moduleId,
      workbookUser.subscriptionTier
    );

    if (!validationResult.isValid) {
      const statusCode = validationResult.code === 'MODULE_NOT_FOUND' ? 404 :
                         validationResult.code === 'ALREADY_COMPLETED' ? 409 : 403;

      return NextResponse.json(
        {
          success: false,
          error: validationResult.error || 'Module completion not allowed',
          code: validationResult.code,
          details: validationResult.lessonStats,
          timestamp: Date.now(),
        },
        { status: statusCode }
      );
    }

    const module = validationResult.module!;
    const userName = `${workbookUser.firstName} ${workbookUser.lastName}`.trim();

    // Create completion record using transaction
    const completion = await db.transaction(async (client) => {
      const now = new Date();
      const completionId = uuidv4();

      // Calculate completion score
      let completionScore = 100;
      if (validationResult.lessonStats) {
        completionScore = Math.round(validationResult.lessonStats.completionRate * 100);
      }

      // Generate certificate if requested
      let certificateUrl = null;
      if (requestBody.requestCertificate) {
        certificateUrl = await generateCertificate(
          workbookUser.id,
          moduleId,
          userName,
          module.title,
          now
        );
      }

      // Create completion record
      const completionRecord = await client.query(
        `
        INSERT INTO module_completions (
          id, user_id, module_id, completed_at,
          time_spent_minutes, completion_score, certificate_url,
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $4)
        RETURNING *
      `,
        [
          completionId,
          workbookUser.id,
          moduleId,
          now,
          requestBody.timeSpentMinutes,
          completionScore,
          certificateUrl,
          requestBody.notes,
        ]
      );

      // Update user progress to completed
      await client.query(
        `
        UPDATE user_progress
        SET
          status = 'completed',
          progress_percent = 100,
          completed_at = $1,
          time_spent_minutes = time_spent_minutes + $2,
          updated_at = $1
        WHERE user_id = $3 AND module_id = $4
      `,
        [now, requestBody.timeSpentMinutes, workbookUser.id, moduleId]
      );

      // Create achievement
      await client.query(
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
          workbookUser.id,
          `module-${moduleId}-completion`,
          'Module Master',
          `Completed module: ${module.title}`,
          now,
          JSON.stringify({
            moduleId,
            moduleName: module.title,
            completionScore,
            difficultyLevel: module.difficulty_level,
          }),
        ]
      );

      return completionRecord.rows[0];
    });

    // Validate completion record
    const validatedCompletion = ModuleCompletionSchema.parse({
      id: completion.id,
      userId: completion.user_id,
      moduleId: completion.module_id,
      completedAt: completion.completed_at,
      timeSpentMinutes: completion.time_spent_minutes,
      completionScore: completion.completion_score,
      certificateUrl: completion.certificate_url,
      notes: completion.notes,
      createdAt: completion.created_at,
    });

    // Build successful response
    const response = {
      success: true as const,
      data: {
        completion: validatedCompletion,
        module: {
          id: module.id,
          title: module.title,
          description: module.description,
          difficultyLevel: module.difficulty_level,
          moduleOrder: module.module_order,
        },
        certificate: validatedCompletion.certificateUrl ? {
          url: validatedCompletion.certificateUrl,
          issuedAt: validatedCompletion.completedAt,
          issuedTo: userName,
        } : null,
        achievement: {
          type: 'module_completed',
          title: 'Module Master',
          description: `Completed module: ${module.title}`,
        },
      },
      message: `Congratulations! You have successfully completed "${module.title}"${validatedCompletion.certificateUrl ? ' and earned a certificate' : ''}`,
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Module completion API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Module completion POST error:', error);

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
        error: 'Failed to complete module',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}