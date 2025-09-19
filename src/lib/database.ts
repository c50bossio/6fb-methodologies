/**
 * Database Connection and Query Utilities
 * Provides connection management and query interfaces for the workbook functionality
 */

import { Pool, PoolConfig, PoolClient } from 'pg'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

class DatabaseConnection {
  private pool: Pool | null = null
  private isConnected = false

  constructor() {
    this.initializePool()
  }

  private initializePool() {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'secure_app_password_change_in_production',
      ssl: process.env.NODE_ENV === 'production' ? true : false,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

    this.pool = new Pool(config)

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err)
      this.isConnected = false
    })

    // Handle new connections
    this.pool.on('connect', () => {
      this.isConnected = true
    })
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized')
    }
    return this.pool.connect()
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(text, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params)
    return results.length > 0 ? results[0] : null
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.isConnected = false
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool?.totalCount || 0,
      idleCount: this.pool?.idleCount || 0,
      waitingCount: this.pool?.waitingCount || 0,
    }
  }
}

// Singleton instance
const db = new DatabaseConnection()

export default db

// Type definitions for workbook entities
export interface WorkbookUser {
  id: string
  customer_id?: string
  email: string
  first_name?: string
  last_name?: string
  subscription_tier: 'basic' | 'premium' | 'enterprise'
  workshop_access_granted: boolean
  workshop_access_expires_at?: Date
  daily_transcription_limit_minutes: number
  daily_transcription_used_minutes: number
  monthly_transcription_cost_cents: number
  monthly_cost_limit_cents: number
  last_reset_date: Date
  preferences: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface WorkbookSession {
  id: string
  user_id: string
  title?: string
  description?: string
  status: 'active' | 'paused' | 'completed' | 'stopped'
  started_at: Date
  ended_at?: Date
  duration_seconds: number
  total_chunks: number
  metadata: Record<string, any>
  tags?: string[]
  is_workshop_related: boolean
  workshop_module?: string
  created_at: Date
  updated_at: Date
}

export interface AudioRecording {
  id: string
  session_id: string
  user_id: string
  chunk_number: number
  file_path?: string
  file_size_bytes?: number
  duration_seconds?: number
  format: string
  sample_rate: number
  channels: number
  quality: string
  upload_status: string
  uploaded_at?: Date
  metadata: Record<string, any>
  created_at: Date
}

export interface Transcription {
  id: string
  recording_id: string
  session_id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  provider: string
  model: string
  language: string
  text?: string
  confidence_score?: number
  processing_duration_seconds?: number
  cost_cents?: number
  cost_per_minute_cents?: number
  error_message?: string
  retry_count: number
  max_retries: number
  started_at?: Date
  completed_at?: Date
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface SessionNote {
  id: string
  user_id: string
  session_id?: string
  transcription_id?: string
  type: 'session-note' | 'manual' | 'transcription-highlight' | 'action-item'
  title?: string
  content: string
  rich_content?: Record<string, any>
  timestamp_in_session?: number
  highlighted_text?: string
  tags?: string[]
  is_action_item: boolean
  action_item_completed: boolean
  action_item_due_date?: Date
  parent_note_id?: string
  importance: number
  is_private: boolean
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface UserProgress {
  id: string
  user_id: string
  module_id: string
  module_name?: string
  progress_percentage: number
  completed: boolean
  completed_at?: Date
  time_spent_seconds: number
  sessions_count: number
  notes_count: number
  last_accessed: Date
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface TranscriptionJob {
  id: string
  transcription_id: string
  user_id: string
  priority: number
  status: string
  attempts: number
  max_attempts: number
  scheduled_at: Date
  started_at?: Date
  completed_at?: Date
  error_message?: string
  processor_id?: string
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface CostTracking {
  id: string
  user_id: string
  transcription_id?: string
  service_type: string
  provider: string
  cost_cents: number
  quantity: number
  unit: string
  rate_cents_per_unit: number
  billing_date: Date
  usage_date: Date
  metadata: Record<string, any>
  created_at: Date
}

export interface RateLimit {
  id: string
  user_id: string
  endpoint: string
  requests_count: number
  window_start: Date
  window_duration_seconds: number
  limit_per_window: number
  blocked_until?: Date
  created_at: Date
  updated_at: Date
}

// Error classes
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}