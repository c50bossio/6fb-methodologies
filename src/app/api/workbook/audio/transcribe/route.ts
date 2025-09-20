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
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `transcribe_${userId}`;
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
  estimatedDurationMinutes: number
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
  if (availableMinutes < estimatedDurationMinutes) {
    throw new ValidationError(
      `Daily transcription limit exceeded. Available: ${availableMinutes} minutes`
    );
  }

  // Check monthly cost limit (assuming $0.006 per minute)
  const estimatedCostCents = Math.round(estimatedDurationMinutes * 0.6);
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

// T032: Audio transcription API with chunked processing
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for audio transcription' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Enhanced rate limiting based on user role
    const rateLimits = getRateLimits(auth.session.role);
    if (!checkRateLimit(auth.session.userId, rateLimits.transcriptions.limit, rateLimits.transcriptions.window * 1000)) {
      return NextResponse.json(
        { error: 'Transcription rate limit exceeded for your subscription level' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const recordingId = formData.get('recordingId') as string;
    const sessionId = formData.get('sessionId') as string;
    const language = (formData.get('language') as string) || 'en';
    const model = (formData.get('model') as string) || 'whisper-1';
    const prompt = formData.get('prompt') as string;
    const temperature = parseFloat((formData.get('temperature') as string) || '0');
    const responseFormat = (formData.get('responseFormat') as string) || 'verbose_json';
    const enableChunking = (formData.get('enableChunking') as string) === 'true';
    const chunkSizeMinutes = parseInt((formData.get('chunkSizeMinutes') as string) || '5');

    if (!audioFile && !recordingId) {
      throw new ValidationError('Either audio file or recording ID is required');
    }

    let audioFileToProcess = audioFile;
    let estimatedDurationMinutes = 0;

    // If recordingId is provided, get the file from database
    if (recordingId) {
      const recording = await db.queryOne(
        'SELECT * FROM audio_recordings WHERE id = $1 AND user_id = $2',
        [recordingId, auth.session.userId]
      );

      if (!recording) {
        return NextResponse.json(
          { error: 'Audio recording not found or unauthorized' },
          { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
        );
      }

      // For now, we'll require the audio file to be uploaded again
      // In production, you'd fetch it from S3
      if (!audioFile) {
        throw new ValidationError('Audio file is required when using recordingId');
      }

      estimatedDurationMinutes = Math.ceil((recording.duration_seconds || 0) / 60);
    } else {
      // Estimate duration from file size (rough approximation)
      estimatedDurationMinutes = Math.ceil(audioFile.size / (1024 * 1024 * 0.5));
    }

    // Validate file if provided
    if (audioFile) {
      const allowedTypes = [
        'audio/webm',
        'audio/mp3',
        'audio/wav',
        'audio/m4a',
        'audio/ogg',
        'audio/mpeg',
      ];
      if (!allowedTypes.includes(audioFile.type)) {
        throw new ValidationError('Unsupported audio format');
      }

      const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit for OpenAI Whisper
      if (audioFile.size > maxSizeBytes) {
        throw new ValidationError('Audio file too large (max 25MB per chunk)');
      }
    }

    // Validate user limits
    await validateTranscriptionLimits(auth.session.userId, estimatedDurationMinutes);

    // Verify session ownership if provided
    if (sessionId) {
      const session = await db.queryOne(
        'SELECT * FROM workbook_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, auth.session.userId]
      );

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or unauthorized' },
          { status: 404, headers: WORKBOOK_SECURITY_HEADERS }
        );
      }
    }

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
            enableChunking,
            chunkSizeMinutes,
            responseFormat,
            temperature,
            prompt: prompt ? 'provided' : 'none',
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
      const arrayBuffer = await audioFileToProcess.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let transcriptionResults: any[] = [];
      let totalDuration = 0;
      let totalCost = 0;

      if (enableChunking && audioFileToProcess.size > 10 * 1024 * 1024) {
        // For chunked processing, we'd need to implement audio splitting
        // For now, we'll process the whole file and add chunking support later
        console.log('Chunked processing requested but not yet implemented, processing whole file');
      }

      // Create a File-like object for OpenAI API
      const audioData = new File([buffer], audioFileToProcess.name, {
        type: audioFileToProcess.type,
      });

      // Transcribe audio using OpenAI Whisper
      const openai = getOpenAIClient();

      const transcriptionParams: any = {
        file: audioData,
        model: model,
        language: language,
        response_format: responseFormat,
        temperature: temperature,
      };

      if (prompt) {
        transcriptionParams.prompt = prompt;
      }

      if (responseFormat === 'verbose_json') {
        transcriptionParams.timestamp_granularities = ['word', 'segment'];
      }

      const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionParams);

      const actualDurationMinutes = Math.ceil((transcriptionResponse.duration || estimatedDurationMinutes * 60) / 60);
      const actualCostCents = Math.round(actualDurationMinutes * 0.6);

      totalDuration = transcriptionResponse.duration || 0;
      totalCost = actualCostCents;

      // Store detailed transcription results
      const detailedMetadata = {
        ...JSON.parse(transcriptionRecord.metadata),
        openaiResponse: {
          duration: transcriptionResponse.duration,
          language: transcriptionResponse.language,
          task: transcriptionResponse.task,
          segments: responseFormat === 'verbose_json' ? transcriptionResponse.segments?.slice(0, 5) : undefined,
          words: responseFormat === 'verbose_json' ? transcriptionResponse.words?.slice(0, 20) : undefined,
        },
        processing: {
          chunkCount: 1,
          totalProcessingTime: Date.now() - new Date(transcriptionRecord.created_at).getTime(),
        },
      };

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
          totalCost,
          new Date(),
          new Date(),
          JSON.stringify(detailedMetadata),
          transcriptionId,
        ]
      );

      // Update user usage statistics
      await updateTranscriptionUsage(
        auth.session.userId,
        actualDurationMinutes,
        totalCost
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
          totalCost,
          actualDurationMinutes,
          'minutes',
          60, // 0.6 cents per minute
          new Date().toISOString().split('T')[0], // Today's date
          new Date(),
          JSON.stringify({
            model: model,
            language: language,
            sessionId: sessionId,
            recordingId: recordingId,
            enableChunking,
            responseFormat,
          }),
          new Date(),
        ]
      );

      // Update recording if recordingId was provided
      if (recordingId) {
        await db.query(
          `
          UPDATE audio_recordings
          SET duration_seconds = $1, metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{transcription}',
            $2
          )
          WHERE id = $3
        `,
          [
            totalDuration,
            JSON.stringify({
              transcriptionId: transcriptionId,
              transcribedAt: new Date().toISOString(),
              model: model,
              language: language,
            }),
            recordingId,
          ]
        );
      }

      return NextResponse.json(
        {
          success: true,
          transcription: {
            id: transcriptionId,
            text: transcriptionResponse.text,
            duration: totalDuration,
            language: transcriptionResponse.language,
            segments: responseFormat === 'verbose_json' ? transcriptionResponse.segments : undefined,
            words: responseFormat === 'verbose_json' ? transcriptionResponse.words : undefined,
            cost_cents: totalCost,
            status: 'completed',
            provider: 'openai-whisper',
            model: model,
          },
          usage: {
            duration_minutes: actualDurationMinutes,
            cost_cents: totalCost,
            daily_remaining_minutes: (await db.queryOne(
              'SELECT daily_transcription_limit_minutes - daily_transcription_used_minutes as remaining FROM workbook_users WHERE id = $1',
              [auth.session.userId]
            ))?.remaining || 0,
          },
          message: 'Audio transcribed successfully',
        },
        { status: 201, headers: WORKBOOK_SECURITY_HEADERS }
      );
    } catch (transcriptionError) {
      console.error('Transcription processing error:', transcriptionError);

      // Update transcription with error
      await db.query(
        `
        UPDATE transcriptions
        SET status = $1, error_message = $2, updated_at = $3,
            retry_count = retry_count + 1,
            processing_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
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

      // Check if we should retry
      if (transcriptionRecord.retry_count < transcriptionRecord.max_retries) {
        // In production, you'd queue this for retry
        console.log(`Transcription ${transcriptionId} will be retried (attempt ${transcriptionRecord.retry_count + 1}/${transcriptionRecord.max_retries})`);
      }

      throw new Error(
        'Transcription failed: ' +
          (transcriptionError instanceof Error
            ? transcriptionError.message
            : 'Unknown error')
      );
    }
  } catch (error) {
    console.error('Transcription API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Transcription service temporarily unavailable' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin':
        process.env.NODE_ENV === 'development'
          ? '*'
          : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
