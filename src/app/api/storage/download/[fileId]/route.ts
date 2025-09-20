/**
 * File Download API Endpoint
 *
 * Provides secure file downloads with access control, audit logging, and analytics
 * Supports both direct downloads and streaming for large files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import { getFileFromDatabase, logFileAccess } from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';
import { headers } from 'next/headers';

interface DownloadResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
    expiresAt: Date;
  };
  error?: string;
  details?: string;
}

interface RouteParams {
  params: {
    fileId: string;
  };
}

/**
 * GET /api/storage/download/[fileId]
 * Generate signed download URL for a file
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DownloadResponse>> {
  const startTime = Date.now();
  let userId: string | null = null;
  let clientIp: string | null = null;

  try {
    // Get client information for audit logging
    const headersList = headers();
    clientIp =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';

    const userAgent = headersList.get('user-agent') || 'unknown';

    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    userId = authResult.userId;
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID required' },
        { status: 400 }
      );
    }

    // Get file metadata from database
    const fileRecord = await getFileFromDatabase(fileId);
    if (!fileRecord) {
      await logFileAccess('download', fileId, userId, {
        error: 'File not found',
        fileId,
        clientIp,
        userAgent,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (fileRecord.user_id !== userId) {
      // In the future, you might want to check for shared files or admin access
      // For now, users can only download their own files
      await logFileAccess('download', fileRecord.file_name, userId, {
        error: 'Access denied',
        fileId,
        fileOwnerId: fileRecord.user_id,
        attemptedBy: userId,
        clientIp,
        userAgent,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse query parameters for download options
    const { searchParams } = new URL(request.url);
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600'); // 1 hour default
    const inline = searchParams.get('inline') === 'true';
    const download = searchParams.get('download') === 'true';

    // Validate expiration time (max 24 hours)
    const maxExpirationTime = 24 * 60 * 60; // 24 hours
    const actualExpiresIn = Math.min(expiresIn, maxExpirationTime);

    // Generate content disposition
    let contentDisposition: string | undefined;
    if (download) {
      contentDisposition = `attachment; filename="${fileRecord.file_name}"`;
    } else if (inline) {
      contentDisposition = `inline; filename="${fileRecord.file_name}"`;
    }

    // Extract S3 key from file URL
    const s3Key = extractS3KeyFromUrl(fileRecord.file_url);
    if (!s3Key) {
      await logFileAccess('download', fileRecord.file_name, userId, {
        error: 'Invalid file URL',
        fileId,
        fileUrl: fileRecord.file_url,
        clientIp,
        userAgent,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        { success: false, error: 'Invalid file URL' },
        { status: 500 }
      );
    }

    // Generate signed download URL
    const storageService = getStorageService();
    const downloadUrl = await storageService.getSignedDownloadUrl(s3Key, {
      expiresIn: actualExpiresIn,
      responseContentType: fileRecord.mime_type,
      responseContentDisposition: contentDisposition,
    });

    // Log successful download request
    await logFileAccess('download', fileRecord.file_name, userId, {
      fileId,
      fileName: fileRecord.file_name,
      fileSize: fileRecord.file_size_bytes,
      mimeType: fileRecord.mime_type,
      expiresIn: actualExpiresIn,
      inline,
      download,
      clientIp,
      userAgent,
      processingTime: Date.now() - startTime,
    });

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + actualExpiresIn * 1000);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        fileName: fileRecord.file_name,
        mimeType: fileRecord.mime_type,
        size: fileRecord.file_size_bytes,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Download endpoint error:', error);

    // Log the error if we have user context
    if (userId) {
      await logFileAccess('download', params.fileId, userId, {
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
 * POST /api/storage/download/[fileId]
 * Stream file content directly (for large files or when signed URLs aren't suitable)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    userId = authResult.userId;
    const { fileId } = params;

    // Get file metadata from database
    const fileRecord = await getFileFromDatabase(fileId);
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check access permissions
    if (fileRecord.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body for streaming options
    const body = await request.json();
    const { range, quality } = body;

    // Extract S3 key from file URL
    const s3Key = extractS3KeyFromUrl(fileRecord.file_url);
    if (!s3Key) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 500 });
    }

    // For now, redirect to signed URL
    // In production, you might want to implement actual streaming
    const storageService = getStorageService();
    const downloadUrl = await storageService.getSignedDownloadUrl(s3Key, {
      expiresIn: 300, // 5 minutes for streaming
    });

    // Log streaming access
    await logFileAccess('access', fileRecord.file_name, userId, {
      fileId,
      streamingAccess: true,
      range,
      quality,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Streaming endpoint error:', error);

    if (userId) {
      await logFileAccess('access', params.fileId, userId, {
        error: 'Streaming error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });
    }

    return NextResponse.json({ error: 'Streaming failed' }, { status: 500 });
  }
}

/**
 * Extract S3 key from file URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Handle S3 direct URLs
    if (
      urlObj.hostname.includes('.s3.') ||
      urlObj.hostname.includes('s3.amazonaws.com')
    ) {
      return urlObj.pathname.substring(1); // Remove leading slash
    }

    // Handle CloudFront URLs
    if (
      urlObj.hostname.includes('cloudfront.net') ||
      urlObj.hostname.includes('amazonaws.com')
    ) {
      return urlObj.pathname.substring(1); // Remove leading slash
    }

    // Handle custom domain URLs
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (error) {
    console.error('Failed to extract S3 key from URL:', url, error);
    return null;
  }
}
