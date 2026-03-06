import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
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
  const key = `search_notes_${userId}`;
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

/**
 * POST /api/workbook/notes/search - Full-text search across notes
 * Supports advanced search with filters, highlighting, and relevance ranking
 */
export async function POST(request: NextRequest) {
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
    if (!checkRateLimit(auth.session.userId, 30)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      query,
      type,
      tags,
      sessionId,
      transcriptionId,
      lessonId,
      moduleId,
      isActionItem,
      importance,
      isPrivate,
      dateRange,
      includeHighlights = true,
      limit = 20,
      offset = 0,
      sortBy = 'relevance', // relevance, created_at, updated_at, title
      sortOrder = 'desc',
    } = body;

    // Validation
    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    if (limit > 100) {
      throw new ValidationError('Limit cannot exceed 100');
    }

    const maxOffset = 1000;
    if (offset > maxOffset) {
      throw new ValidationError(`Offset cannot exceed ${maxOffset}`);
    }

    // Build search query
    let searchQuery = `
      SELECT
        sn.*,
        ws.title as session_title,
        ws.workshop_module,
        t.text as transcription_text,
        ts_rank(sn.search_vector, plainto_tsquery('english', $1)) as relevance_score,
        ts_headline('english', sn.content, plainto_tsquery('english', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlighted_content,
        ts_headline('english', sn.title, plainto_tsquery('english', $1),
          'StartSel=<mark>, StopSel=</mark>') as highlighted_title
      FROM session_notes sn
      LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
      LEFT JOIN transcriptions t ON sn.transcription_id = t.id
      WHERE sn.user_id = $2
        AND sn.search_vector @@ plainto_tsquery('english', $1)
    `;

    const params: any[] = [query, auth.session.userId];
    let paramIndex = 3;

    // Add filters
    if (type) {
      searchQuery += ` AND sn.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (sessionId) {
      searchQuery += ` AND sn.session_id = $${paramIndex}`;
      params.push(sessionId);
      paramIndex++;
    }

    if (transcriptionId) {
      searchQuery += ` AND sn.transcription_id = $${paramIndex}`;
      params.push(transcriptionId);
      paramIndex++;
    }

    if (lessonId) {
      searchQuery += ` AND sn.lesson_id = $${paramIndex}`;
      params.push(lessonId);
      paramIndex++;
    }

    if (moduleId) {
      searchQuery += ` AND sn.module_id = $${paramIndex}`;
      params.push(moduleId);
      paramIndex++;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      searchQuery += ` AND sn.tags && $${paramIndex}`;
      params.push(tags);
      paramIndex++;
    }

    if (isActionItem !== undefined) {
      searchQuery += ` AND sn.is_action_item = $${paramIndex}`;
      params.push(isActionItem);
      paramIndex++;
    }

    if (importance !== undefined) {
      searchQuery += ` AND sn.importance = $${paramIndex}`;
      params.push(importance);
      paramIndex++;
    }

    if (isPrivate !== undefined) {
      searchQuery += ` AND sn.is_private = $${paramIndex}`;
      params.push(isPrivate);
      paramIndex++;
    }

    if (dateRange) {
      if (dateRange.from) {
        searchQuery += ` AND sn.created_at >= $${paramIndex}`;
        params.push(new Date(dateRange.from));
        paramIndex++;
      }
      if (dateRange.to) {
        searchQuery += ` AND sn.created_at <= $${paramIndex}`;
        params.push(new Date(dateRange.to));
        paramIndex++;
      }
    }

    // Add sorting
    const allowedSortFields = ['relevance', 'created_at', 'updated_at', 'title', 'importance'];
    const allowedSortOrders = ['asc', 'desc'];

    if (!allowedSortFields.includes(sortBy)) {
      throw new ValidationError('Invalid sort field');
    }

    if (!allowedSortOrders.includes(sortOrder.toLowerCase())) {
      throw new ValidationError('Invalid sort order');
    }

    if (sortBy === 'relevance') {
      searchQuery += ` ORDER BY relevance_score DESC, sn.updated_at DESC`;
    } else {
      const dbField = sortBy === 'title' ? 'sn.title' : `sn.${sortBy}`;
      searchQuery += ` ORDER BY ${dbField} ${sortOrder.toUpperCase()}`;
    }

    // Add pagination
    searchQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute search
    const searchResults = await db.query(searchQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM session_notes sn
      WHERE sn.user_id = $2
        AND sn.search_vector @@ plainto_tsquery('english', $1)
    `;

    const countParams = [query, auth.session.userId];
    let countParamIndex = 3;

    // Re-add the same filters for count query
    if (type) {
      countQuery += ` AND sn.type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (sessionId) {
      countQuery += ` AND sn.session_id = $${countParamIndex}`;
      countParams.push(sessionId);
      countParamIndex++;
    }

    if (transcriptionId) {
      countQuery += ` AND sn.transcription_id = $${countParamIndex}`;
      countParams.push(transcriptionId);
      countParamIndex++;
    }

    if (lessonId) {
      countQuery += ` AND sn.lesson_id = $${countParamIndex}`;
      countParams.push(lessonId);
      countParamIndex++;
    }

    if (moduleId) {
      countQuery += ` AND sn.module_id = $${countParamIndex}`;
      countParams.push(moduleId);
      countParamIndex++;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      countQuery += ` AND sn.tags && $${countParamIndex}`;
      countParams.push(tags);
      countParamIndex++;
    }

    if (isActionItem !== undefined) {
      countQuery += ` AND sn.is_action_item = $${countParamIndex}`;
      countParams.push(isActionItem);
      countParamIndex++;
    }

    if (importance !== undefined) {
      countQuery += ` AND sn.importance = $${countParamIndex}`;
      countParams.push(importance);
      countParamIndex++;
    }

    if (isPrivate !== undefined) {
      countQuery += ` AND sn.is_private = $${countParamIndex}`;
      countParams.push(isPrivate);
      countParamIndex++;
    }

    if (dateRange) {
      if (dateRange.from) {
        countQuery += ` AND sn.created_at >= $${countParamIndex}`;
        countParams.push(new Date(dateRange.from));
        countParamIndex++;
      }
      if (dateRange.to) {
        countQuery += ` AND sn.created_at <= $${countParamIndex}`;
        countParams.push(new Date(dateRange.to));
        countParamIndex++;
      }
    }

    const countResult = await db.queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0', 10);

    // Format results
    const formattedResults = searchResults.map((note: any) => ({
      ...note,
      relevance_score: parseFloat(note.relevance_score || '0'),
      highlighted_content: includeHighlights ? note.highlighted_content : undefined,
      highlighted_title: includeHighlights ? note.highlighted_title : undefined,
    }));

    // Get search suggestions if no results
    let suggestions: string[] = [];
    if (searchResults.length === 0 && query.length >= 3) {
      try {
        const suggestionQuery = `
          SELECT DISTINCT unnest(string_to_array(content, ' ')) as word
          FROM session_notes
          WHERE user_id = $1
            AND content ILIKE $2
          LIMIT 5
        `;
        const suggestionResults = await db.query(suggestionQuery, [
          auth.session.userId,
          `%${query}%`
        ]);
        suggestions = suggestionResults
          .map((row: any) => row.word)
          .filter((word: string) => word.length > 2)
          .slice(0, 5);
      } catch (error) {
        console.warn('Failed to generate search suggestions:', error);
      }
    }

    return NextResponse.json({
      success: true,
      results: formattedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      searchInfo: {
        query,
        executionTime: Date.now(), // In production, measure actual execution time
        totalMatches: total,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Notes search error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to search notes' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workbook/notes/search - Get popular search terms and suggestions
 */
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

    // Get popular tags
    const tagsQuery = `
      SELECT unnest(tags) as tag, COUNT(*) as usage_count
      FROM session_notes
      WHERE user_id = $1 AND tags IS NOT NULL
      GROUP BY tag
      ORDER BY usage_count DESC
      LIMIT 10
    `;
    const popularTags = await db.query(tagsQuery, [auth.session.userId]);

    // Get recent note types
    const typesQuery = `
      SELECT type, COUNT(*) as count
      FROM session_notes
      WHERE user_id = $1
      GROUP BY type
      ORDER BY count DESC
    `;
    const noteTypes = await db.query(typesQuery, [auth.session.userId]);

    // Get sessions with notes
    const sessionsQuery = `
      SELECT DISTINCT ws.id, ws.title, COUNT(sn.id) as note_count
      FROM workbook_sessions ws
      INNER JOIN session_notes sn ON ws.id = sn.session_id
      WHERE ws.user_id = $1
      GROUP BY ws.id, ws.title
      ORDER BY note_count DESC
      LIMIT 10
    `;
    const sessionsWithNotes = await db.query(sessionsQuery, [auth.session.userId]);

    return NextResponse.json({
      success: true,
      suggestions: {
        popularTags: popularTags.map((row: any) => ({
          tag: row.tag,
          count: parseInt(row.usage_count, 10),
        })),
        noteTypes: noteTypes.map((row: any) => ({
          type: row.type,
          count: parseInt(row.count, 10),
        })),
        sessionsWithNotes: sessionsWithNotes.map((row: any) => ({
          id: row.id,
          title: row.title,
          noteCount: parseInt(row.note_count, 10),
        })),
      },
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get search suggestions' },
      { status: 500 }
    );
  }
}