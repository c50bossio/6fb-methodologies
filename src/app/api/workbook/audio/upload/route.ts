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
  getStorageService,
  type AudioFileMetadata,
  type UploadResult,
  type UploadProgress
} from '@/lib/storage';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  userId: string,
  limit: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `audio_upload_${userId}`;
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

// POST /api/workbook/audio/upload - Upload audio recordings to S3
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.RECORD_AUDIO)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for audio recording' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Enhanced rate limiting based on user role
    const rateLimits = getRateLimits(auth.session.role);
    if (!checkRateLimit(
      auth.session.userId,
      rateLimits.audioRecordings.limit,
      rateLimits.audioRecordings.window * 1000
    )) {
      return NextResponse.json(
        { error: 'Recording rate limit exceeded for your subscription level' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const moduleId = formData.get('moduleId') as string;
    const lessonId = formData.get('lessonId') as string;
    const title = (formData.get('title') as string) || `Recording ${new Date().toISOString()}`;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const isPublic = formData.get('isPublic') === 'true';

    if (!audioFile) {
      throw new ValidationError('Audio file is required');
    }

    // Validate file type and size
    const allowedTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/flac',
    ];
    if (!allowedTypes.includes(audioFile.type)) {
      throw new ValidationError('Unsupported audio format');
    }

    const maxSizeBytes = 100 * 1024 * 1024; // 100MB limit
    if (audioFile.size > maxSizeBytes) {
      throw new ValidationError('Audio file too large (max 100MB)');
    }

    // Upload to S3 using the storage service
    const uploadResult: UploadResult = await uploadAudioFile(audioFile, auth.session.userId, {
      moduleId,
      lessonId,
      sessionId,
      tags,
      metadata: {
        title,
        description,
        userAgent: request.headers.get('user-agent'),
        uploadTimestamp: new Date().toISOString(),
        uploadedBy: auth.session.name
      },
      extractWaveform: true,
      compress: true,
      isPublic
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
        id, session_id, user_id, module_id, lesson_id,
        file_size_bytes, format, upload_status, s3_key, s3_bucket,
        title, description, tags, waveform_data, peaks_data, duration_seconds,
        is_public, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `,
      [
        recordingId,
        sessionId,
        auth.session.userId,
        moduleId,
        lessonId,
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
        s3FileMetadata.duration || 0,
        isPublic,
        JSON.stringify({
          originalName: audioFile.name,
          s3Metadata: s3FileMetadata.metadata,
          uploadedAt: s3FileMetadata.uploadedAt.toISOString()
        }),
        new Date(),
        new Date(),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        recording: {
          id: recordingId,
          title,
          description,
          file_size_bytes: s3FileMetadata.size,
          format: s3FileMetadata.mimeType,
          s3_key: s3FileMetadata.key,
          url: s3FileMetadata.url,
          public_url: s3FileMetadata.publicUrl,
          waveform_data: s3FileMetadata.waveform,
          peaks_data: s3FileMetadata.peaks,
          duration_seconds: s3FileMetadata.duration,
          tags,
          is_public: isPublic,
          created_at: audioRecord.created_at
        },
        message: 'Audio uploaded successfully',
      },
      { status: 201, headers: WORKBOOK_SECURITY_HEADERS }
    );

  } catch (error) {
    console.error('Audio upload error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload audio file' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}