/**
 * Individual File Management API Endpoints
 *
 * Provides CRUD operations for individual files including
 * get details, update metadata, and delete single files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import {
  getFileFromDatabase,
  deleteFileFromDatabase,
  logFileAccess,
  getDatabaseService,
} from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';

interface FileResponse {
  success: boolean;
  data?: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    sizePretty: string;
    url: string;
    moduleId?: string;
    lessonId?: string;
    duration?: number;
    isProcessed: boolean;
    transcriptionId?: string;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

interface UpdateFileRequest {
  metadata?: Record<string, any>;
  tags?: string[];
  moduleId?: string;
  lessonId?: string;
}

interface RouteParams {
  params: {
    fileId: string;
  };
}

/**
 * GET /api/storage/files/[fileId]
 * Get detailed information about a specific file
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<FileResponse>> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID required' },
        { status: 400 }
      );
    }

    // Get file from database
    const fileRecord = await getFileFromDatabase(fileId);
    if (!fileRecord) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (fileRecord.user_id !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Log file access
    await logFileAccess('access', fileRecord.file_name, authResult.userId, {
      fileId,
      action: 'view_details',
      fileName: fileRecord.file_name,
    });

    // Transform for response
    const transformedFile = {
      id: fileRecord.id,
      fileName: fileRecord.file_name,
      originalName: fileRecord.metadata?.originalName || fileRecord.file_name,
      mimeType: fileRecord.mime_type,
      size: fileRecord.file_size_bytes,
      sizePretty: formatBytes(fileRecord.file_size_bytes),
      url: fileRecord.file_url,
      moduleId: fileRecord.module_id,
      lessonId: fileRecord.lesson_id,
      duration: fileRecord.duration_seconds,
      isProcessed: fileRecord.is_processed,
      transcriptionId: fileRecord.transcription_id,
      metadata: fileRecord.metadata || {},
      createdAt: fileRecord.created_at,
      updatedAt: fileRecord.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: transformedFile,
    });

  } catch (error) {
    console.error('Get file endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve file',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/storage/files/[fileId]
 * Update file metadata and associations
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<FileResponse>> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID required' },
        { status: 400 }
      );
    }

    // Parse request body
    const updateData: UpdateFileRequest = await request.json();

    // Get existing file from database
    const fileRecord = await getFileFromDatabase(fileId);
    if (!fileRecord) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (fileRecord.user_id !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Prepare update object
    const updates: any = {};

    // Update metadata if provided
    if (updateData.metadata) {
      updates.metadata = {
        ...fileRecord.metadata,
        ...updateData.metadata,
        tags: updateData.tags || fileRecord.metadata?.tags || [],
        lastModified: new Date().toISOString(),
      };
    }

    // Update associations if provided
    if (updateData.moduleId !== undefined) {
      // In a full implementation, you'd validate that the module exists and user has access
      updates.metadata = {
        ...updates.metadata || fileRecord.metadata,
        moduleId: updateData.moduleId,
      };
    }

    if (updateData.lessonId !== undefined) {
      updates.metadata = {
        ...updates.metadata || fileRecord.metadata,
        lessonId: updateData.lessonId,
      };
    }

    // Update in database
    const dbService = getDatabaseService();
    const updateSuccess = await dbService.updateAudioRecording(fileId, updates);

    if (!updateSuccess) {
      return NextResponse.json(
        { success: false, error: 'Failed to update file' },
        { status: 500 }
      );
    }

    // Get updated file
    const updatedFile = await getFileFromDatabase(fileId);
    if (!updatedFile) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve updated file' },
        { status: 500 }
      );
    }

    // Log the update
    await logFileAccess('access', fileRecord.file_name, authResult.userId, {
      fileId,
      action: 'update_metadata',
      fileName: fileRecord.file_name,
      updatedFields: Object.keys(updateData),
      metadata: updateData,
    });

    // Transform for response
    const transformedFile = {
      id: updatedFile.id,
      fileName: updatedFile.file_name,
      originalName: updatedFile.metadata?.originalName || updatedFile.file_name,
      mimeType: updatedFile.mime_type,
      size: updatedFile.file_size_bytes,
      sizePretty: formatBytes(updatedFile.file_size_bytes),
      url: updatedFile.file_url,
      moduleId: updatedFile.module_id,
      lessonId: updatedFile.lesson_id,
      duration: updatedFile.duration_seconds,
      isProcessed: updatedFile.is_processed,
      transcriptionId: updatedFile.transcription_id,
      metadata: updatedFile.metadata || {},
      createdAt: updatedFile.created_at,
      updatedAt: updatedFile.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: transformedFile,
    });

  } catch (error) {
    console.error('Update file endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update file',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/files/[fileId]
 * Delete a specific file
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      );
    }

    // Get file from database
    const fileRecord = await getFileFromDatabase(fileId);
    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (fileRecord.user_id !== authResult.userId) {
      await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
        fileId,
        error: 'Access denied',
        attemptedBy: authResult.userId,
        fileOwnerId: fileRecord.user_id,
      });

      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Extract S3 key from URL
    const s3Key = extractS3KeyFromUrl(fileRecord.file_url);
    if (!s3Key) {
      await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
        fileId,
        error: 'Invalid file URL',
        fileUrl: fileRecord.file_url,
      });

      return NextResponse.json(
        { error: 'Invalid file URL' },
        { status: 500 }
      );
    }

    // Delete from S3
    const storageService = getStorageService();
    const s3DeleteSuccess = await storageService.deleteFile(s3Key);

    if (!s3DeleteSuccess) {
      await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
        fileId,
        error: 'S3 deletion failed',
        s3Key,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Failed to delete file from storage',
          details: 'S3 deletion failed'
        },
        { status: 500 }
      );
    }

    // Delete from database
    const dbDeleteSuccess = await deleteFileFromDatabase(fileId, authResult.userId);

    if (!dbDeleteSuccess) {
      await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
        fileId,
        error: 'Database deletion failed',
        s3DeleteSuccess: true,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Failed to delete file record',
          details: 'Database deletion failed - file removed from storage but record remains'
        },
        { status: 500 }
      );
    }

    // Log successful deletion
    await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
      fileId,
      fileName: fileRecord.file_name,
      fileSize: fileRecord.file_size_bytes,
      s3Key,
      deletionSuccess: true,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedFileId: fileId,
        fileName: fileRecord.file_name,
      },
    });

  } catch (error) {
    console.error('Delete file endpoint error:', error);

    // Try to log the error if we have enough context
    if (params.fileId) {
      try {
        const authResult = await verifyToken(request);
        if (authResult.valid && authResult.userId) {
          await logFileAccess('delete', params.fileId, authResult.userId, {
            fileId: params.fileId,
            error: 'Endpoint error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
          });
        }
      } catch (logError) {
        console.warn('Failed to log deletion error:', logError);
      }
    }

    return NextResponse.json(
      {
        error: 'File deletion failed',
        details: process.env.NODE_ENV === 'development' ?
          (error instanceof Error ? error.message : 'Unknown error') :
          'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract S3 key from file URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (error) {
    console.error('Failed to extract S3 key from URL:', url, error);
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