/**
 * T007: Progress Tracking API Contract Test
 *
 * Tests the progress tracking API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - GET /workbook/progress (overview)
 * - GET /workbook/progress/{moduleId}
 * - PUT /workbook/progress/{moduleId}
 */

import request from 'supertest';
import {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN,
  MOCK_MODULE_ID,
  MOCK_USER_ID
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Progress Tracking API Contract Tests', () => {

  describe('GET /workbook/progress', () => {
    const endpoint = '/api/workbook/progress';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return user progress overview', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateUserProgressOverview(response.body);
      });

      it('should include achievements in progress overview', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('achievements');
        expect(Array.isArray(response.body.achievements)).toBe(true);

        // Validate achievement structure
        response.body.achievements.forEach((achievement: any) => {
          expect(achievement).toHaveProperty('id');
          expect(achievement).toHaveProperty('title');
          expect(achievement).toHaveProperty('earned_at');

          expect(typeof achievement.id).toBe('string');
          expect(typeof achievement.title).toBe('string');
          ResponseValidators.dateTime(achievement.earned_at);
        });
      });

      it('should calculate overall progress correctly', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(typeof response.body.overall_progress).toBe('number');
        expect(response.body.overall_progress).toBeGreaterThanOrEqual(0);
        expect(response.body.overall_progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('GET /workbook/progress/{moduleId}', () => {
    const endpoint = `/api/workbook/progress/${MOCK_MODULE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return module-specific progress details', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateUserProgress(response.body);
      });

      it('should include correct module reference', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.body.module_id).toBe(MOCK_MODULE_ID);
        expect(response.body.user_id).toBe(MOCK_USER_ID);
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent module', async () => {
        const invalidModuleId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/progress/${invalidModuleId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', '/api/workbook/progress/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('PUT /workbook/progress/{moduleId}', () => {
    const endpoint = `/api/workbook/progress/${MOCK_MODULE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'put', endpoint);

    describe('Successful requests', () => {
      it('should update progress with valid data', async () => {
        const progressUpdate = {
          progress_percent: 75,
          lesson_id: 'lesson-2',
          time_spent_minutes: 30
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(progressUpdate);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateUserProgress(response.body);

        // Verify updated values
        expect(response.body.progress_percent).toBe(progressUpdate.progress_percent);
        expect(response.body.lesson_id).toBe(progressUpdate.lesson_id);
        expect(response.body.time_spent_minutes).toBeGreaterThanOrEqual(progressUpdate.time_spent_minutes);
      });

      it('should update progress with minimum required data', async () => {
        const progressUpdate = {
          progress_percent: 50
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(progressUpdate);

        expect(response.status).toBe(200);
        expect(response.body.progress_percent).toBe(progressUpdate.progress_percent);
      });

      it('should handle 100% completion correctly', async () => {
        const progressUpdate = {
          progress_percent: 100,
          time_spent_minutes: 60
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(progressUpdate);

        expect(response.status).toBe(200);
        expect(response.body.progress_percent).toBe(100);
        expect(response.body.status).toBe('completed');
        expect(response.body.completed_at).toBeDefined();
        ResponseValidators.dateTime(response.body.completed_at);
      });

      it('should update last_accessed_at timestamp', async () => {
        const progressUpdate = {
          progress_percent: 60
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(progressUpdate);

        expect(response.status).toBe(200);
        expect(response.body.last_accessed_at).toBeDefined();
        ResponseValidators.dateTime(response.body.last_accessed_at);

        // Should be recent timestamp (within last 5 seconds)
        const lastAccessed = new Date(response.body.last_accessed_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastAccessed.getTime();
        expect(timeDiff).toBeLessThan(5000); // 5 seconds
      });
    });

    describe('Request validation', () => {
      it('should return 400 for missing progress_percent', async () => {
        const invalidUpdate = {
          lesson_id: 'lesson-1'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid progress_percent range', async () => {
        const invalidUpdates = [
          { progress_percent: -1 },
          { progress_percent: 101 },
          { progress_percent: 150 }
        ];

        for (const update of invalidUpdates) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
            .send(update);

          expect(response.status).toBe(400);
          ResponseValidators.error(response.body);
        }
      });

      it('should return 400 for invalid time_spent_minutes', async () => {
        const invalidUpdate = {
          progress_percent: 50,
          time_spent_minutes: -5
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should validate lesson_id if provided', async () => {
        const updateWithLesson = {
          progress_percent: 50,
          lesson_id: null
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(updateWithLesson);

        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body.lesson_id).toBeNull();
        }
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent module', async () => {
        const invalidModuleId = '550e8400-e29b-41d4-a716-446655440999';
        const progressUpdate = {
          progress_percent: 50
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', `/api/workbook/progress/${invalidModuleId}`)
          .send(progressUpdate);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const progressUpdate = {
          progress_percent: 50
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', '/api/workbook/progress/invalid-uuid')
          .send(progressUpdate);

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid JSON', async () => {
        const response = await request(mockApp)
          .put(endpoint)
          .set('Authorization', MOCK_AUTH_TOKEN)
          .set('Content-Type', 'application/json')
          .send('invalid json');

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });
    });

    describe('Data type validation', () => {
      it('should validate progress_percent is integer', async () => {
        const invalidUpdate = {
          progress_percent: 'fifty'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should validate time_spent_minutes is integer', async () => {
        const invalidUpdate = {
          progress_percent: 50,
          time_spent_minutes: 'thirty'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });
    });
  });
});

// Schema validation helpers
function validateUserProgressOverview(overview: any) {
  expect(overview).toHaveProperty('overall_progress');
  expect(overview).toHaveProperty('modules_started');
  expect(overview).toHaveProperty('modules_completed');
  expect(overview).toHaveProperty('total_time_spent_minutes');
  expect(overview).toHaveProperty('current_streak_days');
  expect(overview).toHaveProperty('last_activity');
  expect(overview).toHaveProperty('achievements');

  expect(typeof overview.overall_progress).toBe('number');
  expect(overview.overall_progress).toBeGreaterThanOrEqual(0);
  expect(overview.overall_progress).toBeLessThanOrEqual(100);

  expect(typeof overview.modules_started).toBe('number');
  expect(overview.modules_started).toBeGreaterThanOrEqual(0);

  expect(typeof overview.modules_completed).toBe('number');
  expect(overview.modules_completed).toBeGreaterThanOrEqual(0);
  expect(overview.modules_completed).toBeLessThanOrEqual(overview.modules_started);

  expect(typeof overview.total_time_spent_minutes).toBe('number');
  expect(overview.total_time_spent_minutes).toBeGreaterThanOrEqual(0);

  expect(typeof overview.current_streak_days).toBe('number');
  expect(overview.current_streak_days).toBeGreaterThanOrEqual(0);

  ResponseValidators.dateTime(overview.last_activity);

  expect(Array.isArray(overview.achievements)).toBe(true);
}

function validateUserProgress(progress: any) {
  expect(progress).toHaveProperty('id');
  expect(progress).toHaveProperty('user_id');
  expect(progress).toHaveProperty('module_id');
  expect(progress).toHaveProperty('progress_percent');
  expect(progress).toHaveProperty('status');
  expect(progress).toHaveProperty('time_spent_minutes');
  expect(progress).toHaveProperty('last_accessed_at');
  expect(progress).toHaveProperty('created_at');
  expect(progress).toHaveProperty('updated_at');

  ResponseValidators.uuid(progress.id);
  ResponseValidators.uuid(progress.user_id);
  ResponseValidators.uuid(progress.module_id);

  expect(typeof progress.progress_percent).toBe('number');
  expect(progress.progress_percent).toBeGreaterThanOrEqual(0);
  expect(progress.progress_percent).toBeLessThanOrEqual(100);

  expect(['not_started', 'in_progress', 'completed', 'locked']).toContain(progress.status);

  expect(typeof progress.time_spent_minutes).toBe('number');
  expect(progress.time_spent_minutes).toBeGreaterThanOrEqual(0);

  ResponseValidators.dateTime(progress.last_accessed_at);
  ResponseValidators.dateTime(progress.created_at);
  ResponseValidators.dateTime(progress.updated_at);

  // lesson_id and completed_at are nullable
  if (progress.lesson_id !== null) {
    expect(typeof progress.lesson_id).toBe('string');
  }

  if (progress.completed_at !== null) {
    ResponseValidators.dateTime(progress.completed_at);
  }

  // If status is completed, completed_at should be set
  if (progress.status === 'completed') {
    expect(progress.completed_at).not.toBeNull();
  }
}