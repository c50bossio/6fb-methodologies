/**
 * Integration Test Setup
 *
 * Global setup and utilities for integration testing.
 * This file is loaded by Jest before running integration tests.
 */

import { jest } from '@jest/globals';

// Extend Jest matchers for better assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    };
  },

  toBeValidHTMLContent(received: string) {
    const hasValidHTML = received.includes('<') && received.includes('>');
    const isNotOnlyWhitespace = received.trim().length > 0;
    const pass = hasValidHTML && isNotOnlyWhitespace;

    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be valid HTML content`,
      pass,
    };
  },

  toHaveValidSearchHighlight(received: any) {
    const hasHighlight = received.highlight && typeof received.highlight === 'string';
    const hasMarkTags = hasHighlight && received.highlight.includes('<mark>');
    const pass = hasHighlight && hasMarkTags;

    return {
      message: () => `expected search result ${pass ? 'not ' : ''}to have valid highlight markup`,
      pass,
    };
  },

  toMatchAudioFileStructure(received: any) {
    const requiredFields = [
      'id', 'file_name', 'file_url', 'mime_type', 'duration_seconds',
      'file_size_bytes', 'module_id', 'lesson_id', 'is_processed', 'created_at'
    ];

    const missingFields = requiredFields.filter(field => !(field in received));
    const pass = missingFields.length === 0;

    return {
      message: () => pass
        ? `expected audio file not to have all required fields`
        : `expected audio file to have required fields, missing: ${missingFields.join(', ')}`,
      pass,
    };
  },

  toMatchNoteStructure(received: any) {
    const requiredFields = [
      'id', 'title', 'content', 'module_id', 'lesson_id', 'tags',
      'is_private', 'is_pinned', 'word_count', 'created_at', 'updated_at'
    ];

    const missingFields = requiredFields.filter(field => !(field in received));
    const hasValidTags = Array.isArray(received.tags);
    const pass = missingFields.length === 0 && hasValidTags;

    return {
      message: () => pass
        ? `expected note not to have all required fields with valid structure`
        : `expected note to have required fields, missing: ${missingFields.join(', ')}, tags array: ${hasValidTags}`,
      pass,
    };
  },
});

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();

  // Keep warnings and errors visible
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test data constants
export const TEST_CONSTANTS = {
  MOCK_USER_ID: '550e8400-e29b-41d4-a716-446655440000',
  MOCK_MODULE_ID: 'test-module-id',
  MOCK_LESSON_ID: 'test-lesson-id',
  MOCK_RECORDING_ID: '550e8400-e29b-41d4-a716-446655440001',
  MOCK_NOTE_ID: '550e8400-e29b-41d4-a716-446655440002',
  MOCK_AUTH_TOKEN: 'Bearer mock-jwt-token-for-testing',

  // Test data patterns
  VALID_EMAIL: 'test@6fbmethodologies.com',
  VALID_PASSWORD: 'TestPassword123!',
  VALID_CUSTOMER_ID: 'test-customer-12345',

  // File constraints
  MAX_AUDIO_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'],
  SUPPORTED_EXPORT_FORMATS: ['pdf', 'markdown', 'json', 'zip'],
};

// Global mock functions
export const mockFunctions = {
  createMockAudioFile: (size: number = 1024, mimeType: string = 'audio/mpeg'): Buffer => {
    const header = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // MP3 header
    const padding = Buffer.alloc(size - header.length, 0);
    return Buffer.concat([header, padding]);
  },

  createMockFormData: (audioBuffer: Buffer, filename: string = 'test.mp3') => {
    // Mock FormData implementation for testing
    return {
      append: jest.fn(),
      getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
      audioBuffer,
      filename,
    };
  },

  mockOpenAIResponse: (text: string = 'Mock transcription text') => ({
    text,
    language: 'en',
    duration: 30.5,
    segments: [{
      id: 0,
      seek: 0,
      start: 0.0,
      end: 30.5,
      text,
      tokens: [1, 2, 3, 4, 5],
      temperature: 0.0,
      avg_logprob: -0.5,
      compression_ratio: 1.8,
      no_speech_prob: 0.1,
    }],
  }),

  mockS3UploadResponse: (key: string = 'test-file.mp3') => ({
    ETag: '"mock-etag"',
    Location: `https://mock-bucket.s3.amazonaws.com/${key}`,
    Key: key,
    Bucket: 'mock-bucket',
  }),
};

// Test database utilities
export const testDbUtils = {
  cleanup: async () => {
    // Mock database cleanup
    console.log('Cleaning up test database...');
  },

  seed: async () => {
    // Mock database seeding
    console.log('Seeding test database...');
  },

  reset: async () => {
    // Mock database reset
    console.log('Resetting test database...');
  },
};

// Network utilities
export const networkUtils = {
  simulateLatency: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  simulateNetworkError: () => {
    throw new Error('Network connection failed');
  },

  simulateTimeout: (ms: number = 5000) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  ),
};

// Performance monitoring utilities
export const performanceUtils = {
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },

  expectWithinTimeLimit: (duration: number, maxMs: number) => {
    expect(duration).toBeLessThan(maxMs);
  },
};

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidHTMLContent(): R;
      toHaveValidSearchHighlight(): R;
      toMatchAudioFileStructure(): R;
      toMatchNoteStructure(): R;
    }
  }
}