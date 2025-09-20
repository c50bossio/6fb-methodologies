/**
 * Background Job Processing for Audio Transcription
 * Simple in-memory queue system with Redis-like functionality
 * In production, replace with Redis + Bull Queue or similar
 */

import db from './database';
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

// Job status types
export type JobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Job interface
export interface TranscriptionJob {
  id: string;
  transcriptionId: string;
  userId: string;
  priority: number;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  processorId?: string;
  metadata: Record<string, any>;
}

// In-memory job queue (replace with Redis in production)
class TranscriptionJobQueue {
  private jobs = new Map<string, TranscriptionJob>();
  private isProcessing = false;
  private processorId: string;
  private maxConcurrentJobs = 3;
  private currentJobs = 0;

  constructor() {
    this.processorId = `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startJobProcessor();
  }

  // Add job to queue
  async addJob(
    transcriptionId: string,
    userId: string,
    priority: number = 5,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const now = new Date();

    const job: TranscriptionJob = {
      id: jobId,
      transcriptionId,
      userId,
      priority,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: now,
      metadata,
    };

    // Store in memory
    this.jobs.set(jobId, job);

    // Store in database
    try {
      await db.query(
        `
        INSERT INTO transcription_jobs (
          id, transcription_id, user_id, priority, status, attempts,
          max_attempts, scheduled_at, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          jobId,
          transcriptionId,
          userId,
          priority,
          'queued',
          0,
          3,
          now,
          JSON.stringify(metadata),
          now,
          now,
        ]
      );

