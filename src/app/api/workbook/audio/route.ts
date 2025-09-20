import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  WORKBOOK_SECURITY_HEADERS,
  getRateLimits
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadAudioFile,
  getAudioDownloadUrl,
  deleteAudioFile,
  getStorageService,
  type AudioFileMetadata,
  type UploadResult
} from '@/lib/storage';
import OpenAI from 'openai';

// Initialize OpenAI client lazily
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `audio_${userId}`;
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

async function validateTranscriptionLimits(
  userId: string,
  durationMinutes: number
) {
  const user = await db.queryOne('SELECT * FROM workbook_users WHERE id = $1', [
    userId,
  ]);

  if (!user) {
    throw new ValidationError('User not found');
  }

  // Check daily limit
  const availableMinutes =
    user.daily_transcription_limit_minutes -
    user.daily_transcription_used_minutes;
  if (availableMinutes < durationMinutes) {
    throw new ValidationError(
      `Daily transcription limit exceeded. Available: ${availableMinutes} minutes`
    );
  }

  // Check monthly cost limit (assuming $0.006 per minute)
  const estimatedCostCents = Math.round(durationMinutes * 0.6); // $0.006 * 100 cents
  if (
    user.monthly_transcription_cost_cents + estimatedCostCents >
    user.monthly_cost_limit_cents
  ) {
    throw new ValidationError('Monthly cost limit would be exceeded');
  }

  return user;
}

async function updateTranscriptionUsage(
  userId: string,
  durationMinutes: number,
  costCents: number
) {
  await db.query(
    `
    UPDATE workbook_users
    SET daily_transcription_used_minutes = daily_transcription_used_minutes + $1,
        monthly_transcription_cost_cents = monthly_transcription_cost_cents + $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `,
    [durationMinutes, costCents, userId]
  );
}

