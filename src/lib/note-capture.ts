'use client';

// Note Capture System for 6FB Workbook
// Handles saving and managing user notes during workshop sessions

import { loadUserProgress, saveUserProgress } from './workbook-auth';

// Note types and categories
export type NoteCategory =
  | 'session-note'
  | 'reflection'
  | 'action-item'
  | 'question'
  | 'insight'
  | 'follow-up';
export type NoteSpeaker = 'Dre' | 'Nate' | 'Bossio' | 'Attendee';

// Session note interface
export interface SessionNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: NoteCategory;
  speaker?: NoteSpeaker;
  day?: 1 | 2;
  session?: string;
  tags: string[];
  timestamp: Date;
  lastModified: Date;
  isPrivate: boolean;
  attachments?: {
    audioRecordingId?: string;
    transcriptionId?: string;
    images?: string[];
  };
  metadata?: {
    location?: string;
    confidence?: number;
    source?: 'manual' | 'audio' | 'transcription';
  };
}

// Note creation data
export interface CreateNoteData {
  title: string;
  content: string;
  category: NoteCategory;
  speaker?: NoteSpeaker;
  day?: 1 | 2;
  session?: string;
  tags?: string[];
  isPrivate?: boolean;
  attachments?: SessionNote['attachments'];
  metadata?: SessionNote['metadata'];
}

// Note query options
export interface NoteQueryOptions {
  category?: NoteCategory;
  speaker?: NoteSpeaker;
  day?: 1 | 2;
  session?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  includePrivate?: boolean;
  searchText?: string;
}

// Statistics interface
export interface NoteStats {
  totalNotes: number;
  notesByCategory: Record<NoteCategory, number>;
  notesByDay: Record<string, number>;
  notesBySpeaker: Record<NoteSpeaker, number>;
  tagsUsed: Record<string, number>;
  averageNoteLength: number;
  lastNoteTime?: Date;
}

// Generate unique note ID
function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Save a new note
export function saveNote(userId: string, noteData: CreateNoteData): string {
  try {
    const noteId = generateNoteId();
    const now = new Date();

    const note: SessionNote = {
      id: noteId,
      userId,
      title: noteData.title,
      content: noteData.content,
      category: noteData.category,
      speaker: noteData.speaker,
      day: noteData.day,
      session: noteData.session,
      tags: noteData.tags || [],
      timestamp: now,
      lastModified: now,
      isPrivate: noteData.isPrivate ?? false,
      attachments: noteData.attachments,
      metadata: noteData.metadata,
    };

    // Get existing notes
    const existingNotes =
      loadUserProgress<SessionNote[]>(userId, 'session_notes') || [];

    // Add new note
    existingNotes.push(note);

    // Save updated notes
    saveUserProgress(userId, 'session_notes', existingNotes);

    return noteId;
  } catch (error) {
    console.error('Failed to save note:', error);
    throw new Error('Unable to save note');
  }
}

// Update an existing note
export function updateNote(
  userId: string,
  noteId: string,
  updates: Partial<CreateNoteData>
): boolean {
  try {
    const notes =
      loadUserProgress<SessionNote[]>(userId, 'session_notes') || [];
    const noteIndex = notes.findIndex(
      n => n.id === noteId && n.userId === userId
    );

    if (noteIndex === -1) {
      return false;
    }

    // Update the note
    const existingNote = notes[noteIndex];
    notes[noteIndex] = {
      ...existingNote,
      ...updates,
      lastModified: new Date(),
      // Preserve read-only fields
      id: existingNote.id,
      userId: existingNote.userId,
      timestamp: existingNote.timestamp,
    };

    // Save updated notes
    saveUserProgress(userId, 'session_notes', notes);

    return true;
  } catch (error) {
    console.error('Failed to update note:', error);
    return false;
  }
}

// Get a specific note by ID
export function getNote(userId: string, noteId: string): SessionNote | null {
  try {
    const notes =
      loadUserProgress<SessionNote[]>(userId, 'session_notes') || [];
    return notes.find(n => n.id === noteId && n.userId === userId) || null;
  } catch (error) {
    console.error('Failed to get note:', error);
    return null;
  }
}

