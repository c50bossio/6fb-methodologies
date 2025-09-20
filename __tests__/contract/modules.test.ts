/**
 * T006: Workshop Modules API Contract Test
 *
 * Tests the workshop modules API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - GET /workbook/modules
 * - GET /workbook/modules/{moduleId}
 * - GET /workbook/modules/{moduleId}/lessons/{lessonId}
 */

import request from 'supertest';
import {
  ContractValidator,
  ResponseValidators,
  TestUtils,
  TestDataGenerators,
  MOCK_AUTH_TOKEN,
  MOCK_MODULE_ID,
  MOCK_LESSON_ID
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Workshop Modules API Contract Tests', () => {

  describe('GET /workbook/modules', () => {
    const endpoint = '/api/workbook/modules';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return list of modules with default parameters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        expect(response.body).toHaveProperty('modules');
        expect(response.body).toHaveProperty('total_count');
        ResponseValidators.pagination(response.body);

        // Validate modules array
        expect(Array.isArray(response.body.modules)).toBe(true);

        if (response.body.modules.length > 0) {
          const module = response.body.modules[0];
          validateWorkshopModuleWithProgress(module);
        }
      });

      it('should return modules with progress when include_progress=true', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?include_progress=true`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('modules');

        if (response.body.modules.length > 0) {
          const module = response.body.modules[0];
          expect(module).toHaveProperty('user_progress');
          expect(module).toHaveProperty('progress_status');
          expect(module).toHaveProperty('is_accessible');

          expect(typeof module.user_progress).toBe('number');
          expect(module.user_progress).toBeGreaterThanOrEqual(0);
          expect(module.user_progress).toBeLessThanOrEqual(100);

          expect(['not_started', 'in_progress', 'completed', 'locked']).toContain(module.progress_status);
          expect(typeof module.is_accessible).toBe('boolean');
        }
      });

      it('should return modules without progress when include_progress=false', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?include_progress=false`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('modules');

        if (response.body.modules.length > 0) {
          const module = response.body.modules[0];
          // Should still have progress fields as the schema extends WorkshopModule
          expect(module).toHaveProperty('user_progress');
          expect(module).toHaveProperty('progress_status');
          expect(module).toHaveProperty('is_accessible');
        }
      });
    });

    describe('Query parameter validation', () => {
      it('should handle invalid include_progress parameter', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?include_progress=invalid`);

        // Should either return 400 or treat as default true
        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });
    });
  });

  describe('GET /workbook/modules/{moduleId}', () => {
    const endpoint = `/api/workbook/modules/${MOCK_MODULE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return detailed module information', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate detailed module schema
        validateWorkshopModuleDetailed(response.body);
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent module', async () => {
        const invalidModuleId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/modules/${invalidModuleId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', '/api/workbook/modules/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('GET /workbook/modules/{moduleId}/lessons/{lessonId}', () => {
    const endpoint = `/api/workbook/modules/${MOCK_MODULE_ID}/lessons/${MOCK_LESSON_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return lesson content', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate lesson schema
        validateWorkshopLesson(response.body);
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent module', async () => {
        const invalidModuleId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/modules/${invalidModuleId}/lessons/${MOCK_LESSON_ID}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 404 for non-existent lesson', async () => {
        const invalidLessonId = 'invalid-lesson-id';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/modules/${MOCK_MODULE_ID}/lessons/${invalidLessonId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid module UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', '/api/workbook/modules/invalid-uuid/lessons/lesson-1');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });
});

// Schema validation helpers
function validateWorkshopModule(module: any) {
  expect(module).toHaveProperty('id');
  expect(module).toHaveProperty('title');
  expect(module).toHaveProperty('description');
  expect(module).toHaveProperty('module_order');
  expect(module).toHaveProperty('duration_minutes');
  expect(module).toHaveProperty('is_published');
  expect(module).toHaveProperty('created_at');
  expect(module).toHaveProperty('updated_at');

  ResponseValidators.uuid(module.id);
  expect(typeof module.title).toBe('string');
  expect(module.title.length).toBeGreaterThan(0);
  expect(typeof module.description).toBe('string');
  expect(typeof module.module_order).toBe('number');
  expect(module.module_order).toBeGreaterThanOrEqual(1);
  expect(module.module_order).toBeLessThanOrEqual(6);
  expect(typeof module.duration_minutes).toBe('number');
  expect(module.duration_minutes).toBeGreaterThan(0);
  expect(typeof module.is_published).toBe('boolean');
  ResponseValidators.dateTime(module.created_at);
  ResponseValidators.dateTime(module.updated_at);
}

function validateWorkshopModuleWithProgress(module: any) {
  validateWorkshopModule(module);

  expect(module).toHaveProperty('user_progress');
  expect(module).toHaveProperty('progress_status');
  expect(module).toHaveProperty('is_accessible');

  expect(typeof module.user_progress).toBe('number');
  expect(module.user_progress).toBeGreaterThanOrEqual(0);
  expect(module.user_progress).toBeLessThanOrEqual(100);
  expect(['not_started', 'in_progress', 'completed', 'locked']).toContain(module.progress_status);
  expect(typeof module.is_accessible).toBe('boolean');
}

function validateWorkshopModuleDetailed(module: any) {
  validateWorkshopModuleWithProgress(module);

  expect(module).toHaveProperty('content');
  expect(module.content).toHaveProperty('overview');
  expect(module.content).toHaveProperty('learning_objectives');
  expect(module.content).toHaveProperty('lessons');
  expect(module.content).toHaveProperty('resources');

  expect(typeof module.content.overview).toBe('string');
  expect(Array.isArray(module.content.learning_objectives)).toBe(true);
  expect(Array.isArray(module.content.lessons)).toBe(true);
  expect(Array.isArray(module.content.resources)).toBe(true);

  // Validate learning objectives
  module.content.learning_objectives.forEach((objective: any) => {
    expect(typeof objective).toBe('string');
  });

  // Validate lessons
  module.content.lessons.forEach((lesson: any) => {
    validateWorkshopLesson(lesson);
  });

  // Validate resources
  module.content.resources.forEach((resource: any) => {
    validateResource(resource);
  });
}

function validateWorkshopLesson(lesson: any) {
  expect(lesson).toHaveProperty('id');
  expect(lesson).toHaveProperty('title');
  expect(lesson).toHaveProperty('type');
  expect(lesson).toHaveProperty('estimated_minutes');
  expect(lesson).toHaveProperty('sort_order');
  expect(lesson).toHaveProperty('content');

  expect(typeof lesson.id).toBe('string');
  expect(typeof lesson.title).toBe('string');
  expect(['video', 'text', 'interactive', 'exercise', 'discussion']).toContain(lesson.type);
  expect(typeof lesson.estimated_minutes).toBe('number');
  expect(lesson.estimated_minutes).toBeGreaterThan(0);
  expect(typeof lesson.sort_order).toBe('number');
  expect(lesson.sort_order).toBeGreaterThanOrEqual(0);
  expect(typeof lesson.content).toBe('object');

  // Validate content based on lesson type
  if (lesson.content.text) {
    expect(typeof lesson.content.text).toBe('string');
  }
  if (lesson.content.video_url) {
    ResponseValidators.url(lesson.content.video_url);
  }
  if (lesson.content.interactive) {
    expect(typeof lesson.content.interactive).toBe('object');
  }
  if (lesson.content.exercises) {
    expect(Array.isArray(lesson.content.exercises)).toBe(true);
  }
}

function validateResource(resource: any) {
  expect(resource).toHaveProperty('title');
  expect(resource).toHaveProperty('type');
  expect(resource).toHaveProperty('url');

  expect(typeof resource.title).toBe('string');
  expect(['pdf', 'video', 'link', 'document']).toContain(resource.type);
  ResponseValidators.url(resource.url);

  if (resource.description) {
    expect(typeof resource.description).toBe('string');
  }
}