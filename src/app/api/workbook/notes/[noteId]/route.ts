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
    noteId: string;
  };
}

// GET /api/workbook/notes/[noteId] - Get specific note
export async function GET(request: NextRequest, context: RouteParams) {
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

    const { noteId } = context.params;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const noteData = await db.queryOne(
      `
      SELECT sn.*, ws.title as session_title, ws.workshop_module,
             t.text as transcription_text,
             parent.title as parent_note_title,
             COUNT(children.id) as child_notes_count
      FROM session_notes sn
      LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
      LEFT JOIN transcriptions t ON sn.transcription_id = t.id
      LEFT JOIN session_notes parent ON sn.parent_note_id = parent.id
      LEFT JOIN session_notes children ON children.parent_note_id = sn.id
      WHERE sn.id = $1 AND sn.user_id = $2
      GROUP BY sn.id, ws.title, ws.workshop_module, t.text, parent.title
    `,
      [noteId, auth.session.userId]
    );

    if (!noteData) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Get child notes if any
    const childNotes = await db.query(
      `
      SELECT id, title, content, type, is_action_item, action_item_completed, created_at
      FROM session_notes
      WHERE parent_note_id = $1
      ORDER BY created_at ASC
    `,
      [noteId]
    );

    return NextResponse.json({
      success: true,
      note: {
        ...noteData,
        child_notes_count: parseInt(noteData.child_notes_count || '0'),
        child_notes: childNotes,
      },
    });
  } catch (error) {
    console.error('Note GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// PUT /api/workbook/notes/[noteId] - Update specific note
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { noteId } = context.params;
    const body = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Verify note ownership
    const existingNote = await db.queryOne(
      'SELECT * FROM session_notes WHERE id = $1 AND user_id = $2',
      [noteId, auth.session.userId]
    );

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    const {
      title,
      content,
      richContent,
      tags,
      isActionItem,
      actionItemCompleted,
      actionItemDueDate,
      importance,
      isPrivate,
      metadata,
    } = body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (title && title.length > 255) {
        throw new ValidationError('Title must be less than 255 characters');
      }
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (content !== undefined) {
      if (!content) {
        throw new ValidationError('Content is required');
      }
      if (content.length > 10000) {
        throw new ValidationError(
          'Content must be less than 10,000 characters'
        );
      }
      updates.push(`content = $${paramIndex}`);
      params.push(content);
      paramIndex++;
    }

    if (richContent !== undefined) {
      updates.push(`rich_content = $${paramIndex}`);
      params.push(richContent ? JSON.stringify(richContent) : null);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }

    if (isActionItem !== undefined) {
      updates.push(`is_action_item = $${paramIndex}`);
      params.push(isActionItem);
      paramIndex++;
    }

    if (actionItemCompleted !== undefined) {
      updates.push(`action_item_completed = $${paramIndex}`);
      params.push(actionItemCompleted);
      paramIndex++;
    }

    if (actionItemDueDate !== undefined) {
      updates.push(`action_item_due_date = $${paramIndex}`);
      params.push(actionItemDueDate ? new Date(actionItemDueDate) : null);
      paramIndex++;
    }

    if (importance !== undefined) {
      if (importance < 1 || importance > 5) {
        throw new ValidationError('Importance must be between 1 and 5');
      }
      updates.push(`importance = $${paramIndex}`);
      params.push(importance);
      paramIndex++;
    }

    if (isPrivate !== undefined) {
      updates.push(`is_private = $${paramIndex}`);
      params.push(isPrivate);
      paramIndex++;
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(metadata));
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updates.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(noteId, auth.session.userId);

    const updatedNote = await db.queryOne(
      `
      UPDATE session_notes
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex - 1} AND user_id = $${paramIndex}
      RETURNING *
    `,
      params
    );

    return NextResponse.json({
      success: true,
      note: updatedNote,
      message: 'Note updated successfully',
    });
  } catch (error) {
    console.error('Note PUT error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/workbook/notes/[noteId] - Delete note
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.SAVE_PROGRESS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { noteId } = context.params;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Verify note ownership
    const existingNote = await db.queryOne(
      'SELECT * FROM session_notes WHERE id = $1 AND user_id = $2',
      [noteId, auth.session.userId]
    );

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if note has children
    const childNotes = await db.query(
      'SELECT id FROM session_notes WHERE parent_note_id = $1',
      [noteId]
    );

    if (childNotes.length > 0) {
      // Update child notes to remove parent reference
      await db.query(
        'UPDATE session_notes SET parent_note_id = NULL WHERE parent_note_id = $1',
        [noteId]
      );
    }

    // Delete the note
    await db.query('DELETE FROM session_notes WHERE id = $1 AND user_id = $2', [
      noteId,
      auth.session.userId,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
      childNotesUpdated: childNotes.length,
    });
  } catch (error) {
    console.error('Note DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