// Get all notes for a user
export function getUserNotes(
  userId: string,
  options: NoteQueryOptions = {}
): SessionNote[] {
  try {
    let notes = loadUserProgress<SessionNote[]>(userId, 'session_notes') || [];

    // Apply filters
    if (options.category) {
      notes = notes.filter(n => n.category === options.category);
    }

    if (options.speaker) {
      notes = notes.filter(n => n.speaker === options.speaker);
    }

    if (options.day) {
      notes = notes.filter(n => n.day === options.day);
    }

    if (options.session) {
      notes = notes.filter(n => n.session === options.session);
    }

    if (options.tags && options.tags.length > 0) {
      notes = notes.filter(n =>
        options.tags!.some(tag => n.tags.includes(tag))
      );
    }

    if (options.startDate) {
      notes = notes.filter(n => n.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      notes = notes.filter(n => n.timestamp <= options.endDate!);
    }

    if (options.includePrivate === false) {
      notes = notes.filter(n => !n.isPrivate);
    }

    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      notes = notes.filter(
        n =>
          n.title.toLowerCase().includes(searchLower) ||
          n.content.toLowerCase().includes(searchLower) ||
          n.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by timestamp (newest first)
    notes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return notes;
  } catch (error) {
    console.error('Failed to get user notes:', error);
    return [];
  }
}

// Delete a note
export function deleteNote(userId: string, noteId: string): boolean {
  try {
    const notes =
      loadUserProgress<SessionNote[]>(userId, 'session_notes') || [];
    const filteredNotes = notes.filter(
      n => !(n.id === noteId && n.userId === userId)
    );

    if (filteredNotes.length === notes.length) {
      return false; // Note not found
    }

    saveUserProgress(userId, 'session_notes', filteredNotes);
    return true;
  } catch (error) {
    console.error('Failed to delete note:', error);
    return false;
  }
}

// Get note statistics
export function getNoteStats(userId: string): NoteStats {
  try {
    const notes = getUserNotes(userId);

    const stats: NoteStats = {
      totalNotes: notes.length,
      notesByCategory: {
        'session-note': 0,
        reflection: 0,
        'action-item': 0,
        question: 0,
        insight: 0,
        'follow-up': 0,
      },
      notesByDay: {},
      notesBySpeaker: {
        Dre: 0,
        Nate: 0,
        Bossio: 0,
        Attendee: 0,
      },
      tagsUsed: {},
      averageNoteLength: 0,
      lastNoteTime: undefined,
    };

    if (notes.length === 0) {
      return stats;
    }

    let totalContentLength = 0;

    notes.forEach(note => {
      // Category stats
      stats.notesByCategory[note.category]++;

      // Day stats
      if (note.day) {
        const dayKey = `Day ${note.day}`;
        stats.notesByDay[dayKey] = (stats.notesByDay[dayKey] || 0) + 1;
      }

      // Speaker stats
      if (note.speaker) {
        stats.notesBySpeaker[note.speaker]++;
      }

      // Tag stats
      note.tags.forEach(tag => {
        stats.tagsUsed[tag] = (stats.tagsUsed[tag] || 0) + 1;
      });

      // Content length
      totalContentLength += note.content.length;

      // Last note time
      if (!stats.lastNoteTime || note.timestamp > stats.lastNoteTime) {
        stats.lastNoteTime = note.timestamp;
      }
    });

    stats.averageNoteLength = Math.round(totalContentLength / notes.length);

    return stats;
  } catch (error) {
    console.error('Failed to get note stats:', error);
    return {
      totalNotes: 0,
      notesByCategory: {
        'session-note': 0,
        reflection: 0,
        'action-item': 0,
        question: 0,
        insight: 0,
        'follow-up': 0,
      },
      notesByDay: {},
      notesBySpeaker: {
        Dre: 0,
        Nate: 0,
        Bossio: 0,
        Attendee: 0,
      },
      tagsUsed: {},
      averageNoteLength: 0,
    };
  }
}

// Get notes by session
export function getSessionNotes(
  userId: string,
  day: 1 | 2,
  session: string
): SessionNote[] {
  return getUserNotes(userId, { day, session });
}

// Get notes by speaker
export function getSpeakerNotes(
  userId: string,
  speaker: NoteSpeaker
): SessionNote[] {
  return getUserNotes(userId, { speaker });
}

// Get recent notes
export function getRecentNotes(
  userId: string,
  limit: number = 10
): SessionNote[] {
  const notes = getUserNotes(userId);
  return notes.slice(0, limit);
}

// Search notes
export function searchNotes(userId: string, searchText: string): SessionNote[] {
  return getUserNotes(userId, { searchText });
}

// Export notes to different formats
export function exportNotes(
  userId: string,
  format: 'json' | 'markdown' | 'csv' = 'json'
): string {
  try {
    const notes = getUserNotes(userId);

    switch (format) {
      case 'json':
        return JSON.stringify(notes, null, 2);

      case 'markdown':
        let markdown = '# Workshop Notes\n\n';
        notes.forEach(note => {
          markdown += `## ${note.title}\n`;
          markdown += `**Date:** ${note.timestamp.toLocaleDateString()}\n`;
          markdown += `**Category:** ${note.category}\n`;
          if (note.speaker) markdown += `**Speaker:** ${note.speaker}\n`;
          if (note.day) markdown += `**Day:** ${note.day}\n`;
          if (note.session) markdown += `**Session:** ${note.session}\n`;
          if (note.tags.length > 0)
            markdown += `**Tags:** ${note.tags.join(', ')}\n`;
          markdown += '\n';
          markdown += note.content;
          markdown += '\n\n---\n\n';
        });
        return markdown;

      case 'csv':
        let csv =
          'ID,Title,Content,Category,Speaker,Day,Session,Tags,Date,Private\n';
        notes.forEach(note => {
          const row = [
            note.id,
            `"${note.title.replace(/"/g, '""')}"`,
            `"${note.content.replace(/"/g, '""')}"`,
            note.category,
            note.speaker || '',
            note.day || '',
            note.session || '',
            `"${note.tags.join(', ')}"`,
            note.timestamp.toISOString(),
            note.isPrivate,
          ].join(',');
          csv += row + '\n';
        });
        return csv;

      default:
        return JSON.stringify(notes, null, 2);
    }
  } catch (error) {
    console.error('Failed to export notes:', error);
    throw new Error('Unable to export notes');
  }
}

// Bulk operations
export function bulkUpdateNotes(
  userId: string,
  noteIds: string[],
  updates: Partial<CreateNoteData>
): number {
  let updatedCount = 0;

  noteIds.forEach(noteId => {
    if (updateNote(userId, noteId, updates)) {
      updatedCount++;
    }
  });

  return updatedCount;
}

export function bulkDeleteNotes(userId: string, noteIds: string[]): number {
  let deletedCount = 0;

  noteIds.forEach(noteId => {
    if (deleteNote(userId, noteId)) {
      deletedCount++;
    }
  });

  return deletedCount;
}

// Utility functions
export function formatNoteDate(timestamp: Date): string {
  return timestamp.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getNoteCategoryColor(category: NoteCategory): string {
  const colors = {
    'session-note': '#3B82F6', // Blue
    reflection: '#8B5CF6', // Purple
    'action-item': '#EF4444', // Red
    question: '#F59E0B', // Yellow
    insight: '#10B981', // Green
    'follow-up': '#6B7280', // Gray
  };
  return colors[category];
}

export function getNoteCategoryIcon(category: NoteCategory): string {
  const icons = {
    'session-note': '📝',
    reflection: '🤔',
    'action-item': '✅',
    question: '❓',
    insight: '💡',
    'follow-up': '📋',
  };
  return icons[category];
}

// Auto-save functionality for real-time editing
export class AutoSaver {
  private userId: string;
  private noteId: string;
  private saveTimeout: number | null = null;
  private saveDelay: number;

  constructor(userId: string, noteId: string, saveDelay: number = 2000) {
    this.userId = userId;
    this.noteId = noteId;
    this.saveDelay = saveDelay;
  }

  scheduleAutoSave(updates: Partial<CreateNoteData>): void {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      updateNote(this.userId, this.noteId, updates);
    }, this.saveDelay);
  }

  forceSave(updates: Partial<CreateNoteData>): void {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    updateNote(this.userId, this.noteId, updates);
  }

  destroy(): void {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}

// Default export for the main functions
export default {
  saveNote,
  updateNote,
  getNote,
  getUserNotes,
  deleteNote,
  getNoteStats,
  getSessionNotes,
  getSpeakerNotes,
  getRecentNotes,
  searchNotes,
  exportNotes,
  bulkUpdateNotes,
  bulkDeleteNotes,
};
