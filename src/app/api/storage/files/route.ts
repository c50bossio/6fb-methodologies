/**
 * File Management API Endpoints
 *
 * Provides CRUD operations for file management, search, and analytics
 * Supports listing, searching, updating, and deleting files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import {
  getUserFiles,
  searchFiles,
  deleteFileFromDatabase,
  getStorageStatistics,
  logFileAccess,
  getDatabaseService,
} from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';

interface FilesListResponse {
  success: boolean;
  data?: {
    files: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    filters?: {
      moduleId?: string;
      mimeType?: string;
      dateRange?: { start: string; end: string };
    };
  };
  error?: string;
}

interface FileDeleteResponse {
  success: boolean;
  data?: {
    deletedFileId: string;
    fileName: string;
  };
  error?: string;
}

interface StatsResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    totalSize: number;
    totalSizePretty: string;
    filesByType: Record<string, number>;
    sizeByType: Record<string, number>;
    uploadsByDay: Array<{ date: string; count: number; size: number }>;
  };
  error?: string;
}

/**
 * GET /api/storage/files
 * List user files with filtering and pagination
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<FilesListResponse>> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 files per page
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const moduleId = searchParams.get('moduleId') || undefined;
    const lessonId = searchParams.get('lessonId') || undefined;
    const mimeType = searchParams.get('mimeType') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Parse date range
    let dateRange: { start: Date; end: Date } | undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    let files;
    let total = 0;

    if (search) {
      // Use search functionality
      files = await searchFiles(search, authResult.userId, limit, offset);
      total = files.length; // For search, we don't have total count easily available
    } else {
      // Use regular listing
      files = await getUserFiles(authResult.userId, limit, offset);

      // Get total count for pagination (in production, you'd optimize this)
      const allFiles = await getUserFiles(authResult.userId, 1000, 0);
      total = allFiles.length;
    }

    // Filter files based on criteria
    let filteredFiles = files;

    if (moduleId) {
      filteredFiles = filteredFiles.filter(file => file.module_id === moduleId);
    }

    if (lessonId) {
      filteredFiles = filteredFiles.filter(file => file.lesson_id === lessonId);
    }

    if (mimeType) {
      filteredFiles = filteredFiles.filter(file =>
        file.mime_type.includes(mimeType)
      );
    }

    if (dateRange) {
      filteredFiles = filteredFiles.filter(file => {
        const fileDate = new Date(file.created_at);
        return fileDate >= dateRange!.start && fileDate <= dateRange!.end;
      });
    }

    // Sort files
    filteredFiles.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.file_name.toLowerCase();
          bValue = b.file_name.toLowerCase();
          break;
        case 'size':
          aValue = a.file_size_bytes;
          bValue = b.file_size_bytes;
          break;
        case 'type':
          aValue = a.mime_type;
          bValue = b.mime_type;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Transform files for response
    const transformedFiles = filteredFiles.map(file => ({
      id: file.id,
      fileName: file.file_name,
      originalName: file.metadata?.originalName || file.file_name,
      mimeType: file.mime_type,
      size: file.file_size_bytes,
      sizePretty: formatBytes(file.file_size_bytes),
      url: file.file_url,
      moduleId: file.module_id,
      lessonId: file.lesson_id,
      duration: file.duration_seconds,
      isProcessed: file.is_processed,
      transcriptionId: file.transcription_id,
      metadata: file.metadata,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        files: transformedFiles,
        pagination: {
          page,
          limit,
          total: filteredFiles.length,
          hasMore: filteredFiles.length === limit,
        },
        filters: {
          moduleId,
          mimeType,
          dateRange: dateRange
            ? {
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString(),
              }
            : undefined,
        },
      },
    });
  } catch (error) {
    console.error('Files list endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve files',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/files
 * Delete multiple files (bulk delete)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileIds } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'File IDs array required' },
        { status: 400 }
      );
    }

    const results = {
      deleted: [] as string[],
      failed: [] as { fileId: string; error: string }[],
    };

    const storageService = getStorageService();

    // Process each file deletion
    for (const fileId of fileIds) {
      try {
        // Get file info first
        const fileRecord = await getFileFromDatabase(fileId);
        if (!fileRecord) {
          results.failed.push({ fileId, error: 'File not found' });
          continue;
        }

        // Check ownership
        if (fileRecord.user_id !== authResult.userId) {
          results.failed.push({ fileId, error: 'Access denied' });
          continue;
        }

        // Extract S3 key from URL
        const s3Key = extractS3KeyFromUrl(fileRecord.file_url);
        if (!s3Key) {
          results.failed.push({ fileId, error: 'Invalid file URL' });
          continue;
        }

        // Delete from S3
        const s3DeleteSuccess = await storageService.deleteFile(s3Key);
        if (!s3DeleteSuccess) {
          results.failed.push({ fileId, error: 'S3 deletion failed' });
          continue;
        }

        // Delete from database
        const dbDeleteSuccess = await deleteFileFromDatabase(
          fileId,
          authResult.userId
        );
        if (!dbDeleteSuccess) {
          results.failed.push({ fileId, error: 'Database deletion failed' });
          continue;
        }

        results.deleted.push(fileId);

        // Log deletion
        await logFileAccess('delete', fileRecord.file_name, authResult.userId, {
          fileId,
          fileName: fileRecord.file_name,
          fileSize: fileRecord.file_size_bytes,
          bulkDelete: true,
        });
      } catch (error) {
        results.failed.push({
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: results.deleted.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error) {
    console.error('Bulk delete endpoint error:', error);
    return NextResponse.json({ error: 'Bulk delete failed' }, { status: 500 });
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
