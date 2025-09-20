/**
 * Contract Test Setup
 *
 * This file provides common setup and utilities for API contract testing.
 * All contract tests should use this setup to ensure consistency.
 */

import request from 'supertest';
import { NextApiRequest, NextApiResponse } from 'next';

// Mock authentication tokens for testing
export const MOCK_AUTH_TOKEN = 'Bearer mock-jwt-token-for-testing';
export const INVALID_AUTH_TOKEN = 'Bearer invalid-token';

// Mock user IDs
export const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
export const MOCK_MODULE_ID = '550e8400-e29b-41d4-a716-446655440001';
export const MOCK_LESSON_ID = 'lesson-1';
export const MOCK_RECORDING_ID = '550e8400-e29b-41d4-a716-446655440002';
export const MOCK_NOTE_ID = '550e8400-e29b-41d4-a716-446655440003';
export const MOCK_SESSION_ID = '550e8400-e29b-41d4-a716-446655440004';

// Common validation helpers
export class ContractValidator {
  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate ISO 8601 date-time format
   */
  static isValidDateTime(dateTime: string): boolean {
    const date = new Date(dateTime);
    return !isNaN(date.getTime()) && dateTime === date.toISOString();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that object has required properties
   */
  static hasRequiredProperties(obj: any, requiredProps: string[]): boolean {
    return requiredProps.every(prop => prop in obj && obj[prop] !== undefined);
  }

  /**
   * Validate array of objects
   */
  static isValidArray(arr: any, validator?: (item: any) => boolean): boolean {
    if (!Array.isArray(arr)) return false;
    if (!validator) return true;
    return arr.every(validator);
  }

  /**
   * Validate enum value
   */
  static isValidEnum(value: any, enumValues: readonly string[]): boolean {
    return enumValues.includes(value);
  }

  /**
   * Validate number range
   */
  static isInRange(value: number, min?: number, max?: number): boolean {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }
}

// Schema validators for common response types
export const ResponseValidators = {
  error: (response: any) => {
    expect(response).toHaveProperty('error');
    expect(typeof response.error).toBe('string');
    if (response.code) {
      expect(typeof response.code).toBe('string');
    }
  },

  pagination: (response: any) => {
    expect(response).toHaveProperty('total_count');
    expect(typeof response.total_count).toBe('number');
    expect(response.total_count).toBeGreaterThanOrEqual(0);
  },

  uuid: (id: string) => {
    expect(ContractValidator.isValidUUID(id)).toBe(true);
  },

  dateTime: (dateTime: string) => {
    expect(ContractValidator.isValidDateTime(dateTime)).toBe(true);
  },

  url: (url: string) => {
    expect(ContractValidator.isValidURL(url)).toBe(true);
  }
};

// Mock Next.js API handler for testing
export function createMockApiHandler(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Mock authentication middleware
    if (req.headers.authorization === MOCK_AUTH_TOKEN) {
      (req as any).user = { id: MOCK_USER_ID };
    } else if (req.headers.authorization === INVALID_AUTH_TOKEN) {
      return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' });
    } else if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authorization header required', code: 'AUTH_MISSING_TOKEN' });
    }

    return handler(req, res);
  };
}

// Test utilities
export const TestUtils = {
  /**
   * Create a test request with authentication
   */
  authenticatedRequest: (app: any, method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    return request(app)[method](url).set('Authorization', MOCK_AUTH_TOKEN);
  },

  /**
   * Create a test request without authentication
   */
  unauthenticatedRequest: (app: any, method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    return request(app)[method](url);
  },

  /**
   * Create a test request with invalid authentication
   */
  invalidAuthRequest: (app: any, method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    return request(app)[method](url).set('Authorization', INVALID_AUTH_TOKEN);
  },

  /**
   * Generate mock file for multipart testing
   */
  mockAudioFile: () => Buffer.from('mock-audio-data'),

  /**
   * Common test cases for authentication
   */
  testAuthentication: (app: any, method: 'get' | 'post' | 'put' | 'delete', url: string) => {
    describe('Authentication', () => {
      it('should return 401 when no authorization header is provided', async () => {
        const response = await TestUtils.unauthenticatedRequest(app, method, url);
        expect(response.status).toBe(401);
        ResponseValidators.error(response.body);
      });

      it('should return 401 when invalid token is provided', async () => {
        const response = await TestUtils.invalidAuthRequest(app, method, url);
        expect(response.status).toBe(401);
        ResponseValidators.error(response.body);
      });
    });
  }
};

// Common test data generators
export const TestDataGenerators = {
  workshopModule: () => ({
    id: MOCK_MODULE_ID,
    title: 'Module 1: Introduction to 6FB Methodology',
    description: 'Learn the foundational principles of the 6FB methodology',
    module_order: 1,
    duration_minutes: 60,
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_progress: 50,
    progress_status: 'in_progress',
    is_accessible: true
  }),

  userProgress: () => ({
    id: '550e8400-e29b-41d4-a716-446655440010',
    user_id: MOCK_USER_ID,
    module_id: MOCK_MODULE_ID,
    lesson_id: MOCK_LESSON_ID,
    progress_percent: 75,
    status: 'in_progress',
    time_spent_minutes: 45,
    last_accessed_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  audioRecording: () => ({
    id: MOCK_RECORDING_ID,
    file_name: 'recording-1.mp3',
    file_url: 'https://example.com/recordings/recording-1.mp3',
    mime_type: 'audio/mpeg',
    duration_seconds: 180,
    file_size_bytes: 1024000,
    module_id: MOCK_MODULE_ID,
    lesson_id: MOCK_LESSON_ID,
    is_processed: true,
    transcription_id: '550e8400-e29b-41d4-a716-446655440020',
    created_at: new Date().toISOString()
  }),

  transcriptionRecord: () => ({
    id: '550e8400-e29b-41d4-a716-446655440020',
    audio_recording_id: MOCK_RECORDING_ID,
    text: 'This is a sample transcription text.',
    confidence: 0.95,
    language: 'en',
    word_count: 6,
    processing_time: 15,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  workbookNote: () => ({
    id: MOCK_NOTE_ID,
    title: 'My Learning Notes',
    content: '<p>These are my notes from the lesson.</p>',
    module_id: MOCK_MODULE_ID,
    lesson_id: MOCK_LESSON_ID,
    audio_recording_id: MOCK_RECORDING_ID,
    timestamp: 120,
    tags: ['important', 'review'],
    is_private: true,
    is_pinned: false,
    word_count: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  liveSession: () => ({
    id: MOCK_SESSION_ID,
    title: 'Live Workshop Session',
    description: 'Interactive workshop on 6FB methodology',
    instructor_id: '550e8400-e29b-41d4-a716-446655440030',
    module_id: MOCK_MODULE_ID,
    scheduled_start: new Date(Date.now() + 3600000).toISOString(),
    scheduled_end: new Date(Date.now() + 7200000).toISOString(),
    actual_start: null,
    actual_end: null,
    max_participants: 50,
    status: 'scheduled',
    features: [
      { type: 'chat', is_enabled: true, config: {} },
      { type: 'qa', is_enabled: true, config: {} }
    ],
    participant_count: 0,
    created_at: new Date().toISOString()
  })
};

export default {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN,
  INVALID_AUTH_TOKEN,
  MOCK_USER_ID,
  MOCK_MODULE_ID,
  MOCK_LESSON_ID,
  MOCK_RECORDING_ID,
  MOCK_NOTE_ID,
  MOCK_SESSION_ID
};