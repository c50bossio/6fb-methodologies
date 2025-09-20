/**
 * Notes Service
 * Single responsibility: Handle workshop note management
 */

import {
  INotesService,
  SessionNote,
  NotesSearchFilter,
  NoteCategory,
  NoteStatus,
  ServiceResult,
  ServiceDependencies,
} from './interfaces';

export class NotesService implements INotesService {
  private dependencies: ServiceDependencies;
  private notes: Map<string, SessionNote> = new Map();
  private notesByUser: Map<string, string[]> = new Map();
  private notesBySession: Map<string, string[]> = new Map();
  private enableLogging: boolean;

  constructor(
    dependencies: ServiceDependencies = {},
    enableLogging: boolean = true
  ) {
    this.dependencies = dependencies;
    this.enableLogging = enableLogging;
  }

  async createNote(
    note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResult<SessionNote>> {
    try {
      // Validate note data
      const validation = this.validateNoteData(note);
      if (!validation.success) {
        return validation;
      }

      const now = new Date();
      const newNote: SessionNote = {
        ...note,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now,
      };

      // Store note
      this.notes.set(newNote.id, newNote);

      // Update indexes
      this.addToUserIndex(newNote.userId, newNote.id);
      this.addToSessionIndex(newNote.sessionId, newNote.id);

      this.log(
        `Note created: ${newNote.id} for user ${newNote.userId}`,
        'info'
      );
      return { success: true, data: newNote };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create note';
      this.log(`Note creation failed: ${message}`, 'error');
      return { success: false, error: message, code: 'CREATE_FAILED' };
    }
  }

  async updateNote(
    id: string,
    updates: Partial<SessionNote>
  ): Promise<ServiceResult<SessionNote>> {
    try {
      const existingNote = this.notes.get(id);
      if (!existingNote) {
        return { success: false, error: 'Note not found', code: 'NOT_FOUND' };
      }

      // Validate updates
      if (updates.id && updates.id !== id) {
        return {
          success: false,
          error: 'Cannot change note ID',
          code: 'INVALID_UPDATE',
        };
      }

      // Apply updates
      const updatedNote: SessionNote = {
        ...existingNote,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      // Re-validate the updated note
      const validation = this.validateNoteData(updatedNote);
      if (!validation.success) {
        return validation;
      }

      // Update indexes if userId or sessionId changed
      if (updates.userId && updates.userId !== existingNote.userId) {
        this.removeFromUserIndex(existingNote.userId, id);
        this.addToUserIndex(updates.userId, id);
      }

      if (updates.sessionId && updates.sessionId !== existingNote.sessionId) {
        this.removeFromSessionIndex(existingNote.sessionId, id);
        this.addToSessionIndex(updates.sessionId, id);
      }

      // Store updated note
      this.notes.set(id, updatedNote);

      this.log(`Note updated: ${id}`, 'info');
      return { success: true, data: updatedNote };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update note';
      this.log(`Note update failed: ${message}`, 'error');
      return { success: false, error: message, code: 'UPDATE_FAILED' };
    }
  }

  async deleteNote(id: string): Promise<ServiceResult<void>> {
    try {
      const note = this.notes.get(id);
      if (!note) {
        return { success: false, error: 'Note not found', code: 'NOT_FOUND' };
      }

      // Remove from indexes
      this.removeFromUserIndex(note.userId, id);
      this.removeFromSessionIndex(note.sessionId, id);

      // Delete note
      this.notes.delete(id);

      this.log(`Note deleted: ${id}`, 'info');
      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete note';
      this.log(`Note deletion failed: ${message}`, 'error');
      return { success: false, error: message, code: 'DELETE_FAILED' };
    }
  }

  async getNote(id: string): Promise<ServiceResult<SessionNote>> {
    const note = this.notes.get(id);
    if (!note) {
      return { success: false, error: 'Note not found', code: 'NOT_FOUND' };
    }
    return { success: true, data: note };
  }

  async searchNotes(
    filter: NotesSearchFilter
  ): Promise<ServiceResult<SessionNote[]>> {
    try {
      let candidateNotes: SessionNote[] = [];

      // Start with the most restrictive filter
      if (filter.userId) {
        const userNoteIds = this.notesByUser.get(filter.userId) || [];
        candidateNotes = userNoteIds
          .map(id => this.notes.get(id)!)
          .filter(Boolean);
      } else if (filter.sessionId) {
        const sessionNoteIds = this.notesBySession.get(filter.sessionId) || [];
        candidateNotes = sessionNoteIds
          .map(id => this.notes.get(id)!)
          .filter(Boolean);
      } else {
        candidateNotes = Array.from(this.notes.values());
      }

      // Apply remaining filters
      const filteredNotes = candidateNotes.filter(note => {
        // Session filter (if not already applied)
        if (
          filter.sessionId &&
          !filter.userId &&
          note.sessionId !== filter.sessionId
        ) {
          return false;
        }

        // Category filter
        if (filter.category && note.category !== filter.category) {
          return false;
        }

        // Status filter
        if (filter.status && note.status !== filter.status) {
          return false;
        }

        // Tags filter
        if (filter.tags && filter.tags.length > 0) {
          const hasAllTags = filter.tags.every(tag => note.tags.includes(tag));
          if (!hasAllTags) {
            return false;
          }
        }

        // Date range filter
        if (filter.dateRange) {
          const noteDate = note.createdAt;
          if (
            noteDate < filter.dateRange.start ||
            noteDate > filter.dateRange.end
          ) {
            return false;
          }
        }

        // Transcription filter
        if (filter.hasTranscription !== undefined) {
          const hasTranscription = !!note.transcriptionId;
          if (hasTranscription !== filter.hasTranscription) {
            return false;
          }
        }

        // Audio filter
        if (filter.hasAudio !== undefined) {
          const hasAudio = !!note.audioRecordingId;
          if (hasAudio !== filter.hasAudio) {
            return false;
          }
        }

        return true;
      });

      // Sort by creation date (newest first)
      filteredNotes.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      this.log(`Search completed: ${filteredNotes.length} notes found`, 'info');
      return { success: true, data: filteredNotes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      this.log(`Note search failed: ${message}`, 'error');
      return { success: false, error: message, code: 'SEARCH_FAILED' };
    }
  }

  async linkTranscription(
    noteId: string,
    transcriptionId: string
  ): Promise<ServiceResult<void>> {
    try {
      const note = this.notes.get(noteId);
      if (!note) {
        return { success: false, error: 'Note not found', code: 'NOT_FOUND' };
      }

      const updatedNote = {
        ...note,
        transcriptionId,
        updatedAt: new Date(),
      };

      this.notes.set(noteId, updatedNote);
      this.log(
        `Transcription linked to note: ${noteId} -> ${transcriptionId}`,
        'info'
      );
      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to link transcription';
      this.log(`Transcription linking failed: ${message}`, 'error');
      return { success: false, error: message, code: 'LINK_FAILED' };
    }
  }

  async linkAudioRecording(
    noteId: string,
    recordingId: string
  ): Promise<ServiceResult<void>> {
    try {
      const note = this.notes.get(noteId);
      if (!note) {
        return { success: false, error: 'Note not found', code: 'NOT_FOUND' };
      }

      const updatedNote = {
        ...note,
        audioRecordingId: recordingId,
        updatedAt: new Date(),
      };

      this.notes.set(noteId, updatedNote);
      this.log(
        `Audio recording linked to note: ${noteId} -> ${recordingId}`,
        'info'
      );
      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to link audio recording';
      this.log(`Audio recording linking failed: ${message}`, 'error');
      return { success: false, error: message, code: 'LINK_FAILED' };
    }
  }

  // ==================== UTILITY METHODS ====================

  async getNoteStats(
    userId?: string,
    sessionId?: string
  ): Promise<
    ServiceResult<{
      total: number;
      byCategory: Record<NoteCategory, number>;
      byStatus: Record<NoteStatus, number>;
      withTranscription: number;
      withAudio: number;
    }>
  > {
    try {
      const filter: NotesSearchFilter = {};
      if (userId) filter.userId = userId;
      if (sessionId) filter.sessionId = sessionId;

      const notesResult = await this.searchNotes(filter);
      if (!notesResult.success) {
        return notesResult;
      }

      const notes = notesResult.data;
      const stats = {
        total: notes.length,
        byCategory: {
          'session-note': 0,
          insight: 0,
          'action-item': 0,
          question: 0,
          reflection: 0,
        } as Record<NoteCategory, number>,
        byStatus: {
          draft: 0,
          published: 0,
          archived: 0,
        } as Record<NoteStatus, number>,
        withTranscription: 0,
        withAudio: 0,
      };

      notes.forEach(note => {
        stats.byCategory[note.category]++;
        stats.byStatus[note.status]++;
        if (note.transcriptionId) stats.withTranscription++;
        if (note.audioRecordingId) stats.withAudio++;
      });

      return { success: true, data: stats };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get stats';
      return { success: false, error: message, code: 'STATS_FAILED' };
    }
  }

  // ==================== PRIVATE METHODS ====================

  private validateNoteData(note: Partial<SessionNote>): ServiceResult<void> {
    if (!note.userId?.trim()) {
      return {
        success: false,
        error: 'User ID is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (!note.sessionId?.trim()) {
      return {
        success: false,
        error: 'Session ID is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (!note.title?.trim()) {
      return {
        success: false,
        error: 'Title is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (!note.content?.trim()) {
      return {
        success: false,
        error: 'Content is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (note.title && note.title.length > 200) {
      return {
        success: false,
        error: 'Title too long (max 200 characters)',
        code: 'VALIDATION_FAILED',
      };
    }

    if (note.content && note.content.length > 10000) {
      return {
        success: false,
        error: 'Content too long (max 10000 characters)',
        code: 'VALIDATION_FAILED',
      };
    }

    const validCategories: NoteCategory[] = [
      'session-note',
      'insight',
      'action-item',
      'question',
      'reflection',
    ];
    if (note.category && !validCategories.includes(note.category)) {
      return {
        success: false,
        error: 'Invalid note category',
        code: 'VALIDATION_FAILED',
      };
    }

    const validStatuses: NoteStatus[] = ['draft', 'published', 'archived'];
    if (note.status && !validStatuses.includes(note.status)) {
      return {
        success: false,
        error: 'Invalid note status',
        code: 'VALIDATION_FAILED',
      };
    }

    return { success: true, data: undefined };
  }

  private addToUserIndex(userId: string, noteId: string): void {
    const userNotes = this.notesByUser.get(userId) || [];
    if (!userNotes.includes(noteId)) {
      userNotes.push(noteId);
      this.notesByUser.set(userId, userNotes);
    }
  }

  private removeFromUserIndex(userId: string, noteId: string): void {
    const userNotes = this.notesByUser.get(userId) || [];
    const index = userNotes.indexOf(noteId);
    if (index > -1) {
      userNotes.splice(index, 1);
      this.notesByUser.set(userId, userNotes);
    }
  }

  private addToSessionIndex(sessionId: string, noteId: string): void {
    const sessionNotes = this.notesBySession.get(sessionId) || [];
    if (!sessionNotes.includes(noteId)) {
      sessionNotes.push(noteId);
      this.notesBySession.set(sessionId, sessionNotes);
    }
  }

  private removeFromSessionIndex(sessionId: string, noteId: string): void {
    const sessionNotes = this.notesBySession.get(sessionId) || [];
    const index = sessionNotes.indexOf(noteId);
    if (index > -1) {
      sessionNotes.splice(index, 1);
      this.notesBySession.set(sessionId, sessionNotes);
    }
  }

  private generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.enableLogging && this.dependencies.logger) {
      this.dependencies.logger(`[NotesService] ${message}`, level);
    }
  }
}
