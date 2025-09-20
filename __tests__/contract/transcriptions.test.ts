/**
 * T009: Transcription API Contract Test
 *
 * Tests the transcription API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - POST /workbook/transcribe
 * - GET /workbook/transcriptions
 * - GET /workbook/transcriptions/search
 */

import request from 'supertest';
import {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN,
  MOCK_MODULE_ID,
  MOCK_RECORDING_ID
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Transcription API Contract Tests', () => {

  describe('POST /workbook/transcribe', () => {
    const endpoint = '/api/workbook/transcribe';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'post', endpoint);

    describe('Successful requests', () => {
      it('should start transcription with required data', async () => {
        const transcribeRequest = {
          recording_id: MOCK_RECORDING_ID
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(transcribeRequest);

        expect(response.status).toBe(202);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateTranscriptionRecord(response.body);

        // Verify initial state
        expect(response.body.audio_recording_id).toBe(MOCK_RECORDING_ID);
        expect(['pending', 'processing']).toContain(response.body.status);
      });

      it('should start transcription with language specified', async () => {
        const transcribeRequest = {
          recording_id: MOCK_RECORDING_ID,
          language: 'en'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(transcribeRequest);

        expect(response.status).toBe(202);
        validateTranscriptionRecord(response.body);

        expect(response.body.language).toBe('en');
      });

      it('should handle various language codes', async () => {
        const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'];

        for (const language of languages) {
          const transcribeRequest = {
            recording_id: MOCK_RECORDING_ID,
            language: language
          };

          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send(transcribeRequest);

          expect(response.status).toBe(202);
          expect(response.body.language).toBe(language);
        }
      });

      it('should auto-detect language when not specified', async () => {
        const transcribeRequest = {
          recording_id: MOCK_RECORDING_ID
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(transcribeRequest);

        expect(response.status).toBe(202);
        expect(response.body.language).toBeDefined();
        expect(typeof response.body.language).toBe('string');
      });
    });

    describe('Request validation', () => {
      it('should return 400 when recording_id is missing', async () => {
        const invalidRequest = {
          language: 'en'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid recording_id format', async () => {
        const invalidRequest = {
          recording_id: 'invalid-uuid'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for non-existent recording', async () => {
        const invalidRequest = {
          recording_id: '550e8400-e29b-41d4-a716-446655440999'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid language code', async () => {
        const invalidRequest = {
          recording_id: MOCK_RECORDING_ID,
          language: 'invalid-language-code'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect([200, 202, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for already transcribed recording', async () => {
        // This would test business logic where a recording already has a transcription
        const duplicateRequest = {
          recording_id: MOCK_RECORDING_ID
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(duplicateRequest);

        expect([202, 400, 409]).toContain(response.status);

        if ([400, 409].includes(response.status)) {
          ResponseValidators.error(response.body);
        }
      });
    });

    describe('Content type validation', () => {
      it('should return 400 for invalid JSON', async () => {
        const response = await request(mockApp)
          .post(endpoint)
          .set('Authorization', MOCK_AUTH_TOKEN)
          .set('Content-Type', 'application/json')
          .send('invalid json');

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for missing content-type', async () => {
        const response = await request(mockApp)
          .post(endpoint)
          .set('Authorization', MOCK_AUTH_TOKEN)
          .send(JSON.stringify({ recording_id: MOCK_RECORDING_ID }));

        expect([202, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });
    });
  });

  describe('GET /workbook/transcriptions', () => {
    const endpoint = '/api/workbook/transcriptions';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return list of transcriptions with default parameters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        expect(response.body).toHaveProperty('transcriptions');
        expect(response.body).toHaveProperty('total_count');
        ResponseValidators.pagination(response.body);

        // Validate transcriptions array
        expect(Array.isArray(response.body.transcriptions)).toBe(true);

        if (response.body.transcriptions.length > 0) {
          response.body.transcriptions.forEach((transcription: any) => {
            validateTranscriptionRecord(transcription);
          });
        }
      });

      it('should filter by status', async () => {
        const statuses = ['pending', 'processing', 'completed', 'failed'];

        for (const status of statuses) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?status=${status}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('transcriptions');

          // All transcriptions should have the requested status
          response.body.transcriptions.forEach((transcription: any) => {
            expect(transcription.status).toBe(status);
          });
        }
      });

      it('should search within transcription text', async () => {
        const searchTerm = 'methodology';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?search=${encodeURIComponent(searchTerm)}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transcriptions');

        // All transcriptions should contain the search term (case-insensitive)
        response.body.transcriptions.forEach((transcription: any) => {
          if (transcription.text) {
            expect(transcription.text.toLowerCase()).toContain(searchTerm.toLowerCase());
          }
        });
      });

      it('should respect pagination limits', async () => {
        const limit = 5;
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=${limit}`);

        expect(response.status).toBe(200);
        expect(response.body.transcriptions.length).toBeLessThanOrEqual(limit);
      });

      it('should handle multiple filters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?status=completed&search=6FB&limit=10`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transcriptions');

        response.body.transcriptions.forEach((transcription: any) => {
          expect(transcription.status).toBe('completed');
          if (transcription.text) {
            expect(transcription.text.toLowerCase()).toContain('6fb');
          }
        });
      });
    });

    describe('Query parameter validation', () => {
      it('should return 400 for invalid status value', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?status=invalid-status`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
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

        // Test invalid limit
        const invalidLimitResponse = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?limit=0`);
        expect([200, 400]).toContain(invalidLimitResponse.status);
      });
    });
  });

  describe('GET /workbook/transcriptions/search', () => {
    const endpoint = '/api/workbook/transcriptions/search';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should search transcriptions with required query', async () => {
        const searchQuery = 'six figure barber';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=${encodeURIComponent(searchQuery)}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('total_count');
        expect(response.body).toHaveProperty('query');
        ResponseValidators.pagination(response.body);

        expect(response.body.query).toBe(searchQuery);
        expect(Array.isArray(response.body.results)).toBe(true);

        // Validate search results
        response.body.results.forEach((result: any) => {
          validateSearchResult(result);
        });
      });

      it('should filter by module_id', async () => {
        const searchQuery = 'methodology';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=${encodeURIComponent(searchQuery)}&module_id=${MOCK_MODULE_ID}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('results');

        // Results should be filtered by module (this would need implementation logic)
        response.body.results.forEach((result: any) => {
          expect(result.type).toBe('transcription');
        });
      });

      it('should filter by date range', async () => {
        const searchQuery = 'barber';
        const dateFrom = '2024-01-01T00:00:00.000Z';
        const dateTo = '2024-12-31T23:59:59.999Z';

        const response = await TestUtils.authenticatedRequest(mockApp, 'get',
          `${endpoint}?q=${encodeURIComponent(searchQuery)}&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('results');

        // Validate date filtering
        response.body.results.forEach((result: any) => {
          const resultDate = new Date(result.created_at);
          const fromDate = new Date(dateFrom);
          const toDate = new Date(dateTo);

          expect(resultDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
          expect(resultDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
        });
      });

      it('should handle complex search queries', async () => {
        const complexQueries = [
          'six figure barber methodology',
          '"exact phrase"',
          'barber AND methodology',
          'revenue OR profit'
        ];

        for (const query of complexQueries) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=${encodeURIComponent(query)}`);

          expect(response.status).toBe(200);
          expect(response.body.query).toBe(query);
        }
      });

      it('should return results with relevance scores', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=methodology`);

        expect(response.status).toBe(200);

        response.body.results.forEach((result: any) => {
          expect(result).toHaveProperty('relevance_score');
          expect(typeof result.relevance_score).toBe('number');
          expect(result.relevance_score).toBeGreaterThan(0);
        });

        // Results should be sorted by relevance (highest first)
        for (let i = 1; i < response.body.results.length; i++) {
          expect(response.body.results[i-1].relevance_score).toBeGreaterThanOrEqual(
            response.body.results[i].relevance_score
          );
        }
      });
    });

    describe('Query parameter validation', () => {
      it('should return 400 when query parameter is missing', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for empty query', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for invalid module_id format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=test&module_id=invalid-uuid`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for invalid date formats', async () => {
        const invalidDates = [
          'invalid-date',
          '2024-13-01',
          '2024-01-32T00:00:00.000Z'
        ];

        for (const invalidDate of invalidDates) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'get',
            `${endpoint}?q=test&date_from=${encodeURIComponent(invalidDate)}`);

          expect([200, 400]).toContain(response.status);

          if (response.status === 400) {
            ResponseValidators.error(response.body);
          }
        }
      });

      it('should handle very long search queries', async () => {
        const longQuery = 'a'.repeat(1000);
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?q=${encodeURIComponent(longQuery)}`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body.query).toBe(longQuery);
        }
      });
    });
  });
});

// Schema validation helpers
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

  // text can be null for pending/processing transcriptions
  if (transcription.text !== null) {
    expect(typeof transcription.text).toBe('string');
  }

  expect(typeof transcription.confidence).toBe('number');
  expect(transcription.confidence).toBeGreaterThanOrEqual(0);
  expect(transcription.confidence).toBeLessThanOrEqual(1);

  expect(typeof transcription.language).toBe('string');
  expect(transcription.language.length).toBeGreaterThan(0);

  expect(typeof transcription.word_count).toBe('number');
  expect(transcription.word_count).toBeGreaterThanOrEqual(0);

  expect(typeof transcription.processing_time).toBe('number');
  expect(transcription.processing_time).toBeGreaterThanOrEqual(0);

  expect(['pending', 'processing', 'completed', 'failed']).toContain(transcription.status);

  ResponseValidators.dateTime(transcription.created_at);
  ResponseValidators.dateTime(transcription.updated_at);

  // Business logic validations
  if (transcription.status === 'completed') {
    expect(transcription.text).not.toBeNull();
    expect(transcription.word_count).toBeGreaterThan(0);
    expect(transcription.confidence).toBeGreaterThan(0);
  }

  if (transcription.status === 'pending') {
    expect(transcription.processing_time).toBe(0);
  }
}

function validateSearchResult(result: any) {
  expect(result).toHaveProperty('type');
  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('title');
  expect(result).toHaveProperty('content');
  expect(result).toHaveProperty('created_at');
  expect(result).toHaveProperty('relevance_score');

  expect(['note', 'transcription']).toContain(result.type);
  ResponseValidators.uuid(result.id);
  expect(typeof result.title).toBe('string');
  expect(typeof result.content).toBe('string');
  ResponseValidators.dateTime(result.created_at);

  expect(typeof result.relevance_score).toBe('number');
  expect(result.relevance_score).toBeGreaterThan(0);
}