// T028: Enhanced User Progress API - Comprehensive progress tracking and analytics
// GET /api/workbook/progress/enhanced - Get comprehensive user progress with analytics
// POST /api/workbook/progress/enhanced - Update progress with validation and logging

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
  validateUpdateProgressBody,
  calculateProgressPercentage,
  SuccessResponseSchema,
  WorkbookErrorResponseSchema,
  ProgressSummarySchema,
  UserProgressSchema,
  type UpdateProgressRequest,
  type ProgressSummary,
  type UserProgress,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';
import { optimizedQueries } from '@/lib/optimized-queries';
import { rateLimiter } from '@/lib/redis-cache';

// Rate limiting configuration
const RATE_LIMITS = {
  GET_PROGRESS: { limit: 60, windowMs: 60000 }, // 60 requests per minute
  UPDATE_PROGRESS: { limit: 30, windowMs: 60000 }, // 30 updates per minute
  BULK_UPDATE: { limit: 10, windowMs: 60000 }, // 10 bulk updates per minute
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
 * Ensure workbook_user exists and return full user info
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
 * Get comprehensive progress summary for user
 */
async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  // Get overall statistics
  const overallStats = await db.queryOne(
    `
    SELECT
      COUNT(*) as modules_started,
      COUNT(CASE WHEN completed = true THEN 1 END) as modules_completed,
      AVG(progress_percentage) as average_progress,
      SUM(time_spent_seconds) as total_time_spent,
      MAX(last_accessed) as last_activity_at
    FROM user_progress
    WHERE user_id = $1
  `,
    [userId]
  );

  // Get recent activity (last 10 activities)
  const recentActivity = await db.query(
    `
    SELECT
      up.module_id,
      wm.title as module_name,
      up.progress_percentage,
      up.last_accessed
    FROM user_progress up
    INNER JOIN workshop_modules wm ON up.module_id = wm.id
    WHERE up.user_id = $1
    ORDER BY up.last_accessed DESC NULLS LAST
    LIMIT 10
  `,
    [userId]
  );

  const summary: ProgressSummary = {
    userId,
    overallProgress: parseFloat(overallStats?.average_progress || '0'),
    modulesStarted: parseInt(overallStats?.modules_started || '0', 10),
    modulesCompleted: parseInt(overallStats?.modules_completed || '0', 10),
    totalTimeSpent: Math.round(parseInt(overallStats?.total_time_spent || '0', 10) / 60),
    lastActivityAt: overallStats?.last_activity_at || undefined,
    recentActivity: recentActivity.map((activity: any) => ({
      moduleId: activity.module_id,
      moduleName: activity.module_name,
      progressPercent: activity.progress_percent || 0,
      lastAccessedAt: activity.last_accessed,
    })),
  };

  // Validate the summary
  return ProgressSummarySchema.parse(summary);
}

/**
 * Get detailed progress for all modules
 */
async function getDetailedProgress(userId: string): Promise<UserProgress[]> {
  const progressRecords = await db.query(
    `
    SELECT
      up.id,
      up.user_id,
      up.module_id,
      up.progress_percentage,
      up.completed,
      up.time_spent_seconds,
      up.last_accessed,
      up.completed_at,
      up.created_at,
      up.updated_at
    FROM user_progress up
    WHERE up.user_id = $1
    ORDER BY up.created_at ASC
  `,
    [userId]
  );

  // Validate each progress record
  const validatedProgress: UserProgress[] = progressRecords.map(
    (record: any) => {
      return UserProgressSchema.parse({
        id: record.id,
        userId: record.user_id,
        moduleId: record.module_id,
        progressPercent: record.progress_percentage || 0,
        status: record.completed ? 'completed' : (record.progress_percentage > 0 ? 'in_progress' : 'not_started'),
        timeSpentMinutes: Math.round((record.time_spent_seconds || 0) / 60),
        lastAccessedAt: record.last_accessed,
        completedAt: record.completed_at,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      });
    }
  );

  return validatedProgress;
}

/**
 * Get learning analytics for user
 */
async function getLearningAnalytics(userId: string): Promise<any> {
  // Get learning patterns
  const learningPatterns = await db.query(
    `
    SELECT
      EXTRACT(hour FROM last_accessed_at) as hour_of_day,
      COUNT(*) as session_count,
      AVG(time_spent_seconds) as avg_time_spent
    FROM user_progress
    WHERE user_id = $1 AND last_accessed IS NOT NULL
    GROUP BY EXTRACT(hour FROM last_accessed)
    ORDER BY hour_of_day
  `,
    [userId]
  );

  // Get completion rate by difficulty
  const difficultyStats = await db.query(
    `
    SELECT
      wm.difficulty_level,
      COUNT(*) as total_modules,
      COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_modules,
      AVG(up.progress_percentage) as avg_progress
    FROM workshop_modules wm
    LEFT JOIN user_progress up ON wm.id = up.module_id AND up.user_id = $1
    WHERE wm.is_published = true
    GROUP BY wm.difficulty_level
    ORDER BY
      CASE wm.difficulty_level
        WHEN 'beginner' THEN 1
        WHEN 'intermediate' THEN 2
        WHEN 'advanced' THEN 3
        ELSE 4
      END
  `,
    [userId]
  );

  // Get streak information
  const streakInfo = await db.queryOne(
    `
    WITH daily_activity AS (
      SELECT DISTINCT DATE(last_accessed) as activity_date
      FROM user_progress
      WHERE user_id = $1 AND last_accessed IS NOT NULL
      ORDER BY activity_date DESC
    ),
    streak_calc AS (
      SELECT
        activity_date,
        activity_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY activity_date DESC) as streak_group
      FROM daily_activity
    )
    SELECT
      COUNT(*) as current_streak,
      MIN(activity_date) as streak_start,
      MAX(activity_date) as streak_end
    FROM streak_calc
    WHERE streak_group = (
      SELECT streak_group
      FROM streak_calc
      WHERE activity_date = CURRENT_DATE
      OR activity_date = CURRENT_DATE - INTERVAL '1 day'
      LIMIT 1
    )
  `,
    [userId]
  );

  return {
    learningPatterns: learningPatterns.map((pattern: any) => ({
      hourOfDay: parseInt(pattern.hour_of_day, 10),
      sessionCount: parseInt(pattern.session_count, 10),
      avgTimeSpent: Math.round(parseFloat(pattern.avg_time_spent || '0') / 60),
    })),
    difficultyStats: difficultyStats.map((stat: any) => ({
      difficulty: stat.difficulty_level,
      totalModules: parseInt(stat.total_modules, 10),
      completedModules: parseInt(stat.completed_modules, 10),
      avgProgress: parseFloat(stat.avg_progress || '0'),
      completionRate: calculateProgressPercentage(
        parseInt(stat.completed_modules, 10),
        parseInt(stat.total_modules, 10)
      ),
    })),
    streak: {
      currentStreak: parseInt(streakInfo?.current_streak || '0', 10),
      streakStart: streakInfo?.streak_start,
      streakEnd: streakInfo?.streak_end,
    },
  };
}

