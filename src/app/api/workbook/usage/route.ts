import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  WORKBOOK_SECURITY_HEADERS,
  getRateLimits,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 30,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `usage_${userId}`;
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
  let token = request.cookies.get('workbook-token')?.value;

  if (!token) {
    token = extractToken(request) || undefined;
  }

  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }

  const session = verifyToken(token);
  if (!session) {
    return { error: 'Invalid authentication token', status: 401 };
  }

  const validation = validateSession(session);
  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 };
  }

  return { session: session! };
}

interface UsageAnalytics {
  user_profile: {
    userId: string;
    role: string;
    subscription_tier: string;
    created_at: string;
    last_login_at: string;
  };
  activity_summary: {
    total_sessions: number;
    total_session_time_minutes: number;
    total_audio_recordings: number;
    total_transcriptions: number;
    total_notes: number;
    last_activity: string;
  };
  usage_limits: {
    daily_transcription_limit_minutes: number;
    daily_transcription_used_minutes: number;
    monthly_cost_limit_cents: number;
    monthly_cost_used_cents: number;
    daily_remaining_minutes: number;
    monthly_remaining_budget_cents: number;
  };
  learning_progress: {
    modules_started: number;
    modules_completed: number;
    lessons_completed: number;
    overall_progress_percent: number;
    current_streak_days: number;
    total_study_time_minutes: number;
  };
  cost_breakdown: {
    total_cost_cents: number;
    transcription_cost_cents: number;
    average_cost_per_minute: number;
    cost_by_month: Array<{ month: string; cost_cents: number; minutes: number }>;
  };
  engagement_metrics: {
    sessions_this_week: number;
    sessions_this_month: number;
    average_session_duration_minutes: number;
    most_active_hour: number;
    most_active_day: string;
    participation_score: number;
  };
  content_interaction: {
    notes_created: number;
    action_items_created: number;
    action_items_completed: number;
    searches_performed: number;
    exports_generated: number;
  };
  performance_insights: {
    completion_rate: number;
    engagement_trend: 'increasing' | 'stable' | 'decreasing';
    learning_velocity: number; // lessons per week
    retention_score: number;
    recommendations: string[];
  };
}

