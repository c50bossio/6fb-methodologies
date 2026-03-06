/**
 * Transcription Search API Route - Fixed Version
 * Provides full-text search and analytics for audio transcriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
// Security headers constant
const WORKBOOK_SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Search interfaces
interface SearchFilters {
  userId?: string;
  sessionId?: string;
  recordingId?: string;
  language?: string;
  provider?: string;
  status?: string;
  minConfidence?: number;
  maxConfidence?: number;
  minDuration?: number;
  maxDuration?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  keyTopics?: string[];
}

interface SearchResult {
  id: string;
  text: string;
  summary: string;
  confidence_score: number;
  language: string;
  key_topics: string[];
  word_count: number;
  duration: number;
  cost_cents: number;
  created_at: string;
  session_id: string;
  recording_id: string;
  relevance_score: number;
  highlight_snippets: string[];
  metadata: any;
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

/**
 * GET /api/workbook/search/transcriptions - Search transcriptions
 */
export async function GET(request: NextRequest) {
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
          error: 'Insufficient permissions to search transcriptions',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Parse query parameters with validation
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit, 100);
    const offset = (page - 1) * limit;

    // Simple search implementation
    const searchQuery = `
      SELECT
        id, text, summary, confidence_score, language, key_topics,
        word_count, character_count, cost_cents, created_at, completed_at,
        session_id, recording_id, metadata
      FROM transcriptions
      WHERE user_id = $1 AND status = 'completed'
      ${query ? "AND (text ILIKE $2 OR summary ILIKE $2)" : ""}
      ORDER BY created_at DESC
      LIMIT $${query ? 3 : 2} OFFSET $${query ? 4 : 3}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM transcriptions
      WHERE user_id = $1 AND status = 'completed'
      ${query ? "AND (text ILIKE $2 OR summary ILIKE $2)" : ""}
    `;

    const params = query
      ? [auth.session.userId, `%${query}%`, limit, offset]
      : [auth.session.userId, limit, offset];

    const countParams = query
      ? [auth.session.userId, `%${query}%`]
      : [auth.session.userId];

    const [searchResults, countResults] = await Promise.all([
      db.query(searchQuery, params),
      db.query(countQuery, countParams),
    ]);

    const results: SearchResult[] = searchResults.map((row: any) => ({
      id: row.id,
      text: row.text,
      summary: row.summary || '',
      confidence_score: row.confidence_score || 0,
      language: row.language,
      key_topics: row.key_topics || [],
      word_count: row.word_count || 0,
      duration: row.metadata?.openaiResponse?.totalDuration || 0,
      cost_cents: row.cost_cents || 0,
      created_at: row.created_at,
      session_id: row.session_id,
      recording_id: row.recording_id,
      relevance_score: 0,
      highlight_snippets: [],
      metadata: row.metadata,
    }));

    const total = parseInt(countResults[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        query,
        executionTime: 0,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Transcription search error:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search transcriptions',
        code: 'INTERNAL_ERROR',
        timestamp: Date.now(),
      },
      { status: 500 }
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