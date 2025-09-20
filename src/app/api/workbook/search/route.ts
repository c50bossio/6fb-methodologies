import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  WORKBOOK_SECURITY_HEADERS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `search_${userId}`;
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

interface SearchResult {
  id: string;
  type: 'note' | 'transcription' | 'module_content' | 'lesson_content' | 'session';
  title: string;
  content: string;
  snippet: string;
  score: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// T034: Search functionality API implementation
// GET /api/workbook/search - Unified search across content, notes, transcriptions
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
        { error: 'Insufficient permissions for search' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 50)) {
      return NextResponse.json(
        { error: 'Search rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const types = url.searchParams.get('types')?.split(',') || ['note', 'transcription', 'module_content', 'lesson_content', 'session'];
    const sessionId = url.searchParams.get('sessionId');
    const moduleId = url.searchParams.get('moduleId');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const minScore = parseFloat(url.searchParams.get('minScore') || '0.1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Search query too long (max 500 characters)' },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Search in notes
    if (types.includes('note')) {
      let noteQuery = `
        SELECT
          sn.id,
          'note' as type,
          sn.title,
          sn.content,
          ts_headline('english', sn.content, plainto_tsquery('english', $1)) as snippet,
          ts_rank(to_tsvector('english', coalesce(sn.title, '') || ' ' || sn.content), plainto_tsquery('english', $1)) as score,
          json_build_object(
            'session_id', sn.session_id,
            'transcription_id', sn.transcription_id,
            'type', sn.type,
            'tags', sn.tags,
            'is_action_item', sn.is_action_item,
            'importance', sn.importance
          ) as metadata,
          sn.created_at,
          sn.updated_at
        FROM session_notes sn
        WHERE sn.user_id = $2
          AND (to_tsvector('english', coalesce(sn.title, '') || ' ' || sn.content) @@ plainto_tsquery('english', $1)
               OR sn.title ILIKE $3 OR sn.content ILIKE $3)
      `;
      const noteParams: any[] = [query, auth.session.userId, `%${searchTerm}%`];

      if (sessionId) {
        noteQuery += ` AND sn.session_id = $${noteParams.length + 1}`;
        noteParams.push(sessionId);
      }

      if (tags && tags.length > 0) {
        noteQuery += ` AND sn.tags && $${noteParams.length + 1}`;
        noteParams.push(tags);
      }

      if (dateFrom) {
        noteQuery += ` AND sn.created_at >= $${noteParams.length + 1}`;
        noteParams.push(new Date(dateFrom));
      }

      if (dateTo) {
        noteQuery += ` AND sn.created_at <= $${noteParams.length + 1}`;
        noteParams.push(new Date(dateTo));
      }

      noteQuery += ` AND ts_rank(to_tsvector('english', coalesce(sn.title, '') || ' ' || sn.content), plainto_tsquery('english', $1)) >= $${noteParams.length + 1}`;
      noteParams.push(minScore);

      const noteResults = await db.query(noteQuery, noteParams);
      results.push(...noteResults);
    }

    // Search in transcriptions
    if (types.includes('transcription')) {
      let transcriptionQuery = `
        SELECT
          t.id,
          'transcription' as type,
          'Audio Transcription' as title,
          t.text as content,
          ts_headline('english', t.text, plainto_tsquery('english', $1)) as snippet,
          ts_rank(to_tsvector('english', t.text), plainto_tsquery('english', $1)) as score,
          json_build_object(
            'recording_id', t.recording_id,
            'session_id', t.session_id,
            'status', t.status,
            'provider', t.provider,
            'model', t.model,
            'language', t.language,
            'duration_seconds', ar.duration_seconds,
            'cost_cents', t.cost_cents
          ) as metadata,
          t.created_at,
          t.updated_at
        FROM transcriptions t
        LEFT JOIN audio_recordings ar ON t.recording_id = ar.id
        WHERE t.user_id = $2
          AND t.status = 'completed'
          AND (to_tsvector('english', t.text) @@ plainto_tsquery('english', $1)
               OR t.text ILIKE $3)
      `;
      const transcriptionParams: any[] = [query, auth.session.userId, `%${searchTerm}%`];

      if (sessionId) {
        transcriptionQuery += ` AND t.session_id = $${transcriptionParams.length + 1}`;
        transcriptionParams.push(sessionId);
      }

      if (dateFrom) {
        transcriptionQuery += ` AND t.created_at >= $${transcriptionParams.length + 1}`;
        transcriptionParams.push(new Date(dateFrom));
      }

      if (dateTo) {
        transcriptionQuery += ` AND t.created_at <= $${transcriptionParams.length + 1}`;
        transcriptionParams.push(new Date(dateTo));
      }

      transcriptionQuery += ` AND ts_rank(to_tsvector('english', t.text), plainto_tsquery('english', $1)) >= $${transcriptionParams.length + 1}`;
      transcriptionParams.push(minScore);

      const transcriptionResults = await db.query(transcriptionQuery, transcriptionParams);
      results.push(...transcriptionResults);
    }

    // Search in workshop modules
    if (types.includes('module_content')) {
      let moduleQuery = `
        SELECT
          wm.id,
          'module_content' as type,
          wm.title,
          wm.description as content,
          ts_headline('english', wm.description, plainto_tsquery('english', $1)) as snippet,
          ts_rank(to_tsvector('english', wm.title || ' ' || coalesce(wm.description, '')), plainto_tsquery('english', $1)) as score,
          json_build_object(
            'order_index', wm.order_index,
            'difficulty_level', wm.difficulty_level,
            'duration_minutes', wm.duration_minutes,
            'is_active', wm.is_active
          ) as metadata,
          wm.created_at,
          wm.updated_at
        FROM workshop_modules wm
        WHERE wm.is_active = true
          AND (to_tsvector('english', wm.title || ' ' || coalesce(wm.description, '')) @@ plainto_tsquery('english', $1)
               OR wm.title ILIKE $2 OR wm.description ILIKE $2)
      `;
      const moduleParams: any[] = [query, `%${searchTerm}%`];

      if (moduleId) {
        moduleQuery += ` AND wm.id = $${moduleParams.length + 1}`;
        moduleParams.push(moduleId);
      }

      moduleQuery += ` AND ts_rank(to_tsvector('english', wm.title || ' ' || coalesce(wm.description, '')), plainto_tsquery('english', $1)) >= $${moduleParams.length + 1}`;
      moduleParams.push(minScore);

      const moduleResults = await db.query(moduleQuery, moduleParams);
      results.push(...moduleResults);
    }

    // Search in lessons
    if (types.includes('lesson_content')) {
      let lessonQuery = `
        SELECT
          wl.id,
          'lesson_content' as type,
          wl.title,
          wl.content,
          ts_headline('english', wl.content, plainto_tsquery('english', $1)) as snippet,
          ts_rank(to_tsvector('english', wl.title || ' ' || coalesce(wl.content, '')), plainto_tsquery('english', $1)) as score,
          json_build_object(
            'module_id', wl.module_id,
            'order_index', wl.order_index,
            'lesson_type', wl.lesson_type,
            'duration_minutes', wl.duration_minutes,
            'is_required', wl.is_required
          ) as metadata,
          wl.created_at,
          wl.updated_at
        FROM workshop_lessons wl
        WHERE wl.is_active = true
          AND (to_tsvector('english', wl.title || ' ' || coalesce(wl.content, '')) @@ plainto_tsquery('english', $1)
               OR wl.title ILIKE $2 OR wl.content ILIKE $2)
      `;
      const lessonParams: any[] = [query, `%${searchTerm}%`];

      if (moduleId) {
        lessonQuery += ` AND wl.module_id = $${lessonParams.length + 1}`;
        lessonParams.push(moduleId);
      }

      lessonQuery += ` AND ts_rank(to_tsvector('english', wl.title || ' ' || coalesce(wl.content, '')), plainto_tsquery('english', $1)) >= $${lessonParams.length + 1}`;
      lessonParams.push(minScore);

      const lessonResults = await db.query(lessonQuery, lessonParams);
      results.push(...lessonResults);
    }

    // Search in sessions
    if (types.includes('session')) {
      let sessionQuery = `
        SELECT
          ws.id,
          'session' as type,
          ws.title,
          coalesce(ws.notes, '') as content,
          ts_headline('english', coalesce(ws.notes, ''), plainto_tsquery('english', $1)) as snippet,
          ts_rank(to_tsvector('english', ws.title || ' ' || coalesce(ws.notes, '')), plainto_tsquery('english', $1)) as score,
          json_build_object(
            'workshop_module', ws.workshop_module,
            'session_type', ws.session_type,
            'status', ws.status,
            'started_at', ws.started_at,
            'ended_at', ws.ended_at
          ) as metadata,
          ws.created_at,
          ws.updated_at
        FROM workbook_sessions ws
        WHERE ws.user_id = $2
          AND (to_tsvector('english', ws.title || ' ' || coalesce(ws.notes, '')) @@ plainto_tsquery('english', $1)
               OR ws.title ILIKE $3 OR ws.notes ILIKE $3)
      `;
      const sessionParams: any[] = [query, auth.session.userId, `%${searchTerm}%`];

      if (sessionId) {
        sessionQuery += ` AND ws.id = $${sessionParams.length + 1}`;
        sessionParams.push(sessionId);
      }

      if (dateFrom) {
        sessionQuery += ` AND ws.created_at >= $${sessionParams.length + 1}`;
        sessionParams.push(new Date(dateFrom));
      }

      if (dateTo) {
        sessionQuery += ` AND ws.created_at <= $${sessionParams.length + 1}`;
        sessionParams.push(new Date(dateTo));
      }

      sessionQuery += ` AND ts_rank(to_tsvector('english', ws.title || ' ' || coalesce(ws.notes, '')), plainto_tsquery('english', $1)) >= $${sessionParams.length + 1}`;
      sessionParams.push(minScore);

      const sessionResults = await db.query(sessionQuery, sessionParams);
      results.push(...sessionResults);
    }

    // Sort results by score (descending) and apply pagination
    results.sort((a, b) => b.score - a.score);
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate total for pagination info
    const total = results.length;

    return NextResponse.json(
      {
        success: true,
        results: paginatedResults,
        pagination: {
          query,
          types,
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
        metadata: {
          searchTerm,
          minScore,
          resultsByType: types.reduce((acc, type) => {
            acc[type] = results.filter(r => r.type === type).length;
            return acc;
          }, {} as Record<string, number>),
          searchDuration: Date.now() - Date.now(), // This would be calculated properly in real implementation
        },
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Search service temporarily unavailable' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// POST /api/workbook/search - Advanced search with complex filters
export async function POST(request: NextRequest) {
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
        { error: 'Insufficient permissions for advanced search' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting for advanced search (more restrictive)
    if (!checkRateLimit(auth.session.userId, 20)) {
      return NextResponse.json(
        { error: 'Advanced search rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const body = await request.json();
    const {
      query,
      filters = {},
      sorting = { field: 'score', order: 'desc' },
      facets = [],
      highlight = true,
      limit = 20,
      offset = 0,
    } = body;

    if (!query || typeof query !== 'string' || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    if (query.length > 500) {
      throw new ValidationError('Search query too long (max 500 characters)');
    }

    // Advanced search logic would go here
    // This would implement more sophisticated search features like:
    // - Boolean operators (AND, OR, NOT)
    // - Phrase matching
    // - Wildcard searches
    // - Field-specific searches
    // - Faceted search results
    // - Search suggestions/corrections

    // For now, return a simplified response
    return NextResponse.json(
      {
        success: true,
        message: 'Advanced search functionality is under development',
        query,
        filters,
        sorting,
        facets,
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Advanced search API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Advanced search service temporarily unavailable' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}