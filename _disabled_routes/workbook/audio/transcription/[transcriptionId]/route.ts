import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

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

interface RouteParams {
  params: {
    transcriptionId: string;
  };
}

// GET /api/workbook/audio/transcription/[transcriptionId] - Get transcription details
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { transcriptionId } = params;

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    const transcription = await db.queryOne(
      `
      SELECT t.*, ar.chunk_number, ar.duration_seconds, ar.format,
             ws.title as session_title, ws.workshop_module
      FROM transcriptions t
      JOIN audio_recordings ar ON t.recording_id = ar.id
      JOIN workbook_sessions ws ON t.session_id = ws.id
      WHERE t.id = $1 AND t.user_id = $2
    `,
      [transcriptionId, auth.session.userId]
    );

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transcription,
    });
  } catch (error) {
    console.error('Transcription GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}

// PUT /api/workbook/audio/transcription/[transcriptionId] - Update transcription (retry, cancel, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { transcriptionId } = params;
    const body = await request.json();

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    const { action } = body;

    if (!action) {
      throw new ValidationError('Action is required');
    }

    // Verify transcription ownership
    const transcription = await db.queryOne(
      'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2',
      [transcriptionId, auth.session.userId]
    );

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found or unauthorized' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'retry':
        if (transcription.status !== 'failed') {
          throw new ValidationError('Can only retry failed transcriptions');
        }

        if (transcription.retry_count >= transcription.max_retries) {
          throw new ValidationError('Maximum retry attempts exceeded');
        }

        // Reset transcription for retry
        await db.query(
          `
          UPDATE transcriptions
          SET status = $1, error_message = NULL, retry_count = retry_count + 1,
              started_at = NULL, completed_at = NULL, updated_at = $2
          WHERE id = $3
        `,
          ['pending', new Date(), transcriptionId]
        );

        // TODO: Add to job queue for processing
        // For now, we'll just update the status

        return NextResponse.json({
          success: true,
          message: 'Transcription queued for retry',
        });

      case 'cancel':
        if (!['pending', 'processing'].includes(transcription.status)) {
          throw new ValidationError(
            'Can only cancel pending or processing transcriptions'
          );
        }

        await db.query(
          `
          UPDATE transcriptions
          SET status = $1, error_message = $2, updated_at = $3
          WHERE id = $4
        `,
          ['cancelled', 'Cancelled by user', new Date(), transcriptionId]
        );

        return NextResponse.json({
          success: true,
          message: 'Transcription cancelled successfully',
        });

      default:
        throw new ValidationError('Invalid action');
    }
  } catch (error) {
    console.error('Transcription PUT error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update transcription' },
      { status: 500 }
    );
  }
}

// DELETE /api/workbook/audio/transcription/[transcriptionId] - Delete transcription
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { transcriptionId } = params;

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    // Verify transcription ownership
    const transcription = await db.queryOne(
      'SELECT * FROM transcriptions WHERE id = $1 AND user_id = $2',
      [transcriptionId, auth.session.userId]
    );

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete transcription (this will also cascade to related records)
    await db.query(
      'DELETE FROM transcriptions WHERE id = $1 AND user_id = $2',
      [transcriptionId, auth.session.userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Transcription deleted successfully',
    });
  } catch (error) {
    console.error('Transcription DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transcription' },
      { status: 500 }
    );
  }
}
