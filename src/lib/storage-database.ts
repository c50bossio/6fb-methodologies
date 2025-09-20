/**
 * Database Integration for File Storage System
 *
 * Handles synchronization between S3 file storage and PostgreSQL database
 * Provides CRUD operations, cleanup jobs, and audit trails
 */

import { sql } from '@vercel/postgres';
import { FileMetadata, AudioFileMetadata } from './storage';

// Database types that match the schema
export interface AudioRecordingRecord {
  id: string;
  user_id: string;
  module_id?: string;
  lesson_id?: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number;
  file_size_bytes: number;
  metadata: Record<string, any>;
  transcription_id?: string;
  is_processed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StorageAuditRecord {
  id: string;
  action: 'upload' | 'download' | 'delete' | 'access';
  file_key: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  file_size?: number;
  processing_time?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface CleanupJobRecord {
  id: string;
  job_type: 'orphaned_files' | 'old_files' | 'large_files' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: Record<string, any>;
  files_processed: number;
  files_deleted: number;
  bytes_saved: number;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

// Database service class
export class StorageDatabaseService {
  /**
   * Save audio recording metadata to database
   */
  async saveAudioRecording(metadata: AudioFileMetadata): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO audio_recordings (
          id, user_id, module_id, lesson_id, file_name, file_url,
          mime_type, duration_seconds, file_size_bytes, metadata, is_processed
        ) VALUES (
          ${metadata.id}, ${metadata.userId}, ${metadata.moduleId || null},
          ${metadata.lessonId || null}, ${metadata.fileName}, ${metadata.url},
          ${metadata.mimeType}, ${metadata.duration}, ${metadata.size},
          ${JSON.stringify({
            originalName: metadata.originalName,
            sampleRate: metadata.sampleRate,
            channels: metadata.channels,
            bitRate: metadata.bitRate,
            codec: metadata.codec,
            waveform: metadata.waveform,
            peaks: metadata.peaks,
            thumbnailUrl: metadata.thumbnailUrl,
            tags: metadata.tags,
            ...metadata.metadata
          })}::jsonb, ${false}
        )
        RETURNING id
      `;

      // Log the upload action
      await this.logStorageAction({
        action: 'upload',
        file_key: metadata.key,
        user_id: metadata.userId,
        file_size: metadata.size,
        metadata: {
          mimeType: metadata.mimeType,
          duration: metadata.duration,
          originalName: metadata.originalName,
        },
      });

      return result.rows[0].id;
    } catch (error) {
      console.error('Failed to save audio recording to database:', error);
      throw new Error(`Database save failed: ${error}`);
    }
  }

  /**
   * Get audio recording by ID
   */
  async getAudioRecording(id: string): Promise<AudioRecordingRecord | null> {
    try {
      const result = await sql`
        SELECT * FROM audio_recordings
        WHERE id = ${id}
      `;

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToRecord(result.rows[0]);
    } catch (error) {
      console.error('Failed to get audio recording:', error);
      return null;
    }
  }

  /**
   * Get audio recordings by user
   */
  async getUserAudioRecordings(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AudioRecordingRecord[]> {
    try {
      const result = await sql`
        SELECT * FROM audio_recordings
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return result.rows.map(row => this.mapDatabaseRowToRecord(row));
    } catch (error) {
      console.error('Failed to get user recordings:', error);
      return [];
    }
  }

  /**
   * Update audio recording metadata
   */
  async updateAudioRecording(
    id: string,
    updates: Partial<Pick<AudioRecordingRecord, 'metadata' | 'is_processed' | 'transcription_id'>>
  ): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (updates.is_processed !== undefined) {
        updateFields.push(`is_processed = $${paramIndex}`);
        values.push(updates.is_processed);
        paramIndex++;
      }

      if (updates.transcription_id !== undefined) {
        updateFields.push(`transcription_id = $${paramIndex}`);
        values.push(updates.transcription_id);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return true; // Nothing to update
      }

      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(new Date().toISOString());
      paramIndex++;

      updateFields.push(`id = $${paramIndex}`);
      values.push(id);

      const query = `
        UPDATE audio_recordings
        SET ${updateFields.slice(0, -1).join(', ')}
        WHERE ${updateFields[updateFields.length - 1]}
      `;

      await sql.query(query, values);
      return true;
    } catch (error) {
      console.error('Failed to update audio recording:', error);
      return false;
    }
  }

  /**
   * Delete audio recording from database
   */
  async deleteAudioRecording(id: string, userId: string): Promise<boolean> {
    try {
      // First get the recording to log the deletion
      const recording = await this.getAudioRecording(id);
      if (!recording) {
        return false;
      }

      // Delete the record
      const result = await sql`
        DELETE FROM audio_recordings
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (result.rowCount && result.rowCount > 0) {
        // Log the deletion
        await this.logStorageAction({
          action: 'delete',
          file_key: recording.file_url.split('/').pop() || '',
          user_id: userId,
          file_size: recording.file_size_bytes,
          metadata: {
            originalFileName: recording.file_name,
            deletedAt: new Date().toISOString(),
          },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete audio recording:', error);
      return false;
    }
  }

  /**
   * Find orphaned files (in S3 but not in database)
   */
  async findOrphanedFiles(s3Keys: string[]): Promise<string[]> {
    try {
      if (s3Keys.length === 0) {
        return [];
      }

      // Extract file names from S3 keys
      const fileNames = s3Keys.map(key => key.split('/').pop()).filter(Boolean);

      const result = await sql`
        SELECT file_name FROM audio_recordings
        WHERE file_name = ANY(${fileNames})
      `;

      const dbFileNames = new Set(result.rows.map(row => row.file_name));

      return s3Keys.filter(key => {
        const fileName = key.split('/').pop();
        return fileName && !dbFileNames.has(fileName);
      });
    } catch (error) {
      console.error('Failed to find orphaned files:', error);
      return [];
    }
  }

  /**
   * Find database records without corresponding S3 files
   */
  async findDanglingRecords(s3Keys: string[]): Promise<AudioRecordingRecord[]> {
    try {
      const fileNames = s3Keys.map(key => key.split('/').pop()).filter(Boolean);

      const result = await sql`
        SELECT * FROM audio_recordings
        WHERE file_name != ALL(${fileNames})
      `;

      return result.rows.map(row => this.mapDatabaseRowToRecord(row));
    } catch (error) {
      console.error('Failed to find dangling records:', error);
      return [];
    }
  }

  /**
   * Log storage action for audit trail
   */
  async logStorageAction(action: Omit<StorageAuditRecord, 'id' | 'created_at'>): Promise<void> {
    try {
      await sql`
        INSERT INTO storage_audit_log (
          action, file_key, user_id, ip_address, user_agent,
          file_size, processing_time, error_message, metadata
        ) VALUES (
          ${action.action}, ${action.file_key}, ${action.user_id},
          ${action.ip_address || null}, ${action.user_agent || null},
          ${action.file_size || null}, ${action.processing_time || null},
          ${action.error_message || null}, ${JSON.stringify(action.metadata || {})}::jsonb
        )
      `;
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.warn('Failed to log storage action:', error);
    }
  }

  /**
   * Create cleanup job record
   */
  async createCleanupJob(
    jobType: CleanupJobRecord['job_type'],
    parameters: Record<string, any>
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO storage_cleanup_jobs (
          job_type, status, parameters, files_processed, files_deleted, bytes_saved
        ) VALUES (
          ${jobType}, 'pending', ${JSON.stringify(parameters)}::jsonb, 0, 0, 0
        )
        RETURNING id
      `;

      return result.rows[0].id;
    } catch (error) {
      console.error('Failed to create cleanup job:', error);
      throw new Error(`Failed to create cleanup job: ${error}`);
    }
  }

  /**
   * Update cleanup job progress
   */
  async updateCleanupJob(
    jobId: string,
    updates: Partial<Pick<CleanupJobRecord, 'status' | 'files_processed' | 'files_deleted' | 'bytes_saved' | 'error_message' | 'started_at' | 'completed_at'>>
  ): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.files_processed !== undefined) {
        updateFields.push(`files_processed = $${paramIndex}`);
        values.push(updates.files_processed);
        paramIndex++;
      }

      if (updates.files_deleted !== undefined) {
        updateFields.push(`files_deleted = $${paramIndex}`);
        values.push(updates.files_deleted);
        paramIndex++;
      }

      if (updates.bytes_saved !== undefined) {
        updateFields.push(`bytes_saved = $${paramIndex}`);
        values.push(updates.bytes_saved);
        paramIndex++;
      }

      if (updates.error_message !== undefined) {
        updateFields.push(`error_message = $${paramIndex}`);
        values.push(updates.error_message);
        paramIndex++;
      }

      if (updates.started_at !== undefined) {
        updateFields.push(`started_at = $${paramIndex}`);
        values.push(updates.started_at);
        paramIndex++;
      }

      if (updates.completed_at !== undefined) {
        updateFields.push(`completed_at = $${paramIndex}`);
        values.push(updates.completed_at);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return true;
      }

      updateFields.push(`id = $${paramIndex}`);
      values.push(jobId);

      const query = `
        UPDATE storage_cleanup_jobs
        SET ${updateFields.slice(0, -1).join(', ')}
        WHERE ${updateFields[updateFields.length - 1]}
      `;

      await sql.query(query, values);
      return true;
    } catch (error) {
      console.error('Failed to update cleanup job:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    sizeByType: Record<string, number>;
    uploadsByDay: Array<{ date: string; count: number; size: number }>;
  }> {
    try {
      // Get total counts and sizes
      const totalsResult = await sql`
        SELECT
          COUNT(*) as total_files,
          SUM(file_size_bytes) as total_size
        FROM audio_recordings
      `;

      // Get breakdown by MIME type
      const typeBreakdownResult = await sql`
        SELECT
          mime_type,
          COUNT(*) as file_count,
          SUM(file_size_bytes) as total_size
        FROM audio_recordings
        GROUP BY mime_type
        ORDER BY total_size DESC
      `;

      // Get uploads by day for the last 30 days
      const uploadsResult = await sql`
        SELECT
          DATE(created_at) as upload_date,
          COUNT(*) as upload_count,
          SUM(file_size_bytes) as upload_size
        FROM audio_recordings
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY upload_date DESC
      `;

      const filesByType: Record<string, number> = {};
      const sizeByType: Record<string, number> = {};

      typeBreakdownResult.rows.forEach(row => {
        filesByType[row.mime_type] = parseInt(row.file_count);
        sizeByType[row.mime_type] = parseInt(row.total_size);
      });

      const uploadsByDay = uploadsResult.rows.map(row => ({
        date: row.upload_date,
        count: parseInt(row.upload_count),
        size: parseInt(row.upload_size),
      }));

      return {
        totalFiles: parseInt(totalsResult.rows[0].total_files),
        totalSize: parseInt(totalsResult.rows[0].total_size),
        filesByType,
        sizeByType,
        uploadsByDay,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        sizeByType: {},
        uploadsByDay: [],
      };
    }
  }

  /**
   * Search audio recordings with full-text search
   */
  async searchAudioRecordings(
    query: string,
    userId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<AudioRecordingRecord[]> {
    try {
      const searchQuery = `
        SELECT ar.*, ts_rank(tr.search_vector, plainto_tsquery('english', $1)) as rank
        FROM audio_recordings ar
        LEFT JOIN transcription_records tr ON ar.transcription_id = tr.id
        WHERE (
          ar.file_name ILIKE $2 OR
          (tr.search_vector IS NOT NULL AND tr.search_vector @@ plainto_tsquery('english', $1))
        )
        ${userId ? 'AND ar.user_id = $5' : ''}
        ORDER BY rank DESC NULLS LAST, ar.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const params = [query, `%${query}%`, limit, offset];
      if (userId) {
        params.push(userId);
      }

      const result = await sql.query(searchQuery, params);
      return result.rows.map(row => this.mapDatabaseRowToRecord(row));
    } catch (error) {
      console.error('Failed to search audio recordings:', error);
      return [];
    }
  }

  /**
   * Get files that haven't been accessed recently
   */
  async getStaleFiles(daysOld: number = 90): Promise<AudioRecordingRecord[]> {
    try {
      const result = await sql`
        SELECT ar.* FROM audio_recordings ar
        LEFT JOIN storage_audit_log sal ON ar.file_name = sal.file_key
          AND sal.action = 'download'
          AND sal.created_at > CURRENT_DATE - INTERVAL '${daysOld} days'
        WHERE ar.created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
          AND sal.id IS NULL
        ORDER BY ar.created_at ASC
      `;

      return result.rows.map(row => this.mapDatabaseRowToRecord(row));
    } catch (error) {
      console.error('Failed to get stale files:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private mapDatabaseRowToRecord(row: any): AudioRecordingRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      module_id: row.module_id,
      lesson_id: row.lesson_id,
      file_name: row.file_name,
      file_url: row.file_url,
      mime_type: row.mime_type,
      duration_seconds: row.duration_seconds,
      file_size_bytes: row.file_size_bytes,
      metadata: row.metadata || {},
      transcription_id: row.transcription_id,
      is_processed: row.is_processed,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

// Utility functions for common database operations
export async function saveFileToDatabase(metadata: AudioFileMetadata): Promise<string> {
  const dbService = new StorageDatabaseService();
  return dbService.saveAudioRecording(metadata);
}

export async function getFileFromDatabase(id: string): Promise<AudioRecordingRecord | null> {
  const dbService = new StorageDatabaseService();
  return dbService.getAudioRecording(id);
}

export async function getUserFiles(
  userId: string,
  limit?: number,
  offset?: number
): Promise<AudioRecordingRecord[]> {
  const dbService = new StorageDatabaseService();
  return dbService.getUserAudioRecordings(userId, limit, offset);
}

export async function deleteFileFromDatabase(id: string, userId: string): Promise<boolean> {
  const dbService = new StorageDatabaseService();
  return dbService.deleteAudioRecording(id, userId);
}

export async function searchFiles(
  query: string,
  userId?: string,
  limit?: number,
  offset?: number
): Promise<AudioRecordingRecord[]> {
  const dbService = new StorageDatabaseService();
  return dbService.searchAudioRecordings(query, userId, limit, offset);
}

export async function getStorageStatistics() {
  const dbService = new StorageDatabaseService();
  return dbService.getStorageStats();
}

export async function logFileAccess(
  action: 'upload' | 'download' | 'delete' | 'access',
  fileKey: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const dbService = new StorageDatabaseService();
  return dbService.logStorageAction({
    action,
    file_key: fileKey,
    user_id: userId,
    metadata,
  });
}

// Global database service instance
let globalDatabaseService: StorageDatabaseService | null = null;

export function getDatabaseService(): StorageDatabaseService {
  if (!globalDatabaseService) {
    globalDatabaseService = new StorageDatabaseService();
  }
  return globalDatabaseService;
}

// StorageDatabaseService is already exported above in the class declaration
export type {
  AudioRecordingRecord,
  StorageAuditRecord,
  CleanupJobRecord,
};