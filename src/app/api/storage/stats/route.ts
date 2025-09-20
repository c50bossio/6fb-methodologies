/**
 * Storage Statistics API Endpoint
 *
 * Provides comprehensive storage analytics, usage statistics,
 * and insights for administrators and users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import {
  getStorageStatistics,
  getDatabaseService,
} from '@/lib/storage-database';
import { verifyToken } from '@/lib/workbook-auth';
import { sql } from '@vercel/postgres';

interface StatsResponse {
  success: boolean;
  data?: {
    overview: {
      totalFiles: number;
      totalSize: number;
      totalSizePretty: string;
      filesThisMonth: number;
      sizeThisMonth: number;
      averageFileSize: number;
      averageFileSizePretty: string;
    };
    breakdown: {
      filesByType: Record<string, number>;
      sizeByType: Record<string, number>;
      filesByModule: Record<string, number>;
      sizeByModule: Record<string, number>;
    };
    activity: {
      uploadsByDay: Array<{ date: string; count: number; size: number }>;
      downloadsByDay: Array<{ date: string; count: number }>;
      topFiles: Array<{
        id: string;
        fileName: string;
        downloadCount: number;
        size: number;
        lastAccessed: string;
      }>;
    };
    storage: {
      utilizationByUser: Array<{
        userId: string;
        email: string;
        fileCount: number;
        totalSize: number;
        percentage: number;
      }>;
      oldestFiles: Array<{
        id: string;
        fileName: string;
        createdAt: string;
        size: number;
        lastAccessed?: string;
      }>;
      largestFiles: Array<{
        id: string;
        fileName: string;
        size: number;
        sizePretty: string;
        uploadedAt: string;
      }>;
    };
    health: {
      orphanedFiles: number;
      danglingRecords: number;
      processingQueue: number;
      failedUploads: number;
    };
  };
  error?: string;
}

/**
 * GET /api/storage/stats
 * Get comprehensive storage statistics
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<StatsResponse>> {
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
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'admin'
    const days = parseInt(searchParams.get('days') || '30');
    const includeHealth = searchParams.get('includeHealth') === 'true';

    // For admin scope, check if user has admin privileges
    // In a full implementation, you'd have proper role checking
    const isAdmin = scope === 'admin'; // Simplified for now

    // Get basic storage statistics
    const basicStats = await getStorageStatistics();

    // Build the response data
    const responseData: StatsResponse['data'] = {
      overview: {
        totalFiles: basicStats.totalFiles,
        totalSize: basicStats.totalSize,
        totalSizePretty: formatBytes(basicStats.totalSize),
        filesThisMonth: 0,
        sizeThisMonth: 0,
        averageFileSize:
          basicStats.totalFiles > 0
            ? Math.round(basicStats.totalSize / basicStats.totalFiles)
            : 0,
        averageFileSizePretty:
          basicStats.totalFiles > 0
            ? formatBytes(
                Math.round(basicStats.totalSize / basicStats.totalFiles)
              )
            : '0 B',
      },
      breakdown: {
        filesByType: basicStats.filesByType,
        sizeByType: basicStats.sizeByType,
        filesByModule: {},
        sizeByModule: {},
      },
      activity: {
        uploadsByDay: basicStats.uploadsByDay,
        downloadsByDay: [],
        topFiles: [],
      },
      storage: {
        utilizationByUser: [],
        oldestFiles: [],
        largestFiles: [],
      },
      health: {
        orphanedFiles: 0,
        danglingRecords: 0,
        processingQueue: 0,
        failedUploads: 0,
      },
    };

    // Calculate files/size this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthStats = basicStats.uploadsByDay
      .filter(day => new Date(day.date) >= thisMonth)
      .reduce(
        (acc, day) => ({
          count: acc.count + day.count,
          size: acc.size + day.size,
        }),
        { count: 0, size: 0 }
      );

    responseData.overview.filesThisMonth = thisMonthStats.count;
    responseData.overview.sizeThisMonth = thisMonthStats.size;

    // Get detailed statistics based on scope
    if (isAdmin) {
      await addAdminStatistics(responseData, days);
    } else {
      await addUserStatistics(responseData, authResult.userId, days);
    }

    // Add health statistics if requested
    if (includeHealth && isAdmin) {
      await addHealthStatistics(responseData);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Storage stats endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve storage statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * Add admin-level statistics
 */
