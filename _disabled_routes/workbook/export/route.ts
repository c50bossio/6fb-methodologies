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

async function generatePDFExport(
  userId: string,
  options: ExportOptions
): Promise<Buffer> {
  const puppeteer = await import('puppeteer');

  console.log(
    'PDF export requested for user:',
    userId,
    'with options:',
    options
  );

  // Gather data for PDF export
  const exportData = await generateJSONExport(userId, options);

  // Generate HTML content for PDF
  const htmlContent = generatePDFHTML(exportData);

  // Launch Puppeteer in headless mode
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set page content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          6FB Workshop Progress Report
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; margin: 0 auto; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function generatePDFHTML(exportData: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>6FB Methodologies Workshop Workbook</title>
      <style>
        @page {
          size: A4;
          margin: 0.75in;
          background: #fafafa;
        }

        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.4;
          color: #2d2d2d;
          font-size: 11pt;
          background: #fafafa;
          margin: 0;
          padding: 20px;
        }

        /* Workbook Cover Style */
        .cover-page {
          text-align: center;
          padding: 60px 40px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 3px solid #22c55e;
          border-radius: 12px;
          margin-bottom: 40px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          page-break-after: always;
        }

        .cover-page h1 {
          font-size: 36pt;
          color: #22c55e;
          font-weight: bold;
          margin: 0 0 20px 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .cover-page .subtitle {
          font-size: 18pt;
          color: #4a4a4a;
          font-style: italic;
          margin: 0 0 30px 0;
        }

        .cover-page .date {
          font-size: 14pt;
          color: #666;
          background: #f8f9fa;
          padding: 10px 20px;
          border-radius: 6px;
          display: inline-block;
          margin: 20px 0;
        }

        .cover-page .user-info {
          font-size: 12pt;
          color: #666;
          margin-top: 40px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        /* Physical Workbook Page Style */
        .workbook-page {
          background: #ffffff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          position: relative;
        }

        .workbook-page::before {
          content: "";
          position: absolute;
          left: 40px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #ff6b6b;
        }

        .workbook-page::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50px;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #22c55e 50px, #e2e8f0 50px, #e2e8f0 calc(100% - 50px), transparent 100%);
        }

        .section-header {
          background: #22c55e;
          color: white;
          padding: 15px 20px;
          margin: -30px -30px 30px -30px;
          font-size: 16pt;
          font-weight: bold;
          border-radius: 8px 8px 0 0;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .day-header {
          background: linear-gradient(135deg, #22c55e, #16a085);
          color: white;
          padding: 20px;
          margin: 20px -30px;
          font-size: 18pt;
          font-weight: bold;
          text-align: center;
          position: relative;
        }

        .day-header::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid #16a085;
        }

        /* Workshop Session Styling */
        .session-box {
          background: #f8f9fa;
          border: 2px solid #22c55e;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          position: relative;
        }

        .session-title {
          font-size: 14pt;
          font-weight: bold;
          color: #22c55e;
          margin-bottom: 10px;
          text-decoration: underline;
        }

        .session-meta {
          font-size: 10pt;
          color: #666;
          font-style: italic;
          margin-bottom: 15px;
        }

        /* Note Style */
        .note-entry {
          background: #fff;
          border: 1px solid #ddd;
          border-left: 4px solid #22c55e;
          border-radius: 6px;
          padding: 15px 20px;
          margin: 15px 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .note-title {
          font-weight: bold;
          color: #2d2d2d;
          margin-bottom: 8px;
          font-size: 12pt;
        }

        .note-content {
          line-height: 1.6;
          color: #4a4a4a;
        }

        .note-date {
          font-size: 9pt;
          color: #888;
          font-style: italic;
          margin-top: 10px;
          text-align: right;
        }

        /* Action Items */
        .action-item {
          border-left-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .action-completed {
          border-left-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .action-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 8pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .action-pending {
          background: #fbbf24;
          color: #92400e;
        }

        .action-done {
          background: #10b981;
          color: white;
        }

        /* Progress Tracking */
        .progress-section {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 2px solid #64748b;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }

        .progress-title {
          font-size: 14pt;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 15px;
          text-align: center;
        }

        .progress-bar {
          background: #e2e8f0;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
          border: 1px solid #cbd5e1;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a085);
          transition: width 0.3s ease;
        }

        /* Lines for writing */
        .writing-lines {
          background-image: repeating-linear-gradient(
            transparent,
            transparent 24px,
            #e2e8f0 24px,
            #e2e8f0 25px
          );
          min-height: 150px;
          padding: 25px 0;
          margin: 20px 0;
        }

        /* Footer */
        .page-footer {
          text-align: center;
          font-size: 9pt;
          color: #888;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover-page">
        <h1>6FB Methodologies</h1>
        <div class="subtitle">Workshop Workbook</div>
        <div class="date">${currentDate}</div>
        <div class="user-info">
          <strong>Participant:</strong> ${exportData.userId || 'Workshop Attendee'}<br>
          <strong>Workshop Location:</strong> In-Person Intensive<br>
          <strong>Coaches:</strong> Dre, Nate & Bossio
        </div>
      </div>

      ${exportData.data.progress ? `
        <div class="workbook-page">
          <div class="section-header">Workshop Progress Summary</div>
          <div class="progress-section">
            <div class="progress-title">Your Learning Journey</div>
            ${exportData.data.progress.map((progress: any) => `
              <div style="margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-weight: bold;">${progress.module_title || 'Workshop Session'}</span>
                  <span style="color: #22c55e; font-weight: bold;">${progress.progress_percentage || 0}% Complete</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress.progress_percentage || 0}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${exportData.data.notes ? `
        <div class="workbook-page">
          <div class="section-header">Workshop Notes & Action Items</div>

          ${exportData.data.notes
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .reduce((acc: any, note: any) => {
              const sessionKey = note.session_title || 'General Notes';
              if (!acc[sessionKey]) acc[sessionKey] = [];
              acc[sessionKey].push(note);
              return acc;
            }, {})
            ? Object.entries(
                exportData.data.notes
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .reduce((acc: any, note: any) => {
                    const sessionKey = note.session_title || 'General Notes';
                    if (!acc[sessionKey]) acc[sessionKey] = [];
                    acc[sessionKey].push(note);
                    return acc;
                  }, {})
              ).map(([sessionTitle, sessionNotes]: [string, any[]]) => `
                <div class="session-box">
                  <div class="session-title">${sessionTitle}</div>
                  ${sessionNotes.map((note: any) => `
                    <div class="note-entry ${note.is_action_item ? (note.action_item_completed ? 'action-completed' : 'action-item') : ''}">
                      ${note.is_action_item ? `
                        <div class="action-badge ${note.action_item_completed ? 'action-done' : 'action-pending'}">
                          ${note.action_item_completed ? '✓ Completed' : '⏳ Action Item'}
                        </div>
                      ` : ''}
                      <div class="note-title">${note.title || 'Workshop Note'}</div>
                      <div class="note-content">${note.content}</div>
                      <div class="note-date">${new Date(note.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="writing-lines"></div>
              `).join('')
            : '<div class="session-box"><div class="session-title">No Notes Available</div><div class="writing-lines"></div></div>'
          }
        </div>
      ` : ''}

      ${exportData.data.transcriptions ? `
        <div class="workbook-page page-break">
          <div class="section-header">Audio Transcriptions</div>
          ${exportData.data.transcriptions.map((transcription: any) => `
            <div class="session-box">
              <div class="session-title">🎤 ${transcription.recording_title || 'Workshop Audio Recording'}</div>
              <div class="session-meta">
                Recorded: ${new Date(transcription.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                • Duration: ${Math.round((transcription.duration_seconds || 0) / 60)} minutes
                • Language: ${transcription.language || 'English'}
              </div>
              <div class="note-entry">
                <div class="note-content" style="font-style: italic; color: #4a4a4a;">
                  "${transcription.text}"
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${exportData.data.sessions ? `
        <div class="workbook-page page-break">
          <div class="section-header">Workshop Session Summary</div>
          ${exportData.data.sessions.map((session: any) => `
            <div class="session-box">
              <div class="session-title">📋 ${session.title || 'Workshop Session'}</div>
              <div class="session-meta">
                Session Date: ${new Date(session.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div class="progress-section" style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-around; text-align: center;">
                  <div>
                    <div style="font-size: 18pt; font-weight: bold; color: #22c55e;">${session.notes_count || 0}</div>
                    <div style="font-size: 10pt; color: #666;">Notes Taken</div>
                  </div>
                  <div>
                    <div style="font-size: 18pt; font-weight: bold; color: #22c55e;">${session.recordings_count || 0}</div>
                    <div style="font-size: 10pt; color: #666;">Recordings Made</div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
          <div class="writing-lines"></div>
        </div>
      ` : ''}

      <!-- Action Plan Pages -->
      <div class="workbook-page page-break">
        <div class="section-header">My Action Plan</div>
        <div class="session-box">
          <div class="session-title">📝 Key Takeaways from This Workshop</div>
          <div class="writing-lines" style="min-height: 200px;"></div>
        </div>

        <div class="session-box">
          <div class="session-title">🎯 Top 3 Action Items to Implement</div>
          <div style="margin: 20px 0;">
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>1. Priority Action:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>2. Secondary Action:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
            <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong>3. Long-term Goal:</strong>
              <div class="writing-lines" style="min-height: 60px; margin-top: 10px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Final Page -->
      <div class="workbook-page page-break">
        <div class="section-header">Workshop Completion Certificate</div>
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 24pt; color: #22c55e; margin: 20px 0;">🎉 Congratulations! 🎉</div>
          <div style="font-size: 16pt; margin: 20px 0;">You have successfully completed the</div>
          <div style="font-size: 20pt; font-weight: bold; color: #22c55e; margin: 20px 0;">6FB Methodologies Workshop</div>
          <div style="font-size: 14pt; margin: 30px 0;">This workbook contains your personal journey through the workshop</div>

          <div style="margin: 40px 0; padding: 20px; border: 2px solid #22c55e; border-radius: 10px; background: #f0fdf4;">
            <div style="font-size: 12pt; color: #166534;">
              <strong>What's Next?</strong><br>
              • Implement your action plan<br>
              • Join our community for ongoing support<br>
              • Schedule your 90-day check-in<br>
              • Visit 6fbmethodologies.com for resources
            </div>
          </div>
        </div>

        <div class="page-footer">
          <p><strong>6FB Methodologies Workshop System</strong></p>
          <p>Generated on ${currentDate}</p>
          <p>Visit <strong>6fbmethodologies.com</strong> for continued learning and support</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateJSONExport(
  userId: string,
  options: ExportOptions
): Promise<any> {
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
      notesParams.push(
        new Date(options.dateRange.start),
        new Date(options.dateRange.end)
      );
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
      transcriptionsParams.push(
        new Date(options.dateRange.start),
        new Date(options.dateRange.end)
      );
    }

    transcriptionsQuery += ` ORDER BY t.created_at DESC`;

    const transcriptions = await db.query(
      transcriptionsQuery,
      transcriptionsParams
    );
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
      sessionsParams.push(
        new Date(options.dateRange.start),
        new Date(options.dateRange.end)
      );
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
      audioParams.push(
        new Date(options.dateRange.start),
        new Date(options.dateRange.end)
      );
    }

    audioQuery += ` ORDER BY ar.created_at DESC`;

    const audioRecordings = await db.query(audioQuery, audioParams);
    exportData.data.audioRecordings = audioRecordings;
  }

  return exportData;
}

async function generateMarkdownExport(
  userId: string,
  options: ExportOptions
): Promise<string> {
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

async function generateCSVExport(
  userId: string,
  options: ExportOptions
): Promise<string> {
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

    let csv =
      'Title,Content,Type,Tags,Is Action Item,Completed,Importance,Created At,Session\n';
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
    if (!checkRateLimit(auth.session.userId, 3, 300000)) {
      // 3 exports per 5 minutes
      return NextResponse.json(
        {
          error:
            'Export rate limit exceeded. Please wait before requesting another export.',
        },
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
      throw new ValidationError(
        'Invalid export format. Supported formats: pdf, json, markdown, csv'
      );
    }

    // Validate date range if provided
    if (dateRange) {
      if (!dateRange.start || !dateRange.end) {
        throw new ValidationError(
          'Date range must include both start and end dates'
        );
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
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        throw new ValidationError(
          `Date range too large. Maximum ${maxDays} days allowed.`
        );
      }
    }

    // Validate that at least one data type is included
    if (
      !includeNotes &&
      !includeTranscriptions &&
      !includeProgress &&
      !includeSessions &&
      !includeAudioMetadata
    ) {
      throw new ValidationError(
        'At least one data type must be included in the export'
      );
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
    let isPDFBuffer = false;

    try {
      switch (format) {
        case 'pdf':
          exportData = await generatePDFExport(auth.session.userId, options);
          contentType = 'application/pdf';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.pdf`;
          isPDFBuffer = true;
          break;

        case 'json':
          exportData = await generateJSONExport(auth.session.userId, options);
          contentType = 'application/json';
          filename = `6fb-export-${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'markdown':
          exportData = await generateMarkdownExport(
            auth.session.userId,
            options
          );
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
          isPDFBuffer
            ? (exportData as Buffer).length
            : typeof exportData === 'string'
            ? Buffer.byteLength(exportData, 'utf8')
            : JSON.stringify(exportData).length,
          new Date(),
          exportId,
        ]
      );

      // For PDF, return the binary data directly for download
      if (isPDFBuffer) {
        return new NextResponse(exportData as Buffer, {
          status: 200,
          headers: {
            ...WORKBOOK_SECURITY_HEADERS,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': (exportData as Buffer).length.toString(),
          },
        });
      }

      // For other formats, return JSON with data
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
          exportError instanceof Error
            ? exportError.message
            : 'Unknown export error',
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
    const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
    const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    const limit = Math.min(
      isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit,
      100
    );
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

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
    let countQuery =
      'SELECT COUNT(*) as total FROM data_exports WHERE user_id = $1';
    const countParams = [auth.session.userId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await db.queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0', 10);

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
