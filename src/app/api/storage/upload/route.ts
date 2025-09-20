/**
 * File Upload API Endpoint
 *
 * Handles secure file uploads to AWS S3 with validation, processing, and database integration
 * Supports audio files, images, and documents with comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService, AudioFileMetadata } from '@/lib/storage';
import { saveFileToDatabase, logFileAccess } from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';
import { headers } from 'next/headers';

// Request validation schema
interface UploadRequestBody {
  file: File;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  generateThumbnail?: boolean;
  extractWaveform?: boolean;
  compress?: boolean;
  isPublic?: boolean;
}

interface UploadResponse {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    url: string;
    publicUrl?: string;
    size: number;
    mimeType: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  details?: string;
}

// File validation rules
const VALIDATION_RULES = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    // Audio formats
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/m4a',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    // Image formats (for thumbnails)
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Document formats
    'application/pdf',
    'text/plain',
  ],
  maxFileNameLength: 255,
  allowedFileExtensions: [
    'mp3',
    'wav',
    'm4a',
    'webm',
    'ogg',
    'flac',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'pdf',
    'txt',
  ],
};

/**
 * POST /api/storage/upload
 * Upload a file to S3 with validation and processing
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  const startTime = Date.now();
  let userId: string | null = null;
  let clientIp: string | null = null;

  try {
    // Get client IP for audit logging
    const headersList = headers();
    clientIp =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';

    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    userId = authResult.userId;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      await logFileAccess('upload', file.name, userId, {
        error: validationResult.error,
        validationFailed: true,
        fileSize: file.size,
        mimeType: file.type,
      });

      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          details: validationResult.details,
        },
        { status: 400 }
      );
    }

    // Parse additional parameters
    const uploadOptions = {
      userId,
      moduleId: (formData.get('moduleId') as string) || undefined,
      lessonId: (formData.get('lessonId') as string) || undefined,
      sessionId: (formData.get('sessionId') as string) || undefined,
      tags: parseJsonField(formData.get('tags') as string) || [],
      metadata: parseJsonField(formData.get('metadata') as string) || {},
      generateThumbnail: formData.get('generateThumbnail') === 'true',
      extractWaveform: formData.get('extractWaveform') === 'true',
      compress: formData.get('compress') === 'true',
      isPublic: formData.get('isPublic') === 'true',
    };

    // Upload to S3
    const storageService = getStorageService();
    const uploadResult = await storageService.uploadFile(
      file,
      file.name,
      uploadOptions,
      // Progress callback (for server-side logging)
      progress => {
        console.log(
          `Upload progress for ${file.name}: ${progress.percentage}% (${progress.stage})`
        );
      }
    );

    if (!uploadResult.success || !uploadResult.fileMetadata) {
      await logFileAccess('upload', file.name, userId, {
        error: uploadResult.error,
        uploadFailed: true,
        fileSize: file.size,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || 'Upload failed',
          details: 'File upload to storage failed',
        },
        { status: 500 }
      );
    }

    // Save to database
    const fileMetadata = uploadResult.fileMetadata as AudioFileMetadata;

    try {
      const dbFileId = await saveFileToDatabase(fileMetadata);

      // Log successful upload
      await logFileAccess('upload', fileMetadata.key, userId, {
        fileId: dbFileId,
        fileName: fileMetadata.fileName,
        fileSize: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        processingTime: Date.now() - startTime,
        moduleId: uploadOptions.moduleId,
        lessonId: uploadOptions.lessonId,
        sessionId: uploadOptions.sessionId,
      });

      return NextResponse.json({
        success: true,
        data: {
          fileId: dbFileId,
          fileName: fileMetadata.fileName,
          url: fileMetadata.url,
          publicUrl: fileMetadata.publicUrl,
          size: fileMetadata.size,
          mimeType: fileMetadata.mimeType,
          metadata: {
            duration: fileMetadata.duration,
            sampleRate: fileMetadata.sampleRate,
            channels: fileMetadata.channels,
            codec: fileMetadata.codec,
            waveform: fileMetadata.waveform ? 'generated' : 'not_requested',
            peaks: fileMetadata.peaks ? fileMetadata.peaks.length : 0,
            originalName: fileMetadata.originalName,
            uploadedAt: fileMetadata.uploadedAt,
            ...fileMetadata.metadata,
          },
        },
      });
    } catch (dbError) {
      console.error('Database save failed:', dbError);

      // Attempt to clean up uploaded file
      try {
        await storageService.deleteFile(fileMetadata.key);
      } catch (cleanupError) {
        console.error(
          'Failed to cleanup uploaded file after db error:',
          cleanupError
        );
      }

      await logFileAccess('upload', fileMetadata.key, userId, {
        error: 'Database save failed',
        dbError: dbError instanceof Error ? dbError.message : 'Unknown error',
        fileSize: fileMetadata.size,
        processingTime: Date.now() - startTime,
        cleanupAttempted: true,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save file metadata',
          details: 'File uploaded but database save failed',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload endpoint error:', error);

    // Log the error if we have user context
    if (userId) {
      await logFileAccess('upload', 'unknown', userId, {
        error: 'Endpoint error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        clientIp,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storage/upload
 * Get upload configuration and signed URLs for client-side uploads
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const mimeType = searchParams.get('mimeType');

    if (!fileName || !mimeType) {
      return NextResponse.json(
        { error: 'fileName and mimeType parameters required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!VALIDATION_RULES.allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `File type ${mimeType} not allowed` },
        { status: 400 }
      );
    }

    // Generate signed upload URL
    const storageService = getStorageService();
    const fileKey = `users/${authResult.userId}/uploads/${Date.now()}_${fileName}`;
    const signedUrl = await storageService.getSignedUploadUrl(
      fileKey,
      mimeType,
      3600
    );

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: signedUrl,
        fileKey,
        expiresIn: 3600,
        maxFileSize: VALIDATION_RULES.maxFileSize,
        allowedTypes: VALIDATION_RULES.allowedMimeTypes,
      },
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

/**
 * File validation function
 */
function validateFile(file: File): {
  isValid: boolean;
  error?: string;
  details?: string;
} {
  // Check file size
  if (file.size > VALIDATION_RULES.maxFileSize) {
    return {
      isValid: false,
      error: 'File too large',
      details: `Maximum file size is ${formatBytes(VALIDATION_RULES.maxFileSize)}, got ${formatBytes(file.size)}`,
    };
  }

  // Check file name length
  if (file.name.length > VALIDATION_RULES.maxFileNameLength) {
    return {
      isValid: false,
      error: 'File name too long',
      details: `Maximum file name length is ${VALIDATION_RULES.maxFileNameLength} characters`,
    };
  }

  // Check MIME type
  if (!VALIDATION_RULES.allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed',
      details: `Allowed types: ${VALIDATION_RULES.allowedMimeTypes.join(', ')}`,
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (
    !extension ||
    !VALIDATION_RULES.allowedFileExtensions.includes(extension)
  ) {
    return {
      isValid: false,
      error: 'File extension not allowed',
      details: `Allowed extensions: ${VALIDATION_RULES.allowedFileExtensions.join(', ')}`,
    };
  }

  // Check for malicious file names
  if (
    file.name.includes('..') ||
    file.name.includes('/') ||
    file.name.includes('\\')
  ) {
    return {
      isValid: false,
      error: 'Invalid file name',
      details: 'File name contains invalid characters',
    };
  }

  return { isValid: true };
}

/**
 * Parse JSON field with error handling
 */
function parseJsonField(value: string | null): any {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Format bytes for human reading
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
