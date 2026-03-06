/**
 * Mock Database Service for Development
 * Provides database fallback when PostgreSQL is not available
 */

import { randomUUID } from 'crypto';

export interface MockUser {
  id: string;
  email: string;
  name?: string;
  role: 'basic' | 'premium' | 'vip';
  daily_transcription_limit_minutes: number;
  daily_transcription_used_minutes: number;
  monthly_transcription_cost_cents: number;
  monthly_cost_limit_cents: number;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface MockTranscription {
  id: string;
  recording_id?: string;
  session_id?: string;
  user_id: string;
  text: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: string;
  model: string;
  language: string;
  cost_cents: number;
  confidence_score?: number;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  metadata: any;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  processing_duration_seconds?: number;
}

export interface MockAudioRecording {
  id: string;
  session_id?: string;
  user_id: string;
  module_id?: string;
  lesson_id?: string;
  file_size_bytes: number;
  format: string;
  upload_status: string;
  s3_key: string;
  s3_bucket: string;
  title: string;
  description?: string;
  tags: string;
  waveform_data: string;
  peaks_data: string;
  duration_seconds: number;
  is_public: boolean;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export class MockDatabase {
  private users: Map<string, MockUser> = new Map();
  private transcriptions: Map<string, MockTranscription> = new Map();
  private audioRecordings: Map<string, MockAudioRecording> = new Map();

  constructor() {
    this.initializeTestData();
  }

  private initializeTestData() {
    // Create test users
    const testUser: MockUser = {
      id: randomUUID(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'premium',
      daily_transcription_limit_minutes: 120,
      daily_transcription_used_minutes: 0,
      monthly_transcription_cost_cents: 0,
      monthly_cost_limit_cents: 5000, // $50
      permissions: ['view_content', 'record_audio', 'transcribe_audio', 'save_progress', 'export_notes'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.users.set(testUser.id, testUser);
    console.log('🔧 Mock database initialized with test user:', testUser.email);
  }

  // User operations
  async getUserById(id: string): Promise<MockUser | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<MockUser | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: Partial<MockUser>): Promise<MockUser> {
    const user: MockUser = {
      id: randomUUID(),
      email: userData.email || '',
      name: userData.name,
      role: userData.role || 'basic',
      daily_transcription_limit_minutes: userData.daily_transcription_limit_minutes || 60,
      daily_transcription_used_minutes: 0,
      monthly_transcription_cost_cents: 0,
      monthly_cost_limit_cents: userData.monthly_cost_limit_cents || 1000,
      permissions: userData.permissions || ['view_content', 'record_audio'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<MockUser>): Promise<MockUser | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Transcription operations
  async createTranscription(data: Partial<MockTranscription>): Promise<MockTranscription> {
    const transcription: MockTranscription = {
      id: randomUUID(),
      recording_id: data.recording_id,
      session_id: data.session_id,
      user_id: data.user_id || '',
      text: data.text || '',
      status: data.status || 'pending',
      provider: data.provider || 'openai-whisper',
      model: data.model || 'whisper-1',
      language: data.language || 'en',
      cost_cents: data.cost_cents || 0,
      confidence_score: data.confidence_score,
      error_message: data.error_message,
      retry_count: data.retry_count || 0,
      max_retries: data.max_retries || 3,
      metadata: data.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.transcriptions.set(transcription.id, transcription);
    return transcription;
  }

  async updateTranscription(id: string, updates: Partial<MockTranscription>): Promise<MockTranscription | null> {
    const transcription = this.transcriptions.get(id);
    if (!transcription) return null;

    const updatedTranscription = {
      ...transcription,
      ...updates,
      updated_at: new Date(),
    };

    this.transcriptions.set(id, updatedTranscription);
    return updatedTranscription;
  }

  async getTranscriptionById(id: string): Promise<MockTranscription | null> {
    return this.transcriptions.get(id) || null;
  }

  // Audio recording operations
  async createAudioRecording(data: Partial<MockAudioRecording>): Promise<MockAudioRecording> {
    const recording: MockAudioRecording = {
      id: randomUUID(),
      session_id: data.session_id,
      user_id: data.user_id || '',
      module_id: data.module_id,
      lesson_id: data.lesson_id,
      file_size_bytes: data.file_size_bytes || 0,
      format: data.format || 'audio/webm',
      upload_status: data.upload_status || 'uploaded',
      s3_key: data.s3_key || '',
      s3_bucket: data.s3_bucket || 'mock-bucket',
      title: data.title || 'Mock Recording',
      description: data.description,
      tags: data.tags || '[]',
      waveform_data: data.waveform_data || '[]',
      peaks_data: data.peaks_data || '[]',
      duration_seconds: data.duration_seconds || 0,
      is_public: data.is_public || false,
      metadata: data.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.audioRecordings.set(recording.id, recording);
    return recording;
  }

  async getAudioRecordingById(id: string): Promise<MockAudioRecording | null> {
    return this.audioRecordings.get(id) || null;
  }

  // Query method for compatibility
  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    console.log('🔧 Mock database query:', sql.substring(0, 100) + '...');

    // Handle specific query patterns
    if (sql.includes('INSERT INTO transcriptions')) {
      // Mock transcription creation
      const transcription = await this.createTranscription({
        user_id: params[3] || params[2],
        status: 'pending',
        provider: 'openai-whisper',
        model: 'whisper-1',
        language: 'en',
        retry_count: 0,
        max_retries: 3,
      });
      return { rows: [transcription] };
    }

    if (sql.includes('INSERT INTO audio_recordings')) {
      // Mock audio recording creation
      const recording = await this.createAudioRecording({
        user_id: params[2],
        title: params[10] || 'Mock Recording',
        format: params[6] || 'audio/webm',
        file_size_bytes: params[5] || 0,
      });
      return { rows: [recording] };
    }

    if (sql.includes('SELECT * FROM workbook_users')) {
      // Mock user queries
      const users = Array.from(this.users.values());
      return { rows: users };
    }

    // Default empty response
    return { rows: [] };
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  // Statistics
  getStats() {
    return {
      users: this.users.size,
      transcriptions: this.transcriptions.size,
      audioRecordings: this.audioRecordings.size,
    };
  }
}

// Singleton instance
let mockDbInstance: MockDatabase | null = null;

export function getMockDatabase(): MockDatabase {
  if (!mockDbInstance) {
    mockDbInstance = new MockDatabase();
  }
  return mockDbInstance;
}

// Utility function to check if mock database should be used
export function shouldUseMockDatabase(): boolean {
  return process.env.USE_MOCK_DATABASE === 'true' ||
         (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL);
}