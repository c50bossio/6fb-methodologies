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
  limit: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `export_${userId}`;
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

interface ExportOptions {
  format: 'pdf' | 'json' | 'markdown' | 'csv';
  includeNotes: boolean;
  includeTranscriptions: boolean;
  includeProgress: boolean;
  includeSessions: boolean;
  includeAudioMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  sessionIds?: string[];
  moduleIds?: string[];
  tags?: string[];
  onlyActionItems?: boolean;
  onlyCompletedItems?: boolean;
}

async function generatePDFExport(userId: string, options: ExportOptions): Promise<string> {
  // PDF generation would use a library like jsPDF or Puppeteer
  // For now, return a placeholder
  console.log('PDF export requested for user:', userId, 'with options:', options);

  // This would generate a comprehensive PDF report including:
  // - User progress summary
  // - Notes with formatting
  // - Transcription highlights
  // - Action items and their status
  // - Session summaries
  // - Charts and visualizations

  return 'PDF export functionality is under development';
}

async function generateJSONExport(userId: string, options: ExportOptions): Promise<any> {
  const exportData: any = {
    exportId: uuidv4(),
    userId,
    exportedAt: new Date().toISOString(),
    options,
    data: {},
  };

  // Get user progress data
  if (options.includeProgress) {
    const progress = await db.query(
      `SELECT up.*, wm.title as module_title, wl.title as lesson_title
       FROM user_progress up
       LEFT JOIN workshop_modules wm ON up.module_id = wm.id
       LEFT JOIN workshop_lessons wl ON up.lesson_id = wl.id
       WHERE up.user_id = $1`,
      [userId]
    );
    exportData.data.progress = progress;
  }

  // Get notes data
  if (options.includeNotes) {
    let notesQuery = `
      SELECT sn.*, ws.title as session_title
      FROM session_notes sn
      LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
      WHERE sn.user_id = $1
    `;
    const notesParams: any[] = [userId];

    if (options.sessionIds?.length) {
      notesQuery += ` AND sn.session_id = ANY($${notesParams.length + 1})`;
      notesParams.push(options.sessionIds);
    }

    if (options.tags?.length) {
      notesQuery += ` AND sn.tags && $${notesParams.length + 1}`;
      notesParams.push(options.tags);
    }

    if (options.onlyActionItems) {
      notesQuery += ` AND sn.is_action_item = true`;
    }

    if (options.onlyCompletedItems) {
      notesQuery += ` AND sn.action_item_completed = true`;
    }

    if (options.dateRange) {
      notesQuery += ` AND sn.created_at >= $${notesParams.length + 1} AND sn.created_at <= $${notesParams.length + 2}`;
      notesParams.push(new Date(options.dateRange.start), new Date(options.dateRange.end));
    }

    notesQuery += ` ORDER BY sn.created_at DESC`;

    const notes = await db.query(notesQuery, notesParams);
    exportData.data.notes = notes;
  }

  // Get transcriptions data
  if (options.includeTranscriptions) {
    let transcriptionsQuery = `
      SELECT t.*, ar.title as recording_title, ar.duration_seconds
      FROM transcriptions t
      LEFT JOIN audio_recordings ar ON t.recording_id = ar.id
      WHERE t.user_id = $1 AND t.status = 'completed'
    `;
    const transcriptionsParams: any[] = [userId];

    if (options.sessionIds?.length) {
      transcriptionsQuery += ` AND t.session_id = ANY($${transcriptionsParams.length + 1})`;
      transcriptionsParams.push(options.sessionIds);
    }

    if (options.dateRange) {
      transcriptionsQuery += ` AND t.created_at >= $${transcriptionsParams.length + 1} AND t.created_at <= $${transcriptionsParams.length + 2}`;
      transcriptionsParams.push(new Date(options.dateRange.start), new Date(options.dateRange.end));
    }

    transcriptionsQuery += ` ORDER BY t.created_at DESC`;

    const transcriptions = await db.query(transcriptionsQuery, transcriptionsParams);
    exportData.data.transcriptions = transcriptions;
  }

  // Get sessions data
  if (options.includeSessions) {
    let sessionsQuery = `
      SELECT ws.*, COUNT(sn.id) as notes_count, COUNT(ar.id) as recordings_count
      FROM workbook_sessions ws
      LEFT JOIN session_notes sn ON ws.id = sn.session_id
      LEFT JOIN audio_recordings ar ON ws.id = ar.session_id
      WHERE ws.user_id = $1
    `;
    const sessionsParams: any[] = [userId];

    if (options.sessionIds?.length) {
      sessionsQuery += ` AND ws.id = ANY($${sessionsParams.length + 1})`;
      sessionsParams.push(options.sessionIds);
    }

    if (options.moduleIds?.length) {
      sessionsQuery += ` AND ws.workshop_module = ANY($${sessionsParams.length + 1})`;
      sessionsParams.push(options.moduleIds);
    }

    if (options.dateRange) {
      sessionsQuery += ` AND ws.created_at >= $${sessionsParams.length + 1} AND ws.created_at <= $${sessionsParams.length + 2}`;
      sessionsParams.push(new Date(options.dateRange.start), new Date(options.dateRange.end));
    }

    sessionsQuery += ` GROUP BY ws.id ORDER BY ws.created_at DESC`;

    const sessions = await db.query(sessionsQuery, sessionsParams);
    exportData.data.sessions = sessions;
  }

  // Get audio metadata if requested
  if (options.includeAudioMetadata) {
    let audioQuery = `
      SELECT ar.id, ar.title, ar.description, ar.file_size_bytes, ar.format,
             ar.duration_seconds, ar.tags, ar.created_at, ar.session_id
      FROM audio_recordings ar
      WHERE ar.user_id = $1
    `;
    const audioParams: any[] = [userId];

    if (options.sessionIds?.length) {
      audioQuery += ` AND ar.session_id = ANY($${audioParams.length + 1})`;
      audioParams.push(options.sessionIds);
    }

    if (options.dateRange) {
      audioQuery += ` AND ar.created_at >= $${audioParams.length + 1} AND ar.created_at <= $${audioParams.length + 2}`;
      audioParams.push(new Date(options.dateRange.start), new Date(options.dateRange.end));
    }

    audioQuery += ` ORDER BY ar.created_at DESC`;

    const audioRecordings = await db.query(audioQuery, audioParams);
    exportData.data.audioRecordings = audioRecordings;
  }

  return exportData;
}

