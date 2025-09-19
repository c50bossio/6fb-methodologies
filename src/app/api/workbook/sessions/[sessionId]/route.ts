import { NextRequest, NextResponse } from 'next/server'
import { extractToken, verifyToken, validateSession, hasPermission, WORKBOOK_PERMISSIONS } from '@/lib/workbook-auth'
import db, { DatabaseError, ValidationError } from '@/lib/database'

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

interface RouteParams {
  params: {
    sessionId: string
  }
}

// GET /api/workbook/sessions/[sessionId] - Get specific session
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.VIEW_CONTENT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { sessionId } = context.params

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const sessionData = await db.queryOne(`
      SELECT s.*,
             COUNT(ar.id) as audio_chunks_count,
             COUNT(t.id) as transcriptions_count,
             COUNT(sn.id) as notes_count,
             SUM(CASE WHEN t.status = 'completed' THEN t.cost_cents ELSE 0 END) as total_cost_cents
      FROM workbook_sessions s
      LEFT JOIN audio_recordings ar ON s.id = ar.session_id
      LEFT JOIN transcriptions t ON s.id = t.session_id
      LEFT JOIN session_notes sn ON s.id = sn.session_id
      WHERE s.id = $1 AND s.user_id = $2
      GROUP BY s.id
    `, [sessionId, auth.session.userId])

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get recent audio recordings
    const recentRecordings = await db.query(`
      SELECT id, chunk_number, duration_seconds, format, upload_status, created_at
      FROM audio_recordings
      WHERE session_id = $1
      ORDER BY chunk_number ASC
      LIMIT 10
    `, [sessionId])

    // Get recent notes
    const recentNotes = await db.query(`
      SELECT id, type, title, content, timestamp_in_session, is_action_item, created_at
      FROM session_notes
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [sessionId])

    return NextResponse.json({
      success: true,
      session: {
        ...sessionData,
        audio_chunks_count: parseInt(sessionData.audio_chunks_count || '0'),
        transcriptions_count: parseInt(sessionData.transcriptions_count || '0'),
        notes_count: parseInt(sessionData.notes_count || '0'),
        total_cost_cents: parseInt(sessionData.total_cost_cents || '0'),
        recent_recordings: recentRecordings,
        recent_notes: recentNotes
      }
    })

  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

// PUT /api/workbook/sessions/[sessionId] - Update specific session
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { sessionId } = context.params
    const body = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session ownership
    const existingSession = await db.queryOne(
      'SELECT * FROM workbook_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, auth.session.userId]
    )

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
    }

    const { status, title, description, tags, metadata } = body

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++

      // If ending the session, set ended_at timestamp
      if (status === 'completed' || status === 'stopped') {
        updates.push(`ended_at = $${paramIndex}`)
        params.push(new Date())
        paramIndex++
      }
    }

    if (title !== undefined) {
      if (title.length > 255) {
        throw new ValidationError('Title must be less than 255 characters')
      }
      updates.push(`title = $${paramIndex}`)
      params.push(title)
      paramIndex++
    }

    if (description !== undefined) {
      if (description.length > 2000) {
        throw new ValidationError('Description must be less than 2000 characters')
      }
      updates.push(`description = $${paramIndex}`)
      params.push(description)
      paramIndex++
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`)
      params.push(tags)
      paramIndex++
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`)
      params.push(JSON.stringify(metadata))
      paramIndex++
    }

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update')
    }

    updates.push(`updated_at = $${paramIndex}`)
    params.push(new Date())
    paramIndex++

    params.push(sessionId, auth.session.userId)

    const updatedSession = await db.queryOne(`
      UPDATE workbook_sessions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex - 1} AND user_id = $${paramIndex}
      RETURNING *
    `, params)

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: 'Session updated successfully'
    })

  } catch (error) {
    console.error('Session PUT error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE /api/workbook/sessions/[sessionId] - Delete session
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { sessionId } = context.params

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session ownership
    const existingSession = await db.queryOne(
      'SELECT * FROM workbook_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, auth.session.userId]
    )

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
    }

    // Delete session (cascades to related records due to foreign key constraints)
    await db.query(
      'DELETE FROM workbook_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, auth.session.userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Session DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}