// T038: Enhanced usage analytics API
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for usage analytics' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 30)) {
      return NextResponse.json(
        { error: 'Usage analytics rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '30d'; // 7d, 30d, 90d, 1y
    const includeDetails = url.searchParams.get('details') === 'true';
    const includeCosts = url.searchParams.get('costs') === 'true';

    // Validate timeframe
    const validTimeframes = ['7d', '30d', '90d', '1y'];
    if (!validTimeframes.includes(timeframe)) {
      throw new ValidationError('Invalid timeframe. Valid options: 7d, 30d, 90d, 1y');
    }

    const timeframeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[timeframe];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Get user profile information
    const userProfile = await db.queryOne(
      `SELECT id, email, first_name, last_name, subscription_tier, role,
              daily_transcription_limit_minutes, daily_transcription_used_minutes,
              monthly_transcription_cost_cents, monthly_cost_limit_cents,
              created_at, last_login_at
       FROM workbook_users
       WHERE id = $1`,
      [auth.session.userId]
    );

    if (!userProfile) {
      throw new ValidationError('User profile not found');
    }

    // Get session activity summary
    const sessionSummary = await db.queryOne(
      `SELECT
         COUNT(*) as total_sessions,
         COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60), 0) as total_session_time_minutes,
         MAX(COALESCE(ended_at, started_at)) as last_activity
       FROM workbook_sessions
       WHERE user_id = $1 AND created_at >= $2`,
      [auth.session.userId, startDate]
    );

    // Get audio and transcription counts
    const audioStats = await db.queryOne(
      `SELECT
         COUNT(DISTINCT ar.id) as total_audio_recordings,
         COUNT(DISTINCT t.id) as total_transcriptions,
         COALESCE(SUM(t.cost_cents), 0) as total_transcription_cost_cents
       FROM audio_recordings ar
       LEFT JOIN transcriptions t ON ar.id = t.recording_id
       WHERE ar.user_id = $1 AND ar.created_at >= $2`,
      [auth.session.userId, startDate]
    );

    // Get notes count
    const notesStats = await db.queryOne(
      `SELECT
         COUNT(*) as total_notes,
         COUNT(*) FILTER (WHERE is_action_item = true) as action_items_created,
         COUNT(*) FILTER (WHERE is_action_item = true AND action_item_completed = true) as action_items_completed
       FROM session_notes
       WHERE user_id = $1 AND created_at >= $2`,
      [auth.session.userId, startDate]
    );

    // Get learning progress
    const learningProgress = await db.queryOne(
      `SELECT
         COUNT(DISTINCT up.module_id) as modules_started,
         COUNT(DISTINCT up.module_id) FILTER (WHERE up.status = 'completed') as modules_completed,
         COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.status = 'completed') as lessons_completed,
         COALESCE(AVG(up.progress_percent), 0) as overall_progress_percent,
         COALESCE(SUM(up.time_spent_minutes), 0) as total_study_time_minutes
       FROM user_progress up
       LEFT JOIN lesson_progress lp ON up.user_id = lp.user_id
       WHERE up.user_id = $1`,
      [auth.session.userId]
    );

    // Calculate learning streak
    const streakData = await db.query(
      `SELECT DATE(last_accessed_at) as activity_date
       FROM user_progress
       WHERE user_id = $1 AND last_accessed_at >= $2
       GROUP BY DATE(last_accessed_at)
       ORDER BY activity_date DESC`,
      [auth.session.userId, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)] // Last 60 days
    );

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    for (const activity of streakData) {
      const activityDate = new Date(activity.activity_date).toISOString().split('T')[0];
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (activityDate === expectedDate || (currentStreak === 0 && activityDate === today)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Get engagement metrics
    const engagementStats = await db.queryOne(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as sessions_this_week,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as sessions_this_month,
         COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60), 0) as average_session_duration_minutes
       FROM workbook_sessions
       WHERE user_id = $1`,
      [auth.session.userId]
    );

    // Get most active hour
    const activeHourData = await db.queryOne(
      `SELECT EXTRACT(hour FROM started_at) as hour, COUNT(*) as session_count
       FROM workbook_sessions
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY EXTRACT(hour FROM started_at)
       ORDER BY session_count DESC
       LIMIT 1`,
      [auth.session.userId, startDate]
    );

    // Get most active day of week
    const activeDayData = await db.queryOne(
      `SELECT
         CASE EXTRACT(dow FROM started_at)
           WHEN 0 THEN 'Sunday'
           WHEN 1 THEN 'Monday'
           WHEN 2 THEN 'Tuesday'
           WHEN 3 THEN 'Wednesday'
           WHEN 4 THEN 'Thursday'
           WHEN 5 THEN 'Friday'
           WHEN 6 THEN 'Saturday'
         END as day_name,
         COUNT(*) as session_count
       FROM workbook_sessions
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY EXTRACT(dow FROM started_at)
       ORDER BY session_count DESC
       LIMIT 1`,
      [auth.session.userId, startDate]
    );

    // Get cost breakdown by month if requested
    let costBreakdown = null;
    if (includeCosts) {
      const costByMonth = await db.query(
        `SELECT
           TO_CHAR(usage_date, 'YYYY-MM') as month,
           SUM(cost_cents) as cost_cents,
           SUM(quantity) as minutes
         FROM cost_tracking
         WHERE user_id = $1 AND usage_date >= $2
         GROUP BY TO_CHAR(usage_date, 'YYYY-MM')
         ORDER BY month DESC`,
        [auth.session.userId, startDate]
      );

      costBreakdown = {
        total_cost_cents: audioStats.total_transcription_cost_cents || 0,
        transcription_cost_cents: audioStats.total_transcription_cost_cents || 0,
        average_cost_per_minute: audioStats.total_transcriptions > 0
          ? (audioStats.total_transcription_cost_cents || 0) / audioStats.total_transcriptions
          : 0,
        cost_by_month: costByMonth,
      };
    }

    // Calculate performance insights
    const completionRate = learningProgress.modules_started > 0
      ? (learningProgress.modules_completed / learningProgress.modules_started) * 100
      : 0;

    const learningVelocity = learningProgress.lessons_completed / Math.max(timeframeDays / 7, 1); // lessons per week

    // Simple engagement trend calculation
    const recentSessions = engagementStats.sessions_this_week || 0;
    const expectedWeeklySessions = (engagementStats.sessions_this_month || 0) / 4;
    const engagementTrend = recentSessions > expectedWeeklySessions * 1.1 ? 'increasing'
      : recentSessions < expectedWeeklySessions * 0.9 ? 'decreasing'
      : 'stable';

    // Generate recommendations
    const recommendations = [];
    if (completionRate < 50) {
      recommendations.push('Focus on completing started modules to improve your learning outcomes');
    }
    if (currentStreak === 0) {
      recommendations.push('Start a daily learning streak to build consistent study habits');
    }
    if (learningVelocity < 1) {
      recommendations.push('Consider setting aside more time for lessons to accelerate your progress');
    }
    if ((notesStats.action_items_completed || 0) < (notesStats.action_items_created || 1) * 0.5) {
      recommendations.push('Complete more action items to put your learning into practice');
    }

    const analytics: UsageAnalytics = {
      user_profile: {
        userId: userProfile.id,
        role: userProfile.role || 'student',
        subscription_tier: userProfile.subscription_tier,
        created_at: userProfile.created_at,
        last_login_at: userProfile.last_login_at,
      },
      activity_summary: {
        total_sessions: parseInt(sessionSummary.total_sessions) || 0,
        total_session_time_minutes: Math.round(parseFloat(sessionSummary.total_session_time_minutes) || 0),
        total_audio_recordings: parseInt(audioStats.total_audio_recordings) || 0,
        total_transcriptions: parseInt(audioStats.total_transcriptions) || 0,
        total_notes: parseInt(notesStats.total_notes) || 0,
        last_activity: sessionSummary.last_activity || userProfile.last_login_at,
      },
      usage_limits: {
        daily_transcription_limit_minutes: userProfile.daily_transcription_limit_minutes,
        daily_transcription_used_minutes: userProfile.daily_transcription_used_minutes,
        monthly_cost_limit_cents: userProfile.monthly_cost_limit_cents,
        monthly_cost_used_cents: userProfile.monthly_transcription_cost_cents,
        daily_remaining_minutes: Math.max(0, userProfile.daily_transcription_limit_minutes - userProfile.daily_transcription_used_minutes),
        monthly_remaining_budget_cents: Math.max(0, userProfile.monthly_cost_limit_cents - userProfile.monthly_transcription_cost_cents),
      },
      learning_progress: {
        modules_started: parseInt(learningProgress.modules_started) || 0,
        modules_completed: parseInt(learningProgress.modules_completed) || 0,
        lessons_completed: parseInt(learningProgress.lessons_completed) || 0,
        overall_progress_percent: Math.round(parseFloat(learningProgress.overall_progress_percent) || 0),
        current_streak_days: currentStreak,
        total_study_time_minutes: parseInt(learningProgress.total_study_time_minutes) || 0,
      },
      cost_breakdown: costBreakdown || {
        total_cost_cents: 0,
        transcription_cost_cents: 0,
        average_cost_per_minute: 0,
        cost_by_month: [],
      },
      engagement_metrics: {
        sessions_this_week: parseInt(engagementStats.sessions_this_week) || 0,
        sessions_this_month: parseInt(engagementStats.sessions_this_month) || 0,
        average_session_duration_minutes: Math.round(parseFloat(engagementStats.average_session_duration_minutes) || 0),
        most_active_hour: parseInt(activeHourData?.hour) || 9,
        most_active_day: activeDayData?.day_name || 'Monday',
        participation_score: Math.round((completionRate + (currentStreak * 5) + Math.min(learningVelocity * 10, 50)) / 3),
      },
      content_interaction: {
        notes_created: parseInt(notesStats.total_notes) || 0,
        action_items_created: parseInt(notesStats.action_items_created) || 0,
        action_items_completed: parseInt(notesStats.action_items_completed) || 0,
        searches_performed: 0, // Would need to track search queries
        exports_generated: 0, // Would get from data_exports table
      },
      performance_insights: {
        completion_rate: Math.round(completionRate),
        engagement_trend,
        learning_velocity: Math.round(learningVelocity * 10) / 10,
        retention_score: Math.min(Math.round((currentStreak * 10) + (completionRate / 2)), 100),
        recommendations,
      },
    };

    return NextResponse.json(
      {
        success: true,
        timeframe,
        analytics,
        generated_at: new Date().toISOString(),
        ...(includeDetails && {
          raw_data: {
            session_summary: sessionSummary,
            audio_stats: audioStats,
            notes_stats: notesStats,
            learning_progress: learningProgress,
          },
        }),
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Usage analytics API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Unable to retrieve usage analytics' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
