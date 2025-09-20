import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

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

interface RouteParams {
  params: {
    moduleId: string;
  };
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

// GET /api/workbook/progress/[moduleId] - Get detailed progress for specific module
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { moduleId } = params;

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      );
    }

    // Validate module ID
    const validModule = WORKSHOP_MODULES.find(m => m.id === moduleId);
    if (!validModule) {
      return NextResponse.json({ error: 'Invalid module ID' }, { status: 400 });
    }

    // Get progress record
    const progressData = await db.queryOne(
      `
      SELECT * FROM user_progress
      WHERE user_id = $1 AND module_id = $2
    `,
      [auth.session.userId, moduleId]
    );

    if (!progressData) {
      // Create default progress record if it doesn't exist
      const newProgress = await db.queryOne(
        `
        INSERT INTO user_progress (user_id, module_id, module_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [
          auth.session.userId,
          moduleId,
          validModule.name,
          new Date(),
          new Date(),
        ]
      );

      return NextResponse.json({
        success: true,
        progress: newProgress,
        module: validModule,
        sessions: [],
        notes: [],
        transcriptions: [],
      });
    }

    // Get related sessions for this module
    const sessions = await db.query(
      `
      SELECT id, title, status, started_at, ended_at, duration_seconds, total_chunks
      FROM workbook_sessions
      WHERE user_id = $1 AND workshop_module = $2
      ORDER BY created_at DESC
    `,
      [auth.session.userId, moduleId]
    );

    // Get notes related to this module (from sessions in this module)
    const notes = await db.query(
      `
      SELECT sn.id, sn.title, sn.content, sn.type, sn.is_action_item,
             sn.action_item_completed, sn.importance, sn.created_at
      FROM session_notes sn
      JOIN workbook_sessions ws ON sn.session_id = ws.id
      WHERE ws.user_id = $1 AND ws.workshop_module = $2
      ORDER BY sn.created_at DESC
      LIMIT 20
    `,
      [auth.session.userId, moduleId]
    );

    // Get transcriptions for this module
    const transcriptions = await db.query(
      `
      SELECT t.id, t.text, t.status, t.cost_cents, t.completed_at,
             ar.duration_seconds
      FROM transcriptions t
      JOIN audio_recordings ar ON t.recording_id = ar.id
      JOIN workbook_sessions ws ON t.session_id = ws.id
      WHERE ws.user_id = $1 AND ws.workshop_module = $2
      ORDER BY t.completed_at DESC
      LIMIT 10
    `,
      [auth.session.userId, moduleId]
    );

    // Calculate additional statistics
    const totalCostCents = transcriptions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.cost_cents || 0), 0);

    const totalTranscriptionTime = transcriptions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.duration_seconds || 0), 0);

    return NextResponse.json({
      success: true,
      progress: progressData,
      module: validModule,
      sessions,
      notes,
      transcriptions,
      statistics: {
        sessions_count: sessions.length,
        notes_count: notes.length,
        transcriptions_count: transcriptions.length,
        total_cost_cents: totalCostCents,
        total_transcription_time_seconds: totalTranscriptionTime,
        action_items_count: notes.filter(n => n.is_action_item).length,
        completed_action_items_count: notes.filter(
          n => n.is_action_item && n.action_item_completed
        ).length,
      },
    });
  } catch (error) {
    console.error('Module progress GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module progress' },
      { status: 500 }
    );
  }
}

// PUT /api/workbook/progress/[moduleId] - Update progress for specific module
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { moduleId } = params;
    const body = await request.json();

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      );
    }

    // Validate module ID
    const validModule = WORKSHOP_MODULES.find(m => m.id === moduleId);
    if (!validModule) {
      return NextResponse.json({ error: 'Invalid module ID' }, { status: 400 });
    }

    const {
      progressPercentage,
      completed,
      timeSpentSeconds,
      metadata = {},
    } = body;

    // Validation
    if (
      progressPercentage !== undefined &&
      (progressPercentage < 0 || progressPercentage > 100)
    ) {
      throw new ValidationError(
        'Progress percentage must be between 0 and 100'
      );
    }

    if (timeSpentSeconds !== undefined && timeSpentSeconds < 0) {
      throw new ValidationError('Time spent cannot be negative');
    }

    // Upsert progress record
    const updatedProgress = await db.queryOne(
      `
      INSERT INTO user_progress (
        user_id, module_id, module_name, progress_percentage,
        completed, completed_at, time_spent_seconds, last_accessed,
        metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET
        progress_percentage = COALESCE($4, user_progress.progress_percentage),
        completed = COALESCE($5, user_progress.completed),
        completed_at = CASE WHEN $5 = true THEN $10 ELSE user_progress.completed_at END,
        time_spent_seconds = CASE
          WHEN $7 IS NOT NULL THEN user_progress.time_spent_seconds + $7
          ELSE user_progress.time_spent_seconds
        END,
        last_accessed = $8,
        metadata = CASE
          WHEN $9::text != '{}'::text THEN $9::jsonb
          ELSE user_progress.metadata
        END,
        updated_at = $11
      RETURNING *
    `,
      [
        auth.session.userId,
        moduleId,
        validModule.name,
        progressPercentage,
        completed,
        completed ? new Date() : null,
        timeSpentSeconds,
        new Date(),
        JSON.stringify(metadata),
        new Date(),
        new Date(),
      ]
    );

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      message: `Progress updated for module: ${validModule.name}`,
    });
  } catch (error) {
    console.error('Module progress PUT error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update module progress' },
      { status: 500 }
    );
  }
}

// DELETE /api/workbook/progress/[moduleId] - Reset progress for specific module
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { moduleId } = params;

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      );
    }

    // Validate module ID
    const validModule = WORKSHOP_MODULES.find(m => m.id === moduleId);
    if (!validModule) {
      return NextResponse.json({ error: 'Invalid module ID' }, { status: 400 });
    }

    // Reset progress (set back to defaults)
    const resetProgress = await db.queryOne(
      `
      UPDATE user_progress
      SET progress_percentage = 0,
          completed = false,
          completed_at = NULL,
          time_spent_seconds = 0,
          sessions_count = 0,
          notes_count = 0,
          metadata = '{}',
          updated_at = $1
      WHERE user_id = $2 AND module_id = $3
      RETURNING *
    `,
      [new Date(), auth.session.userId, moduleId]
    );

    if (!resetProgress) {
      return NextResponse.json(
        { error: 'Progress record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: resetProgress,
      message: `Progress reset for module: ${validModule.name}`,
    });
  } catch (error) {
    console.error('Module progress DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to reset module progress' },
      { status: 500 }
    );
  }
}
