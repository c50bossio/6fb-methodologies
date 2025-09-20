import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 30,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `progress_${userId}`;
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

// Ensure workbook_user exists and return UUID
async function ensureWorkbookUser(session: any): Promise<string> {
  // Check if workbook_user exists by email
  let workbookUser = await db.queryOne(
    `
    SELECT id FROM workbook_users WHERE email = $1
  `,
    [session.email]
  );

  if (!workbookUser) {
    // Create workbook_user record
    workbookUser = await db.queryOne(
      `
      INSERT INTO workbook_users (email, first_name, last_name, subscription_tier, workshop_access_granted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
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

  return workbookUser.id;
}

// Workshop modules configuration
const WORKSHOP_MODULES = [
  { id: 'intro', name: 'Introduction to 6FB Methodologies', order: 1 },
  { id: 'foundations', name: 'Business Foundations', order: 2 },
  { id: 'marketing', name: 'Marketing Strategies', order: 3 },
  { id: 'operations', name: 'Operations Excellence', order: 4 },
  { id: 'growth', name: 'Growth and Scaling', order: 5 },
  { id: 'conclusion', name: 'Implementation and Next Steps', order: 6 },
];

// GET /api/workbook/progress - Get user progress across all modules
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 50)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Ensure workbook_user exists and get UUID
    const workbookUserId = await ensureWorkbookUser(auth.session);

    const url = new URL(request.url);
    const moduleId = url.searchParams.get('moduleId');
    const detailed = url.searchParams.get('detailed') === 'true';

    let query = `
      SELECT up.*,
             ws.title as current_session_title,
             ws.status as current_session_status
      FROM user_progress up
      LEFT JOIN workbook_sessions ws ON up.user_id = ws.user_id
        AND up.module_id = ws.workshop_module
        AND ws.status = 'active'
      WHERE up.user_id = $1
    `;
    const params: any[] = [workbookUserId];

    if (moduleId) {
      query += ` AND up.module_id = $${params.length + 1}`;
      params.push(moduleId);
    }

    query += ` ORDER BY up.created_at ASC`;

    const progressRecords = await db.query(query, params);

    // If no progress records exist, create them for all modules
    if (progressRecords.length === 0) {
      const initPromises = WORKSHOP_MODULES.map(module =>
        db.query(
          `
          INSERT INTO user_progress (id, user_id, module_id, module_name, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id, module_id) DO NOTHING
        `,
          [
            uuidv4(),
            workbookUserId,
            module.id,
            module.name,
            new Date(),
            new Date(),
          ]
        )
      );

      await Promise.all(initPromises);

      // Fetch the newly created records
      const newProgressRecords = await db.query(query, params);
      progressRecords.push(...newProgressRecords);
    }

    let responseData: any = {
      success: true,
      progress: progressRecords,
    };

    if (detailed) {
      // Get detailed statistics
      const overallStats = await db.queryOne(
        `
        SELECT
          COUNT(*) as total_modules,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_modules,
          AVG(progress_percentage) as average_progress,
          SUM(time_spent_seconds) as total_time_spent,
          SUM(sessions_count) as total_sessions,
          SUM(notes_count) as total_notes
        FROM user_progress
        WHERE user_id = $1
      `,
        [workbookUserId]
      );

      // Get recent activity
      const recentActivity = await db.query(
        `
        SELECT 'session' as type, id, title as description, created_at, workshop_module as module_id
        FROM workbook_sessions
        WHERE user_id = $1
        UNION ALL
        SELECT 'note' as type, id,
               COALESCE(title, LEFT(content, 50) || '...') as description,
               created_at, NULL as module_id
        FROM session_notes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [workbookUserId]
      );

      responseData.statistics = {
        ...overallStats,
        total_modules: parseInt(overallStats?.total_modules || '0'),
        completed_modules: parseInt(overallStats?.completed_modules || '0'),
        average_progress: parseFloat(overallStats?.average_progress || '0'),
        total_time_spent: parseInt(overallStats?.total_time_spent || '0'),
        total_sessions: parseInt(overallStats?.total_sessions || '0'),
        total_notes: parseInt(overallStats?.total_notes || '0'),
      };

      responseData.recent_activity = recentActivity;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Progress GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST /api/workbook/progress - Update user progress
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update progress' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 20)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Ensure workbook_user exists and get UUID
    const workbookUserId = await ensureWorkbookUser(auth.session);

    const body = await request.json();
    const {
      moduleId,
      progressPercentage,
      completed = false,
      timeSpentSeconds = 0,
      metadata = {},
    } = body;

    // Validation
    if (!moduleId) {
      throw new ValidationError('Module ID is required');
    }

    if (
      progressPercentage !== undefined &&
      (progressPercentage < 0 || progressPercentage > 100)
    ) {
      throw new ValidationError(
        'Progress percentage must be between 0 and 100'
      );
    }

    if (timeSpentSeconds < 0) {
      throw new ValidationError('Time spent cannot be negative');
    }

    // Validate module ID
    const validModule = WORKSHOP_MODULES.find(m => m.id === moduleId);
    if (!validModule) {
      throw new ValidationError('Invalid module ID');
    }

    // Check if progress record exists
    const existingProgress = await db.queryOne(
      'SELECT * FROM user_progress WHERE user_id = $1 AND module_id = $2',
      [workbookUserId, moduleId]
    );

    let updatedProgress;

    if (existingProgress) {
      // Update existing progress
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (progressPercentage !== undefined) {
        updates.push(`progress_percentage = $${paramIndex}`);
        params.push(progressPercentage);
        paramIndex++;
      }

      if (completed !== undefined) {
        updates.push(`completed = $${paramIndex}`);
        params.push(completed);
        paramIndex++;

        if (completed) {
          updates.push(`completed_at = $${paramIndex}`);
          params.push(new Date());
          paramIndex++;
        }
      }

      if (timeSpentSeconds > 0) {
        updates.push(
          `time_spent_seconds = time_spent_seconds + $${paramIndex}`
        );
        params.push(timeSpentSeconds);
        paramIndex++;
      }

      updates.push(`last_accessed = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      updates.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      if (Object.keys(metadata).length > 0) {
        updates.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(metadata));
        paramIndex++;
      }

      params.push(workbookUserId, moduleId);

      updatedProgress = await db.queryOne(
        `
        UPDATE user_progress
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex - 1} AND module_id = $${paramIndex}
        RETURNING *
      `,
        params
      );
    } else {
      // Create new progress record
      const progressId = uuidv4();
      const now = new Date();

      updatedProgress = await db.queryOne(
        `
        INSERT INTO user_progress (
          id, user_id, module_id, module_name, progress_percentage,
          completed, completed_at, time_spent_seconds, last_accessed,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
        [
          progressId,
          workbookUserId,
          moduleId,
          validModule.name,
          progressPercentage || 0,
          completed,
          completed ? now : null,
          timeSpentSeconds,
          now,
          JSON.stringify(metadata),
          now,
          now,
        ]
      );
    }

    // Update session and note counts (these are calculated in triggers)
    // The database triggers will automatically update these counts

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      message: 'Progress updated successfully',
    });
  } catch (error) {
    console.error('Progress POST error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// PUT /api/workbook/progress - Bulk update progress for multiple modules
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update progress' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 10)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Ensure workbook_user exists and get UUID
    const workbookUserId = await ensureWorkbookUser(auth.session);

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      throw new ValidationError('Updates must be an array');
    }

    if (updates.length === 0) {
      throw new ValidationError('At least one update is required');
    }

    if (updates.length > 10) {
      throw new ValidationError('Maximum 10 updates allowed per request');
    }

    const results: any[] = [];

    // Use transaction for bulk updates
    await db.transaction(async client => {
      for (const update of updates) {
        const {
          moduleId,
          progressPercentage,
          completed,
          timeSpentSeconds,
          metadata,
        } = update;

        if (!moduleId) {
          throw new ValidationError('Module ID is required for all updates');
        }

        const validModule = WORKSHOP_MODULES.find(m => m.id === moduleId);
        if (!validModule) {
          throw new ValidationError(`Invalid module ID: ${moduleId}`);
        }

        // Upsert progress record
        const result = await client.query(
          `
          INSERT INTO user_progress (
            id, user_id, module_id, module_name, progress_percentage,
            completed, completed_at, time_spent_seconds, last_accessed,
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (user_id, module_id)
          DO UPDATE SET
            progress_percentage = COALESCE($5, user_progress.progress_percentage),
            completed = COALESCE($6, user_progress.completed),
            completed_at = CASE WHEN $6 = true THEN $11 ELSE user_progress.completed_at END,
            time_spent_seconds = user_progress.time_spent_seconds + COALESCE($8, 0),
            last_accessed = $9,
            metadata = COALESCE($10, user_progress.metadata),
            updated_at = $12
          RETURNING *
        `,
          [
            uuidv4(),
            workbookUserId,
            moduleId,
            validModule.name,
            progressPercentage,
            completed,
            completed ? new Date() : null,
            timeSpentSeconds || 0,
            new Date(),
            metadata ? JSON.stringify(metadata) : null,
            new Date(),
            new Date(),
          ]
        );

        results.push(result.rows[0]);
      }
    });

    return NextResponse.json({
      success: true,
      updated_count: results.length,
      progress: results,
      message: `${results.length} progress records updated successfully`,
    });
  } catch (error) {
    console.error('Progress PUT error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
