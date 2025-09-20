// T029: Module Completion API - Module completion tracking and certificate generation
// GET /api/workbook/completion - Get completion history and certificates
// POST /api/workbook/completion - Request module completion processing

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
  PaginatedResponseSchema,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ModuleCompletionSchema,
  CompletionHistoryItemSchema,
  type CompleteModuleRequest,
  type ModuleCompletion,
  type CompletionHistoryItem,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';

// Rate limiting configuration
const RATE_LIMITS = {
  GET_COMPLETIONS: { limit: 30, windowMs: 60000 }, // 30 requests per minute
  COMPLETE_MODULE: { limit: 5, windowMs: 300000 }, // 5 completions per 5 minutes
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
 * Get completion history for user
 */
async function getCompletionHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  completions: CompletionHistoryItem[];
  total: number;
  totalPages: number;
}> {
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await db.queryOne(
    `
    SELECT COUNT(*) as total
    FROM user_progress up
    INNER JOIN workshop_modules wm ON up.module_id = wm.id
    WHERE up.user_id = $1 AND up.status = 'completed'
  `,
    [userId]
  );

  const total = parseInt(countResult?.total || '0');
  const totalPages = Math.ceil(total / limit);

  // Get completion records
  const completions = await db.query(
    `
    SELECT
      up.module_id,
      wm.title as module_name,
      up.completed_at,
      up.time_spent_minutes,
      mc.completion_score,
      mc.certificate_url
    FROM user_progress up
    INNER JOIN workshop_modules wm ON up.module_id = wm.id
    LEFT JOIN module_completions mc ON up.user_id = mc.user_id AND up.module_id = mc.module_id
    WHERE up.user_id = $1 AND up.status = 'completed'
    ORDER BY up.completed_at DESC
    LIMIT $2 OFFSET $3
  `,
    [userId, limit, offset]
  );

  const validatedCompletions: CompletionHistoryItem[] = completions.map((completion: any) => {
    return CompletionHistoryItemSchema.parse({
      moduleId: completion.module_id,
      moduleName: completion.module_name,
      completedAt: completion.completed_at,
      timeSpentMinutes: completion.time_spent_minutes || 0,
      completionScore: completion.completion_score,
      certificateUrl: completion.certificate_url,
    });
  });

  return {
    completions: validatedCompletions,
    total,
    totalPages,
  };
}

/**
 * Check if module is ready for completion
 */
async function checkModuleCompletionEligibility(
  userId: string,
  moduleId: string,
  userTier: SubscriptionTier
): Promise<{
  isEligible: boolean;
  module?: any;
  progress?: any;
  error?: string;
  code?: string;
}> {
  // Get module details
  const module = await db.queryOne(
    `
    SELECT
      id,
      title,
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
      isEligible: false,
      error: 'Module not found',
      code: 'MODULE_NOT_FOUND',
    };
  }

  if (!module.is_published) {
    return {
      isEligible: false,
      error: 'Module is not published',
      code: 'MODULE_NOT_PUBLISHED',
      module,
    };
  }

  // Check subscription tier access
  const hasAccess = validateModuleAccess(userTier, module.access_level);
  if (!hasAccess) {
    return {
      isEligible: false,
      error: 'Insufficient subscription tier for this module',
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
    return {
      isEligible: false,
      error: 'Module prerequisites not met',
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
      isEligible: false,
      error: 'No progress found for this module',
      code: 'NO_PROGRESS_FOUND',
      module,
    };
  }

  // Check if module lessons are completed
  const lessonCompletion = await db.queryOne(
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

  const totalLessons = parseInt(lessonCompletion?.total_lessons || '0');
  const completedLessons = parseInt(lessonCompletion?.completed_lessons || '0');
  const lessonCompletionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 100;

  if (lessonCompletionRate < 100) {
    return {
      isEligible: false,
      error: `Module completion requires all lessons to be completed. Current: ${completedLessons}/${totalLessons} lessons completed.`,
      code: 'LESSONS_NOT_COMPLETED',
      module,
      progress,
    };
  }

  return {
    isEligible: true,
    module,
    progress,
  };
}

/**
 * Generate completion certificate URL (placeholder implementation)
 */
async function generateCertificateUrl(
  userId: string,
  moduleId: string,
  userName: string,
  moduleName: string
): Promise<string | null> {
  try {
    // In a real implementation, this would:
    // 1. Generate a PDF certificate
    // 2. Upload to secure storage (S3, etc.)
    // 3. Return the secure URL

    // For now, return a placeholder URL
    const certificateId = uuidv4();
    const certificateUrl = `https://certificates.6fbmethodologies.com/${certificateId}.pdf`;

    // Store certificate record
    await db.query(
      `
      INSERT INTO completion_certificates (
        id, user_id, module_id, certificate_url,
        issued_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        certificate_url = $4,
        issued_at = $5
    `,
      [certificateId, userId, moduleId, certificateUrl, new Date()]
    );

    return certificateUrl;
  } catch (error) {
    console.error('Failed to generate certificate:', error);
    return null;
  }
}

