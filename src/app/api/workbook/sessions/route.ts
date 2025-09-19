import { NextRequest, NextResponse } from 'next/server'
import { extractToken, verifyToken, validateSession, hasPermission, WORKBOOK_PERMISSIONS } from '@/lib/workbook-auth'
import db, { WorkbookSession, DatabaseError, ValidationError } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = `sessions_${userId}`
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

async function ensureUserExists(session: any) {
  try {
    // Check if user exists in workbook_users table
    const existingUser = await db.queryOne(
      'SELECT * FROM workbook_users WHERE email = $1',
      [session.email]
    )

    if (!existingUser) {
      // Create user record
      await db.query(`
        INSERT INTO workbook_users (
          id, email, first_name, last_name, subscription_tier,
          workshop_access_granted, daily_transcription_limit_minutes,
          monthly_cost_limit_cents, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        session.userId,
        session.email,
        session.name?.split(' ')[0] || 'Workshop',
        session.name?.split(' ').slice(1).join(' ') || 'Participant',
        session.role || 'basic',
        true,
        session.role === 'vip' ? 240 : session.role === 'premium' ? 120 : 60,
        session.role === 'vip' ? 10000 : session.role === 'premium' ? 5000 : 2500,
        JSON.stringify({})
      ])
    }

    return session.userId
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    throw new DatabaseError('Failed to setup user account')
  }
}

// GET /api/workbook/sessions - List user sessions
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

    await ensureUserExists(auth.session)

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const status = url.searchParams.get('status')
    const moduleId = url.searchParams.get('module')

    let query = `
      SELECT id, title, description, status, started_at, ended_at,
             duration_seconds, total_chunks, tags, is_workshop_related,
             workshop_module, created_at, updated_at
      FROM workbook_sessions
      WHERE user_id = $1
    `
    const params: any[] = [auth.session.userId]

    if (status) {
      query += ` AND status = $${params.length + 1}`
      params.push(status)
    }

    if (moduleId) {
      query += ` AND workshop_module = $${params.length + 1}`
      params.push(moduleId)
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const sessions = await db.query(query, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM workbook_sessions WHERE user_id = $1'
    const countParams = [auth.session.userId]

    if (status) {
      countQuery += ` AND status = $2`
      countParams.push(status)
    }

    const countResult = await db.queryOne(countQuery, countParams)
    const total = parseInt(countResult?.total || '0')

    return NextResponse.json({
      success: true,
      sessions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Sessions GET error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST /api/workbook/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)) {
      return NextResponse.json({ error: 'Insufficient permissions to create sessions' }, { status: 403 })
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 5)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    await ensureUserExists(auth.session)

    const body = await request.json()
    const { title, description, workshop_module, tags = [], metadata = {} } = body

    // Validation
    if (title && title.length > 255) {
      throw new ValidationError('Title must be less than 255 characters')
    }

    if (description && description.length > 2000) {
      throw new ValidationError('Description must be less than 2000 characters')
    }

    // Check if user has any active sessions
    const activeSessions = await db.query(
      'SELECT id FROM workbook_sessions WHERE user_id = $1 AND status = $2',
      [auth.session.userId, 'active']
    )

    if (activeSessions.length > 0) {
      return NextResponse.json({
        error: 'You already have an active session. Please complete it before starting a new one.',
        activeSessionId: activeSessions[0].id
      }, { status: 409 })
    }

    const sessionId = uuidv4()
    const now = new Date()

    const newSession = await db.queryOne(`
      INSERT INTO workbook_sessions (
        id, user_id, title, description, status, started_at,
        tags, is_workshop_related, workshop_module, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      sessionId,
      auth.session.userId,
      title || `Session ${new Date().toISOString().split('T')[0]}`,
      description,
      'active',
      now,
      tags,
      true,
      workshop_module,
      JSON.stringify(metadata),
      now,
      now
    ])

    // Initialize progress tracking if workshop module specified
    if (workshop_module) {
      await db.query(`
        INSERT INTO user_progress (user_id, module_id, module_name, last_accessed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, module_id)
        DO UPDATE SET last_accessed = $4, updated_at = CURRENT_TIMESTAMP
      `, [
        auth.session.userId,
        workshop_module,
        workshop_module,
        now
      ])
    }

    return NextResponse.json({
      success: true,
      session: newSession,
      message: 'Session created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Sessions POST error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// PUT /api/workbook/sessions - Update session (used for ending sessions)
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 20)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json()
    const { sessionId, status, title, description, tags, metadata } = body

    if (!sessionId) {
      throw new ValidationError('Session ID is required')
    }

    // Verify session ownership
    const existingSession = await db.queryOne(
      'SELECT * FROM workbook_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, auth.session.userId]
    )

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
    }

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
      updates.push(`title = $${paramIndex}`)
      params.push(title)
      paramIndex++
    }

    if (description !== undefined) {
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
    console.error('Sessions PUT error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}