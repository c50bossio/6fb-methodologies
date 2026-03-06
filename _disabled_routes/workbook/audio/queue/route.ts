import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  WORKBOOK_SECURITY_HEADERS,
} from '@/lib/workbook-auth';
import db, { ValidationError } from '@/lib/database';

/**
 * Queue management API for transcription jobs
 * Provides queue status, job management, and admin controls
 */

// GET /api/workbook/audio/queue - Get queue status
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const isAdmin = hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN_ACCESS);

    if (action === 'stats' && isAdmin) {
      // Get detailed queue statistics for admins
      const queueStats = await db.query(`
        SELECT
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))) as avg_processing_time,
          SUM(cost_cents) as total_cost
        FROM transcriptions
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `);

      const userStats = await db.query(`
        SELECT
          u.subscription_tier,
          COUNT(t.id) as transcription_count,
          SUM(t.cost_cents) as total_cost,
          AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))) as avg_processing_time
        FROM workbook_users u
        LEFT JOIN transcriptions t ON u.id = t.user_id
        WHERE t.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY u.subscription_tier
      `);

      return NextResponse.json(
        {
          queue_stats: queueStats,
          user_stats: userStats,
          system_metrics: {
            active_processing_jobs: 0, // This would come from Redis in production
            queue_length: 0,
            avg_wait_time: 0,
          },
        },
        { headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Get user's transcription queue status
    const userTranscriptions = await db.query(
      `
      SELECT
        id, status, created_at, started_at, completed_at,
        EXTRACT(EPOCH FROM (COALESCE(completed_at, started_at, NOW()) - created_at)) as processing_time,
        cost_cents, metadata
      FROM transcriptions
      WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 20
    `,
      [auth.session.userId]
    );

    const userUsage = await db.queryOne(
      `
      SELECT
        daily_transcription_limit_minutes,
        daily_transcription_used_minutes,
        monthly_transcription_cost_cents,
        monthly_cost_limit_cents,
        CASE
          WHEN last_reset_date::date < CURRENT_DATE THEN 0
          ELSE daily_transcription_used_minutes
        END as current_daily_used,
        CASE
          WHEN EXTRACT(MONTH FROM last_reset_date) < EXTRACT(MONTH FROM CURRENT_TIMESTAMP) OR
               EXTRACT(YEAR FROM last_reset_date) < EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
          THEN 0
          ELSE monthly_transcription_cost_cents
        END as current_monthly_cost
      FROM workbook_users
      WHERE id = $1
    `,
      [auth.session.userId]
    );

    return NextResponse.json(
      {
        user_transcriptions: userTranscriptions,
        usage: {
          daily_limit_minutes: userUsage.daily_transcription_limit_minutes,
          daily_used_minutes: userUsage.current_daily_used,
          daily_remaining_minutes:
            userUsage.daily_transcription_limit_minutes - userUsage.current_daily_used,
          monthly_cost_cents: userUsage.current_monthly_cost,
          monthly_limit_cents: userUsage.monthly_cost_limit_cents,
          monthly_remaining_cents:
            userUsage.monthly_cost_limit_cents - userUsage.current_monthly_cost,
        },
      },
      { headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Queue status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// POST /api/workbook/audio/queue - Queue management actions
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const { action, transcriptionId, priority } = await request.json();

    switch (action) {
      case 'cancel':
        if (!transcriptionId) {
          throw new ValidationError('Transcription ID is required for cancel action');
        }

        // Verify ownership
        const transcription = await db.queryOne(
          'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2',
          [transcriptionId, auth.session.userId]
        );

        if (!transcription) {
          return NextResponse.json(
            { error: 'Transcription not found or unauthorized' },
            { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
          );
        }

        if (transcription.status === 'completed') {
          throw new ValidationError('Cannot cancel completed transcription');
        }

        // Update status to cancelled
        await db.query(
          'UPDATE transcriptions SET status = $1, updated_at = $2 WHERE id = $3',
          ['failed', new Date(), transcriptionId]
        );

        return NextResponse.json(
          { message: 'Transcription cancelled successfully' },
          { headers: WORKBOOK_SECURITY_HEADERS }
        );

      case 'retry':
        if (!transcriptionId) {
          throw new ValidationError('Transcription ID is required for retry action');
        }

        // Verify ownership and failed status
        const retryTranscription = await db.queryOne(
          'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2 AND status = $3',
          [transcriptionId, auth.session.userId, 'failed']
        );

        if (!retryTranscription) {
          return NextResponse.json(
            { error: 'Transcription not found, unauthorized, or not in failed state' },
            { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
          );
        }

        if (retryTranscription.retry_count >= retryTranscription.max_retries) {
          throw new ValidationError('Maximum retry attempts exceeded');
        }

        // Reset status and increment retry count
        await db.query(
          `
          UPDATE transcriptions
          SET status = $1, retry_count = retry_count + 1, updated_at = $2,
              error_message = NULL
          WHERE id = $3
        `,
          ['pending', new Date(), transcriptionId]
        );

        return NextResponse.json(
          { message: 'Transcription queued for retry' },
          { headers: WORKBOOK_SECURITY_HEADERS }
        );

      case 'update_priority':
        if (!transcriptionId || !priority) {
          throw new ValidationError('Transcription ID and priority are required');
        }

        if (!['low', 'normal', 'high'].includes(priority)) {
          throw new ValidationError('Invalid priority. Must be low, normal, or high');
        }

        // Check if user can set high priority (premium feature)
        if (priority === 'high' && auth.session.role === 'basic') {
          throw new ValidationError('High priority is only available for premium users');
        }

        // Update priority in metadata
        await db.query(
          `
          UPDATE transcriptions
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{priority}',
            $1
          ),
          updated_at = $2
          WHERE id = $3 AND user_id = $4 AND status IN ('pending', 'processing')
        `,
          [JSON.stringify(priority), new Date(), transcriptionId, auth.session.userId]
        );

        return NextResponse.json(
          { message: 'Priority updated successfully' },
          { headers: WORKBOOK_SECURITY_HEADERS }
        );

      default:
        throw new ValidationError('Invalid action');
    }
  } catch (error) {
    console.error('Queue management API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Queue management operation failed' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// DELETE /api/workbook/audio/queue - Admin only: Clear failed jobs
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.ADMIN_ACCESS)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const rawOlderThanDays = parseInt(url.searchParams.get('older_than_days') || '7', 10);
    const olderThanDays = isNaN(rawOlderThanDays) || rawOlderThanDays < 1 ? 7 : Math.min(rawOlderThanDays, 365);

    if (action === 'clear_failed') {
      const result = await db.query(
        `
        DELETE FROM transcriptions
        WHERE status = 'failed'
        AND created_at < NOW() - INTERVAL '${olderThanDays} days'
        RETURNING id
      `
      );

      return NextResponse.json(
        {
          message: `Cleared ${result.length} failed transcription jobs older than ${olderThanDays} days`,
          cleared_count: result.length,
        },
        { headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    throw new ValidationError('Invalid delete action');
  } catch (error) {
    console.error('Queue cleanup API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Queue cleanup operation failed' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin':
        process.env.NODE_ENV === 'development'
          ? '*'
          : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}