      console.log(`Transcription job ${jobId} added to queue`);
      return jobId;
    } catch (error) {
      console.error('Failed to add job to database:', error);
      this.jobs.delete(jobId);
      throw error;
    }
  }

  // Get job status
  getJobStatus(jobId: string): TranscriptionJob | null {
    return this.jobs.get(jobId) || null;
  }

  // Cancel job
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'processing') {
      // Cannot cancel processing jobs immediately
      return false;
    }

    job.status = 'cancelled';
    this.jobs.set(jobId, job);

    // Update database
    await db.query(
      'UPDATE transcription_jobs SET status = $1, updated_at = $2 WHERE id = $3',
      ['cancelled', new Date(), jobId]
    );

    return true;
  }

  // Start job processor
  private startJobProcessor() {
    setInterval(async () => {
      if (this.currentJobs >= this.maxConcurrentJobs) {
        return;
      }

      await this.processNextJob();
    }, 5000); // Check every 5 seconds
  }

  // Process next job in queue
  private async processNextJob() {
    if (this.currentJobs >= this.maxConcurrentJobs) {
      return;
    }

    // Get next job (highest priority first, then oldest)
    const queuedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'queued')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower number = higher priority
        }
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });

    if (queuedJobs.length === 0) {
      return;
    }

    const job = queuedJobs[0];
    this.currentJobs++;

    try {
      await this.processJob(job);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
    } finally {
      this.currentJobs--;
    }
  }

  // Process individual job
  private async processJob(job: TranscriptionJob) {
    console.log(`Starting transcription job ${job.id}`);

    // Update job status
    job.status = 'processing';
    job.startedAt = new Date();
    job.processorId = this.processorId;
    job.attempts++;
    this.jobs.set(job.id, job);

    // Update database
    await db.query(
      `UPDATE transcription_jobs
       SET status = $1, started_at = $2, processor_id = $3, attempts = $4, updated_at = $5
       WHERE id = $6`,
      [
        'processing',
        job.startedAt,
        this.processorId,
        job.attempts,
        new Date(),
        job.id,
      ]
    );

    try {
      // Get transcription record
      const transcription = await db.queryOne(
        'SELECT * FROM transcriptions WHERE id = $1',
        [job.transcriptionId]
      );

      if (!transcription) {
        throw new Error('Transcription record not found');
      }

      // Get audio recording
      const audioRecord = await db.queryOne(
        'SELECT * FROM audio_recordings WHERE id = $1',
        [transcription.recording_id]
      );

      if (!audioRecord) {
        throw new Error('Audio recording not found');
      }

      // For this implementation, we'll simulate the transcription process
      // In a real implementation, you would:
      // 1. Retrieve the audio file from storage
      // 2. Call OpenAI Whisper API
      // 3. Process the response

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock transcription result (replace with actual OpenAI call)
      const mockResult = {
        text: `This is a mock transcription for job ${job.id}. In production, this would be the actual transcribed text from OpenAI Whisper.`,
        duration: audioRecord.duration_seconds || 30,
        confidence: 0.95,
      };

      const costCents = Math.round((mockResult.duration / 60) * 0.6); // $0.006 per minute

      // Update transcription with results
      await db.query(
        `
        UPDATE transcriptions
        SET status = $1, text = $2, confidence_score = $3, cost_cents = $4,
            completed_at = $5, updated_at = $6,
            processing_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
        WHERE id = $7
      `,
        [
          'completed',
          mockResult.text,
          mockResult.confidence,
          costCents,
          new Date(),
          new Date(),
          job.transcriptionId,
        ]
      );

      // Update user usage
      const durationMinutes = Math.ceil(mockResult.duration / 60);
      await db.query(
        `
        UPDATE workbook_users
        SET daily_transcription_used_minutes = daily_transcription_used_minutes + $1,
            monthly_transcription_cost_cents = monthly_transcription_cost_cents + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [durationMinutes, costCents, job.userId]
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
          job.userId,
          job.transcriptionId,
          'transcription',
          'openai',
          costCents,
          durationMinutes,
          'minutes',
          60, // 0.6 cents per minute
          new Date().toISOString().split('T')[0],
          new Date(),
          JSON.stringify({
            jobId: job.id,
            processorId: this.processorId,
            duration: mockResult.duration,
          }),
          new Date(),
        ]
      );

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      this.jobs.set(job.id, job);

      await db.query(
        `UPDATE transcription_jobs
         SET status = $1, completed_at = $2, updated_at = $3
         WHERE id = $4`,
        ['completed', job.completedAt, new Date(), job.id]
      );

      console.log(`Transcription job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Transcription job ${job.id} failed:`, error);

      // Update job with error
      job.status = 'failed';
      job.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.jobs.set(job.id, job);

      // Update database
      await db.query(
        `UPDATE transcription_jobs
         SET status = $1, error_message = $2, updated_at = $3
         WHERE id = $4`,
        ['failed', job.errorMessage, new Date(), job.id]
      );

      // Update transcription status
      await db.query(
        `UPDATE transcriptions
         SET status = $1, error_message = $2, updated_at = $3
         WHERE id = $4`,
        ['failed', job.errorMessage, new Date(), job.transcriptionId]
      );

      // Retry if attempts remaining
      if (job.attempts < job.maxAttempts) {
        console.log(
          `Scheduling retry for job ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`
        );

        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, job.attempts) * 30000; // 30s, 60s, 120s
        setTimeout(() => {
          job.status = 'queued';
          job.scheduledAt = new Date();
          this.jobs.set(job.id, job);

          db.query(
            `UPDATE transcription_jobs
             SET status = $1, scheduled_at = $2, updated_at = $3
             WHERE id = $4`,
            ['queued', job.scheduledAt, new Date(), job.id]
          );
        }, retryDelay);
      }
    }
  }

  // Get queue statistics
  getQueueStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      currentJobs: this.currentJobs,
      maxConcurrentJobs: this.maxConcurrentJobs,
      processorId: this.processorId,
    };
  }

  // Clean up old completed jobs
  async cleanupOldJobs(olderThanHours: number = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const jobsToRemove = Array.from(this.jobs.values()).filter(
      job =>
        (job.status === 'completed' ||
          job.status === 'failed' ||
          job.status === 'cancelled') &&
        (job.completedAt || job.scheduledAt) < cutoffTime
    );

    for (const job of jobsToRemove) {
      this.jobs.delete(job.id);
    }

    // Clean up database records
    await db.query(
      `DELETE FROM transcription_jobs
       WHERE status IN ('completed', 'failed', 'cancelled')
       AND updated_at < $1`,
      [cutoffTime]
    );

    console.log(`Cleaned up ${jobsToRemove.length} old transcription jobs`);
    return jobsToRemove.length;
  }
}

// Singleton instance
const transcriptionQueue = new TranscriptionJobQueue();

export default transcriptionQueue;

// Helper functions
export async function addTranscriptionJob(
  transcriptionId: string,
  userId: string,
  priority: number = 5,
  metadata: Record<string, any> = {}
): Promise<string> {
  return transcriptionQueue.addJob(transcriptionId, userId, priority, metadata);
}

export function getJobStatus(jobId: string): TranscriptionJob | null {
  return transcriptionQueue.getJobStatus(jobId);
}

export async function cancelTranscriptionJob(jobId: string): Promise<boolean> {
  return transcriptionQueue.cancelJob(jobId);
}

export function getQueueStatistics() {
  return transcriptionQueue.getQueueStats();
}
