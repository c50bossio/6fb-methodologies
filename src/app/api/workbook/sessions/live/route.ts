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
import { v4 as uuidv4 } from 'uuid';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Real-time connection store (in production, use Redis)
const activeConnections = new Map<string, Set<string>>(); // sessionId -> Set of userIds
const userPresence = new Map<
  string,
  {
    sessionId: string;
    userId: string;
    joinedAt: Date;
    lastSeen: Date;
    metadata: any;
  }
>();

function checkRateLimit(
  userId: string,
  action: string,
  limit: number = 50,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `live_session_${action}_${userId}`;
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

function broadcastToSession(
  sessionId: string,
  event: string,
  data: any,
  excludeUserId?: string
) {
  // In production, this would use Socket.io or similar
  // For now, we'll store events that can be polled
  console.log(`Broadcasting to session ${sessionId}:`, {
    event,
    data,
    excludeUserId,
  });

  // Store event for polling-based real-time updates
  const eventId = uuidv4();
  const eventData = {
    id: eventId,
    sessionId,
    event,
    data,
    timestamp: new Date().toISOString(),
    excludeUserId,
  };

  // In production, push to Redis or WebSocket connections
  // For now, just log it
  return eventId;
}

async function updateUserPresence(
  userId: string,
  sessionId: string,
  action: 'join' | 'leave' | 'update',
  metadata: any = {}
) {
  const now = new Date();

  if (action === 'join') {
    userPresence.set(userId, {
      sessionId,
      userId,
      joinedAt: now,
      lastSeen: now,
      metadata,
    });

    if (!activeConnections.has(sessionId)) {
      activeConnections.set(sessionId, new Set());
    }
    activeConnections.get(sessionId)!.add(userId);

    // Broadcast user joined event
    broadcastToSession(
      sessionId,
      'user_joined',
      {
        userId,
        joinedAt: now,
        metadata,
      },
      userId
    );
  } else if (action === 'leave') {
    userPresence.delete(userId);
    activeConnections.get(sessionId)?.delete(userId);

    // Broadcast user left event
    broadcastToSession(
      sessionId,
      'user_left',
      {
        userId,
        leftAt: now,
      },
      userId
    );
  } else if (action === 'update') {
    const presence = userPresence.get(userId);
    if (presence) {
      presence.lastSeen = now;
      presence.metadata = { ...presence.metadata, ...metadata };

      // Broadcast presence update
      broadcastToSession(
        sessionId,
        'user_presence_updated',
        {
          userId,
          lastSeen: now,
          metadata: presence.metadata,
        },
        userId
      );
    }
  }
}

// T036: Live sessions API with real-time features
// GET /api/workbook/sessions/live - Get available live sessions
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
        { error: 'Insufficient permissions for live sessions' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting
    const rateLimits = getRateLimits(auth.session.role);
    if (
      !checkRateLimit(
        auth.session.userId,
        'list',
        rateLimits.liveSessionList.limit,
        rateLimits.liveSessionList.window * 1000
      )
    ) {
      return NextResponse.json(
        { error: 'Live sessions list rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    const includePrivate = url.searchParams.get('includePrivate') === 'true';
    const moduleId = url.searchParams.get('moduleId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    // Get live sessions
    let query = `
      SELECT
        ls.id,
        ls.title,
        ls.description,
        ls.instructor_id,
        wu.first_name || ' ' || wu.last_name as instructor_name,
        ls.module_id,
        wm.title as module_title,
        ls.status,
        ls.max_participants,
        ls.scheduled_start,
        ls.scheduled_end,
        ls.actual_start,
        ls.actual_end,
        ls.features,
        ls.created_at,
        COUNT(DISTINCT sp.user_id) as current_participants,
        CASE WHEN sp_user.user_id IS NOT NULL THEN true ELSE false END as user_joined
      FROM live_sessions ls
      LEFT JOIN workbook_users wu ON ls.instructor_id = wu.id
      LEFT JOIN workshop_modules wm ON ls.module_id = wm.id
      LEFT JOIN session_participants sp ON ls.id = sp.session_id AND sp.left_at IS NULL
      LEFT JOIN session_participants sp_user ON ls.id = sp_user.session_id
        AND sp_user.user_id = $1 AND sp_user.left_at IS NULL
      WHERE 1=1
    `;
    const params: any[] = [auth.session.userId];

    if (status && status !== 'all') {
      query += ` AND ls.status = $${params.length + 1}`;
      params.push(status);
    }

    if (moduleId) {
      query += ` AND ls.module_id = $${params.length + 1}`;
      params.push(moduleId);
    }

    // Only show sessions user can access
    if (!includePrivate) {
      query += ` AND (ls.instructor_id = $${params.length + 1} OR ls.status IN ('scheduled', 'starting', 'active'))`;
      params.push(auth.session.userId);
    }

    query += `
      GROUP BY ls.id, wu.first_name, wu.last_name, wm.title, sp_user.user_id
      ORDER BY
        CASE ls.status
          WHEN 'active' THEN 1
          WHEN 'starting' THEN 2
          WHEN 'scheduled' THEN 3
          ELSE 4
        END,
        ls.scheduled_start ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const sessions = await db.query(query, params);

    // Get presence data for active sessions
    const sessionsWithPresence = sessions.map(session => {
      const connections = activeConnections.get(session.id) || new Set();
      const presenceData = Array.from(connections)
        .map(userId => {
          const presence = userPresence.get(userId);
          return presence
            ? {
                userId: presence.userId,
                joinedAt: presence.joinedAt,
                lastSeen: presence.lastSeen,
                metadata: presence.metadata,
              }
            : null;
        })
        .filter(Boolean);

      return {
        ...session,
        realtime_participants: presenceData.length,
        presence_data: presenceData,
        can_join: session.current_participants < session.max_participants,
        is_live: session.status === 'active' || session.status === 'starting',
      };
    });

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT ls.id) as total
      FROM live_sessions ls
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (status && status !== 'all') {
      countQuery += ` AND ls.status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (moduleId) {
      countQuery += ` AND ls.module_id = $${countParams.length + 1}`;
      countParams.push(moduleId);
    }

    if (!includePrivate) {
      countQuery += ` AND (ls.instructor_id = $${countParams.length + 1} OR ls.status IN ('scheduled', 'starting', 'active'))`;
      countParams.push(auth.session.userId);
    }

    const countResult = await db.queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0');

    return NextResponse.json(
      {
        success: true,
        sessions: sessionsWithPresence,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
        realtime_info: {
          total_active_sessions: Array.from(activeConnections.keys()).length,
          total_connected_users: userPresence.size,
        },
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Live sessions GET error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch live sessions' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// POST /api/workbook/sessions/live - Create new live session
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.MANAGE_SESSIONS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create live sessions' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting for session creation (more restrictive)
    if (!checkRateLimit(auth.session.userId, 'create', 5, 300000)) {
      // 5 sessions per 5 minutes
      return NextResponse.json(
        { error: 'Session creation rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      moduleId,
      scheduledStart,
      scheduledEnd,
      maxParticipants = 50,
      features = ['chat', 'screen_share', 'whiteboard'],
      isPrivate = false,
      requireRegistration = false,
      autoRecord = true,
    } = body;

    // Validation
    if (!title || title.length < 3) {
      throw new ValidationError(
        'Session title must be at least 3 characters long'
      );
    }

    if (title.length > 200) {
      throw new ValidationError(
        'Session title must be less than 200 characters'
      );
    }

    if (description && description.length > 1000) {
      throw new ValidationError(
        'Session description must be less than 1000 characters'
      );
    }

    if (maxParticipants < 1 || maxParticipants > 1000) {
      throw new ValidationError('Max participants must be between 1 and 1000');
    }

    // Validate scheduled times
    const startTime = new Date(scheduledStart);
    const endTime = new Date(scheduledEnd);
    const now = new Date();

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new ValidationError('Invalid scheduled start or end time');
    }

    if (startTime <= now) {
      throw new ValidationError('Scheduled start time must be in the future');
    }

    if (endTime <= startTime) {
      throw new ValidationError('Scheduled end time must be after start time');
    }

    const durationHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 8) {
      throw new ValidationError('Session duration cannot exceed 8 hours');
    }

    // Validate module if provided
    if (moduleId) {
      const module = await db.queryOne(
        'SELECT id FROM workshop_modules WHERE id = $1 AND is_published = true',
        [moduleId]
      );

      if (!module) {
        throw new ValidationError('Invalid or unpublished module');
      }
    }

    // Check for conflicting sessions for this instructor
    const conflictingSessions = await db.query(
      `SELECT id FROM live_sessions
       WHERE instructor_id = $1
       AND status IN ('scheduled', 'starting', 'active')
       AND (
         (scheduled_start <= $2 AND scheduled_end > $2) OR
         (scheduled_start < $3 AND scheduled_end >= $3) OR
         (scheduled_start >= $2 AND scheduled_end <= $3)
       )`,
      [auth.session.userId, startTime, endTime]
    );

    if (conflictingSessions.length > 0) {
      throw new ValidationError(
        'You have a conflicting session scheduled during this time'
      );
    }

    // Create live session
    const sessionId = uuidv4();
    const now_timestamp = new Date();

    const newSession = await db.queryOne(
      `
      INSERT INTO live_sessions (
        id, title, description, instructor_id, module_id, scheduled_start, scheduled_end,
        max_participants, status, features, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
      [
        sessionId,
        title,
        description,
        auth.session.userId,
        moduleId,
        startTime,
        endTime,
        maxParticipants,
        'scheduled',
        JSON.stringify(features),
        JSON.stringify({
          isPrivate,
          requireRegistration,
          autoRecord,
          createdByAPI: true,
          version: '1.0',
        }),
        now_timestamp,
        now_timestamp,
      ]
    );

    // Auto-join the instructor
    await db.query(
      `
      INSERT INTO session_participants (
        id, session_id, user_id, role, permissions, joined_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        uuidv4(),
        sessionId,
        auth.session.userId,
        'instructor',
        JSON.stringify([
          'can_speak',
          'can_moderate',
          'can_record',
          'can_share_screen',
        ]),
        now_timestamp,
        now_timestamp,
        now_timestamp,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        session: {
          ...newSession,
          join_url: `/workbook/sessions/live/${sessionId}`,
          instructor_joined: true,
          current_participants: 1,
        },
        message: 'Live session created successfully',
      },
      { status: 201, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Live session creation error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create live session' },
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