// T031: Audio recording API implementation
// POST /api/workbook/audio - Upload audio recordings to S3
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for audio transcription' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(auth.session.userId, 10)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const moduleId = formData.get('moduleId') as string;
    const lessonId = formData.get('lessonId') as string;
    const chunkNumber = parseInt(
      (formData.get('chunkNumber') as string) || '0'
    );
    const language = (formData.get('language') as string) || 'en';
    const model = (formData.get('model') as string) || 'whisper-1';
    const title = (formData.get('title') as string) || `Recording ${new Date().toISOString()}`;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];

    if (!audioFile) {
      throw new ValidationError('Audio file is required');
    }

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    // Verify session ownership
    const session = await db.queryOne(
      'SELECT * FROM workbook_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, auth.session.userId]
    );

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate file type and size
    const allowedTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/ogg',
    ];
    if (!allowedTypes.includes(audioFile.type)) {
      throw new ValidationError('Unsupported audio format');
    }

    const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit for OpenAI Whisper
    if (audioFile.size > maxSizeBytes) {
      throw new ValidationError('Audio file too large (max 25MB)');
    }

    // Enhanced rate limiting based on user role
    const rateLimits = getRateLimits(auth.session.role);
    if (!checkRateLimit(auth.session.userId, rateLimits.audioRecordings.limit, rateLimits.audioRecordings.window * 1000)) {
      return NextResponse.json(
        { error: 'Recording rate limit exceeded for your subscription level' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Estimate duration (rough approximation based on file size and format)
    const estimatedDurationMinutes = Math.ceil(
      audioFile.size / (1024 * 1024 * 0.5)
    ); // Rough estimate

    // Upload to S3 using the storage service
    const uploadResult: UploadResult = await uploadAudioFile(audioFile, auth.session.userId, {
      moduleId,
      lessonId,
      sessionId,
      tags,
      metadata: {
        title,
        description,
        chunkNumber,
        estimatedDurationMinutes,
        userAgent: request.headers.get('user-agent'),
        uploadTimestamp: new Date().toISOString()
      },
      extractWaveform: true,
      compress: true
    });

    if (!uploadResult.success || !uploadResult.fileMetadata) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload audio file' },
        { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const s3FileMetadata = uploadResult.fileMetadata as AudioFileMetadata;

    // Create audio recording record in database
    const recordingId = uuidv4();
    const audioRecord = await db.queryOne(
      `
      INSERT INTO audio_recordings (
        id, session_id, user_id, module_id, lesson_id, chunk_number,
        file_size_bytes, format, upload_status, s3_key, s3_bucket,
        title, description, tags, waveform_data, peaks_data,
        metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `,
      [
        recordingId,
        sessionId,
        auth.session.userId,
        moduleId,
        lessonId,
        chunkNumber,
        s3FileMetadata.size,
        s3FileMetadata.mimeType,
        'uploaded',
        s3FileMetadata.key,
        s3FileMetadata.bucket,
        title,
        description,
        JSON.stringify(tags),
        JSON.stringify(s3FileMetadata.waveform || []),
        JSON.stringify(s3FileMetadata.peaks || []),
        JSON.stringify({
          originalName: audioFile.name,
          estimatedDurationMinutes,
          s3Metadata: s3FileMetadata.metadata,
          uploadedAt: s3FileMetadata.uploadedAt.toISOString()
        }),
        new Date(),
        new Date(),
      ]
    );

    // Create transcription record
    const transcriptionId = uuidv4();
    const transcriptionRecord = await db.queryOne(
      `
      INSERT INTO transcriptions (
        id, recording_id, session_id, user_id, status, provider,
        model, language, cost_per_minute_cents, retry_count, max_retries,
        metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
      [
        transcriptionId,
        recordingId,
        sessionId,
        auth.session.userId,
        'pending',
        'openai-whisper',
        model,
        language,
        60, // $0.006 per minute = 0.6 cents
        0,
        3,
        JSON.stringify({
          requestMetadata: {
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          },
        }),
        new Date(),
        new Date(),
      ]
    );

    // Start transcription process
    try {
      // Update status to processing
      await db.query(
        'UPDATE transcriptions SET status = $1, started_at = $2 WHERE id = $3',
        ['processing', new Date(), transcriptionId]
      );

      // Convert File to Buffer for OpenAI API
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a File-like object for OpenAI API
      const audioData = new File([buffer], audioFile.name, {
        type: audioFile.type,
      });

      // Transcribe audio using OpenAI Whisper
      const openai = getOpenAIClient();
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioData,
        model: model,
        language: language,
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      const actualDurationMinutes = Math.ceil(
        (transcriptionResponse.duration || 0) / 60
      );
      const actualCostCents = Math.round(actualDurationMinutes * 0.6);

      // Update transcription with results
      await db.query(
        `
        UPDATE transcriptions
        SET status = $1, text = $2, confidence_score = $3,
            cost_cents = $4, completed_at = $5, updated_at = $6,
            processing_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at)),
            metadata = $7
        WHERE id = $8
      `,
        [
          'completed',
          transcriptionResponse.text,
          null, // OpenAI doesn't provide overall confidence score
          actualCostCents,
          new Date(),
          new Date(),
          JSON.stringify({
            ...JSON.parse(transcriptionRecord.metadata),
            openaiResponse: {
              duration: transcriptionResponse.duration,
              words: transcriptionResponse.words?.slice(0, 10), // Store first 10 words for debugging
            },
          }),
          transcriptionId,
        ]
      );

      // Update audio recording with actual duration
      await db.query(
        `
        UPDATE audio_recordings
        SET duration_seconds = $1, metadata = $2
        WHERE id = $3
      `,
        [
          transcriptionResponse.duration,
          JSON.stringify({
            ...JSON.parse(audioRecord.metadata),
            actualDuration: transcriptionResponse.duration,
          }),
          recordingId,
        ]
      );

      // Update user usage statistics
      await updateTranscriptionUsage(
        auth.session.userId,
        actualDurationMinutes,
        actualCostCents
      );

      // Create cost tracking record
      await db.query(
        `
        INSERT INTO cost_tracking (
          user_id, transcription_id, service_type, provider,
          cost_cents, quantity, unit, rate_cents_per_unit,
          billing_date, usage_date, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        [
          auth.session.userId,
          transcriptionId,
          'transcription',
          'openai',
          actualCostCents,
          actualDurationMinutes,
          'minutes',
          60, // 0.6 cents per minute
          new Date().toISOString().split('T')[0], // Today's date
          new Date(),
          JSON.stringify({
            model: model,
            language: language,
            sessionId: sessionId,
          }),
          new Date(),
        ]
      );

      return NextResponse.json(
        {
          success: true,
          audio_recording: {
            id: recordingId,
            title,
            description,
            file_size_bytes: s3FileMetadata.size,
            format: s3FileMetadata.mimeType,
            s3_key: s3FileMetadata.key,
            url: s3FileMetadata.url,
            waveform_data: s3FileMetadata.waveform,
            peaks_data: s3FileMetadata.peaks,
            created_at: audioRecord.created_at
          },
          transcription: {
            id: transcriptionId,
            text: transcriptionResponse.text,
            duration: transcriptionResponse.duration,
            cost_cents: actualCostCents,
            status: 'completed',
          },
          message: 'Audio uploaded and transcribed successfully',
        },
        { status: 201, headers: WORKBOOK_SECURITY_HEADERS }
      );
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);

      // Update transcription with error
      await db.query(
        `
        UPDATE transcriptions
        SET status = $1, error_message = $2, updated_at = $3,
            retry_count = retry_count + 1
        WHERE id = $4
      `,
        [
          'failed',
          transcriptionError instanceof Error
            ? transcriptionError.message
            : 'Unknown transcription error',
          new Date(),
          transcriptionId,
        ]
      );

      throw new Error(
        'Transcription failed: ' +
          (transcriptionError instanceof Error
            ? transcriptionError.message
            : 'Unknown error')
      );
    }
  } catch (error) {
    console.error('Audio POST error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}

// GET /api/workbook/audio - Get audio recordings and transcriptions
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

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const status = url.searchParams.get('status');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20'),
      100
    );
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    let query = `
      SELECT ar.*, t.id as transcription_id, t.status as transcription_status,
             t.text, t.confidence_score, t.cost_cents, t.error_message
      FROM audio_recordings ar
      LEFT JOIN transcriptions t ON ar.id = t.recording_id
      WHERE ar.user_id = $1
    `;
    const params: any[] = [auth.session.userId];

    if (sessionId) {
      query += ` AND ar.session_id = $${params.length + 1}`;
      params.push(sessionId);
    }

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const recordings = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT ar.id) as total
      FROM audio_recordings ar
      LEFT JOIN transcriptions t ON ar.id = t.recording_id
      WHERE ar.user_id = $1
    `;
    const countParams = [auth.session.userId];

    if (sessionId) {
      countQuery += ` AND ar.session_id = $2`;
      countParams.push(sessionId);
    }

    const countResult = await db.queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0');

    return NextResponse.json({
      success: true,
      recordings,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Audio GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio recordings' },
      { status: 500 }
    );
  }
}
