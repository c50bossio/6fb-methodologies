/**
 * Database Connection and Query Utilities
 * Production-ready database utilities with connection pooling, query builders,
 * performance monitoring, transaction support, and comprehensive error handling
 */

import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Performance monitoring interface
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  rowCount?: number;
}

// Query builder interface
interface QueryBuilder {
  select(columns?: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, value?: any): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  leftJoin(table: string, condition: string): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  groupBy(columns: string[]): QueryBuilder;
  having(condition: string, value?: any): QueryBuilder;
  build(): { text: string; values: any[] };
}

// Migration interface
interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  propagateCreateError?: boolean;
}

interface ConnectionRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

interface BackupConfig {
  enabled: boolean;
  schedule?: string;
  retentionDays: number;
  backupPath: string;
  compression: boolean;
}

class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected = false;
  private queryMetrics: QueryMetrics[] = [];
  private maxMetricsHistory = 1000;
  private retryConfig: ConnectionRetryConfig;
  private backupConfig: BackupConfig;
  private performanceThresholds = {
    slowQueryMs: 1000,
    verySlowQueryMs: 5000,
  };

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 10000,
    };

    this.backupConfig = {
      enabled: process.env.NODE_ENV === 'production',
      retentionDays: 30,
      backupPath: process.env.BACKUP_PATH || './backups',
      compression: true,
    };

    this.initializePool();
  }

  private initializePool() {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'app_user',
      password:
        process.env.DB_PASSWORD || 'secure_app_password_change_in_production',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(
        process.env.DB_CONNECTION_TIMEOUT || '5000'
      ),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(
        process.env.DB_CREATE_RETRY_INTERVAL || '200'
      ),
      propagateCreateError: false,
    };

    this.pool = new Pool(config);

    // Enhanced error handling
    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', {
        error: err.message,
        stack: err.stack,
        client: client ? 'client-specific' : 'pool-wide',
        timestamp: new Date().toISOString(),
      });
      this.isConnected = false;

      // Attempt reconnection after error
      setTimeout(() => this.attemptReconnection(), 5000);
    });

    // Connection lifecycle events
    this.pool.on('connect', client => {
      this.isConnected = true;
      console.log('Database connection established');

      // Set connection-level settings
      client
        .query("SET application_name = '6fb-workbook'")
        .catch(console.error);
      client.query("SET statement_timeout = '30s'").catch(console.error);
      client.query("SET timezone = 'UTC'").catch(console.error);
    });

    this.pool.on('acquire', () => {
      // Connection acquired from pool
    });

    this.pool.on('release', () => {
      // Connection released back to pool
    });

    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }

  private async attemptReconnection(attempt = 1): Promise<void> {
    if (attempt > this.retryConfig.maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.retryConfig.retryDelay *
        Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxRetryDelay
    );

    console.log(
      `Attempting database reconnection (attempt ${attempt}/${this.retryConfig.maxRetries}) in ${delay}ms`
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.healthCheck();
      console.log('Database reconnection successful');
      this.isConnected = true;
    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error);
      await this.attemptReconnection(attempt + 1);
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new ConnectionError('Database pool not initialized');
    }
    return this.pool.connect();
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    const client = await this.getClient();

    try {
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;

      // Record performance metrics
      this.recordQueryMetrics({
        query: this.sanitizeQuery(text),
        duration,
        timestamp: new Date(),
        success: true,
        rowCount: result.rowCount,
      });

      // Log slow queries
      if (duration > this.performanceThresholds.slowQueryMs) {
        console.warn('Slow query detected:', {
          query: this.sanitizeQuery(text),
          duration: `${duration}ms`,
          rowCount: result.rowCount,
        });
      }

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record error metrics
      this.recordQueryMetrics({
        query: this.sanitizeQuery(text),
        duration,
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('Database query error:', {
        query: this.sanitizeQuery(text),
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      });

      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    } finally {
      client.release();
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query for logging
    return (
      query
        .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
        .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
        .substring(0, 200) + (query.length > 200 ? '...' : '')
    );
  }

  private recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0] : null;
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }

  getStatus() {
    const recentMetrics = this.queryMetrics.slice(-100);
    const avgDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length
        : 0;
    const errorRate =
      recentMetrics.length > 0
        ? recentMetrics.filter(m => !m.success).length / recentMetrics.length
        : 0;

    return {
      isConnected: this.isConnected,
      poolStatus: {
        totalCount: this.pool?.totalCount || 0,
        idleCount: this.pool?.idleCount || 0,
        waitingCount: this.pool?.waitingCount || 0,
      },
      performance: {
        avgQueryDuration: Math.round(avgDuration),
        errorRate: Math.round(errorRate * 100),
        totalQueries: this.queryMetrics.length,
        slowQueries: recentMetrics.filter(
          m => m.duration > this.performanceThresholds.slowQueryMs
        ).length,
        verySlowQueries: recentMetrics.filter(
          m => m.duration > this.performanceThresholds.verySlowQueryMs
        ).length,
      },
    };
  }

  // Query Builder Implementation
  queryBuilder(): QueryBuilder {
    return new SQLQueryBuilder();
  }

  // Migration Management
  async runMigrations(migrationsPath?: string): Promise<void> {
    const migrationDir =
      migrationsPath || path.join(process.cwd(), 'database', 'migrations');

    try {
      // Ensure migrations table exists
      await this.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get applied migrations
      const appliedMigrations = await this.query<{ version: string }>(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));

      // Read migration files
      const files = await fs.readdir(migrationDir);
      const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();

      for (const file of migrationFiles) {
        const version = file.replace('.sql', '');

        if (!appliedVersions.has(version)) {
          console.log(`Applying migration: ${file}`);

          const migrationContent = await fs.readFile(
            path.join(migrationDir, file),
            'utf-8'
          );

          await this.transaction(async client => {
            await client.query(migrationContent);
            await client.query(
              'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
              [version, file]
            );
          });

          console.log(`Migration applied: ${file}`);
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw new MigrationError(
        'Migration execution failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Backup and Restore
  async createBackup(backupName?: string): Promise<string> {
    if (!this.backupConfig.enabled) {
      throw new DatabaseError('Backups are disabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupConfig.backupPath, filename);

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupConfig.backupPath, { recursive: true });

      // Create backup using pg_dump
      const { spawn } = await import('child_process');

      return new Promise((resolve, reject) => {
        const pgDump = spawn(
          'pg_dump',
          [
            `--host=${process.env.DB_HOST || 'localhost'}`,
            `--port=${process.env.DB_PORT || '5432'}`,
            `--username=${process.env.DB_USER || 'app_user'}`,
            `--dbname=${process.env.DB_NAME || 'postgres'}`,
            '--no-password',
            '--clean',
            '--create',
          ],
          {
            env: {
              ...process.env,
              PGPASSWORD: process.env.DB_PASSWORD,
            },
          }
        );

        const writeStream = require('fs').createWriteStream(backupPath);
        pgDump.stdout.pipe(writeStream);

        pgDump.on('close', code => {
          if (code === 0) {
            console.log(`Backup created: ${backupPath}`);
            resolve(backupPath);
          } else {
            reject(new DatabaseError(`Backup failed with code ${code}`));
          }
        });

        pgDump.on('error', error => {
          reject(new DatabaseError('Backup process failed', error));
        });
      });
    } catch (error) {
      throw new DatabaseError(
        'Backup creation failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Performance Analysis
  getPerformanceReport(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp >= last24h);

    if (recentMetrics.length === 0) {
      return { message: 'No recent query data available' };
    }

    const successful = recentMetrics.filter(m => m.success);
    const failed = recentMetrics.filter(m => !m.success);
    const durations = successful.map(m => m.duration).sort((a, b) => a - b);

    return {
      timeRange: '24 hours',
      totalQueries: recentMetrics.length,
      successRate: Math.round((successful.length / recentMetrics.length) * 100),
      performance: {
        avgDuration: Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        ),
        medianDuration: durations[Math.floor(durations.length / 2)],
        p95Duration: durations[Math.floor(durations.length * 0.95)],
        p99Duration: durations[Math.floor(durations.length * 0.99)],
        slowQueries: successful.filter(
          m => m.duration > this.performanceThresholds.slowQueryMs
        ).length,
      },
      errors: {
        count: failed.length,
        uniqueErrors: [...new Set(failed.map(m => m.errorMessage))].length,
        mostCommon: this.getMostCommonErrors(failed),
      },
    };
  }

  private getMostCommonErrors(
    failedMetrics: QueryMetrics[]
  ): Array<{ error: string; count: number }> {
    const errorCounts = failedMetrics.reduce(
      (acc, m) => {
        const error = m.errorMessage || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

// Type definitions for workbook entities
export interface WorkbookUser {
  id: string;
  customer_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_tier: 'basic' | 'premium' | 'vip' | 'enterprise';
  workshop_access_granted: boolean;
  workshop_access_expires_at?: Date;
  daily_transcription_limit_minutes: number;
  daily_transcription_used_minutes: number;
  monthly_transcription_cost_cents: number;
  monthly_cost_limit_cents: number;
  last_reset_date: Date;
  preferences: Record<string, any>;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  phone?: string;
  timezone?: string;
  language: string;
  notification_preferences: Record<string, any>;
  onboarding_completed: boolean;
  last_login_at?: Date;
  login_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkbookSession {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  started_at: Date;
  ended_at?: Date;
  duration_seconds: number;
  total_chunks: number;
  metadata: Record<string, any>;
  tags?: string[];
  is_workshop_related: boolean;
  workshop_module?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkshopModule {
  id: string;
  title: string;
  description: string;
  module_order: number;
  duration_minutes: number;
  content: Record<string, any>;
  prerequisites?: string[];
  is_published: boolean;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface WorkshopLesson {
  id: string;
  module_id: string;
  title: string;
  type: 'video' | 'audio' | 'text' | 'interactive' | 'exercise';
  content: Record<string, any>;
  estimated_minutes: number;
  sort_order: number;
  is_published: boolean;
  prerequisites?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface LiveSession {
  id: string;
  title: string;
  description?: string;
  scheduled_at: Date;
  duration_minutes: number;
  max_participants?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  meeting_url?: string;
  recording_url?: string;
  instructor_id: string;
  module_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface LiveSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at?: Date;
  left_at?: Date;
  attendance_status: 'registered' | 'attended' | 'no_show';
  feedback_rating?: number;
  feedback_text?: string;
  created_at: Date;
}

export interface AudioRecording {
  id: string;
  session_id: string;
  user_id: string;
  lesson_id?: string;
  chunk_number: number;
  file_path?: string;
  file_url?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  format: string;
  sample_rate: number;
  channels: number;
  quality: string;
  upload_status: string;
  uploaded_at?: Date;
  processed_at?: Date;
  storage_provider: string;
  encryption_key_id?: string;
  checksum?: string;
  is_backup: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Transcription {
  id: string;
  recording_id: string;
  session_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  model: string;
  language: string;
  text?: string;
  formatted_text?: string;
  confidence_score?: number;
  processing_duration_seconds?: number;
  cost_cents?: number;
  cost_per_minute_cents?: number;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  started_at?: Date;
  completed_at?: Date;
  word_count?: number;
  character_count?: number;
  summary?: string;
  key_topics?: string[];
  action_items?: string[];
  sentiment_score?: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SessionNote {
  id: string;
  user_id: string;
  session_id?: string;
  transcription_id?: string;
  lesson_id?: string;
  module_id?: string;
  type:
    | 'session-note'
    | 'manual'
    | 'transcription-highlight'
    | 'action-item'
    | 'lesson-note'
    | 'reflection';
  title?: string;
  content: string;
  rich_content?: Record<string, any>;
  timestamp_in_session?: number;
  highlighted_text?: string;
  tags?: string[];
  is_action_item: boolean;
  action_item_completed: boolean;
  action_item_due_date?: Date;
  parent_note_id?: string;
  importance: number;
  is_private: boolean;
  is_public: boolean;
  likes_count: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  module_name?: string;
  progress_percentage: number;
  completed: boolean;
  completed_at?: Date;
  time_spent_seconds: number;
  sessions_count: number;
  notes_count: number;
  last_accessed: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  module_id: string;
  progress_percentage: number;
  completed: boolean;
  completed_at?: Date;
  time_spent_seconds: number;
  last_position?: number;
  notes_count: number;
  quiz_score?: number;
  attempts_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: 'module_completed' | 'streak' | 'milestone' | 'certificate';
  achievement_id: string;
  title: string;
  description: string;
  earned_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface TranscriptionJob {
  id: string;
  transcription_id: string;
  user_id: string;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  processor_id?: string;
  estimated_cost_cents?: number;
  actual_cost_cents?: number;
  queue_position?: number;
  processing_node?: string;
  timeout_seconds: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CostTracking {
  id: string;
  user_id: string;
  session_id?: string;
  transcription_id?: string;
  recording_id?: string;
  service_type: string;
  provider: string;
  cost_cents: number;
  quantity: number;
  unit: string;
  rate_cents_per_unit: number;
  billing_date: Date;
  usage_date: Date;
  tier_discount_applied: boolean;
  discount_percentage?: number;
  invoice_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface RateLimit {
  id: string;
  user_id: string;
  endpoint: string;
  requests_count: number;
  window_start: Date;
  window_duration_seconds: number;
  limit_per_window: number;
  blocked_until?: Date;
  tier_multiplier: number;
  burst_allowed: boolean;
  burst_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface SystemMetrics {
  id: string;
  metric_type:
    | 'query_performance'
    | 'user_activity'
    | 'cost_tracking'
    | 'error_rate';
  metric_name: string;
  value: number;
  unit: string;
  tags: Record<string, any>;
  recorded_at: Date;
  aggregation_period: string;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

// Error classes
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'ConnectionError';
  }
}

export class QueryTimeoutError extends DatabaseError {
  constructor(query: string, timeout: number) {
    super(`Query timed out after ${timeout}ms: ${query.substring(0, 100)}...`);
    this.name = 'QueryTimeoutError';
  }
}

export class MigrationError extends DatabaseError {
  constructor(version: string, originalError?: Error) {
    super(`Migration ${version} failed`, originalError);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// SQL Query Builder Implementation
class SQLQueryBuilder implements QueryBuilder {
  private selectClause: string[] = [];
  private fromClause = '';
  private whereConditions: Array<{ condition: string; value?: any }> = [];
  private joinClauses: string[] = [];
  private orderByClause: string[] = [];
  private limitClause?: number;
  private offsetClause?: number;
  private groupByClause: string[] = [];
  private havingConditions: Array<{ condition: string; value?: any }> = [];
  private parameterIndex = 1;
  private parameters: any[] = [];

  select(columns?: string[]): QueryBuilder {
    this.selectClause = columns || ['*'];
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromClause = table;
    return this;
  }

  where(condition: string, value?: any): QueryBuilder {
    if (value !== undefined) {
      const paramPlaceholder = `$${this.parameterIndex++}`;
      this.whereConditions.push({
        condition: condition.replace('?', paramPlaceholder),
        value,
      });
      this.parameters.push(value);
    } else {
      this.whereConditions.push({ condition });
    }
    return this;
  }

  join(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`INNER JOIN ${table} ON ${condition}`);
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause.push(`${column} ${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = count;
    return this;
  }

  groupBy(columns: string[]): QueryBuilder {
    this.groupByClause = columns;
    return this;
  }

  having(condition: string, value?: any): QueryBuilder {
    if (value !== undefined) {
      const paramPlaceholder = `$${this.parameterIndex++}`;
      this.havingConditions.push({
        condition: condition.replace('?', paramPlaceholder),
        value,
      });
      this.parameters.push(value);
    } else {
      this.havingConditions.push({ condition });
    }
    return this;
  }

  build(): { text: string; values: any[] } {
    if (!this.fromClause) {
      throw new ValidationError('FROM clause is required');
    }

    let query = `SELECT ${this.selectClause.join(', ')} FROM ${this.fromClause}`;

    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions
        .map(w => w.condition)
        .join(' AND ');
      query += ` WHERE ${conditions}`;
    }

    if (this.groupByClause.length > 0) {
      query += ` GROUP BY ${this.groupByClause.join(', ')}`;
    }

    if (this.havingConditions.length > 0) {
      const conditions = this.havingConditions
        .map(h => h.condition)
        .join(' AND ');
      query += ` HAVING ${conditions}`;
    }

    if (this.orderByClause.length > 0) {
      query += ` ORDER BY ${this.orderByClause.join(', ')}`;
    }

    if (this.limitClause !== undefined) {
      query += ` LIMIT ${this.limitClause}`;
    }

    if (this.offsetClause !== undefined) {
      query += ` OFFSET ${this.offsetClause}`;
    }

    return {
      text: query,
      values: this.parameters,
    };
  }
}

// Additional utility functions for common database operations
export const dbUtils = {
  // Pagination helper
  paginate: (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    return { limit, offset };
  },

  // Search helper for full-text search
  buildSearchQuery: (searchTerm: string, columns: string[]) => {
    const searchVector = columns
      .map(col => `coalesce(${col}, '')`)
      .join(" || ' ' || ");
    return {
      condition: `(${searchVector}) ILIKE ?`,
      value: `%${searchTerm}%`,
    };
  },

  // Date range helper
  dateRange: (startDate: Date, endDate: Date) => {
    return {
      condition: 'created_at BETWEEN ? AND ?',
      values: [startDate, endDate],
    };
  },

  // Batch insert helper
  buildBatchInsert: (table: string, records: Record<string, any>[]) => {
    if (records.length === 0) {
      throw new ValidationError('No records provided for batch insert');
    }

    const columns = Object.keys(records[0]);
    const placeholders = records
      .map(
        (_, recordIndex) =>
          `(${columns.map((_, colIndex) => `$${recordIndex * columns.length + colIndex + 1}`).join(', ')})`
      )
      .join(', ');

    const values = records.flatMap(record => columns.map(col => record[col]));

    return {
      text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
      values,
    };
  },
};

// Singleton instance
const db = new DatabaseConnection();

export default db;

// Export query builder for direct use
export { SQLQueryBuilder as QueryBuilder };

// Export utility functions
// dbUtils is already exported above as const

// Health check endpoint data
export const getHealthCheckData = async () => {
  const status = db.getStatus();
  const isHealthy = await db.healthCheck();

  return {
    healthy: isHealthy,
    database: {
      connected: status.isConnected,
      pool: status.poolStatus,
      performance: status.performance,
    },
    timestamp: new Date().toISOString(),
  };
};

// Performance monitoring endpoint data
export const getPerformanceData = () => {
  return db.getPerformanceReport();
};