/**
 * Create module completion record
 */
async function createModuleCompletion(
  userId: string,
  moduleId: string,
  completionData: CompleteModuleRequest,
  userName: string,
  moduleName: string
): Promise<ModuleCompletion> {
  const now = new Date();
  const completionId = uuidv4();

  // Calculate completion score based on various factors
  let completionScore = 100; // Base score

  // Adjust score based on time efficiency (optional)
  // This could be enhanced with more sophisticated scoring logic

  // Generate certificate if requested
  let certificateUrl = null;
  if (completionData.requestCertificate) {
    certificateUrl = await generateCertificateUrl(
      userId,
      moduleId,
      userName,
      moduleName
    );
  }

  // Create completion record
  const completion = await db.queryOne(
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
      userId,
      moduleId,
      now,
      completionData.timeSpentMinutes,
      completionScore,
      certificateUrl,
      completionData.notes,
    ]
  );

  // Update user progress to completed status
  await db.query(
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
    [now, completionData.timeSpentMinutes, userId, moduleId]
  );

  // Validate and return completion record
  return ModuleCompletionSchema.parse({
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
}

/**
 * Create completion achievement
 */
async function createCompletionAchievement(
  userId: string,
  moduleId: string,
  moduleName: string,
  completionScore: number
): Promise<void> {
  try {
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
        'Module Master',
        `Completed module: ${moduleName}`,
        new Date(),
        JSON.stringify({
          moduleId,
          moduleName,
          completionScore,
        }),
      ]
    );
  } catch (error) {
    console.warn('Failed to create completion achievement:', error);
  }
}

/**
 * GET /api/workbook/completion - Get completion history
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
          error: 'Insufficient permissions to view completion history',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 'GET_COMPLETIONS')) {
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

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Get completion history
    const historyResult = await getCompletionHistory(workbookUser.id, page, limit);

    // Build pagination metadata
    const pagination = {
      page,
      limit,
      total: historyResult.total,
      totalPages: historyResult.totalPages,
      hasNext: page < historyResult.totalPages,
      hasPrev: page > 1,
    };

    // Build successful response
    const response = {
      success: true as const,
      data: historyResult.completions,
      pagination,
      message: `Found ${historyResult.completions.length} completion records`,
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Completion history API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Completion history GET error:', error);

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
        error: 'Failed to fetch completion history',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workbook/completion - Request module completion processing
 */
export async function POST(request: NextRequest) {
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
    if (!checkRateLimit(auth.session.userId, 'COMPLETE_MODULE')) {
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
    let requestBody: CompleteModuleRequest & { moduleId: string };
    try {
      const body = await request.json();
      const validatedBody = validateCompleteModuleBody(body);

      if (!body.moduleId) {
        throw new Error('moduleId is required');
      }

      requestBody = {
        ...validatedBody,
        moduleId: body.moduleId,
      };
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

    // Check module completion eligibility
    const eligibilityCheck = await checkModuleCompletionEligibility(
      workbookUser.id,
      requestBody.moduleId,
      workbookUser.subscriptionTier
    );

    if (!eligibilityCheck.isEligible) {
      const statusCode = eligibilityCheck.code === 'MODULE_NOT_FOUND' ? 404 : 403;
      return NextResponse.json(
        {
          success: false,
          error: eligibilityCheck.error || 'Module completion not allowed',
          code: eligibilityCheck.code,
          timestamp: Date.now(),
        },
        { status: statusCode }
      );
    }

    const module = eligibilityCheck.module!;
    const userName = `${workbookUser.firstName} ${workbookUser.lastName}`.trim();

    // Create completion record using transaction
    const completion = await db.transaction(async () => {
      return await createModuleCompletion(
        workbookUser.id,
        requestBody.moduleId,
        requestBody,
        userName,
        module.title
      );
    });

    // Create achievement (async, don't wait)
    createCompletionAchievement(
      workbookUser.id,
      requestBody.moduleId,
      module.title,
      completion.completionScore || 100
    ).catch(console.warn);

    // Build successful response
    const response = {
      success: true as const,
      data: {
        completion,
        module: {
          id: module.id,
          title: module.title,
          difficultyLevel: module.difficulty_level,
        },
        certificate: completion.certificateUrl ? {
          url: completion.certificateUrl,
          issuedAt: completion.completedAt,
        } : null,
      },
      message: `Module "${module.title}" completed successfully${completion.certificateUrl ? ' with certificate' : ''}`,
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