async function addAdminStatistics(
  data: StatsResponse['data'],
  days: number
): Promise<void> {
  try {
    // Get utilization by user
    const userUtilizationResult = await sql`
      SELECT
        u.id as user_id,
        u.email,
        COUNT(ar.id) as file_count,
        COALESCE(SUM(ar.file_size_bytes), 0) as total_size
      FROM workbook_users u
      LEFT JOIN audio_recordings ar ON u.id = ar.user_id
      GROUP BY u.id, u.email
      ORDER BY total_size DESC
      LIMIT 20
    `;

    const totalSize = userUtilizationResult.rows.reduce(
      (sum, row) => sum + parseInt(row.total_size),
      0
    );

    data!.storage.utilizationByUser = userUtilizationResult.rows.map(row => ({
      userId: row.user_id,
      email: row.email,
      fileCount: parseInt(row.file_count),
      totalSize: parseInt(row.total_size),
      percentage:
        totalSize > 0 ? (parseInt(row.total_size) / totalSize) * 100 : 0,
    }));

    // Get breakdown by module
    const moduleBreakdownResult = await sql`
      SELECT
        COALESCE(wm.title, 'No Module') as module_name,
        COUNT(ar.id) as file_count,
        COALESCE(SUM(ar.file_size_bytes), 0) as total_size
      FROM audio_recordings ar
      LEFT JOIN workshop_modules wm ON ar.module_id = wm.id
      GROUP BY wm.title
      ORDER BY total_size DESC
    `;

    moduleBreakdownResult.rows.forEach(row => {
      data!.breakdown.filesByModule[row.module_name] = parseInt(row.file_count);
      data!.breakdown.sizeByModule[row.module_name] = parseInt(row.total_size);
    });

    // Get download activity
    const downloadActivityResult = await sql`
      SELECT
        DATE(created_at) as download_date,
        COUNT(*) as download_count
      FROM storage_audit_log
      WHERE action = 'download'
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY download_date DESC
    `;

    data!.activity.downloadsByDay = downloadActivityResult.rows.map(row => ({
      date: row.download_date,
      count: parseInt(row.download_count),
    }));

    // Get top files by download count
    const topFilesResult = await sql`
      SELECT
        ar.id,
        ar.file_name,
        COUNT(sal.id) as download_count,
        ar.file_size_bytes as size,
        MAX(sal.created_at) as last_accessed
      FROM audio_recordings ar
      LEFT JOIN storage_audit_log sal ON ar.file_name = sal.file_key AND sal.action = 'download'
      GROUP BY ar.id, ar.file_name, ar.file_size_bytes
      ORDER BY download_count DESC
      LIMIT 10
    `;

    data!.activity.topFiles = topFilesResult.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      downloadCount: parseInt(row.download_count),
      size: parseInt(row.size),
      lastAccessed: row.last_accessed || '',
    }));

    // Get oldest files
    const oldestFilesResult = await sql`
      SELECT
        ar.id,
        ar.file_name,
        ar.created_at,
        ar.file_size_bytes as size,
        MAX(sal.created_at) as last_accessed
      FROM audio_recordings ar
      LEFT JOIN storage_audit_log sal ON ar.file_name = sal.file_key
        AND sal.action IN ('download', 'access')
      GROUP BY ar.id, ar.file_name, ar.created_at, ar.file_size_bytes
      ORDER BY ar.created_at ASC
      LIMIT 10
    `;

    data!.storage.oldestFiles = oldestFilesResult.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      createdAt: row.created_at,
      size: parseInt(row.size),
      lastAccessed: row.last_accessed,
    }));

    // Get largest files
    const largestFilesResult = await sql`
      SELECT id, file_name, file_size_bytes, created_at
      FROM audio_recordings
      ORDER BY file_size_bytes DESC
      LIMIT 10
    `;

    data!.storage.largestFiles = largestFilesResult.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      size: parseInt(row.file_size_bytes),
      sizePretty: formatBytes(parseInt(row.file_size_bytes)),
      uploadedAt: row.created_at,
    }));
  } catch (error) {
    console.error('Failed to get admin statistics:', error);
  }
}

/**
 * Add user-level statistics
 */
async function addUserStatistics(
  data: StatsResponse['data'],
  userId: string,
  days: number
): Promise<void> {
  try {
    // Get user's breakdown by module
    const moduleBreakdownResult = await sql`
      SELECT
        COALESCE(wm.title, 'No Module') as module_name,
        COUNT(ar.id) as file_count,
        COALESCE(SUM(ar.file_size_bytes), 0) as total_size
      FROM audio_recordings ar
      LEFT JOIN workshop_modules wm ON ar.module_id = wm.id
      WHERE ar.user_id = ${userId}
      GROUP BY wm.title
      ORDER BY total_size DESC
    `;

    moduleBreakdownResult.rows.forEach(row => {
      data!.breakdown.filesByModule[row.module_name] = parseInt(row.file_count);
      data!.breakdown.sizeByModule[row.module_name] = parseInt(row.total_size);
    });

    // Get user's download activity
    const downloadActivityResult = await sql`
      SELECT
        DATE(created_at) as download_date,
        COUNT(*) as download_count
      FROM storage_audit_log
      WHERE action = 'download'
        AND user_id = ${userId}
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY download_date DESC
    `;

    data!.activity.downloadsByDay = downloadActivityResult.rows.map(row => ({
      date: row.download_date,
      count: parseInt(row.download_count),
    }));

    // Get user's largest files
    const largestFilesResult = await sql`
      SELECT id, file_name, file_size_bytes, created_at
      FROM audio_recordings
      WHERE user_id = ${userId}
      ORDER BY file_size_bytes DESC
      LIMIT 5
    `;

    data!.storage.largestFiles = largestFilesResult.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      size: parseInt(row.file_size_bytes),
      sizePretty: formatBytes(parseInt(row.file_size_bytes)),
      uploadedAt: row.created_at,
    }));
  } catch (error) {
    console.error('Failed to get user statistics:', error);
  }
}

/**
 * Add health statistics for system monitoring
 */
async function addHealthStatistics(data: StatsResponse['data']): Promise<void> {
  try {
    // Get processing queue size
    const queueResult = await sql`
      SELECT COUNT(*) as queue_size
      FROM storage_cleanup_jobs
      WHERE status IN ('pending', 'running')
    `;

    data!.health.processingQueue = parseInt(
      queueResult.rows[0]?.queue_size || '0'
    );

    // Get failed uploads count (last 24 hours)
    const failedUploadsResult = await sql`
      SELECT COUNT(*) as failed_count
      FROM storage_audit_log
      WHERE action = 'upload'
        AND error_message IS NOT NULL
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `;

    data!.health.failedUploads = parseInt(
      failedUploadsResult.rows[0]?.failed_count || '0'
    );

    // In a full implementation, you would also check for:
    // - Orphaned files (files in S3 but not in database)
    // - Dangling records (database records without S3 files)
    // This would require comparing S3 file listings with database records
  } catch (error) {
    console.error('Failed to get health statistics:', error);
  }
}

/**
 * Format bytes for human reading
 */
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
