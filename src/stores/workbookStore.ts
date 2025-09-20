/**
 * Workbook Store - Zustand store for workbook content and progress
 * Manages modules, lessons, notes, recordings, and user progress
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface WorkshopModule {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isLocked: boolean;
  completionRequired: boolean;
  content: {
    objectives: string[];
    materials: string[];
    exercises: Array<{
      id: string;
      title: string;
      type: 'text' | 'video' | 'audio' | 'interactive';
      content: any;
      timeEstimate: number;
    }>;
  };
  metadata: {
    tags: string[];
    category: string;
    lastUpdated: string;
    version: string;
  };
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  type: 'video' | 'text' | 'audio' | 'interactive' | 'live_session';
  content: any;
  duration: number;
  isCompleted: boolean;
  progressPercent: number;
  lastAccessedAt?: string;
  timeSpent: number; // in minutes
  bookmarks: Array<{
    id: string;
    timestamp: number;
    note: string;
    createdAt: string;
  }>;
}

export interface WorkbookNote {
  id: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  content: string;
  tags: string[];
  isPrivate: boolean;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  collaborators: Array<{
    userId: string;
    name: string;
    lastEditAt: string;
  }>;
}

export interface AudioRecording {
  id: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  filename: string;
  fileSize: number;
  duration: number;
  format: string;
  s3Url: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  transcriptionId?: string;
  createdAt: string;
  metadata: {
    sampleRate?: number;
    bitRate?: number;
    channels?: number;
  };
}

export interface TranscriptionRecord {
  id: string;
  audioRecordingId: string;
  content: string;
  confidence: number;
  status: 'processing' | 'completed' | 'failed';
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  processingTime: number;
  createdAt: string;
  completedAt?: string;
}

export interface UserProgress {
  moduleId: string;
  lessonId?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  timeSpentMinutes: number;
  lastAccessedAt: string;
  completedAt?: string;
  attempts: number;
  score?: number;
  feedback?: string;
}

export interface WorkbookState {
  // Data
  modules: WorkshopModule[];
  lessons: Record<string, Lesson[]>; // moduleId -> lessons
  notes: WorkbookNote[];
  recordings: AudioRecording[];
  transcriptions: TranscriptionRecord[];
  progress: Record<string, UserProgress>; // moduleId -> progress

  // UI State
  currentModuleId: string | null;
  currentLessonId: string | null;
  activeNoteId: string | null;
  sidebarOpen: boolean;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'title' | 'date' | 'progress' | 'duration';
  sortOrder: 'asc' | 'desc';

  // Loading states
  isLoading: boolean;
  loadingStates: Record<string, boolean>;
  errors: Record<string, string>;

  // Actions - Modules and Lessons
  loadModules: () => Promise<void>;
  loadLessons: (moduleId: string) => Promise<void>;
  setCurrentModule: (moduleId: string | null) => void;
  setCurrentLesson: (lessonId: string | null) => void;
  updateLessonProgress: (lessonId: string, progress: Partial<UserProgress>) => Promise<void>;
  markLessonComplete: (lessonId: string) => Promise<void>;
  addBookmark: (lessonId: string, timestamp: number, note: string) => Promise<void>;

  // Actions - Notes
  loadNotes: () => Promise<void>;
  createNote: (note: Omit<WorkbookNote, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<string>;
  updateNote: (noteId: string, updates: Partial<WorkbookNote>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => WorkbookNote[];
  shareNote: (noteId: string, userIds: string[]) => Promise<void>;
  setActiveNote: (noteId: string | null) => void;

  // Actions - Audio and Transcriptions
  uploadAudio: (file: File, metadata: { moduleId?: string; lessonId?: string; title: string }) => Promise<string>;
  transcribeAudio: (recordingId: string) => Promise<string>;
  loadTranscriptions: () => Promise<void>;
  searchTranscriptions: (query: string) => TranscriptionRecord[];

  // Actions - Progress
  loadProgress: () => Promise<void>;
  updateProgress: (moduleId: string, progress: Partial<UserProgress>) => Promise<void>;
  getModuleProgress: (moduleId: string) => UserProgress | null;
  getOverallProgress: () => { completedModules: number; totalModules: number; percentComplete: number };

  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;

  // Utilities
  getFilteredModules: () => WorkshopModule[];
  getFilteredNotes: () => WorkbookNote[];
  getAvailableTags: () => string[];
  exportData: (format: 'json' | 'pdf' | 'markdown') => Promise<string>;
}

export const useWorkbookStore = create<WorkbookState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        modules: [],
        lessons: {},
        notes: [],
        recordings: [],
        transcriptions: [],
        progress: {},

        currentModuleId: null,
        currentLessonId: null,
        activeNoteId: null,
        sidebarOpen: true,
        viewMode: 'grid',
        searchQuery: '',
        selectedTags: [],
        sortBy: 'title',
        sortOrder: 'asc',

        isLoading: false,
        loadingStates: {},
        errors: {},

        // Actions - Modules and Lessons
        loadModules: async () => {
          set((state) => {
            state.loadingStates.modules = true;
            delete state.errors.modules;
          });

          try {
            const response = await fetch('/api/workbook/modules', {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load modules');
            }

            const modules = await response.json();

            set((state) => {
              state.modules = modules;
              state.loadingStates.modules = false;
            });
          } catch (error) {
            set((state) => {
              state.loadingStates.modules = false;
              state.errors.modules = error instanceof Error ? error.message : 'Failed to load modules';
            });
          }
        },

        loadLessons: async (moduleId) => {
          set((state) => {
            state.loadingStates[`lessons-${moduleId}`] = true;
            delete state.errors[`lessons-${moduleId}`];
          });

          try {
            const response = await fetch(`/api/workbook/modules/${moduleId}/lessons`, {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load lessons');
            }

            const lessons = await response.json();

            set((state) => {
              state.lessons[moduleId] = lessons;
              state.loadingStates[`lessons-${moduleId}`] = false;
            });
          } catch (error) {
            set((state) => {
              state.loadingStates[`lessons-${moduleId}`] = false;
              state.errors[`lessons-${moduleId}`] = error instanceof Error ? error.message : 'Failed to load lessons';
            });
          }
        },

        setCurrentModule: (moduleId) => {
          set((state) => {
            state.currentModuleId = moduleId;
            state.currentLessonId = null;
          });

          if (moduleId && !get().lessons[moduleId]) {
            get().loadLessons(moduleId);
          }
        },

        setCurrentLesson: (lessonId) => {
          set((state) => {
            state.currentLessonId = lessonId;
          });
        },

        updateLessonProgress: async (lessonId, progress) => {
          try {
            const response = await fetch(`/api/workbook/progress/${lessonId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify(progress),
            });

            if (!response.ok) {
              throw new Error('Failed to update progress');
            }

            const updatedProgress = await response.json();

            set((state) => {
              state.progress[lessonId] = updatedProgress;
            });
          } catch (error) {
            console.error('Failed to update lesson progress:', error);
          }
        },

        markLessonComplete: async (lessonId) => {
          await get().updateLessonProgress(lessonId, {
            status: 'completed',
            progressPercent: 100,
            completedAt: new Date().toISOString(),
          });
        },

        addBookmark: async (lessonId, timestamp, note) => {
          try {
            const response = await fetch(`/api/workbook/lessons/${lessonId}/bookmarks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify({ timestamp, note }),
            });

            if (!response.ok) {
              throw new Error('Failed to add bookmark');
            }

            const bookmark = await response.json();

            set((state) => {
              Object.values(state.lessons).forEach(moduleLinks => {
                const lesson = moduleLinks.find(l => l.id === lessonId);
                if (lesson) {
                  lesson.bookmarks.push(bookmark);
                }
              });
            });
          } catch (error) {
            console.error('Failed to add bookmark:', error);
          }
        },

        // Actions - Notes
        loadNotes: async () => {
          set((state) => {
            state.loadingStates.notes = true;
            delete state.errors.notes;
          });

          try {
            const response = await fetch('/api/workbook/notes', {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load notes');
            }

            const notes = await response.json();

            set((state) => {
              state.notes = notes;
              state.loadingStates.notes = false;
            });
          } catch (error) {
            set((state) => {
              state.loadingStates.notes = false;
              state.errors.notes = error instanceof Error ? error.message : 'Failed to load notes';
            });
          }
        },

        createNote: async (noteData) => {
          try {
            const response = await fetch('/api/workbook/notes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify(noteData),
            });

            if (!response.ok) {
              throw new Error('Failed to create note');
            }

            const newNote = await response.json();

            set((state) => {
              state.notes.push(newNote);
            });

            return newNote.id;
          } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
          }
        },

        updateNote: async (noteId, updates) => {
          try {
            const response = await fetch(`/api/workbook/notes/${noteId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify(updates),
            });

            if (!response.ok) {
              throw new Error('Failed to update note');
            }

            const updatedNote = await response.json();

            set((state) => {
              const index = state.notes.findIndex(n => n.id === noteId);
              if (index !== -1) {
                state.notes[index] = updatedNote;
              }
            });
          } catch (error) {
            console.error('Failed to update note:', error);
            throw error;
          }
        },

        deleteNote: async (noteId) => {
          try {
            const response = await fetch(`/api/workbook/notes/${noteId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to delete note');
            }

            set((state) => {
              state.notes = state.notes.filter(n => n.id !== noteId);
              if (state.activeNoteId === noteId) {
                state.activeNoteId = null;
              }
            });
          } catch (error) {
            console.error('Failed to delete note:', error);
            throw error;
          }
        },

        searchNotes: (query) => {
          const { notes } = get();
          if (!query.trim()) return notes;

          const searchTerm = query.toLowerCase();
          return notes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        },

        shareNote: async (noteId, userIds) => {
          try {
            const response = await fetch(`/api/workbook/notes/${noteId}/share`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify({ userIds }),
            });

            if (!response.ok) {
              throw new Error('Failed to share note');
            }

            set((state) => {
              const note = state.notes.find(n => n.id === noteId);
              if (note) {
                note.sharedWith = [...new Set([...note.sharedWith, ...userIds])];
              }
            });
          } catch (error) {
            console.error('Failed to share note:', error);
            throw error;
          }
        },

        setActiveNote: (noteId) => {
          set((state) => {
            state.activeNoteId = noteId;
          });
        },

        // Actions - Audio and Transcriptions
        uploadAudio: async (file, metadata) => {
          const recordingId = `temp-${Date.now()}`;

          set((state) => {
            state.recordings.push({
              id: recordingId,
              ...metadata,
              filename: file.name,
              fileSize: file.size,
              duration: 0,
              format: file.type,
              s3Url: '',
              status: 'uploading',
              createdAt: new Date().toISOString(),
              metadata: {},
            });
          });

          try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('metadata', JSON.stringify(metadata));

            const response = await fetch('/api/workbook/audio', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Failed to upload audio');
            }

            const uploadedRecording = await response.json();

            set((state) => {
              const index = state.recordings.findIndex(r => r.id === recordingId);
              if (index !== -1) {
                state.recordings[index] = uploadedRecording;
              }
            });

            return uploadedRecording.id;
          } catch (error) {
            set((state) => {
              const index = state.recordings.findIndex(r => r.id === recordingId);
              if (index !== -1) {
                state.recordings[index].status = 'failed';
              }
            });
            throw error;
          }
        },

        transcribeAudio: async (recordingId) => {
          try {
            const response = await fetch('/api/workbook/audio/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify({ recordingId }),
            });

            if (!response.ok) {
              throw new Error('Failed to start transcription');
            }

            const transcription = await response.json();

            set((state) => {
              state.transcriptions.push(transcription);
              const recording = state.recordings.find(r => r.id === recordingId);
              if (recording) {
                recording.transcriptionId = transcription.id;
              }
            });

            return transcription.id;
          } catch (error) {
            console.error('Failed to transcribe audio:', error);
            throw error;
          }
        },

        loadTranscriptions: async () => {
          set((state) => {
            state.loadingStates.transcriptions = true;
            delete state.errors.transcriptions;
          });

          try {
            const response = await fetch('/api/workbook/transcriptions', {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load transcriptions');
            }

            const transcriptions = await response.json();

            set((state) => {
              state.transcriptions = transcriptions;
              state.loadingStates.transcriptions = false;
            });
          } catch (error) {
            set((state) => {
              state.loadingStates.transcriptions = false;
              state.errors.transcriptions = error instanceof Error ? error.message : 'Failed to load transcriptions';
            });
          }
        },

        searchTranscriptions: (query) => {
          const { transcriptions } = get();
          if (!query.trim()) return transcriptions;

          const searchTerm = query.toLowerCase();
          return transcriptions.filter(transcription =>
            transcription.content.toLowerCase().includes(searchTerm) ||
            transcription.segments.some(segment =>
              segment.text.toLowerCase().includes(searchTerm)
            )
          );
        },

        // Actions - Progress
        loadProgress: async () => {
          set((state) => {
            state.loadingStates.progress = true;
            delete state.errors.progress;
          });

          try {
            const response = await fetch('/api/workbook/progress', {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load progress');
            }

            const progressData = await response.json();

            set((state) => {
              state.progress = progressData.reduce((acc: Record<string, UserProgress>, item: UserProgress) => {
                acc[item.moduleId] = item;
                return acc;
              }, {});
              state.loadingStates.progress = false;
            });
          } catch (error) {
            set((state) => {
              state.loadingStates.progress = false;
              state.errors.progress = error instanceof Error ? error.message : 'Failed to load progress';
            });
          }
        },

        updateProgress: async (moduleId, progressUpdate) => {
          try {
            const response = await fetch(`/api/workbook/progress/${moduleId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get().token}`,
              },
              body: JSON.stringify(progressUpdate),
            });

            if (!response.ok) {
              throw new Error('Failed to update progress');
            }

            const updatedProgress = await response.json();

            set((state) => {
              state.progress[moduleId] = updatedProgress;
            });
          } catch (error) {
            console.error('Failed to update progress:', error);
          }
        },

        getModuleProgress: (moduleId) => {
          return get().progress[moduleId] || null;
        },

        getOverallProgress: () => {
          const { modules, progress } = get();
          const completedModules = Object.values(progress).filter(p => p.status === 'completed').length;
          const totalModules = modules.length;
          const percentComplete = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

          return { completedModules, totalModules, percentComplete };
        },

        // Actions - UI
        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        setViewMode: (mode) => {
          set((state) => {
            state.viewMode = mode;
          });
        },

        setSearchQuery: (query) => {
          set((state) => {
            state.searchQuery = query;
          });
        },

        setSelectedTags: (tags) => {
          set((state) => {
            state.selectedTags = tags;
          });
        },

        setSorting: (sortBy, sortOrder) => {
          set((state) => {
            state.sortBy = sortBy;
            state.sortOrder = sortOrder;
          });
        },

        setLoading: (key, loading) => {
          set((state) => {
            if (loading) {
              state.loadingStates[key] = true;
            } else {
              delete state.loadingStates[key];
            }
          });
        },

        setError: (key, error) => {
          set((state) => {
            if (error) {
              state.errors[key] = error;
            } else {
              delete state.errors[key];
            }
          });
        },

        clearErrors: () => {
          set((state) => {
            state.errors = {};
          });
        },

        // Utilities
        getFilteredModules: () => {
          const { modules, searchQuery, selectedTags, sortBy, sortOrder } = get();

          let filtered = modules;

          // Filter by search query
          if (searchQuery.trim()) {
            const searchTerm = searchQuery.toLowerCase();
            filtered = filtered.filter(module =>
              module.title.toLowerCase().includes(searchTerm) ||
              module.description.toLowerCase().includes(searchTerm) ||
              module.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
          }

          // Filter by tags
          if (selectedTags.length > 0) {
            filtered = filtered.filter(module =>
              selectedTags.some(tag => module.metadata.tags.includes(tag))
            );
          }

          // Sort
          filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
              case 'title':
                aValue = a.title;
                bValue = b.title;
                break;
              case 'date':
                aValue = new Date(a.metadata.lastUpdated);
                bValue = new Date(b.metadata.lastUpdated);
                break;
              case 'duration':
                aValue = a.duration;
                bValue = b.duration;
                break;
              case 'progress':
                const progressA = get().progress[a.id]?.progressPercent || 0;
                const progressB = get().progress[b.id]?.progressPercent || 0;
                aValue = progressA;
                bValue = progressB;
                break;
              default:
                aValue = a.order;
                bValue = b.order;
            }

            if (typeof aValue === 'string') {
              return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          });

          return filtered;
        },

        getFilteredNotes: () => {
          const { notes, searchQuery, selectedTags, sortBy, sortOrder } = get();

          let filtered = notes;

          // Filter by search query
          if (searchQuery.trim()) {
            filtered = get().searchNotes(searchQuery);
          }

          // Filter by tags
          if (selectedTags.length > 0) {
            filtered = filtered.filter(note =>
              selectedTags.some(tag => note.tags.includes(tag))
            );
          }

          // Sort
          filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
              case 'title':
                aValue = a.title;
                bValue = b.title;
                break;
              case 'date':
                aValue = new Date(a.updatedAt);
                bValue = new Date(b.updatedAt);
                break;
              default:
                aValue = new Date(a.updatedAt);
                bValue = new Date(b.updatedAt);
            }

            if (typeof aValue === 'string') {
              return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          });

          return filtered;
        },

        getAvailableTags: () => {
          const { modules, notes } = get();

          const moduleTags = modules.flatMap(m => m.metadata.tags);
          const noteTags = notes.flatMap(n => n.tags);

          return [...new Set([...moduleTags, ...noteTags])].sort();
        },

        exportData: async (format) => {
          try {
            const response = await fetch(`/api/workbook/export?format=${format}`, {
              headers: {
                'Authorization': `Bearer ${get().token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to export data');
            }

            const data = await response.json();
            return data.downloadUrl;
          } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
          }
        },
      }))
    ),
    {
      name: 'workbook-store',
    }
  )
);