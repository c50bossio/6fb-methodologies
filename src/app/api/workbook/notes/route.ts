import { NextRequest, NextResponse } from 'next/server'
import { extractToken, verifyToken, validateSession, hasPermission, WORKBOOK_PERMISSIONS } from '@/lib/workbook-auth'
import db, { DatabaseError, ValidationError } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 50, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = `notes_${userId}`
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

async function authenticateRequest(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return { error: 'Authentication token required', status: 401 }
  }

  const session = verifyToken(token)
  const validation = validateSession(session)

  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 }
  }

  return { session: session! }
}

// GET /api/workbook/notes - List user notes
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 100)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const transcriptionId = url.searchParams.get('transcriptionId')
    const type = url.searchParams.get('type')
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean)
    const isActionItem = url.searchParams.get('isActionItem')
    const completed = url.searchParams.get('completed')
    const search = url.searchParams.get('search')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    let query = `
      SELECT sn.*, ws.title as session_title, ws.workshop_module,
             COUNT(children.id) as child_notes_count
      FROM session_notes sn
      LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
      LEFT JOIN session_notes children ON children.parent_note_id = sn.id
      WHERE sn.user_id = $1
    `
    const params: any[] = [auth.session.userId]

    if (sessionId) {
      query += ` AND sn.session_id = $${params.length + 1}`
      params.push(sessionId)
    }

    if (transcriptionId) {
      query += ` AND sn.transcription_id = $${params.length + 1}`
      params.push(transcriptionId)
    }

    if (type) {
      query += ` AND sn.type = $${params.length + 1}`
      params.push(type)
    }

    if (isActionItem !== null) {
      query += ` AND sn.is_action_item = $${params.length + 1}`
      params.push(isActionItem === 'true')
    }

    if (completed !== null && isActionItem === 'true') {
      query += ` AND sn.action_item_completed = $${params.length + 1}`
      params.push(completed === 'true')
    }

    if (tags && tags.length > 0) {
      query += ` AND sn.tags && $${params.length + 1}`
      params.push(tags)
    }

    if (search) {
      query += ` AND (sn.title ILIKE $${params.length + 1} OR sn.content ILIKE $${params.length + 2})`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` GROUP BY sn.id, ws.title, ws.workshop_module`

    // Validate sort parameters
    const allowedSortFields = ['created_at', 'updated_at', 'title', 'importance', 'timestamp_in_session']
    const allowedSortOrders = ['asc', 'desc']

    if (!allowedSortFields.includes(sortBy)) {
      throw new ValidationError('Invalid sort field')
    }

    if (!allowedSortOrders.includes(sortOrder.toLowerCase())) {
      throw new ValidationError('Invalid sort order')
    }

    query += ` ORDER BY sn.${sortBy} ${sortOrder.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const notes = await db.query(query, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM session_notes WHERE user_id = $1'
    const countParams = [auth.session.userId]

    if (sessionId) {
      countQuery += ` AND session_id = $2`
      countParams.push(sessionId)
    }

    const countResult = await db.queryOne(countQuery, countParams)
    const total = parseInt(countResult?.total || '0')

    return NextResponse.json({
      success: true,
      notes,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Notes GET error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/workbook/notes - Create new note
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json({ error: 'Insufficient permissions to create notes' }, { status: 403 })
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 20)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json()
    const {
      sessionId,
      transcriptionId,
      type = 'manual',
      title,
      content,
      richContent,
      timestampInSession,
      highlightedText,
      tags = [],
      isActionItem = false,
      actionItemDueDate,
      parentNoteId,
      importance = 1,
      isPrivate = true,
      metadata = {}
    } = body

    // Validation
    if (!content) {
      throw new ValidationError('Content is required')
    }

    if (content.length > 10000) {
      throw new ValidationError('Content must be less than 10,000 characters')
    }

    if (title && title.length > 255) {
      throw new ValidationError('Title must be less than 255 characters')
    }

    if (importance < 1 || importance > 5) {
      throw new ValidationError('Importance must be between 1 and 5')
    }

    const validTypes = ['session-note', 'manual', 'transcription-highlight', 'action-item']
    if (!validTypes.includes(type)) {
      throw new ValidationError('Invalid note type')
    }

    // Verify session ownership if sessionId provided
    if (sessionId) {
      const session = await db.queryOne(
        'SELECT id FROM workbook_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, auth.session.userId]
      )

      if (!session) {
        return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
      }
    }

    // Verify transcription ownership if transcriptionId provided
    if (transcriptionId) {
      const transcription = await db.queryOne(
        'SELECT id FROM transcriptions WHERE id = $1 AND user_id = $2',
        [transcriptionId, auth.session.userId]
      )

      if (!transcription) {
        return NextResponse.json({ error: 'Transcription not found or unauthorized' }, { status: 404 })
      }
    }

    // Verify parent note ownership if parentNoteId provided
    if (parentNoteId) {
      const parentNote = await db.queryOne(
        'SELECT id FROM session_notes WHERE id = $1 AND user_id = $2',
        [parentNoteId, auth.session.userId]
      )

      if (!parentNote) {
        return NextResponse.json({ error: 'Parent note not found or unauthorized' }, { status: 404 })
      }
    }

    const noteId = uuidv4()
    const now = new Date()

    const newNote = await db.queryOne(`
      INSERT INTO session_notes (
        id, user_id, session_id, transcription_id, type, title, content,
        rich_content, timestamp_in_session, highlighted_text, tags,
        is_action_item, action_item_due_date, parent_note_id, importance,
        is_private, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      noteId,
      auth.session.userId,
      sessionId,
      transcriptionId,
      type,
      title,
      content,
      richContent ? JSON.stringify(richContent) : null,
      timestampInSession,
      highlightedText,
      tags,
      isActionItem,
      actionItemDueDate ? new Date(actionItemDueDate) : null,
      parentNoteId,
      importance,
      isPrivate,
      JSON.stringify(metadata),
      now,
      now
    ])

    return NextResponse.json({
      success: true,
      note: newNote,
      message: 'Note created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Notes POST error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}