/**
 * T014: Audio Transcription Workflow Integration Test
 *
 * Tests the complete audio transcription workflow:
 * Upload audio file → Process → Transcribe with OpenAI → Search results
 *
 * This test validates:
 * - Audio file upload and validation
 * - File storage integration with S3
 * - OpenAI Whisper API integration (mocked)
 * - Transcription processing pipeline
 * - Search functionality across transcriptions
 * - Error handling for audio processing failures
 * - Cleanup of storage resources
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { PassThrough } from 'stream';

// Mock AWS S3
const mockS3Upload = jest.fn();
const mockS3Delete = jest.fn();
const mockS3GetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn((command) => {
      if (command.constructor.name === 'PutObjectCommand') {
        return mockS3Upload();
      }
      if (command.constructor.name === 'DeleteObjectCommand') {
        return mockS3Delete();
      }
    }),
  })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockS3GetSignedUrl,
}));

// Mock OpenAI
const mockOpenAITranscribe = jest.fn();

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    audio: {
      transcriptions: {
        create: mockOpenAITranscribe,
      },
    },
  })),
}));

// Mock Next.js app for testing
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn(),
};

// Test data generators
class AudioTestDataGenerator {
  static createMockAudioFile(
    name: string = 'test-audio.mp3',
    size: number = 1024 * 1024, // 1MB
    mimeType: string = 'audio/mpeg'
  ): Buffer {
    // Create a mock audio file buffer
    const header = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // MP3 header
    const padding = Buffer.alloc(size - header.length, 0);
    return Buffer.concat([header, padding]);
  }

  static createFormData(audioBuffer: Buffer, filename: string = 'test-audio.mp3'): FormData {
    const form = new FormData();
    const stream = new PassThrough();
    stream.end(audioBuffer);

    form.append('audio', stream, {
      filename,
      contentType: 'audio/mpeg',
    });
    form.append('moduleId', 'test-module-id');
    form.append('lessonId', 'test-lesson-id');
    form.append('timestamp', '120');

    return form;
  }

  static mockOpenAIResponse(text: string = 'This is a test transcription of the audio file.') {
    return {
      text,
      language: 'en',
      duration: 30.5,
      segments: [
        {
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
        },
      ],
    };
  }
}

// Test utilities
class AudioTestUtils {
  static readonly MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  static readonly MOCK_MODULE_ID = 'test-module-id';
  static readonly MOCK_LESSON_ID = 'test-lesson-id';
  static readonly MOCK_RECORDING_ID = '550e8400-e29b-41d4-a716-446655440001';
  static readonly MOCK_AUTH_TOKEN = 'Bearer mock-jwt-token-for-testing';

  static authenticatedRequest(method: 'get' | 'post' | 'put' | 'delete', url: string) {
    return request(mockApp)[method](url).set('Authorization', this.MOCK_AUTH_TOKEN);
  }

  static setupMocks() {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default successful responses
    mockS3Upload.mockResolvedValue({
      ETag: '"mock-etag"',
      Location: 'https://mock-bucket.s3.amazonaws.com/test-file.mp3',
    });

    mockS3Delete.mockResolvedValue({});

    mockS3GetSignedUrl.mockResolvedValue('https://mock-bucket.s3.amazonaws.com/signed-url');

    mockOpenAITranscribe.mockResolvedValue(AudioTestDataGenerator.mockOpenAIResponse());
  }

  static expectValidRecordingResponse(response: any) {
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('file_name');
    expect(response.body).toHaveProperty('file_url');
    expect(response.body).toHaveProperty('mime_type');
    expect(response.body).toHaveProperty('duration_seconds');
    expect(response.body).toHaveProperty('file_size_bytes');
    expect(response.body).toHaveProperty('module_id', AudioTestUtils.MOCK_MODULE_ID);
    expect(response.body).toHaveProperty('lesson_id', AudioTestUtils.MOCK_LESSON_ID);
    expect(response.body).toHaveProperty('is_processed', false);
    expect(response.body).toHaveProperty('created_at');
  }

  static expectValidTranscriptionResponse(response: any) {
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('audio_recording_id');
    expect(response.body).toHaveProperty('text');
    expect(response.body).toHaveProperty('confidence');
    expect(response.body).toHaveProperty('language');
    expect(response.body).toHaveProperty('word_count');
    expect(response.body).toHaveProperty('processing_time');
    expect(response.body).toHaveProperty('status', 'completed');
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');
  }
}

describe('Audio Transcription Workflow Integration Tests', () => {
  beforeEach(() => {
    AudioTestUtils.setupMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audio Upload Flow', () => {
    it('should successfully upload and process audio file', async () => {
      // Step 1: Create test audio file
      const audioBuffer = AudioTestDataGenerator.createMockAudioFile('test-recording.mp3');
      const formData = AudioTestDataGenerator.createFormData(audioBuffer, 'test-recording.mp3');

      // Step 2: Upload audio file
      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      expect(uploadResponse.status).toBe(201);
      AudioTestUtils.expectValidRecordingResponse(uploadResponse);

      // Verify S3 upload was called
      expect(mockS3Upload).toHaveBeenCalledTimes(1);

      const recordingId = uploadResponse.body.id;

      // Step 3: Verify file storage metadata
      expect(uploadResponse.body.file_size_bytes).toBe(audioBuffer.length);
      expect(uploadResponse.body.mime_type).toBe('audio/mpeg');
      expect(uploadResponse.body.file_name).toBe('test-recording.mp3');
    });

    it('should validate audio file types and sizes', async () => {
      // Test invalid file type
      const invalidBuffer = AudioTestDataGenerator.createMockAudioFile('test.txt', 1024, 'text/plain');
      const invalidFormData = AudioTestDataGenerator.createFormData(invalidBuffer, 'test.txt');

      const invalidResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(invalidFormData);

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body.error).toMatch(/invalid file type/i);

      // Test file too large (simulate 50MB file)
      const largeBuffer = AudioTestDataGenerator.createMockAudioFile('large.mp3', 50 * 1024 * 1024);
      const largeFormData = AudioTestDataGenerator.createFormData(largeBuffer, 'large.mp3');

      const largeResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(largeFormData);

      expect(largeResponse.status).toBe(400);
      expect(largeResponse.body.error).toMatch(/file size too large/i);
    });

    it('should handle S3 upload failures gracefully', async () => {
      // Mock S3 upload failure
      mockS3Upload.mockRejectedValue(new Error('S3 upload failed'));

      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const response = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      expect(response.status).toBe(500);
      expect(response.body.error).toMatch(/upload failed/i);
    });
  });

  describe('Transcription Processing Flow', () => {
    let recordingId: string;

    beforeEach(async () => {
      // Setup a test recording
      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      recordingId = uploadResponse.body.id;
    });

    it('should successfully transcribe audio using OpenAI Whisper', async () => {
      // Mock successful OpenAI response
      const mockTranscriptionText = 'This is a comprehensive test of the 6FB methodology transcription system.';
      mockOpenAITranscribe.mockResolvedValue(
        AudioTestDataGenerator.mockOpenAIResponse(mockTranscriptionText)
      );

      // Step 1: Trigger transcription
      const transcribeResponse = await AudioTestUtils.authenticatedRequest(
        'post',
        '/api/workbook/audio/transcribe'
      ).send({
        recordingId,
        language: 'en',
        prompt: 'This is educational content about business methodology.',
      });

      expect(transcribeResponse.status).toBe(202);
      expect(transcribeResponse.body.message).toMatch(/transcription started/i);

      // Step 2: Check transcription status (simulating async processing completion)
      const statusResponse = await AudioTestUtils.authenticatedRequest(
        'get',
        `/api/workbook/audio/transcription/${recordingId}`
      );

      expect(statusResponse.status).toBe(200);
      AudioTestUtils.expectValidTranscriptionResponse(statusResponse);

      // Verify OpenAI was called correctly
      expect(mockOpenAITranscribe).toHaveBeenCalledTimes(1);
      const openAICall = mockOpenAITranscribe.mock.calls[0][0];
      expect(openAICall).toHaveProperty('file');
      expect(openAICall).toHaveProperty('model', 'whisper-1');
      expect(openAICall).toHaveProperty('language', 'en');
      expect(openAICall).toHaveProperty('prompt');

      // Verify transcription content
      expect(statusResponse.body.text).toBe(mockTranscriptionText);
      expect(statusResponse.body.language).toBe('en');
      expect(statusResponse.body.word_count).toBeGreaterThan(0);
    });

    it('should handle OpenAI API failures with retry logic', async () => {
      // Mock OpenAI failure on first attempt, success on second
      mockOpenAITranscribe
        .mockRejectedValueOnce(new Error('OpenAI API temporarily unavailable'))
        .mockResolvedValueOnce(AudioTestDataGenerator.mockOpenAIResponse());

      const transcribeResponse = await AudioTestUtils.authenticatedRequest(
        'post',
        '/api/workbook/audio/transcribe'
      ).send({
        recordingId,
        language: 'en',
      });

      expect(transcribeResponse.status).toBe(202);

      // Check that retry was attempted
      expect(mockOpenAITranscribe).toHaveBeenCalledTimes(2);

      // Verify final success
      const statusResponse = await AudioTestUtils.authenticatedRequest(
        'get',
        `/api/workbook/audio/transcription/${recordingId}`
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('completed');
    });

    it('should handle unsupported audio formats during transcription', async () => {
      // Mock OpenAI rejection for unsupported format
      mockOpenAITranscribe.mockRejectedValue(new Error('Unsupported audio format'));

      const transcribeResponse = await AudioTestUtils.authenticatedRequest(
        'post',
        '/api/workbook/audio/transcribe'
      ).send({
        recordingId,
        language: 'en',
      });

      expect(transcribeResponse.status).toBe(202);

      // Check transcription status should show error
      const statusResponse = await AudioTestUtils.authenticatedRequest(
        'get',
        `/api/workbook/audio/transcription/${recordingId}`
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('failed');
      expect(statusResponse.body.error).toMatch(/unsupported audio format/i);
    });

    it('should support multiple audio formats for transcription', async () => {
      const formats = [
        { ext: 'mp3', mime: 'audio/mpeg' },
        { ext: 'wav', mime: 'audio/wav' },
        { ext: 'm4a', mime: 'audio/mp4' },
        { ext: 'webm', mime: 'audio/webm' },
      ];

      for (const format of formats) {
        // Create and upload file of each format
        const audioBuffer = AudioTestDataGenerator.createMockAudioFile(
          `test.${format.ext}`,
          1024,
          format.mime
        );
        const formData = AudioTestDataGenerator.createFormData(audioBuffer, `test.${format.ext}`);

        const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
          .set('Content-Type', 'multipart/form-data')
          .send(formData);

        expect(uploadResponse.status).toBe(201);

        // Trigger transcription
        const transcribeResponse = await AudioTestUtils.authenticatedRequest(
          'post',
          '/api/workbook/audio/transcribe'
        ).send({
          recordingId: uploadResponse.body.id,
          language: 'en',
        });

        expect(transcribeResponse.status).toBe(202);
      }

      // Verify OpenAI was called for each format
      expect(mockOpenAITranscribe).toHaveBeenCalledTimes(formats.length);
    });
  });

  describe('Search Integration', () => {
    let transcriptionId: string;
    let searchableText: string;

    beforeEach(async () => {
      // Setup transcription with searchable content
      searchableText = 'The six figure barber methodology focuses on building sustainable revenue streams through premium service delivery and customer retention strategies.';

      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      const recordingId = uploadResponse.body.id;

      // Mock OpenAI response with searchable text
      mockOpenAITranscribe.mockResolvedValue(
        AudioTestDataGenerator.mockOpenAIResponse(searchableText)
      );

      // Trigger transcription
      await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio/transcribe').send({
        recordingId,
        language: 'en',
      });

      // Get transcription ID
      const statusResponse = await AudioTestUtils.authenticatedRequest(
        'get',
        `/api/workbook/audio/transcription/${recordingId}`
      );
      transcriptionId = statusResponse.body.id;
    });

    it('should find transcriptions in full-text search', async () => {
      // Search for content that exists in transcription
      const searchResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'six figure barber methodology',
        types: ['transcriptions'],
        limit: 10,
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.results).toHaveLength(1);

      const result = searchResponse.body.results[0];
      expect(result.type).toBe('transcription');
      expect(result.id).toBe(transcriptionId);
      expect(result.content).toContain('six figure barber methodology');
      expect(result.highlight).toBeDefined();
      expect(result.relevance_score).toBeGreaterThan(0);
    });

    it('should support advanced search queries', async () => {
      // Phrase search
      const phraseResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: '"premium service delivery"',
        types: ['transcriptions'],
      });

      expect(phraseResponse.status).toBe(200);
      expect(phraseResponse.body.results.length).toBeGreaterThan(0);

      // Wildcard search
      const wildcardResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'method*',
        types: ['transcriptions'],
      });

      expect(wildcardResponse.status).toBe(200);
      expect(wildcardResponse.body.results.length).toBeGreaterThan(0);

      // Boolean search
      const booleanResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'barber AND methodology',
        types: ['transcriptions'],
      });

      expect(booleanResponse.status).toBe(200);
      expect(booleanResponse.body.results.length).toBeGreaterThan(0);
    });

    it('should filter search results by module and lesson', async () => {
      // Search with module filter
      const moduleFilterResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'methodology',
        types: ['transcriptions'],
        filters: {
          module_id: AudioTestUtils.MOCK_MODULE_ID,
        },
      });

      expect(moduleFilterResponse.status).toBe(200);
      expect(moduleFilterResponse.body.results.length).toBeGreaterThan(0);

      // Search with lesson filter
      const lessonFilterResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'methodology',
        types: ['transcriptions'],
        filters: {
          module_id: AudioTestUtils.MOCK_MODULE_ID,
          lesson_id: AudioTestUtils.MOCK_LESSON_ID,
        },
      });

      expect(lessonFilterResponse.status).toBe(200);
      expect(lessonFilterResponse.body.results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-existent content', async () => {
      const searchResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'nonexistent content that should not be found',
        types: ['transcriptions'],
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.results).toHaveLength(0);
      expect(searchResponse.body.total_count).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up S3 resources when recording is deleted', async () => {
      // Upload a file first
      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      const recordingId = uploadResponse.body.id;

      // Delete the recording
      const deleteResponse = await AudioTestUtils.authenticatedRequest(
        'delete',
        `/api/workbook/audio/${recordingId}`
      );

      expect(deleteResponse.status).toBe(200);

      // Verify S3 delete was called
      expect(mockS3Delete).toHaveBeenCalledTimes(1);
    });

    it('should handle S3 deletion failures gracefully', async () => {
      // Mock S3 delete failure
      mockS3Delete.mockRejectedValue(new Error('S3 delete failed'));

      // Upload a file first
      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      const recordingId = uploadResponse.body.id;

      // Delete should still succeed even if S3 cleanup fails
      const deleteResponse = await AudioTestUtils.authenticatedRequest(
        'delete',
        `/api/workbook/audio/${recordingId}`
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.warning).toMatch(/cleanup warning/i);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent transcription requests', async () => {
      const concurrentRequests = 5;
      const requests = [];

      // Create multiple recordings
      for (let i = 0; i < concurrentRequests; i++) {
        const audioBuffer = AudioTestDataGenerator.createMockAudioFile(`test-${i}.mp3`);
        const formData = AudioTestDataGenerator.createFormData(audioBuffer, `test-${i}.mp3`);

        const uploadPromise = AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
          .set('Content-Type', 'multipart/form-data')
          .send(formData)
          .then(response => response.body.id);

        requests.push(uploadPromise);
      }

      const recordingIds = await Promise.all(requests);

      // Trigger concurrent transcriptions
      const transcriptionPromises = recordingIds.map(recordingId =>
        AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio/transcribe').send({
          recordingId,
          language: 'en',
        })
      );

      const responses = await Promise.all(transcriptionPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(202);
      });

      // Verify OpenAI was called for each
      expect(mockOpenAITranscribe).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('should respect rate limiting for transcription requests', async () => {
      const audioBuffer = AudioTestDataGenerator.createMockAudioFile();
      const formData = AudioTestDataGenerator.createFormData(audioBuffer);

      const uploadResponse = await AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio')
        .set('Content-Type', 'multipart/form-data')
        .send(formData);

      const recordingId = uploadResponse.body.id;

      // Make multiple rapid requests
      const rapidRequests = Array(10).fill(null).map(() =>
        AudioTestUtils.authenticatedRequest('post', '/api/workbook/audio/transcribe').send({
          recordingId,
          language: 'en',
        })
      );

      const responses = await Promise.all(rapidRequests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});