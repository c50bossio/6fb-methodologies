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
 * Transcription Analytics API for admin dashboard
 * Provides comprehensive analytics and monitoring for transcription services
 */

// GET /api/workbook/admin/transcription-analytics - Get analytics data
export async function GET(request: NextRequest) {
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
    const timeRange = url.searchParams.get('range') || '7d'; // 1d, 7d, 30d, 90d
    const breakdown = url.searchParams.get('breakdown') || 'daily'; // hourly, daily, weekly

    const analytics = await getTranscriptionAnalytics(timeRange, breakdown);

    return NextResponse.json(
      {
        analytics,
        generated_at: new Date().toISOString(),
        time_range: timeRange,
        breakdown,
      },
      { headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Transcription analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get transcription analytics' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// POST /api/workbook/admin/transcription-analytics - Generate reports
export async function POST(request: NextRequest) {
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

    const {
      report_type,
      time_range,
      user_id,
      include_segments = false,
      export_format = 'json',
    } = await request.json();

    const reportData = await generateTranscriptionReport(
      report_type,
      time_range,
      user_id,
      include_segments
    );

    if (export_format === 'csv') {
      const csv = convertToCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          ...WORKBOOK_SECURITY_HEADERS,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transcription_report_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(
      {
        report: reportData,
        generated_at: new Date().toISOString(),
        report_type,
        time_range,
        user_id,
      },
      { headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Transcription report generation error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate transcription report' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

async function getTranscriptionAnalytics(timeRange: string, breakdown: string) {
  const { interval, dateCondition } = getTimeRangeConditions(timeRange, breakdown);

  // Overall statistics
  const overallStats = await db.queryOne(`
    SELECT
      COUNT(*) as total_transcriptions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_transcriptions,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_transcriptions,
      COUNT(*) FILTER (WHERE status = 'processing') as processing_transcriptions,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_transcriptions,
      SUM(cost_cents) as total_cost_cents,
      SUM(word_count) as total_words,
      AVG(word_count) as avg_words_per_transcription,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time_seconds,
      AVG(confidence_score) as avg_confidence_score,
      COUNT(DISTINCT user_id) as unique_users
    FROM transcriptions
    WHERE ${dateCondition}
  `);

  // Time series data
  const timeSeriesData = await db.query(`
    SELECT
      DATE_TRUNC('${interval}', created_at) as time_bucket,
      COUNT(*) as transcription_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      SUM(cost_cents) as total_cost,
      SUM(word_count) as total_words,
      AVG(confidence_score) as avg_confidence,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
    FROM transcriptions
    WHERE ${dateCondition}
    GROUP BY DATE_TRUNC('${interval}', created_at)
    ORDER BY time_bucket ASC
  `);

  // Provider performance
  const providerStats = await db.query(`
    SELECT
      provider,
      model,
      COUNT(*) as transcription_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      SUM(cost_cents) as total_cost,
      AVG(cost_cents) as avg_cost,
      AVG(confidence_score) as avg_confidence,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
    FROM transcriptions
    WHERE ${dateCondition}
    GROUP BY provider, model
    ORDER BY transcription_count DESC
  `);

  // Language distribution
  const languageStats = await db.query(`
    SELECT
      language,
      COUNT(*) as transcription_count,
      AVG(confidence_score) as avg_confidence,
      SUM(word_count) as total_words
    FROM transcriptions
    WHERE ${dateCondition} AND status = 'completed'
    GROUP BY language
    ORDER BY transcription_count DESC
  `);

  // User tier performance
  const userTierStats = await db.query(`
    SELECT
      u.subscription_tier,
      COUNT(t.id) as transcription_count,
      COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_count,
      SUM(t.cost_cents) as total_cost,
      AVG(t.cost_cents) as avg_cost_per_transcription,
      AVG(t.word_count) as avg_words_per_transcription,
      AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at))) as avg_processing_time
    FROM transcriptions t
    JOIN workbook_users u ON t.user_id = u.id
    WHERE ${dateCondition.replace('created_at', 't.created_at')}
    GROUP BY u.subscription_tier
    ORDER BY transcription_count DESC
  `);

  // Error analysis
  const errorStats = await db.query(`
    SELECT
      COALESCE(error_message, 'Unknown error') as error_type,
      COUNT(*) as error_count,
      provider,
      model
    FROM transcriptions
    WHERE ${dateCondition} AND status = 'failed'
    GROUP BY error_message, provider, model
    ORDER BY error_count DESC
    LIMIT 20
  `);

  // Cost analysis
  const costAnalysis = await db.query(`
    SELECT
      DATE_TRUNC('${interval}', usage_date) as time_bucket,
      SUM(cost_cents) as total_cost,
      SUM(quantity) as total_minutes,
      AVG(rate_cents_per_unit) as avg_rate,
      COUNT(*) as transaction_count
    FROM cost_tracking
    WHERE service_type = 'transcription'
    AND ${dateCondition.replace('created_at', 'usage_date')}
    GROUP BY DATE_TRUNC('${interval}', usage_date)
    ORDER BY time_bucket ASC
  `);

  // Queue performance
  const queueStats = await db.query(`
    SELECT
      priority,
      COUNT(*) as job_count,
      AVG(EXTRACT(EPOCH FROM (started_at - created_at))) as avg_wait_time_seconds,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time_seconds,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
    FROM transcription_queue tq
    JOIN transcriptions t ON tq.transcription_id = t.id
    WHERE ${dateCondition.replace('created_at', 'tq.created_at')}
    GROUP BY priority
    ORDER BY
      CASE priority
        WHEN 'high' THEN 1
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 3
      END
  `);

  // Top users by usage
  const topUsers = await db.query(`
    SELECT
      u.email,
      u.subscription_tier,
      COUNT(t.id) as transcription_count,
      SUM(t.cost_cents) as total_cost,
      SUM(t.word_count) as total_words,
      MAX(t.created_at) as last_transcription
    FROM transcriptions t
    JOIN workbook_users u ON t.user_id = u.id
    WHERE ${dateCondition.replace('created_at', 't.created_at')}
    GROUP BY u.id, u.email, u.subscription_tier
    ORDER BY transcription_count DESC
    LIMIT 20
  `);

  return {
    overall_stats: overallStats,
    time_series: timeSeriesData,
    provider_performance: providerStats,
    language_distribution: languageStats,
    user_tier_performance: userTierStats,
    error_analysis: errorStats,
    cost_analysis: costAnalysis,
    queue_performance: queueStats,
    top_users: topUsers,
  };
}

async function generateTranscriptionReport(
  reportType: string,
  timeRange: string,
  userId?: string,
  includeSegments: boolean = false
) {
  const { dateCondition } = getTimeRangeConditions(timeRange, 'daily');

  switch (reportType) {
    case 'user_usage':
      return await getUserUsageReport(dateCondition, userId);

    case 'cost_breakdown':
      return await getCostBreakdownReport(dateCondition, userId);

    case 'performance_metrics':
      return await getPerformanceMetricsReport(dateCondition);

    case 'error_analysis':
      return await getErrorAnalysisReport(dateCondition);

    case 'detailed_transcriptions':
      return await getDetailedTranscriptionsReport(dateCondition, userId, includeSegments);

    default:
      throw new ValidationError('Invalid report type');
  }
}

async function getUserUsageReport(dateCondition: string, userId?: string) {
  const userFilter = userId ? `AND u.id = '${userId}'` : '';

  return await db.query(`
    SELECT
      u.email,
      u.subscription_tier,
      u.daily_transcription_limit_minutes,
      u.monthly_cost_limit_cents,
      COUNT(t.id) as total_transcriptions,
      COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_transcriptions,
      SUM(t.cost_cents) as total_cost_cents,
      SUM(t.word_count) as total_words,
      AVG(t.confidence_score) as avg_confidence,
      MAX(t.created_at) as last_transcription,
      MIN(t.created_at) as first_transcription
    FROM workbook_users u
    LEFT JOIN transcriptions t ON u.id = t.user_id AND ${dateCondition.replace('created_at', 't.created_at')}
    WHERE u.is_active = true ${userFilter}
    GROUP BY u.id, u.email, u.subscription_tier, u.daily_transcription_limit_minutes, u.monthly_cost_limit_cents
    ORDER BY total_transcriptions DESC NULLS LAST
  `);
}

async function getCostBreakdownReport(dateCondition: string, userId?: string) {
  const userFilter = userId ? `AND user_id = '${userId}'` : '';

  return await db.query(`
    SELECT
      DATE(usage_date) as usage_date,
      provider,
      service_type,
      SUM(cost_cents) as total_cost_cents,
      SUM(quantity) as total_quantity,
      unit,
      AVG(rate_cents_per_unit) as avg_rate,
      COUNT(*) as transaction_count
    FROM cost_tracking
    WHERE ${dateCondition.replace('created_at', 'usage_date')} ${userFilter}
    GROUP BY DATE(usage_date), provider, service_type, unit
    ORDER BY usage_date DESC, total_cost_cents DESC
  `);
}

async function getPerformanceMetricsReport(dateCondition: string) {
  return await db.query(`
    SELECT
      provider,
      model,
      language,
      COUNT(*) as total_transcriptions,
      COUNT(*) FILTER (WHERE status = 'completed') as successful_transcriptions,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_transcriptions,
      (COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*) * 100) as success_rate,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time_seconds,
      AVG(confidence_score) as avg_confidence_score,
      AVG(word_count) as avg_word_count,
      AVG(cost_cents) as avg_cost_cents,
      MIN(created_at) as first_transcription,
      MAX(created_at) as last_transcription
    FROM transcriptions
    WHERE ${dateCondition}
    GROUP BY provider, model, language
    ORDER BY total_transcriptions DESC
  `);
}

async function getErrorAnalysisReport(dateCondition: string) {
  return await db.query(`
    SELECT
      COALESCE(error_message, 'Unknown error') as error_message,
      provider,
      model,
      language,
      COUNT(*) as error_count,
      MIN(created_at) as first_occurrence,
      MAX(created_at) as last_occurrence,
      AVG(retry_count) as avg_retry_count
    FROM transcriptions
    WHERE ${dateCondition} AND status = 'failed'
    GROUP BY error_message, provider, model, language
    ORDER BY error_count DESC, last_occurrence DESC
  `);
}

async function getDetailedTranscriptionsReport(
  dateCondition: string,
  userId?: string,
  includeSegments: boolean = false
) {
  const userFilter = userId ? `AND t.user_id = '${userId}'` : '';

  const baseQuery = `
    SELECT
      t.id,
      t.user_id,
      u.email as user_email,
      t.status,
      t.provider,
      t.model,
      t.language,
      t.text,
      t.summary,
      t.word_count,
      t.character_count,
      t.confidence_score,
      t.cost_cents,
      t.key_topics,
      t.action_items,
      t.created_at,
      t.started_at,
      t.completed_at,
      EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) as processing_time_seconds,
      t.metadata
    FROM transcriptions t
    JOIN workbook_users u ON t.user_id = u.id
    WHERE ${dateCondition.replace('created_at', 't.created_at')} ${userFilter}
    ORDER BY t.created_at DESC
    LIMIT 1000
  `;

  const transcriptions = await db.query(baseQuery);

  if (includeSegments && transcriptions.length > 0) {
    const transcriptionIds = transcriptions.map(t => `'${t.id}'`).join(',');

    const segments = await db.query(`
      SELECT
        transcription_id,
        segment_index,
        start_time,
        end_time,
        text,
        confidence_score,
        speaker_id
      FROM transcription_segments
      WHERE transcription_id IN (${transcriptionIds})
      ORDER BY transcription_id, segment_index
    `);

    // Group segments by transcription ID
    const segmentsByTranscription = segments.reduce((acc, segment) => {
      if (!acc[segment.transcription_id]) {
        acc[segment.transcription_id] = [];
      }
      acc[segment.transcription_id].push(segment);
      return acc;
    }, {});

    // Add segments to transcriptions
    transcriptions.forEach(transcription => {
      transcription.segments = segmentsByTranscription[transcription.id] || [];
    });
  }

  return transcriptions;
}

function getTimeRangeConditions(timeRange: string, breakdown: string) {
  let interval: string;
  let dateCondition: string;

  switch (breakdown) {
    case 'hourly':
      interval = 'hour';
      break;
    case 'weekly':
      interval = 'week';
      break;
    case 'monthly':
      interval = 'month';
      break;
    default:
      interval = 'day';
  }

  switch (timeRange) {
    case '1d':
      dateCondition = "created_at >= NOW() - INTERVAL '1 day'";
      break;
    case '7d':
      dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
      break;
    case '30d':
      dateCondition = "created_at >= NOW() - INTERVAL '30 days'";
      break;
    case '90d':
      dateCondition = "created_at >= NOW() - INTERVAL '90 days'";
      break;
    case '1y':
      dateCondition = "created_at >= NOW() - INTERVAL '1 year'";
      break;
    default:
      dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
  }

  return { interval, dateCondition };
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value.toString();
      }).join(',')
    ),
  ].join('\n');

  return csvContent;
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}