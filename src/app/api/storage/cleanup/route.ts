/**
 * Storage Cleanup API Endpoint
 *
 * Manages automated and manual cleanup operations for storage system
 * Handles orphaned files, old files, and maintenance tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import { getDatabaseService, logFileAccess } from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';
import { sql } from '@vercel/postgres';

interface CleanupRequest {
  type: 'orphaned_files' | 'old_files' | 'large_files' | 'manual';
  parameters: {
    olderThanDays?: number;
    minSizeBytes?: number;
    dryRun?: boolean;
    batchSize?: number;
    userIds?: string[];
    fileIds?: string[];
  };
}

interface CleanupResponse {
  success: boolean;
  data?: {
    jobId: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    filesProcessed?: number;
    filesDeleted?: number;
    bytesSaved?: number;
    bytesSavedPretty?: string;
    dryRun?: boolean;
    details?: any;
  };
  error?: string;
}

interface CleanupJobStatus {
  id: string;
  type: string;
  status: string;
  filesProcessed: number;
  filesDeleted: number;
  bytesSaved: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * POST /api/storage/cleanup
 * Start a new cleanup operation
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CleanupResponse>> {
  try {
    // Authentication check
    const authResult = await verifyToken(request);
    if (!authResult.valid || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, only allow admin users to trigger cleanup
    // In a full implementation, you'd check user roles properly
    const isAdmin = true; // Simplified for now
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const cleanupRequest: CleanupRequest = await request.json();

    // Validate request
    if (
      !['orphaned_files', 'old_files', 'large_files', 'manual'].includes(
        cleanupRequest.type
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid cleanup type' },
        { status: 400 }
      );
    }

    // Create cleanup job in database
    const dbService = getDatabaseService();
    const jobId = await dbService.createCleanupJob(
      cleanupRequest.type,
      cleanupRequest.parameters
    );

    // Start the cleanup operation asynchronously
    performCleanup(jobId, cleanupRequest, authResult.userId).catch(error => {
      console.error('Cleanup operation failed:', error);
      // Update job status to failed
      dbService.updateCleanupJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        type: cleanupRequest.type,
        status: 'pending',
        dryRun: cleanupRequest.parameters.dryRun || false,
      },
    });
  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start cleanup operation',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storage/cleanup
 * Get cleanup job status and history
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
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    if (jobId) {
      // Get specific job status
      const result = await sql`
        SELECT * FROM storage_cleanup_jobs
        WHERE id = ${jobId}
      `;

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const job = mapCleanupJobRow(result.rows[0]);
      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          type: job.type,
          status: job.status,
          filesProcessed: job.filesProcessed,
          filesDeleted: job.filesDeleted,
          bytesSaved: job.bytesSaved,
          bytesSavedPretty: formatBytes(job.bytesSaved),
          errorMessage: job.errorMessage,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        },
      });
    } else {
      // Get job history
      const query = `
        SELECT * FROM storage_cleanup_jobs
        ${status ? `WHERE status = $1` : ''}
        ORDER BY created_at DESC
        LIMIT $${status ? '2' : '1'}
      `;

      const params = status ? [status, limit] : [limit];
      const result = await sql.query(query, params);

      const jobs = result.rows.map(row => {
        const job = mapCleanupJobRow(row);
        return {
          jobId: job.id,
          type: job.type,
          status: job.status,
          filesProcessed: job.filesProcessed,
          filesDeleted: job.filesDeleted,
          bytesSaved: job.bytesSaved,
          bytesSavedPretty: formatBytes(job.bytesSaved),
          errorMessage: job.errorMessage,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          jobs,
          total: jobs.length,
        },
      });
    }
  } catch (error) {
    console.error('Get cleanup status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/cleanup
 * Cancel a running cleanup job
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Update job status to cancelled
    const dbService = getDatabaseService();
    const updated = await dbService.updateCleanupJob(jobId, {
      status: 'failed',
      errorMessage: 'Cancelled by user',
      completedAt: new Date(),
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Job not found or already completed' },
        { status: 404 }
      );
    }

    // Log the cancellation
    await logFileAccess('access', `cleanup_job_${jobId}`, authResult.userId, {
      action: 'cancel_cleanup_job',
      jobId,
    });

    return NextResponse.json({
      success: true,
      data: { jobId, status: 'cancelled' },
    });
  } catch (error) {
    console.error('Cancel cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel cleanup job' },
      { status: 500 }
    );
  }
}

/**
 * Perform the actual cleanup operation
 */
