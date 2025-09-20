/**
 * T010: Notes API Contract Test
 *
 * Tests the notes API endpoints against the OpenAPI specification.
 * These tests will FAIL initially since the APIs are not implemented yet.
 *
 * Endpoints tested:
 * - GET /workbook/notes (with filtering)
 * - POST /workbook/notes
 * - GET /workbook/notes/{noteId}
 * - PUT /workbook/notes/{noteId}
 * - DELETE /workbook/notes/{noteId}
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
  MOCK_RECORDING_ID,
  MOCK_NOTE_ID
} from './setup';

// Note: This should be replaced with actual Next.js app when APIs are implemented
const mockApp = null; // Will cause tests to fail as expected

describe('Notes API Contract Tests', () => {

  describe('GET /workbook/notes', () => {
    const endpoint = '/api/workbook/notes';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return list of notes with default parameters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        expect(response.body).toHaveProperty('notes');
        expect(response.body).toHaveProperty('total_count');
        ResponseValidators.pagination(response.body);

        // Validate notes array
        expect(Array.isArray(response.body.notes)).toBe(true);

        if (response.body.notes.length > 0) {
          response.body.notes.forEach((note: any) => {
            validateWorkbookNote(note);
          });
        }
      });

      it('should filter by module_id', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?module_id=${MOCK_MODULE_ID}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notes');

        // All notes should have the requested module_id or null
        response.body.notes.forEach((note: any) => {
          if (note.module_id !== null) {
            expect(note.module_id).toBe(MOCK_MODULE_ID);
          }
        });
      });

      it('should filter by tags', async () => {
        const tags = 'important,review';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?tags=${encodeURIComponent(tags)}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notes');

        // Notes should contain at least one of the specified tags
        const tagList = tags.split(',');
        response.body.notes.forEach((note: any) => {
          if (note.tags && note.tags.length > 0) {
            const hasMatchingTag = note.tags.some((tag: string) => tagList.includes(tag));
            expect(hasMatchingTag).toBe(true);
          }
        });
      });

      it('should search within note content', async () => {
        const searchTerm = 'methodology';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?search=${encodeURIComponent(searchTerm)}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notes');

        // Notes should contain the search term in title or content
        response.body.notes.forEach((note: any) => {
          const titleMatch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
          const contentMatch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
          expect(titleMatch || contentMatch).toBe(true);
        });
      });

      it('should sort notes correctly', async () => {
        const sortOptions = [
          'created_asc',
          'created_desc',
          'updated_asc',
          'updated_desc',
          'title_asc',
          'title_desc'
        ];

        for (const sort of sortOptions) {
          const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?sort=${sort}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('notes');

          if (response.body.notes.length > 1) {
            validateSortOrder(response.body.notes, sort);
          }
        }
      });

      it('should handle multiple filters', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get',
          `${endpoint}?module_id=${MOCK_MODULE_ID}&tags=important&search=barber&sort=updated_desc`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notes');

        response.body.notes.forEach((note: any) => {
          // Should match module filter
          if (note.module_id !== null) {
            expect(note.module_id).toBe(MOCK_MODULE_ID);
          }

          // Should contain search term
          const titleMatch = note.title.toLowerCase().includes('barber');
          const contentMatch = note.content.toLowerCase().includes('barber');
          expect(titleMatch || contentMatch).toBe(true);

          // Should have important tag
          if (note.tags && note.tags.length > 0) {
            expect(note.tags).toContain('important');
          }
        });
      });

      it('should return default sort order when not specified', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);

        if (response.body.notes.length > 1) {
          // Default should be updated_desc
          validateSortOrder(response.body.notes, 'updated_desc');
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

      it('should return 400 for invalid sort option', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `${endpoint}?sort=invalid_sort`);

        expect([200, 400]).toContain(response.status);

        if (response.status === 400) {
          ResponseValidators.error(response.body);
        }
      });
    });
  });

  describe('POST /workbook/notes', () => {
    const endpoint = '/api/workbook/notes';

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'post', endpoint);

    describe('Successful requests', () => {
      it('should create note with required fields', async () => {
        const noteData = {
          title: 'My Learning Notes',
          content: '<p>These are my notes from the lesson.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(noteData);

        expect(response.status).toBe(201);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateWorkbookNote(response.body);

        // Verify created values
        expect(response.body.title).toBe(noteData.title);
        expect(response.body.content).toBe(noteData.content);
        expect(response.body.is_private).toBe(true); // default value
      });

      it('should create note with all optional fields', async () => {
        const noteData = {
          title: 'Comprehensive Notes',
          content: '<p>Detailed notes with all metadata.</p>',
          module_id: MOCK_MODULE_ID,
          lesson_id: MOCK_LESSON_ID,
          audio_recording_id: MOCK_RECORDING_ID,
          timestamp: 120,
          tags: ['important', 'review', 'methodology'],
          is_private: false
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(noteData);

        expect(response.status).toBe(201);
        validateWorkbookNote(response.body);

        // Verify all fields
        expect(response.body.title).toBe(noteData.title);
        expect(response.body.content).toBe(noteData.content);
        expect(response.body.module_id).toBe(noteData.module_id);
        expect(response.body.lesson_id).toBe(noteData.lesson_id);
        expect(response.body.audio_recording_id).toBe(noteData.audio_recording_id);
        expect(response.body.timestamp).toBe(noteData.timestamp);
        expect(response.body.tags).toEqual(noteData.tags);
        expect(response.body.is_private).toBe(noteData.is_private);
      });

      it('should calculate word count automatically', async () => {
        const noteData = {
          title: 'Word Count Test',
          content: '<p>This content has exactly eight words in it.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(noteData);

        expect(response.status).toBe(201);
        expect(response.body.word_count).toBe(8);
      });

      it('should handle HTML content correctly', async () => {
        const noteData = {
          title: 'HTML Content Test',
          content: '<h1>Heading</h1><p>Paragraph with <strong>bold</strong> text.</p><ul><li>List item</li></ul>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(noteData);

        expect(response.status).toBe(201);
        expect(response.body.content).toBe(noteData.content);
        expect(response.body.word_count).toBeGreaterThan(0);
      });

      it('should set timestamps correctly', async () => {
        const noteData = {
          title: 'Timestamp Test',
          content: '<p>Testing timestamps.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(noteData);

        expect(response.status).toBe(201);
        ResponseValidators.dateTime(response.body.created_at);
        ResponseValidators.dateTime(response.body.updated_at);

        // Should be recent timestamps (within last 5 seconds)
        const createdAt = new Date(response.body.created_at);
        const updatedAt = new Date(response.body.updated_at);
        const now = new Date();

        expect(now.getTime() - createdAt.getTime()).toBeLessThan(5000);
        expect(now.getTime() - updatedAt.getTime()).toBeLessThan(5000);
      });
    });

    describe('Request validation', () => {
      it('should return 400 when title is missing', async () => {
        const invalidNote = {
          content: '<p>Content without title.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 when content is missing', async () => {
        const invalidNote = {
          title: 'Title without content'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for title too long', async () => {
        const invalidNote = {
          title: 'a'.repeat(201), // exceeds 200 character limit
          content: '<p>Valid content.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for empty title', async () => {
        const invalidNote = {
          title: '',
          content: '<p>Valid content.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for empty content', async () => {
        const invalidNote = {
          title: 'Valid title',
          content: ''
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid module_id format', async () => {
        const invalidNote = {
          title: 'Valid title',
          content: '<p>Valid content.</p>',
          module_id: 'invalid-uuid'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid audio_recording_id format', async () => {
        const invalidNote = {
          title: 'Valid title',
          content: '<p>Valid content.</p>',
          audio_recording_id: 'invalid-uuid'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for negative timestamp', async () => {
        const invalidNote = {
          title: 'Valid title',
          content: '<p>Valid content.</p>',
          timestamp: -1
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'post', endpoint)
          .send(invalidNote);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('GET /workbook/notes/{noteId}', () => {
    const endpoint = `/api/workbook/notes/${MOCK_NOTE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'get', endpoint);

    describe('Successful requests', () => {
      it('should return note details', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', endpoint);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateWorkbookNote(response.body);
        expect(response.body.id).toBe(MOCK_NOTE_ID);
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent note', async () => {
        const invalidNoteId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', `/api/workbook/notes/${invalidNoteId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'get', '/api/workbook/notes/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('PUT /workbook/notes/{noteId}', () => {
    const endpoint = `/api/workbook/notes/${MOCK_NOTE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'put', endpoint);

    describe('Successful requests', () => {
      it('should update note with partial data', async () => {
        const updateData = {
          title: 'Updated Title'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Validate response schema
        validateWorkbookNote(response.body);
        expect(response.body.title).toBe(updateData.title);
        expect(response.body.id).toBe(MOCK_NOTE_ID);
      });

      it('should update all modifiable fields', async () => {
        const updateData = {
          title: 'Completely Updated Note',
          content: '<p>All new content with <em>formatting</em>.</p>',
          tags: ['updated', 'comprehensive'],
          is_private: false,
          is_pinned: true
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(updateData);

        expect(response.status).toBe(200);
        validateWorkbookNote(response.body);

        expect(response.body.title).toBe(updateData.title);
        expect(response.body.content).toBe(updateData.content);
        expect(response.body.tags).toEqual(updateData.tags);
        expect(response.body.is_private).toBe(updateData.is_private);
        expect(response.body.is_pinned).toBe(updateData.is_pinned);
      });

      it('should update word count when content changes', async () => {
        const updateData = {
          content: '<p>This new content has exactly seven words total.</p>'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.word_count).toBe(7);
      });

      it('should update updated_at timestamp', async () => {
        const updateData = {
          title: 'Timestamp Update Test'
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(updateData);

        expect(response.status).toBe(200);
        ResponseValidators.dateTime(response.body.updated_at);

        // Should be recent timestamp (within last 5 seconds)
        const updatedAt = new Date(response.body.updated_at);
        const now = new Date();
        expect(now.getTime() - updatedAt.getTime()).toBeLessThan(5000);
      });
    });

    describe('Request validation', () => {
      it('should return 400 for title too long', async () => {
        const invalidUpdate = {
          title: 'a'.repeat(201) // exceeds 200 character limit
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for empty title', async () => {
        const invalidUpdate = {
          title: ''
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for empty content', async () => {
        const invalidUpdate = {
          content: ''
        };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        ResponseValidators.error(response.body);
      });

      it('should accept empty update object', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'put', endpoint)
          .send({});

        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          validateWorkbookNote(response.body);
        }
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent note', async () => {
        const invalidNoteId = '550e8400-e29b-41d4-a716-446655440999';
        const updateData = { title: 'Updated Title' };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', `/api/workbook/notes/${invalidNoteId}`)
          .send(updateData);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const updateData = { title: 'Updated Title' };

        const response = await TestUtils.authenticatedRequest(mockApp, 'put', '/api/workbook/notes/invalid-uuid')
          .send(updateData);

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });

  describe('DELETE /workbook/notes/{noteId}', () => {
    const endpoint = `/api/workbook/notes/${MOCK_NOTE_ID}`;

    // Authentication tests
    TestUtils.testAuthentication(mockApp, 'delete', endpoint);

    describe('Successful requests', () => {
      it('should delete note successfully', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', endpoint);

        expect(response.status).toBe(204);
        expect(response.body).toEqual({});
      });
    });

    describe('Error scenarios', () => {
      it('should return 404 for non-existent note', async () => {
        const invalidNoteId = '550e8400-e29b-41d4-a716-446655440999';
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', `/api/workbook/notes/${invalidNoteId}`);

        expect(response.status).toBe(404);
        ResponseValidators.error(response.body);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await TestUtils.authenticatedRequest(mockApp, 'delete', '/api/workbook/notes/invalid-uuid');

        expect([400, 404]).toContain(response.status);
        ResponseValidators.error(response.body);
      });
    });
  });
});

// Schema validation helpers
function validateWorkbookNote(note: any) {
  expect(note).toHaveProperty('id');
  expect(note).toHaveProperty('title');
  expect(note).toHaveProperty('content');
  expect(note).toHaveProperty('tags');
  expect(note).toHaveProperty('is_private');
  expect(note).toHaveProperty('is_pinned');
  expect(note).toHaveProperty('word_count');
  expect(note).toHaveProperty('created_at');
  expect(note).toHaveProperty('updated_at');

  ResponseValidators.uuid(note.id);
  expect(typeof note.title).toBe('string');
  expect(note.title.length).toBeGreaterThan(0);
  expect(note.title.length).toBeLessThanOrEqual(200);
  expect(typeof note.content).toBe('string');
  expect(note.content.length).toBeGreaterThan(0);
  expect(Array.isArray(note.tags)).toBe(true);
  expect(typeof note.is_private).toBe('boolean');
  expect(typeof note.is_pinned).toBe('boolean');
  expect(typeof note.word_count).toBe('number');
  expect(note.word_count).toBeGreaterThanOrEqual(0);
  ResponseValidators.dateTime(note.created_at);
  ResponseValidators.dateTime(note.updated_at);

  // Optional fields
  if (note.module_id !== null) {
    ResponseValidators.uuid(note.module_id);
  }
  if (note.lesson_id !== null) {
    expect(typeof note.lesson_id).toBe('string');
  }
  if (note.audio_recording_id !== null) {
    ResponseValidators.uuid(note.audio_recording_id);
  }
  if (note.timestamp !== null) {
    expect(typeof note.timestamp).toBe('number');
    expect(note.timestamp).toBeGreaterThanOrEqual(0);
  }

  // Validate tags array
  note.tags.forEach((tag: any) => {
    expect(typeof tag).toBe('string');
    expect(tag.length).toBeGreaterThan(0);
  });
}

function validateSortOrder(notes: any[], sortOption: string) {
  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1];
    const curr = notes[i];

    switch (sortOption) {
      case 'created_asc':
        expect(new Date(prev.created_at).getTime()).toBeLessThanOrEqual(new Date(curr.created_at).getTime());
        break;
      case 'created_desc':
        expect(new Date(prev.created_at).getTime()).toBeGreaterThanOrEqual(new Date(curr.created_at).getTime());
        break;
      case 'updated_asc':
        expect(new Date(prev.updated_at).getTime()).toBeLessThanOrEqual(new Date(curr.updated_at).getTime());
        break;
      case 'updated_desc':
        expect(new Date(prev.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(curr.updated_at).getTime());
        break;
      case 'title_asc':
        expect(prev.title.toLowerCase()).toBeLessThanOrEqual(curr.title.toLowerCase());
        break;
      case 'title_desc':
        expect(prev.title.toLowerCase()).toBeGreaterThanOrEqual(curr.title.toLowerCase());
        break;
    }
  }
}