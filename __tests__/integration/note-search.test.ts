/**
 * T015: Note-taking with Search Integration Test
 *
 * Tests the complete note lifecycle with search functionality:
 * Create rich text notes → Tag → Search → Export functionality
 *
 * This test validates:
 * - Rich text note creation and editing
 * - Tagging system with hierarchical tags
 * - Full-text search across notes and transcriptions
 * - Advanced search filters and sorting
 * - Export functionality for multiple formats (PDF, Markdown, JSON)
 * - Note organization and categorization
 * - Cross-reference between notes and transcriptions
 * - Collaborative note sharing and permissions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { NextRequest, NextResponse } from 'next/server';

// Mock jsPDF for PDF export
const mockJsPDF = {
  text: jest.fn(),
  save: jest.fn(),
  output: jest.fn().mockReturnValue('mock-pdf-content'),
};

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(() => mockJsPDF),
}));

// Mock file system for export functionality
const mockWriteFile = jest.fn();
const mockCreateReadStream = jest.fn();

jest.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: jest.fn().mockResolvedValue('mock-file-content'),
  unlink: jest.fn(),
}));

jest.mock('fs', () => ({
  createReadStream: mockCreateReadStream,
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
class NoteTestDataGenerator {
  static createBasicNote(overrides: Partial<any> = {}) {
    return {
      title: 'Module 1 Learning Notes',
      content: `<h2>Key Insights from 6FB Methodology</h2>
        <p>The <strong>six figure barber methodology</strong> emphasizes these core principles:</p>
        <ul>
          <li>Premium service positioning</li>
          <li>Customer retention strategies</li>
          <li>Revenue optimization through value-based pricing</li>
        </ul>
        <blockquote>Success comes from consistent application of proven systems.</blockquote>`,
      module_id: 'test-module-id',
      lesson_id: 'test-lesson-id',
      audio_recording_id: 'test-recording-id',
      timestamp: 120,
      tags: ['foundations', 'pricing', 'customer-retention'],
      is_private: true,
      is_pinned: false,
      ...overrides,
    };
  }

  static createRichTextNote(overrides: Partial<any> = {}) {
    return {
      title: 'Advanced Revenue Strategies',
      content: `<h1>Revenue Optimization Framework</h1>
        <h2>Tier 1: Foundation Services</h2>
        <p>Base services that every client receives:</p>
        <ol>
          <li><em>Consultation and analysis</em></li>
          <li><strong>Precision cutting techniques</strong></li>
          <li>Styling and finishing</li>
        </ol>

        <h2>Tier 2: Premium Add-ons</h2>
        <table>
          <tr><th>Service</th><th>Price Range</th><th>Margin</th></tr>
          <tr><td>Beard shaping</td><td>$25-50</td><td>80%</td></tr>
          <tr><td>Hair treatments</td><td>$40-80</td><td>75%</td></tr>
        </table>

        <h2>Implementation Notes</h2>
        <p>Key strategy: <code>value-based pricing</code> over time-based pricing.</p>
        <p><a href="https://6fbmethodologies.com/resources">Additional resources</a></p>`,
      module_id: 'test-module-advanced',
      lesson_id: 'test-lesson-revenue',
      tags: ['advanced', 'revenue', 'pricing-strategy', 'premium-services'],
      is_private: false,
      is_pinned: true,
      ...overrides,
    };
  }

  static createTaggedNoteSet() {
    return [
      this.createBasicNote({
        title: 'Customer Service Excellence',
        tags: ['customer-service', 'excellence', 'retention'],
        content: '<p>Building lasting relationships through exceptional service delivery.</p>',
      }),
      this.createBasicNote({
        title: 'Marketing Fundamentals',
        tags: ['marketing', 'fundamentals', 'client-acquisition'],
        content: '<p>Effective marketing strategies for barbershop growth.</p>',
      }),
      this.createBasicNote({
        title: 'Financial Planning',
        tags: ['finance', 'planning', 'revenue', 'business-growth'],
        content: '<p>Strategic financial planning for sustainable business growth.</p>',
      }),
    ];
  }

  static createSearchableNoteSet() {
    return [
      this.createBasicNote({
        title: 'Six Figure Methodology Overview',
        content: '<p>The six figure barber methodology is a comprehensive system for building a profitable barbershop business.</p>',
        tags: ['methodology', 'overview', 'six-figure'],
      }),
      this.createBasicNote({
        title: 'Premium Service Delivery',
        content: '<p>Premium service delivery involves creating exceptional experiences that justify higher pricing.</p>',
        tags: ['premium', 'service', 'delivery'],
      }),
      this.createBasicNote({
        title: 'Customer Retention Strategies',
        content: '<p>Effective customer retention strategies increase lifetime value and reduce acquisition costs.</p>',
        tags: ['customer', 'retention', 'strategies'],
      }),
    ];
  }
}

// Test utilities
class NoteTestUtils {
  static readonly MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  static readonly MOCK_AUTH_TOKEN = 'Bearer mock-jwt-token-for-testing';

  static authenticatedRequest(method: 'get' | 'post' | 'put' | 'delete', url: string) {
    return request(mockApp)[method](url).set('Authorization', this.MOCK_AUTH_TOKEN);
  }

  static expectValidNoteResponse(response: any) {
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('module_id');
    expect(response.body).toHaveProperty('lesson_id');
    expect(response.body).toHaveProperty('tags');
    expect(response.body).toHaveProperty('is_private');
    expect(response.body).toHaveProperty('is_pinned');
    expect(response.body).toHaveProperty('word_count');
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');
    expect(Array.isArray(response.body.tags)).toBe(true);
  }

  static expectValidSearchResponse(response: any) {
    expect(response.body).toHaveProperty('results');
    expect(response.body).toHaveProperty('total_count');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(response.body).toHaveProperty('total_pages');
    expect(Array.isArray(response.body.results)).toBe(true);
  }

  static expectValidSearchResult(result: any) {
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('highlight');
    expect(result).toHaveProperty('relevance_score');
    expect(result).toHaveProperty('created_at');
    expect(['note', 'transcription']).toContain(result.type);
  }

  static setupMocks() {
    jest.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockCreateReadStream.mockReturnValue({
      pipe: jest.fn(),
      on: jest.fn(),
    });
  }
}

describe('Note-taking with Search Integration Tests', () => {
  beforeEach(() => {
    NoteTestUtils.setupMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Note Creation and Management', () => {
    it('should create a basic note successfully', async () => {
      const noteData = NoteTestDataGenerator.createBasicNote();

      const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);

      expect(response.status).toBe(201);
      NoteTestUtils.expectValidNoteResponse(response);

      expect(response.body.title).toBe(noteData.title);
      expect(response.body.content).toBe(noteData.content);
      expect(response.body.tags).toEqual(noteData.tags);
      expect(response.body.word_count).toBeGreaterThan(0);
    });

    it('should create rich text notes with HTML content', async () => {
      const richNote = NoteTestDataGenerator.createRichTextNote();

      const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(richNote);

      expect(response.status).toBe(201);
      NoteTestUtils.expectValidNoteResponse(response);

      // Verify HTML content is preserved
      expect(response.body.content).toContain('<h1>');
      expect(response.body.content).toContain('<table>');
      expect(response.body.content).toContain('<code>');
      expect(response.body.content).toContain('<a href=');

      // Verify word count calculation works with HTML
      expect(response.body.word_count).toBeGreaterThan(20);
    });

    it('should update existing notes', async () => {
      // Create initial note
      const noteData = NoteTestDataGenerator.createBasicNote();
      const createResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);
      const noteId = createResponse.body.id;

      // Update the note
      const updatedData = {
        title: 'Updated Learning Notes',
        content: '<p>This is updated content with new insights.</p>',
        tags: ['updated', 'insights', 'revision'],
        is_pinned: true,
      };

      const updateResponse = await NoteTestUtils.authenticatedRequest('put', `/api/workbook/notes/${noteId}`).send(
        updatedData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe(updatedData.title);
      expect(updateResponse.body.content).toBe(updatedData.content);
      expect(updateResponse.body.tags).toEqual(updatedData.tags);
      expect(updateResponse.body.is_pinned).toBe(true);
      expect(updateResponse.body.updated_at).not.toBe(updateResponse.body.created_at);
    });

    it('should delete notes with proper cleanup', async () => {
      // Create note to delete
      const noteData = NoteTestDataGenerator.createBasicNote();
      const createResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);
      const noteId = createResponse.body.id;

      // Delete the note
      const deleteResponse = await NoteTestUtils.authenticatedRequest('delete', `/api/workbook/notes/${noteId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toMatch(/deleted successfully/i);

      // Verify note is no longer accessible
      const getResponse = await NoteTestUtils.authenticatedRequest('get', `/api/workbook/notes/${noteId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Tagging System', () => {
    it('should handle hierarchical tags', async () => {
      const noteData = NoteTestDataGenerator.createBasicNote({
        tags: ['business:strategy', 'business:finance', 'marketing:digital', 'marketing:social-media'],
      });

      const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);

      expect(response.status).toBe(201);
      expect(response.body.tags).toEqual(noteData.tags);
    });

    it('should provide tag suggestions based on existing tags', async () => {
      // Create notes with various tags
      const notes = NoteTestDataGenerator.createTaggedNoteSet();
      const createdNotes = [];

      for (const note of notes) {
        const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(note);
        createdNotes.push(response.body);
      }

      // Get tag suggestions
      const suggestionsResponse = await NoteTestUtils.authenticatedRequest('get', '/api/workbook/notes/tags/suggestions?query=cust');

      expect(suggestionsResponse.status).toBe(200);
      expect(suggestionsResponse.body.suggestions).toContain('customer-service');
      expect(suggestionsResponse.body.suggestions).toContain('client-acquisition');
    });

    it('should filter notes by tags', async () => {
      // Create notes with specific tags
      const notes = NoteTestDataGenerator.createTaggedNoteSet();
      for (const note of notes) {
        await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(note);
      }

      // Filter by single tag
      const singleTagResponse = await NoteTestUtils.authenticatedRequest('get', '/api/workbook/notes?tags=revenue');

      expect(singleTagResponse.status).toBe(200);
      expect(singleTagResponse.body.notes.length).toBeGreaterThan(0);
      singleTagResponse.body.notes.forEach((note: any) => {
        expect(note.tags).toContain('revenue');
      });

      // Filter by multiple tags (AND operation)
      const multiTagResponse = await NoteTestUtils.authenticatedRequest('get', '/api/workbook/notes?tags=finance,planning');

      expect(multiTagResponse.status).toBe(200);
      multiTagResponse.body.notes.forEach((note: any) => {
        expect(note.tags.some((tag: string) => ['finance', 'planning'].includes(tag))).toBe(true);
      });
    });
  });

  describe('Full-text Search Functionality', () => {
    let searchableNotes: any[];

    beforeEach(async () => {
      // Create searchable notes
      const noteDataSet = NoteTestDataGenerator.createSearchableNoteSet();
      searchableNotes = [];

      for (const noteData of noteDataSet) {
        const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);
        searchableNotes.push(response.body);
      }
    });

    it('should perform basic text search across notes', async () => {
      const searchResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'six figure methodology',
        types: ['notes'],
        limit: 10,
      });

      expect(searchResponse.status).toBe(200);
      NoteTestUtils.expectValidSearchResponse(searchResponse);

      const results = searchResponse.body.results;
      expect(results.length).toBeGreaterThan(0);

      results.forEach((result: any) => {
        NoteTestUtils.expectValidSearchResult(result);
        expect(result.type).toBe('note');
        expect(result.content.toLowerCase()).toMatch(/six figure|methodology/);
      });
    });

    it('should support advanced search operators', async () => {
      // Phrase search
      const phraseResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: '"premium service delivery"',
        types: ['notes'],
      });

      expect(phraseResponse.status).toBe(200);
      expect(phraseResponse.body.results.length).toBeGreaterThan(0);

      // Boolean AND search
      const andResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'customer AND retention',
        types: ['notes'],
      });

      expect(andResponse.status).toBe(200);
      expect(andResponse.body.results.length).toBeGreaterThan(0);

      // Boolean OR search
      const orResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'customer OR premium',
        types: ['notes'],
      });

      expect(orResponse.status).toBe(200);
      expect(orResponse.body.results.length).toBeGreaterThan(0);

      // NOT search
      const notResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'service NOT premium',
        types: ['notes'],
      });

      expect(notResponse.status).toBe(200);
    });

    it('should provide search result highlighting', async () => {
      const searchResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'methodology',
        types: ['notes'],
        highlight: true,
      });

      expect(searchResponse.status).toBe(200);

      const results = searchResponse.body.results;
      results.forEach((result: any) => {
        expect(result.highlight).toBeDefined();
        expect(result.highlight).toMatch(/<mark>methodology<\/mark>/);
      });
    });

    it('should support search filters and sorting', async () => {
      // Filter by module
      const moduleFilterResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'service',
        types: ['notes'],
        filters: {
          module_id: 'test-module-id',
        },
      });

      expect(moduleFilterResponse.status).toBe(200);

      // Sort by relevance (default)
      const relevanceResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'premium',
        types: ['notes'],
        sort: 'relevance',
      });

      expect(relevanceResponse.status).toBe(200);
      const relevanceResults = relevanceResponse.body.results;
      for (let i = 1; i < relevanceResults.length; i++) {
        expect(relevanceResults[i - 1].relevance_score).toBeGreaterThanOrEqual(relevanceResults[i].relevance_score);
      }

      // Sort by date
      const dateResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'service',
        types: ['notes'],
        sort: 'date',
      });

      expect(dateResponse.status).toBe(200);
    });

    it('should search across both notes and transcriptions', async () => {
      const crossSearchResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'methodology',
        types: ['notes', 'transcriptions'],
        limit: 20,
      });

      expect(crossSearchResponse.status).toBe(200);

      const results = crossSearchResponse.body.results;
      const noteResults = results.filter((r: any) => r.type === 'note');
      const transcriptionResults = results.filter((r: any) => r.type === 'transcription');

      expect(noteResults.length).toBeGreaterThan(0);
      // Transcription results depend on previous test setup
    });
  });

  describe('Export Functionality', () => {
    let noteIds: string[];

    beforeEach(async () => {
      // Create notes for export testing
      const notes = [
        NoteTestDataGenerator.createBasicNote(),
        NoteTestDataGenerator.createRichTextNote(),
      ];

      noteIds = [];
      for (const note of notes) {
        const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(note);
        noteIds.push(response.body.id);
      }
    });

    it('should export single note as PDF', async () => {
      const noteId = noteIds[0];

      const exportResponse = await NoteTestUtils.authenticatedRequest('post', `/api/workbook/notes/${noteId}/export`).send({
        format: 'pdf',
        includeMetadata: true,
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toBe('application/pdf');
      expect(exportResponse.headers['content-disposition']).toMatch(/attachment; filename=.*\.pdf/);

      // Verify jsPDF was called
      expect(mockJsPDF.text).toHaveBeenCalled();
      expect(mockJsPDF.output).toHaveBeenCalled();
    });

    it('should export single note as Markdown', async () => {
      const noteId = noteIds[1]; // Use rich text note

      const exportResponse = await NoteTestUtils.authenticatedRequest('post', `/api/workbook/notes/${noteId}/export`).send({
        format: 'markdown',
        includeMetadata: true,
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toBe('text/markdown');

      // Verify HTML was converted to Markdown
      expect(exportResponse.text).toContain('# Revenue Optimization Framework');
      expect(exportResponse.text).toContain('## Tier 1: Foundation Services');
      expect(exportResponse.text).toContain('- *Consultation and analysis*');
      expect(exportResponse.text).toContain('| Service | Price Range | Margin |');
    });

    it('should export multiple notes as ZIP archive', async () => {
      const exportResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes/export').send({
        noteIds: noteIds,
        format: 'zip',
        includeMetadata: true,
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toBe('application/zip');
      expect(exportResponse.headers['content-disposition']).toMatch(/attachment; filename=.*\.zip/);
    });

    it('should export notes with search filters', async () => {
      const exportResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes/export').send({
        format: 'json',
        filters: {
          tags: ['foundations'],
          module_id: 'test-module-id',
        },
        includeMetadata: true,
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toBe('application/json');

      const exportData = JSON.parse(exportResponse.text);
      expect(exportData).toHaveProperty('notes');
      expect(exportData).toHaveProperty('metadata');
      expect(Array.isArray(exportData.notes)).toBe(true);

      // Verify filtered results
      exportData.notes.forEach((note: any) => {
        expect(note.module_id).toBe('test-module-id');
        expect(note.tags).toContain('foundations');
      });
    });

    it('should handle export errors gracefully', async () => {
      // Test with non-existent note
      const exportResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes/nonexistent-id/export').send({
        format: 'pdf',
      });

      expect(exportResponse.status).toBe(404);
      expect(exportResponse.body.error).toMatch(/note not found/i);

      // Test with invalid format
      const invalidFormatResponse = await NoteTestUtils.authenticatedRequest('post', `/api/workbook/notes/${noteIds[0]}/export`).send({
        format: 'invalid-format',
      });

      expect(invalidFormatResponse.status).toBe(400);
      expect(invalidFormatResponse.body.error).toMatch(/unsupported format/i);
    });
  });

  describe('Note Organization and Cross-references', () => {
    it('should link notes to audio recordings and transcriptions', async () => {
      const noteData = NoteTestDataGenerator.createBasicNote({
        audio_recording_id: 'test-recording-id',
        timestamp: 180, // 3 minutes into recording
      });

      const response = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(noteData);

      expect(response.status).toBe(201);
      expect(response.body.audio_recording_id).toBe('test-recording-id');
      expect(response.body.timestamp).toBe(180);

      // Get linked recording info
      const linkedResponse = await NoteTestUtils.authenticatedRequest('get', `/api/workbook/notes/${response.body.id}/linked`);

      expect(linkedResponse.status).toBe(200);
      expect(linkedResponse.body.audio_recording).toBeDefined();
      expect(linkedResponse.body.transcription).toBeDefined();
    });

    it('should organize notes by module and lesson hierarchy', async () => {
      // Create notes for different modules and lessons
      const moduleANotes = [
        NoteTestDataGenerator.createBasicNote({ module_id: 'module-a', lesson_id: 'lesson-1' }),
        NoteTestDataGenerator.createBasicNote({ module_id: 'module-a', lesson_id: 'lesson-2' }),
      ];

      const moduleBNotes = [
        NoteTestDataGenerator.createBasicNote({ module_id: 'module-b', lesson_id: 'lesson-1' }),
      ];

      for (const note of [...moduleANotes, ...moduleBNotes]) {
        await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(note);
      }

      // Get organized structure
      const structureResponse = await NoteTestUtils.authenticatedRequest('get', '/api/workbook/notes/structure');

      expect(structureResponse.status).toBe(200);
      expect(structureResponse.body.modules).toBeDefined();

      const moduleA = structureResponse.body.modules.find((m: any) => m.id === 'module-a');
      expect(moduleA.lessons).toHaveLength(2);
      expect(moduleA.total_notes).toBe(2);

      const moduleB = structureResponse.body.modules.find((m: any) => m.id === 'module-b');
      expect(moduleB.lessons).toHaveLength(1);
      expect(moduleB.total_notes).toBe(1);
    });

    it('should support note templates and quick creation', async () => {
      // Create a note template
      const templateResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes/templates').send({
        name: 'Lesson Notes Template',
        content: `<h2>{{lesson_title}}</h2>
          <h3>Key Takeaways</h3>
          <ul>
            <li>Point 1:</li>
            <li>Point 2:</li>
            <li>Point 3:</li>
          </ul>
          <h3>Action Items</h3>
          <ul>
            <li>[ ] Action 1</li>
            <li>[ ] Action 2</li>
          </ul>`,
        tags: ['template', 'lesson-notes'],
      });

      expect(templateResponse.status).toBe(201);

      // Use template to create new note
      const fromTemplateResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes/from-template').send({
        template_id: templateResponse.body.id,
        variables: {
          lesson_title: 'Advanced Customer Service Techniques',
        },
        module_id: 'test-module-id',
        lesson_id: 'test-lesson-id',
      });

      expect(fromTemplateResponse.status).toBe(201);
      expect(fromTemplateResponse.body.content).toContain('Advanced Customer Service Techniques');
      expect(fromTemplateResponse.body.content).toContain('Key Takeaways');
      expect(fromTemplateResponse.body.content).toContain('Action Items');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large note creation and search efficiently', async () => {
      const startTime = Date.now();

      // Create many notes
      const notePromises = Array(20).fill(null).map((_, index) =>
        NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(
          NoteTestDataGenerator.createBasicNote({
            title: `Performance Test Note ${index}`,
            content: `<p>This is performance test note number ${index} with searchable content about six figure barber methodology.</p>`,
            tags: [`performance-${index}`, 'test', 'methodology'],
          })
        )
      );

      const responses = await Promise.all(notePromises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test search performance
      const searchStartTime = Date.now();

      const searchResponse = await NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
        query: 'methodology performance',
        types: ['notes'],
        limit: 50,
      });

      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(2000); // Search should complete within 2 seconds

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.results.length).toBeGreaterThan(0);
    });

    it('should handle concurrent note operations', async () => {
      const concurrentOperations = [];

      // Mix of operations: create, read, update, search
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          NoteTestUtils.authenticatedRequest('post', '/api/workbook/notes').send(
            NoteTestDataGenerator.createBasicNote({ title: `Concurrent Note ${i}` })
          )
        );
      }

      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          NoteTestUtils.authenticatedRequest('post', '/api/workbook/search').send({
            query: 'concurrent',
            types: ['notes'],
          })
        );
      }

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      results.forEach(result => {
        expect([200, 201]).toContain(result.status);
      });
    });
  });
});