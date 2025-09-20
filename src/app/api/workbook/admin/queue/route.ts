import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  WorkbookRole,
} from '@/lib/workbook-auth';
import { getQueueStatistics, getJobStatus } from '@/lib/transcription-queue';
import db from '@/lib/database';

async function authenticateAdmin(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return { error: 'Authentication token required', status: 401 };
  }

  const session = verifyToken(token);
  const validation = validateSession(session);

  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 };
  }

  // Check if user has admin privileges (VIP role or explicit admin permission)
  if (
    session!.role !== WorkbookRole.VIP &&
    !session!.permissions.includes('admin_access')
  ) {
    return { error: 'Admin access required', status: 403 };
  }

  return { session: session! };
}

// GET /api/workbook/admin/queue - Get transcription queue status and statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20'),
      100
    );

    // Get queue statistics from in-memory queue
    const queueStats = getQueueStatistics();

    let response: any = {
      success: true,
      queue_statistics: queueStats,
    };

    if (detailed) {
      // Get recent jobs from database
      const recentJobs = await db.query(
        `
        SELECT tj.*, t.status as transcription_status, wu.email
        FROM transcription_jobs tj
        JOIN transcriptions t ON tj.transcription_id = t.id
        JOIN workbook_users wu ON tj.user_id = wu.id
        ORDER BY tj.created_at DESC
        LIMIT $1
      `,
        [limit]
      );

      // Get system health metrics
      const systemHealth = await db.queryOne(`
        SELECT
          COUNT(CASE WHEN tj.status = 'failed' AND tj.created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_failures,
          COUNT(CASE WHEN tj.status = 'completed' AND tj.completed_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_completions,
          AVG(CASE WHEN tj.status = 'completed' THEN EXTRACT(EPOCH FROM (tj.completed_at - tj.started_at)) END) as avg_processing_time_seconds,
          SUM(CASE WHEN ct.created_at > NOW() - INTERVAL '24 hours' THEN ct.cost_cents ELSE 0 END) as cost_last_24h_cents
        FROM transcription_jobs tj
        LEFT JOIN cost_tracking ct ON tj.transcription_id = ct.transcription_id
      `);

      // Get user usage statistics
      const userStats = await db.query(`
        SELECT
          wu.email,
          wu.subscription_tier,
          wu.daily_transcription_used_minutes,
          wu.daily_transcription_limit_minutes,
          wu.monthly_transcription_cost_cents,
          wu.monthly_cost_limit_cents,
          COUNT(tj.id) as jobs_count,
          COUNT(CASE WHEN tj.status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN tj.status = 'failed' THEN 1 END) as failed_jobs
        FROM workbook_users wu
        LEFT JOIN transcription_jobs tj ON wu.id = tj.user_id
          AND tj.created_at > NOW() - INTERVAL '24 hours'
        WHERE wu.daily_transcription_used_minutes > 0
           OR COUNT(tj.id) > 0
        GROUP BY wu.id, wu.email, wu.subscription_tier,
                 wu.daily_transcription_used_minutes, wu.daily_transcription_limit_minutes,
                 wu.monthly_transcription_cost_cents, wu.monthly_cost_limit_cents
        ORDER BY wu.daily_transcription_used_minutes DESC
        LIMIT 20
      `);

      response.recent_jobs = recentJobs;
      response.system_health = {
        ...systemHealth,
        recent_failures: parseInt(systemHealth?.recent_failures || '0'),
        recent_completions: parseInt(systemHealth?.recent_completions || '0'),
        avg_processing_time_seconds: parseFloat(
          systemHealth?.avg_processing_time_seconds || '0'
        ),
        cost_last_24h_cents: parseInt(systemHealth?.cost_last_24h_cents || '0'),
      };
      response.user_statistics = userStats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Queue admin GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue statistics' },
      { status: 500 }
    );
  }
}

// POST /api/workbook/admin/queue - Admin queue operations (cleanup, restart, etc.)
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, jobId, olderThanHours } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'cleanup':
        const hours = olderThanHours || 24;
        const cleanedCount =
          await require('@/lib/transcription-queue').default.cleanupOldJobs(
            hours
          );

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${cleanedCount} old jobs (older than ${hours} hours)`,
          cleaned_count: cleanedCount,
        });

      case 'cancel_job':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID is required for cancel operation' },
            { status: 400 }
          );
        }

        const cancelled =
          await require('@/lib/transcription-queue').cancelTranscriptionJob(
            jobId
          );

        if (!cancelled) {
          return NextResponse.json(
            { error: 'Job not found or cannot be cancelled' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Job ${jobId} cancelled successfully`,
        });

      case 'retry_failed':
        // Retry all failed jobs that haven't exceeded max attempts
        const failedJobs = await db.query(`
          UPDATE transcription_jobs
          SET status = 'queued', scheduled_at = NOW(), updated_at = NOW()
          WHERE status = 'failed' AND attempts < max_attempts
          RETURNING id
        `);

        return NextResponse.json({
          success: true,
          message: `${failedJobs.length} failed jobs queued for retry`,
          retried_count: failedJobs.length,
        });

      case 'reset_user_limits':
        // Reset daily limits for all users (admin emergency function)
        const resetResult = await db.query(`
          UPDATE workbook_users
          SET daily_transcription_used_minutes = 0,
              last_reset_date = CURRENT_DATE,
              updated_at = CURRENT_TIMESTAMP
          WHERE last_reset_date < CURRENT_DATE
          RETURNING id
        `);

        return NextResponse.json({
          success: true,
          message: `Daily limits reset for ${resetResult.length} users`,
          reset_count: resetResult.length,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Queue admin POST error:', error);
    return NextResponse.json(
      { error: 'Failed to perform admin operation' },
      { status: 500 }
    );
  }
}
