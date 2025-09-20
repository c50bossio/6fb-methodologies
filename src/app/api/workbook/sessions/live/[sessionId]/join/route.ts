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
import { v4 as uuidv4 } from 'uuid';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `join_session_${userId}`;
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

function broadcastToSession(sessionId: string, event: string, data: any, excludeUserId?: string) {
  // Real-time broadcasting logic would go here
  console.log(`Broadcasting to session ${sessionId}:`, { event, data, excludeUserId });
}

// POST /api/workbook/sessions/live/[sessionId]/join - Join live session
export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.JOIN_SESSIONS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to join live sessions' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 10)) {
      return NextResponse.json(
        { error: 'Session join rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const { sessionId } = params;
    const body = await request.json();
    const {
      displayName,
      audioEnabled = true,
      videoEnabled = false,
      metadata = {},
    } = body;

    // Get session details
    const session = await db.queryOne(
      `SELECT ls.*, wu.first_name || ' ' || wu.last_name as instructor_name,
              wm.title as module_title,
              COUNT(sp.user_id) as current_participants
       FROM live_sessions ls
       LEFT JOIN workbook_users wu ON ls.instructor_id = wu.id
       LEFT JOIN workshop_modules wm ON ls.module_id = wm.id
       LEFT JOIN session_participants sp ON ls.id = sp.session_id AND sp.left_at IS NULL
       WHERE ls.id = $1
       GROUP BY ls.id, wu.first_name, wu.last_name, wm.title`,
      [sessionId]
    );

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check session status
    if (!['scheduled', 'starting', 'active'].includes(session.status)) {
      return NextResponse.json(
        { error: `Session is ${session.status} and cannot be joined` },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check if session has started (if scheduled)
    if (session.status === 'scheduled' && new Date() < new Date(session.scheduled_start)) {
      const minutesUntilStart = Math.ceil((new Date(session.scheduled_start).getTime() - Date.now()) / (1000 * 60));
      return NextResponse.json(
        {
          error: `Session has not started yet. It begins in ${minutesUntilStart} minutes.`,
          scheduled_start: session.scheduled_start
        },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check capacity
    if (session.current_participants >= session.max_participants) {
      return NextResponse.json(
        { error: 'Session is at maximum capacity' },
        { status: 409, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check if user is already in session
    const existingParticipant = await db.queryOne(
      'SELECT * FROM session_participants WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL',
      [sessionId, auth.session.userId]
    );

    if (existingParticipant) {
      return NextResponse.json(
        {
          error: 'You are already in this session',
          participant: existingParticipant
        },
        { status: 409, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Determine user role and permissions
    const isInstructor = session.instructor_id === auth.session.userId;
    const role = isInstructor ? 'instructor' : 'participant';
    const permissions = isInstructor
      ? ['can_speak', 'can_moderate', 'can_record', 'can_share_screen', 'can_mute_others']
      : ['can_speak'];

    // Add user permissions based on subscription level
    if (auth.session.role === 'vip') {
      permissions.push('can_share_screen', 'priority_support');
    } else if (auth.session.role === 'premium') {
      permissions.push('can_share_screen');
    }

    // Join session
    const participantId = uuidv4();
    const now = new Date();

    const participant = await db.queryOne(
      `
      INSERT INTO session_participants (
        id, session_id, user_id, joined_at, role, permissions,
        participation_score, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        participantId,
        sessionId,
        auth.session.userId,
        now,
        role,
        JSON.stringify(permissions),
        0,
        JSON.stringify({
          displayName: displayName || auth.session.name,
          audioEnabled,
          videoEnabled,
          joinMethod: 'api',
          userAgent: request.headers.get('user-agent'),
          ...metadata,
        }),
        now,
        now,
      ]
    );

    // Update session status if this is the first join and it's scheduled
    if (session.status === 'scheduled' || session.status === 'starting') {
      await db.query(
        'UPDATE live_sessions SET status = $1, actual_start = $2 WHERE id = $3',
        ['active', now, sessionId]
      );
    }

    // Get updated session info with participant count
    const updatedSession = await db.queryOne(
      `SELECT ls.*, COUNT(sp.user_id) as current_participants
       FROM live_sessions ls
       LEFT JOIN session_participants sp ON ls.id = sp.session_id AND sp.left_at IS NULL
       WHERE ls.id = $1
       GROUP BY ls.id`,
      [sessionId]
    );

    // Get other participants for real-time coordination
    const otherParticipants = await db.query(
      `SELECT sp.user_id, sp.role, sp.joined_at, sp.metadata,
              wu.first_name || ' ' || wu.last_name as name
       FROM session_participants sp
       LEFT JOIN workbook_users wu ON sp.user_id = wu.id
       WHERE sp.session_id = $1 AND sp.left_at IS NULL AND sp.user_id != $2
       ORDER BY sp.joined_at ASC`,
      [sessionId, auth.session.userId]
    );

    // Broadcast user joined event
    broadcastToSession(sessionId, 'participant_joined', {
      userId: auth.session.userId,
      name: displayName || auth.session.name,
      role,
      permissions,
      joinedAt: now,
      metadata: participant.metadata,
    }, auth.session.userId);

    return NextResponse.json(
      {
        success: true,
        participant,
        session: {
          ...updatedSession,
          instructor_name: session.instructor_name,
          module_title: session.module_title,
        },
        other_participants: otherParticipants,
        real_time_config: {
          session_id: sessionId,
          user_id: auth.session.userId,
          role,
          permissions,
          // In production, include WebSocket/Socket.io connection details
          connection_info: {
            polling_interval: 2000, // For polling-based updates
            event_types: ['participant_joined', 'participant_left', 'message', 'screen_share', 'recording_started'],
          },
        },
        message: 'Successfully joined live session',
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Session join error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to join session' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// DELETE /api/workbook/sessions/live/[sessionId]/join - Leave live session
export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const { sessionId } = params;

    // Check if user is in session
    const participant = await db.queryOne(
      'SELECT * FROM session_participants WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL',
      [sessionId, auth.session.userId]
    );

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not in this session' },
        { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const now = new Date();

    // Update participant record with leave time
    await db.query(
      'UPDATE session_participants SET left_at = $1, updated_at = $2 WHERE id = $3',
      [now, now, participant.id]
    );

    // Calculate participation score based on time spent
    const timeSpentMinutes = (now.getTime() - new Date(participant.joined_at).getTime()) / (1000 * 60);
    const participationScore = Math.min(Math.round(timeSpentMinutes * 2), 100); // 2 points per minute, max 100

    await db.query(
      'UPDATE session_participants SET participation_score = $1 WHERE id = $2',
      [participationScore, participant.id]
    );

    // Check if this was the instructor leaving
    const session = await db.queryOne(
      'SELECT * FROM live_sessions WHERE id = $1',
      [sessionId]
    );

    if (session?.instructor_id === auth.session.userId) {
      // If instructor leaves, end the session after a grace period
      await db.query(
        'UPDATE live_sessions SET status = $1, actual_end = $2 WHERE id = $3',
        ['completed', now, sessionId]
      );

      // Broadcast session ended event
      broadcastToSession(sessionId, 'session_ended', {
        reason: 'instructor_left',
        endedAt: now,
      });
    } else {
      // Regular participant leaving
      broadcastToSession(sessionId, 'participant_left', {
        userId: auth.session.userId,
        leftAt: now,
        participationScore,
        timeSpentMinutes: Math.round(timeSpentMinutes),
      }, auth.session.userId);
    }

    return NextResponse.json(
      {
        success: true,
        left_at: now,
        participation_score: participationScore,
        time_spent_minutes: Math.round(timeSpentMinutes),
        message: 'Successfully left live session',
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Session leave error:', error);
    return NextResponse.json(
      { error: 'Failed to leave session' },
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
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}