async function generateMarkdownExport(userId: string, options: ExportOptions): Promise<string> {
  let markdown = '# 6FB Workshop Data Export\n\n';
  markdown += `**Exported on:** ${new Date().toISOString()}\n\n`;

  // Get notes and format as markdown
  if (options.includeNotes) {
    const notes = await db.query(
      `SELECT sn.*, ws.title as session_title
       FROM session_notes sn
       LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
       WHERE sn.user_id = $1
       ORDER BY sn.created_at DESC`,
      [userId]
    );

    if (notes.length > 0) {
      markdown += '## Notes\n\n';
      for (const note of notes) {
        markdown += `### ${note.title || 'Untitled Note'}\n\n`;
        markdown += `**Created:** ${new Date(note.created_at).toLocaleDateString()}\n`;
        if (note.session_title) {
          markdown += `**Session:** ${note.session_title}\n`;
        }
        if (note.tags && note.tags.length > 0) {
          markdown += `**Tags:** ${note.tags.join(', ')}\n`;
        }
        if (note.is_action_item) {
          markdown += `**Action Item:** ${note.action_item_completed ? '✅ Completed' : '⏳ Pending'}\n`;
        }
        markdown += '\n';
        markdown += note.content;
        markdown += '\n\n---\n\n';
      }
    }
  }

  // Get transcriptions and format as markdown
  if (options.includeTranscriptions) {
    const transcriptions = await db.query(
      `SELECT t.*, ar.title as recording_title
       FROM transcriptions t
       LEFT JOIN audio_recordings ar ON t.recording_id = ar.id
       WHERE t.user_id = $1 AND t.status = 'completed'
       ORDER BY t.created_at DESC`,
      [userId]
    );

    if (transcriptions.length > 0) {
      markdown += '## Audio Transcriptions\n\n';
      for (const transcription of transcriptions) {
        markdown += `### ${transcription.recording_title || 'Audio Recording'}\n\n`;
        markdown += `**Date:** ${new Date(transcription.created_at).toLocaleDateString()}\n`;
        markdown += `**Duration:** ${Math.round((transcription.duration_seconds || 0) / 60)} minutes\n`;
        markdown += `**Language:** ${transcription.language}\n\n`;
        markdown += '**Transcription:**\n\n';
        markdown += transcription.text;
        markdown += '\n\n---\n\n';
      }
    }
  }

  return markdown;
}