/**
 * GET /api/workbook/progress/enhanced - Get comprehensive progress data
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
          error: 'Insufficient permissions to view progress',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitAllowed = await checkRateLimit(auth.session.userId, 'GET_PROGRESS');
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
    const includeAnalytics = url.searchParams.get('analytics') === 'true';
    const includeDetailed = url.searchParams.get('detailed') === 'true';
    const moduleId = url.searchParams.get('moduleId');

    // Get progress summary using optimized queries
    const summary = await optimizedQueries.getUserProgressSummary(workbookUser.id);

    // Build response data
    const responseData: any = {
      user: {
        id: workbookUser.id,
        email: workbookUser.email,
        firstName: workbookUser.firstName,
        lastName: workbookUser.lastName,
        subscriptionTier: workbookUser.subscriptionTier,
      },
      summary,
    };

    // Include detailed progress if requested
    if (includeDetailed) {
      if (moduleId) {
        // Get progress for specific module
        const moduleProgress = await db.query(
          `
          SELECT
            up.id,
            up.user_id,
            up.module_id,
            up.progress_percentage,
            up.completed,
            up.time_spent_seconds,
            up.last_accessed,
            up.completed_at,
            up.created_at,
            up.updated_at
          FROM user_progress up
          WHERE up.user_id = $1 AND up.module_id = $2
          ORDER BY up.created_at ASC
        `,
          [workbookUser.id, moduleId]
        );

        responseData.moduleProgress = moduleProgress.map((record: any) =>
          UserProgressSchema.parse({
            id: record.id,
            userId: record.user_id,
            moduleId: record.module_id,
            progressPercent: record.progress_percentage || 0,
            status: record.completed ? 'completed' : (record.progress_percentage > 0 ? 'in_progress' : 'not_started'),
            timeSpentMinutes: Math.round((record.time_spent_seconds || 0) / 60),
            lastAccessedAt: record.last_accessed,
            completedAt: record.completed_at,
            createdAt: record.created_at,
            updatedAt: record.updated_at,
          })
        );
      } else {
        // Get all detailed progress
        responseData.detailedProgress = await getDetailedProgress(
          workbookUser.id
        );
      }
    }

    // Include learning analytics if requested
    if (includeAnalytics) {
      responseData.analytics = await getLearningAnalytics(workbookUser.id);
    }

    // Build successful response
    const response = {
      success: true as const,
      data: responseData,
      message: 'Progress data retrieved successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(`Enhanced progress API response time: ${responseTime}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Enhanced progress GET error:', error);

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
        error: 'Failed to fetch progress data',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workbook/progress/enhanced - Update user progress with validation
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
          timestamp: Date.now(),
        },
        { status: auth.status }
      );
    }

    // Check permissions
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions to update progress',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitAllowed = await checkRateLimit(auth.session.userId, 'UPDATE_PROGRESS');
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

    // Parse and validate request body
    let requestBody: UpdateProgressRequest;
    try {
      const body = await request.json();
      requestBody = validateUpdateProgressBody(body);
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

    // Validate that module exists and user has access
    const module = await db.queryOne(
      `
      SELECT id, title, is_published, prerequisites
      FROM workshop_modules
      WHERE id = $1
    `,
      [requestBody.moduleId]
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

    if (!module.is_published) {
      return NextResponse.json(
        {
          success: false,
          error: 'Module is not currently available',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Update progress using optimized query service
    const validatedProgress = await optimizedQueries.updateUserProgress(
      workbookUser.id,
      requestBody.moduleId,
      {
        progressPercent: requestBody.progressPercent,
        timeSpentMinutes: requestBody.timeSpentMinutes,
        completed: requestBody.status === 'completed',
      }
    );

    // Build successful response
    const response = {
      success: true as const,
      data: {
        progress: validatedProgress,
        module: {
          id: module.id,
          title: module.title,
        },
      },
      message: 'Progress updated successfully',
      timestamp: Date.now(),
    };

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      console.log(
        `Enhanced progress update API response time: ${responseTime}ms`
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Enhanced progress POST error:', error);

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
        error: 'Failed to update progress',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
