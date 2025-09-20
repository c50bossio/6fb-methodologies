/**
 * T011: Export API Contract Test
 *
 * Tests the export API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - POST /workbook/export (all formats)
 */

import request from 'supertest';
import {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Export API Contract Tests', () => {

  describe('POST /workbook/export', () => {
    const endpoint = '/api/workbook/export';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'post', endpoint);

    describe('Successful requests', () => {
      it('should export data in PDF format with minimal request', async () => {
        const exportRequest = {
          format: 'pdf'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateExportResponse(response.body);
      });

      it('should export data in JSON format', async () => {
        const exportRequest = {
          format: 'json',
          include_audio: false,
          include_transcriptions: true,
          include_notes: true,
          include_progress: true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);

        // Verify download URL is appropriate for JSON
        expect(response.body.download_url).toMatch(/\.json$/);
      });

      it('should export data in Markdown format', async () => {
        const exportRequest = {
          format: 'markdown',
          include_transcriptions: true,
          include_notes: true,
          include_progress: false
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);

        // Verify download URL is appropriate for Markdown
        expect(response.body.download_url).toMatch(/\.md$/);
      });

      it('should export data in CSV format', async () => {
        const exportRequest = {
          format: 'csv',
          include_notes: true,
          include_progress: true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);

        // Verify download URL is appropriate for CSV
        expect(response.body.download_url).toMatch(/\.csv$/);
      });

      it('should handle comprehensive export with all options', async () => {
        const exportRequest = {
          format: 'pdf',
          include_audio: true,
          include_transcriptions: true,
          include_notes: true,
          include_progress: true,
          date_from: '2024-01-01T00:00:00.000Z',
          date_to: '2024-12-31T23:59:59.999Z'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);

        // File size should be larger when including audio
        if (exportRequest.include_audio) {
          expect(response.body.file_size_bytes).toBeGreaterThan(1000000); // > 1MB
        }
      });

      it('should filter export by date range', async () => {
        const exportRequest = {
          format: 'json',
          date_from: '2024-06-01T00:00:00.000Z',
          date_to: '2024-06-30T23:59:59.999Z'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);
      });

      it('should handle export with only transcriptions', async () => {
        const exportRequest = {
          format: 'markdown',
          include_audio: false,
          include_transcriptions: true,
          include_notes: false,
          include_progress: false
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);
      });

      it('should handle export with only notes', async () => {
        const exportRequest = {
          format: 'pdf',
          include_audio: false,
          include_transcriptions: false,
          include_notes: true,
          include_progress: false
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);
      });

      it('should handle export with default include options', async () => {
        const exportRequest = {
          format: 'json'
          // Should use defaults: audio=false, transcriptions=true, notes=true, progress=true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);
        validateExportResponse(response.body);
      });

      it('should provide reasonable expiration time', async () => {
        const exportRequest = {
          format: 'pdf'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);

        const expiresAt = new Date(response.body.expires_at);
        const now = new Date();
        const timeDiff = expiresAt.getTime() - now.getTime();

        // Should expire between 1 hour and 7 days from now
        expect(timeDiff).toBeGreaterThan(3600000); // > 1 hour
        expect(timeDiff).toBeLessThan(7 * 24 * 3600000); // < 7 days
      });
    });

    describe('Request validation', () => {
      it('should return 400 when format is missing', async () => {
        const invalidRequest = {
          include_notes: true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid format', async () => {
        const invalidRequest = {
          format: 'invalid-format'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should validate format enum values', async () => {
        const validFormats = ['pdf', 'json', 'markdown', 'csv'];
        const invalidFormats = ['xml', 'txt', 'docx', 'excel'];

        for (const format of validFormats) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send({ format });

          expect(response.status).toBe(200);
        }

        for (const format of invalidFormats) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send({ format });

          expect(response.status).toBe(400);
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for invalid date format', async () => {
        const invalidDates = [
          'invalid-date',
          '2024-13-01',
          '2024-01-32T00:00:00.000Z',
          '2024-01-01T25:00:00.000Z'
        ];

        for (const invalidDate of invalidDates) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send({
              format: 'json',
              date_from: invalidDate
            });

          expect(response.status).toBe(400);
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 when date_from is after date_to', async () => {
        const invalidRequest = {
          format: 'json',
          date_from: '2024-12-31T23:59:59.999Z',
          date_to: '2024-01-01T00:00:00.000Z'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should validate boolean include parameters', async () => {
        const invalidRequest = {
          format: 'json',
          include_audio: 'true', // should be boolean, not string
          include_notes: 1, // should be boolean, not number
          include_progress: null // should be boolean, not null
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidRequest);

        expect([200, 400]).toContain(response.status);

        // If the API accepts string/number conversion, that's okay too
        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });

      it('should handle edge case dates', async () => {
        const edgeCases = [
          {
            date_from: '1970-01-01T00:00:00.000Z', // Unix epoch
            date_to: '2038-01-19T03:14:07.000Z' // Y2038 problem date
          },
          {
            date_from: '2024-02-29T00:00:00.000Z', // Leap year
            date_to: '2024-02-29T23:59:59.999Z'
          }
        ];

        for (const testCase of edgeCases) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send({
              format: 'json',
              ...testCase
            });

          expect([200, 400]).toContain(response.status);

          if (response.status === 200) {
            validateExportResponse(response.body);
          }
        }
      });
    });

    describe('Business logic validation', () => {
      it('should handle export when user has no data', async () => {
        const exportRequest = {
          format: 'json'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          validateExportResponse(response.body);
          // File should still be created even if empty
          expect(response.body.file_size_bytes).toBeGreaterThan(0);
        } else {
          // Some APIs might return 400 for no data to export
          ResponseValidators.error(response.body);
        }
      });

      it('should handle large export requests', async () => {
        const exportRequest = {
          format: 'pdf',
          include_audio: true,
          include_transcriptions: true,
          include_notes: true,
          include_progress: true
          // No date filter = all data
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect([200, 413]).toContain(response.status);

        if (response.status === 200) {
          validateExportResponse(response.body);
        } else {
          // Might return 413 if export is too large
          ResponseValidators.error(response.body);
        }
      });

      it('should handle concurrent export requests', async () => {
        const exportRequest = {
          format: 'json'
        };

        // Make multiple concurrent requests
        const promises = Array(3).fill(null).map(() =>
          TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
            .send(exportRequest)
        );

        const responses = await Promise.all(promises);

        responses.forEach(response => {
          expect([200, 429]).toContain(response.status);

          if (response.status === 200) {
            validateExportResponse(response.body);
          } else {
            // Might return 429 for rate limiting
            ResponseValidators.error(response.body);
          }
        });
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
          .send(JSON.stringify({ format: 'json' }));

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });
    });

    describe('Security considerations', () => {
      it('should not expose sensitive information in download URLs', async () => {
        const exportRequest = {
          format: 'json'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);

        // URL should not contain user IDs, tokens, or other sensitive data in plain text
        expect(response.body.download_url).not.toMatch(/user_?id/i);
        expect(response.body.download_url).not.toMatch(/token/i);
        expect(response.body.download_url).not.toMatch(/password/i);
        expect(response.body.download_url).not.toMatch(/secret/i);
      });

      it('should include proper file size estimates', async () => {
        const exportRequest = {
          format: 'pdf',
          include_audio: true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(exportRequest);

        expect(response.status).toBe(200);

        // File size should be reasonable (not 0, not impossibly large)
        expect(response.body.file_size_bytes).toBeGreaterThan(0);
        expect(response.body.file_size_bytes).toBeLessThan(10 * 1024 * 1024 * 1024); // < 10GB
      });
    });
  });
});

// Schema validation helpers
function validateExportResponse(response: any) {
  expect(response).toHaveProperty('download_url');
  expect(response).toHaveProperty('expires_at');
  expect(response).toHaveProperty('file_size_bytes');

  ResponseValidators.url(response.download_url);
  ResponseValidators.dateTime(response.expires_at);

  expect(typeof response.file_size_bytes).toBe('number');
  expect(response.file_size_bytes).toBeGreaterThan(0);

  // Verify expiration is in the future
  const expiresAt = new Date(response.expires_at);
  const now = new Date();
  expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

  // Download URL should be HTTPS in production
  expect(response.download_url).toMatch(/^https?:\/\//);
}