async function generateCSVExport(userId: string, options: ExportOptions): Promise<string> {
  // Generate CSV based on the primary data type requested
  if (options.includeNotes) {
    const notes = await db.query(
      `SELECT sn.title, sn.content, sn.type, sn.tags, sn.is_action_item,
              sn.action_item_completed, sn.importance, sn.created_at,
              ws.title as session_title
       FROM session_notes sn
       LEFT JOIN workbook_sessions ws ON sn.session_id = ws.id
       WHERE sn.user_id = $1
       ORDER BY sn.created_at DESC`,
      [userId]
    );

    let csv = 'Title,Content,Type,Tags,Is Action Item,Completed,Importance,Created At,Session\n';
    for (const note of notes) {
      const row = [
        `"${(note.title || '').replace(/"/g, '""')}"`,
        `"${note.content.substring(0, 500).replace(/"/g, '""')}"`,
        note.type,
        `"${(note.tags || []).join(', ')}"`,
        note.is_action_item ? 'Yes' : 'No',
        note.action_item_completed ? 'Yes' : 'No',
        note.importance,
        new Date(note.created_at).toISOString(),
        `"${(note.session_title || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }
    return csv;
  }

  return 'CSV export requires at least notes to be included';
}

// T035: Export functionality API implementation
// POST /api/workbook/export - Generate exports (PDF, JSON, Markdown, CSV)
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
        { error: 'Insufficient permissions for data export' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Rate limiting (exports can be resource-intensive)
    if (!checkRateLimit(auth.session.userId, 3, 300000)) { // 3 exports per 5 minutes
      return NextResponse.json(
        { error: 'Export rate limit exceeded. Please wait before requesting another export.' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const body = await request.json();
    const {
      format = 'json',
      includeNotes = true,
      includeTranscriptions = false,
      includeProgress = false,
      includeSessions = false,
      includeAudioMetadata = false,
      dateRange,
      sessionIds,
      moduleIds,
      tags,
      onlyActionItems = false,
      onlyCompletedItems = false,
    } = body;

    const options: ExportOptions = {
      format,
      includeNotes,
      includeTranscriptions,
      includeProgress,
      includeSessions,
      includeAudioMetadata,
      dateRange,
      sessionIds,
      moduleIds,
      tags,
      onlyActionItems,
      onlyCompletedItems,
    };

    // Validate format
    const validFormats = ['pdf', 'json', 'markdown', 'csv'];
    if (!validFormats.includes(format)) {
      throw new ValidationError('Invalid export format. Supported formats: pdf, json, markdown, csv');
    }

    // Validate date range if provided
    if (dateRange) {
      if (!dateRange.start || !dateRange.end) {
        throw new ValidationError('Date range must include both start and end dates');
      }

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid date format in date range');
      }

      if (startDate > endDate) {
        throw new ValidationError('Start date must be before end date');
      }

      // Limit export range to prevent abuse
      const maxDays = 365; // 1 year
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        throw new ValidationError(`Date range too large. Maximum ${maxDays} days allowed.`);
      }
    }

    // Validate that at least one data type is included
    if (!includeNotes && !includeTranscriptions && !includeProgress && !includeSessions && !includeAudioMetadata) {
      throw new ValidationError('At least one data type must be included in the export');
    }

    // Create export record
    const exportId = uuidv4();
    const exportRecord = await db.queryOne(
      `INSERT INTO data_exports (
        id, user_id, format, options, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        exportId,
        auth.session.userId,
        format,
        JSON.stringify(options),
        'processing',
        new Date(),
        new Date(),
      ]
    );

    // Generate export based on format
    let exportData: any;
    let contentType: string;
    let filename: string;

    try {
      switch (format) {
        case 'pdf':
          exportData = await generatePDFExport(auth.session.userId, options);
          contentType = 'application/pdf';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        case 'json':
          exportData = await generateJSONExport(auth.session.userId, options);
          contentType = 'application/json';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'markdown':
          exportData = await generateMarkdownExport(auth.session.userId, options);
          contentType = 'text/markdown';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.md`;
          break;

        case 'csv':
          exportData = await generateCSVExport(auth.session.userId, options);
          contentType = 'text/csv';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;

        default:
          throw new Error('Unsupported export format');
      }

      // Update export record with success
      await db.query(
        `UPDATE data_exports
         SET status = $1, completed_at = $2, file_size_bytes = $3, updated_at = $4
         WHERE id = $5`,
        [
          'completed',
          new Date(),
          typeof exportData === 'string' ? Buffer.byteLength(exportData, 'utf8') : JSON.stringify(exportData).length,
          new Date(),
          exportId,
        ]
      );

      // For this implementation, return the data directly
      // In production, you'd save to S3 and return a download URL
      return NextResponse.json(
        {
          success: true,
          exportId,
          format,
          filename,
          contentType,
          data: exportData,
          generatedAt: new Date().toISOString(),
          options,
        },
        { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
      );
    } catch (exportError) {
      console.error('Export generation error:', exportError);

      // Update export record with error
      await db.query(
        `UPDATE data_exports
         SET status = $1, error_message = $2, updated_at = $3
         WHERE id = $4`,
        [
          'failed',
          exportError instanceof Error ? exportError.message : 'Unknown export error',
          new Date(),
          exportId,
        ]
      );

      throw exportError;
    }
  } catch (error) {
    console.error('Export API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Export service temporarily unavailable' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// GET /api/workbook/export - Get export history and status
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
        { error: 'Insufficient permissions to view export history' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const url = new URL(request.url);
    const exportId = url.searchParams.get('exportId');
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    if (exportId) {
      // Get specific export
      const exportRecord = await db.queryOne(
        'SELECT * FROM data_exports WHERE id = $1 AND user_id = $2',
        [exportId, auth.session.userId]
      );

      if (!exportRecord) {
        return NextResponse.json(
          { error: 'Export not found' },
          { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
        );
      }

      return NextResponse.json(
        {
          success: true,
          export: exportRecord,
        },
        { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Get export history
    let query = 'SELECT * FROM data_exports WHERE user_id = $1';
    const params: any[] = [auth.session.userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const exports = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM data_exports WHERE user_id = $1';
    const countParams = [auth.session.userId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await db.queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0');

    return NextResponse.json(
      {
        success: true,
        exports,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Export history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export history' },
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