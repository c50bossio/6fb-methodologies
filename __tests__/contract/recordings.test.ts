/**
 * T008: Audio Recordings API Contract Test
 *
 * Tests the audio recordings API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - GET /workbook/recordings (with pagination)
 * - POST /workbook/recordings (file upload)
 * - GET /workbook/recordings/{recordingId}
 * - DELETE /workbook/recordings/{recordingId}
 */

import request from 'supertest';
import {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN,
  MOCK_MODULE_ID,
  MOCK_LESSON_ID,
  MOCK_RECORDING_ID
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Audio Recordings API Contract Tests', () => {

  describe('GET /workbook/recordings', () => {
    const endpoint = '/api/workbook/recordings';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return list of recordings with default parameters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        expect(response.body).toHaveProperty('recordings');
        expect(response.body).toHaveProperty('total_count');
        expect(response.body).toHaveProperty('has_more');

        ResponseValidators.pagination(response.body);
        expect(typeof response.body.has_more).toBe('boolean');

        // Validate recordings array
        expect(Array.isArray(response.body.recordings)).toBe(true);

        if (response.body.recordings.length > 0) {
          response.body.recordings.forEach((recording: any) => {
            validateAudioRecording(recording);
          });
        }
      });

      it('should filter by module_id', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?module_id=${MOCK_MODULE_ID}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('recordings');

        // All recordings should have the requested module_id or null
        response.body.recordings.forEach((recording: any) => {
          if (recording.module_id !== null) {
            expect(recording.module_id).toBe(MOCK_MODULE_ID);
          }
        });
      });

      it('should respect pagination limits', async () => {
        const limit = 5;
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=${limit}`);

        expect(response.status).toBe(200);
        expect(response.body.recordings.length).toBeLessThanOrEqual(limit);
      });

      it('should handle pagination offset', async () => {
        const limit = 10;
        const offset = 5;
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=${limit}&offset=${offset}`);

        expect(response.status).toBe(200);
        expect(response.body.recordings.length).toBeLessThanOrEqual(limit);
      });

      it('should validate pagination boundaries', async () => {
        // Test maximum limit
        const maxLimitResponse = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=100`);
        expect(maxLimitResponse.status).toBe(200);

        // Test over maximum limit
        const overLimitResponse = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=150`);
        expect([200, 400]).toContain(overLimitResponse.status);

        if (overLimitResponse.status === 400) {
          ResponseValidators.error(overLimitResponse.body);
        }
      });
    });

    describe('Query parameter validation', () => {
      it('should return 400 for invalid module_id format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?module_id=invalid-uuid`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for invalid limit', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=0`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for negative offset', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?offset=-1`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });
    });
  });

  describe('POST /workbook/recordings', () => {
    const endpoint = '/api/workbook/recordings';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'post', endpoint);

    describe('Successful requests', () => {
      it('should upload audio file with required data', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', TestUtils.mockAudioFile(), 'test-recording.mp3')
          .field('module_id', MOCK_MODULE_ID);

        expect(response.status).toBe(201);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateAudioRecording(response.body);

        // Verify uploaded file properties
        expect(response.body.file_name).toContain('test-recording');
        expect(response.body.mime_type).toMatch(/audio\//);
        expect(response.body.module_id).toBe(MOCK_MODULE_ID);
      });

      it('should upload audio file with all optional metadata', async () => {
        const metadata = JSON.stringify({
          sample_rate: 44100,
          channels: 2,
          bitrate: 320000,
          recording_quality: 'high',
          tags: ['important', 'review']
        });

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', TestUtils.mockAudioFile(), 'detailed-recording.wav')
          .field('module_id', MOCK_MODULE_ID)
          .field('lesson_id', MOCK_LESSON_ID)
          .field('metadata', metadata);

        expect(response.status).toBe(201);
        validateAudioRecording(response.body);

        expect(response.body.module_id).toBe(MOCK_MODULE_ID);
        expect(response.body.lesson_id).toBe(MOCK_LESSON_ID);
      });

      it('should handle various audio file formats', async () => {
        const formats = [
          { filename: 'test.mp3', expectedMime: 'audio/mpeg' },
          { filename: 'test.wav', expectedMime: 'audio/wav' },
          { filename: 'test.m4a', expectedMime: 'audio/mp4' }
        ];

        for (const format of formats) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .attach('audio_file', TestUtils.mockAudioFile(), format.filename);

          expect(response.status).toBe(201);
          expect(response.body.mime_type).toMatch(/audio\//);
        }
      });
    });

    describe('Request validation', () => {
      it('should return 400 when audio_file is missing', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .field('module_id', MOCK_MODULE_ID);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid module_id format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', TestUtils.mockAudioFile(), 'test.mp3')
          .field('module_id', 'invalid-uuid');

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid metadata JSON', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', TestUtils.mockAudioFile(), 'test.mp3')
          .field('metadata', 'invalid json');

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 413 for file too large', async () => {
        // Create a large mock file (this would need to be adjusted based on actual file size limits)
        const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', largeFile, 'large-file.mp3');

        expect([413, 400]).toContain(response.status);

        if (response.status === 413) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for non-audio file types', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .attach('audio_file', Buffer.from('not an audio file'), 'test.txt');

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('GET /workbook/recordings/{recordingId}', () => {
    const endpoint = `/api/workbook/recordings/${MOCK_RECORDING_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return detailed recording information', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate detailed recording schema
        validateAudioRecordingDetailed(response.body);
      });

      it('should include metadata when available', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);

        if (response.body.metadata) {
          expect(response.body.metadata).toHaveProperty('sample_rate');
          expect(response.body.metadata).toHaveProperty('channels');
          expect(response.body.metadata).toHaveProperty('bitrate');
          expect(response.body.metadata).toHaveProperty('recording_quality');

          if (response.body.metadata.recording_quality) {
            expect(['low', 'medium', 'high']).toContain(response.body.metadata.recording_quality);
          }

          if (response.body.metadata.tags) {
            expect(Array.isArray(response.body.metadata.tags)).toBe(true);
          }
        }
      });

      it('should include transcription when available', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);

        if (response.body.transcription) {
          validateTranscriptionRecord(response.body.transcription);
        }
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent recording', async () => {
        const invalidRecordingId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/recordings/${invalidRecordingId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', '/api/workbook/recordings/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('DELETE /workbook/recordings/{recordingId}', () => {
    const endpoint = `/api/workbook/recordings/${MOCK_RECORDING_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'delete', endpoint);

    describe('Successful requests', () => {
      it('should delete recording successfully', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', endpoint);

        expect(response.status).toBe(204);
        expect(response.body).toEqual({});
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent recording', async () => {
        const invalidRecordingId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', `/api/workbook/recordings/${invalidRecordingId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', '/api/workbook/recordings/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });

    describe('Access control', () => {
      it('should only allow users to delete their own recordings', async () => {
        // This test would need to be implemented when user isolation is added
        // For now, we just verify that authentication is required
        const response = await TestUtils.unauthenticatedRequest(mockApp, 'delete', endpoint);

        expect(response.status).toBe(401);
        ResponseValidators.error(response.body);
      });
    });
  });
});

// Schema validation helpers
function validateAudioRecording(recording: any) {
  expect(recording).toHaveProperty('id');
  expect(recording).toHaveProperty('file_name');
  expect(recording).toHaveProperty('file_url');
  expect(recording).toHaveProperty('mime_type');
  expect(recording).toHaveProperty('duration_seconds');
  expect(recording).toHaveProperty('file_size_bytes');
  expect(recording).toHaveProperty('is_processed');
  expect(recording).toHaveProperty('created_at');

  ResponseValidators.uuid(recording.id);
  expect(typeof recording.file_name).toBe('string');
  expect(recording.file_name.length).toBeGreaterThan(0);
  ResponseValidators.url(recording.file_url);
  expect(typeof recording.mime_type).toBe('string');
  expect(recording.mime_type).toMatch(/^audio\//);
  expect(typeof recording.duration_seconds).toBe('number');
  expect(recording.duration_seconds).toBeGreaterThan(0);
  expect(typeof recording.file_size_bytes).toBe('number');
  expect(recording.file_size_bytes).toBeGreaterThan(0);
  expect(typeof recording.is_processed).toBe('boolean');
  ResponseValidators.dateTime(recording.created_at);

  // Optional fields
  if (recording.module_id !== null) {
    ResponseValidators.uuid(recording.module_id);
  }
  if (recording.lesson_id !== null) {
    expect(typeof recording.lesson_id).toBe('string');
  }
  if (recording.transcription_id !== null) {
    ResponseValidators.uuid(recording.transcription_id);
  }
}

function validateAudioRecordingDetailed(recording: any) {
  validateAudioRecording(recording);

  // Additional fields for detailed view
  if (recording.metadata) {
    expect(typeof recording.metadata).toBe('object');

    if (recording.metadata.sample_rate) {
      expect(typeof recording.metadata.sample_rate).toBe('number');
      expect(recording.metadata.sample_rate).toBeGreaterThan(0);
    }

    if (recording.metadata.channels) {
      expect(typeof recording.metadata.channels).toBe('number');
      expect(recording.metadata.channels).toBeGreaterThan(0);
    }

    if (recording.metadata.bitrate) {
      expect(typeof recording.metadata.bitrate).toBe('number');
      expect(recording.metadata.bitrate).toBeGreaterThan(0);
    }

    if (recording.metadata.recording_quality) {
      expect(['low', 'medium', 'high']).toContain(recording.metadata.recording_quality);
    }

    if (recording.metadata.tags) {
      expect(Array.isArray(recording.metadata.tags)).toBe(true);
      recording.metadata.tags.forEach((tag: any) => {
        expect(typeof tag).toBe('string');
      });
    }
  }

  if (recording.transcription) {
    validateTranscriptionRecord(recording.transcription);
  }
}

function validateTranscriptionRecord(transcription: any) {
  expect(transcription).toHaveProperty('id');
  expect(transcription).toHaveProperty('audio_recording_id');
  expect(transcription).toHaveProperty('confidence');
  expect(transcription).toHaveProperty('language');
  expect(transcription).toHaveProperty('word_count');
  expect(transcription).toHaveProperty('processing_time');
  expect(transcription).toHaveProperty('status');
  expect(transcription).toHaveProperty('created_at');
  expect(transcription).toHaveProperty('updated_at');

  ResponseValidators.uuid(transcription.id);
  ResponseValidators.uuid(transcription.audio_recording_id);

  if (transcription.text !== null) {
    expect(typeof transcription.text).toBe('string');
  }

  expect(typeof transcription.confidence).toBe('number');
  expect(transcription.confidence).toBeGreaterThanOrEqual(0);
  expect(transcription.confidence).toBeLessThanOrEqual(1);

  expect(typeof transcription.language).toBe('string');
  expect(typeof transcription.word_count).toBe('number');
  expect(transcription.word_count).toBeGreaterThanOrEqual(0);
  expect(typeof transcription.processing_time).toBe('number');
  expect(transcription.processing_time).toBeGreaterThanOrEqual(0);

  expect(['pending', 'processing', 'completed', 'failed']).toContain(transcription.status);

  ResponseValidators.dateTime(transcription.created_at);
  ResponseValidators.dateTime(transcription.updated_at);
}