async function performCleanup(
  jobId: string,
  request: CleanupRequest,
  userId: string
): Promise<void> {
  const dbService = getDatabaseService();
  const storageService = getStorageService();

  try {
    // Update job status to running
    await dbService.updateCleanupJob(jobId, {
      status: 'running',
      startedAt: new Date(),
    });

    let filesProcessed = 0;
    let filesDeleted = 0;
    let bytesSaved = 0;
    const errors: string[] = [];

    switch (request.type) {
      case 'orphaned_files':
        ({ filesProcessed, filesDeleted, bytesSaved } =
          await cleanupOrphanedFiles(
            storageService,
            dbService,
            request.parameters,
            errors
          ));
        break;

      case 'old_files':
        ({ filesProcessed, filesDeleted, bytesSaved } = await cleanupOldFiles(
          storageService,
          dbService,
          request.parameters,
          errors
        ));
        break;

      case 'large_files':
        ({ filesProcessed, filesDeleted, bytesSaved } = await cleanupLargeFiles(
          storageService,
          dbService,
          request.parameters,
          errors
        ));
        break;

      case 'manual':
        ({ filesProcessed, filesDeleted, bytesSaved } = await manualCleanup(
          storageService,
          dbService,
          request.parameters,
          errors
        ));
        break;
    }

    // Update job with results
    await dbService.updateCleanupJob(jobId, {
      status: errors.length > 0 ? 'failed' : 'completed',
      filesProcessed,
      filesDeleted,
      bytesSaved,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      completedAt: new Date(),
    });

    // Log the cleanup completion
    await logFileAccess('access', `cleanup_job_${jobId}`, userId, {
      action: 'cleanup_completed',
      jobId,
      type: request.type,
      filesProcessed,
      filesDeleted,
      bytesSaved,
      bytesSavedPretty: formatBytes(bytesSaved),
      dryRun: request.parameters.dryRun || false,
      errors: errors.length,
    });
  } catch (error) {
    console.error('Cleanup operation error:', error);
    await dbService.updateCleanupJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });
    throw error;
  }
}

/**
 * Cleanup orphaned files (files in S3 without database records)
 */
async function cleanupOrphanedFiles(
  storageService: any,
  dbService: any,
  parameters: any,
  errors: string[]
): Promise<{
  filesProcessed: number;
  filesDeleted: number;
  bytesSaved: number;
}> {
  // This is a placeholder implementation
  // In production, you would:
  // 1. List all files in S3
  // 2. Check which ones don't have database records
  // 3. Delete the orphaned files

  return { filesProcessed: 0, filesDeleted: 0, bytesSaved: 0 };
}

/**
 * Cleanup old files based on age and access patterns
 */
async function cleanupOldFiles(
  storageService: any,
  dbService: any,
  parameters: any,
  errors: string[]
): Promise<{
  filesProcessed: number;
  filesDeleted: number;
  bytesSaved: number;
}> {
  const olderThanDays = parameters.olderThanDays || 90;
  const dryRun = parameters.dryRun || false;
  const batchSize = parameters.batchSize || 100;

  let filesProcessed = 0;
  let filesDeleted = 0;
  let bytesSaved = 0;

  try {
    // Get stale files
    const staleFiles = await dbService.getStaleFiles(olderThanDays);

    for (const file of staleFiles.slice(0, batchSize)) {
      filesProcessed++;

      try {
        if (!dryRun) {
          // Extract S3 key from URL
          const s3Key = extractS3KeyFromUrl(file.file_url);
          if (s3Key) {
            // Delete from S3
            await storageService.deleteFile(s3Key);

            // Delete from database
            await dbService.deleteAudioRecording(file.id, file.user_id);

            filesDeleted++;
            bytesSaved += file.file_size_bytes;
          }
        } else {
          // Dry run - just count what would be deleted
          filesDeleted++;
          bytesSaved += file.file_size_bytes;
        }
      } catch (error) {
        errors.push(`Failed to delete file ${file.file_name}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to get stale files: ${error}`);
  }

  return { filesProcessed, filesDeleted, bytesSaved };
}

/**
 * Cleanup large files above a certain threshold
 */
async function cleanupLargeFiles(
  storageService: any,
  dbService: any,
  parameters: any,
  errors: string[]
): Promise<{
  filesProcessed: number;
  filesDeleted: number;
  bytesSaved: number;
}> {
  // This would implement logic to identify and clean up very large files
  // that might be taking up excessive storage space

  return { filesProcessed: 0, filesDeleted: 0, bytesSaved: 0 };
}

/**
 * Manual cleanup of specific files
 */
async function manualCleanup(
  storageService: any,
  dbService: any,
  parameters: any,
  errors: string[]
): Promise<{
  filesProcessed: number;
  filesDeleted: number;
  bytesSaved: number;
}> {
  const fileIds = parameters.fileIds || [];
  const dryRun = parameters.dryRun || false;

  let filesProcessed = 0;
  let filesDeleted = 0;
  let bytesSaved = 0;

  for (const fileId of fileIds) {
    filesProcessed++;

    try {
      const file = await dbService.getAudioRecording(fileId);
      if (!file) {
        errors.push(`File ${fileId} not found`);
        continue;
      }

      if (!dryRun) {
        const s3Key = extractS3KeyFromUrl(file.file_url);
        if (s3Key) {
          await storageService.deleteFile(s3Key);
          await dbService.deleteAudioRecording(fileId, file.user_id);
          filesDeleted++;
          bytesSaved += file.file_size_bytes;
        }
      } else {
        filesDeleted++;
        bytesSaved += file.file_size_bytes;
      }
    } catch (error) {
      errors.push(`Failed to delete file ${fileId}: ${error}`);
    }
  }

  return { filesProcessed, filesDeleted, bytesSaved };
}

/**
 * Helper functions
 */
function mapCleanupJobRow(row: any): CleanupJobStatus {
  return {
    id: row.id,
    type: row.job_type,
    status: row.status,
    filesProcessed: row.files_processed,
    filesDeleted: row.files_deleted,
    bytesSaved: row.bytes_saved,
    errorMessage: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
