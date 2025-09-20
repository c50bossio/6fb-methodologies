/**
 * Main export file for all Workbook types
 * Comprehensive type definitions for the 6FB Workbook system
 */

// Core types
export * from './core';

// Module and lesson types
export * from './modules';

// Audio and transcription types
export * from './audio';

// Note-taking system types
export * from './notes';

// Live session and collaboration types
export * from './sessions';

// Additional utility types for the complete system
export interface WorkbookSystem {
  // User management
  user: import('./core').WorkbookUser;
  session: import('./core').AuthSession;

  // Content structure
  modules: import('./modules').WorkshopModule[];
  currentModule?: import('./modules').WorkshopModule;
  currentLesson?: import('./modules').WorkshopLesson;

  // User progress
  progress: import('./core').ProgressMetrics;
  moduleProgress: import('./core').ModuleProgress[];

  // Audio system
  recordings: import('./audio').AudioRecording[];
  transcriptions: import('./audio').AudioTranscription[];

  // Note system
  notes: import('./notes').WorkbookNote[];
  categories: import('./notes').NoteCategory[];
  tags: import('./notes').NoteTag[];

  // Live sessions
  liveSessions: import('./sessions').LiveSession[];
  currentSession?: import('./sessions').LiveSession;

  // System configuration
  config: import('./core').SystemConfiguration;
  features: import('./core').FeatureFlags;
}

// Global state types for React Context
export interface WorkbookState extends import('./core').LoadingState {
  system?: WorkbookSystem;
  isAuthenticated: boolean;
  permissions: UserPermissions;
}

export interface UserPermissions {
  canCreateNotes: boolean;
  canRecordAudio: boolean;
  canAccessLiveSessions: boolean;
  canExportData: boolean;
  canCollaborate: boolean;
  canModerate: boolean;
  canAdminister: boolean;
}

// Action types for state management
export type WorkbookAction =
  | { type: 'SET_USER'; payload: import('./core').WorkbookUser }
  | { type: 'SET_SESSION'; payload: import('./core').AuthSession }
  | { type: 'LOGOUT' }
  | { type: 'SET_MODULES'; payload: import('./modules').WorkshopModule[] }
  | { type: 'SET_CURRENT_MODULE'; payload: import('./modules').WorkshopModule }
  | { type: 'SET_CURRENT_LESSON'; payload: import('./modules').WorkshopLesson }
  | { type: 'UPDATE_PROGRESS'; payload: import('./core').ProgressMetrics }
  | { type: 'ADD_RECORDING'; payload: import('./audio').AudioRecording }
  | { type: 'UPDATE_RECORDING'; payload: { id: string; updates: Partial<import('./audio').AudioRecording> } }
  | { type: 'DELETE_RECORDING'; payload: string }
  | { type: 'ADD_TRANSCRIPTION'; payload: import('./audio').AudioTranscription }
  | { type: 'UPDATE_TRANSCRIPTION'; payload: { id: string; updates: Partial<import('./audio').AudioTranscription> } }
  | { type: 'ADD_NOTE'; payload: import('./notes').WorkbookNote }
  | { type: 'UPDATE_NOTE'; payload: { id: string; updates: Partial<import('./notes').WorkbookNote> } }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SET_NOTES'; payload: import('./notes').WorkbookNote[] }
  | { type: 'ADD_CATEGORY'; payload: import('./notes').NoteCategory }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; updates: Partial<import('./notes').NoteCategory> } }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TAG'; payload: import('./notes').NoteTag }
  | { type: 'JOIN_SESSION'; payload: import('./sessions').LiveSession }
  | { type: 'LEAVE_SESSION' }
  | { type: 'UPDATE_SESSION'; payload: { id: string; updates: Partial<import('./sessions').LiveSession> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Hook return types
export interface UseWorkbookReturn {
  state: WorkbookState;
  actions: WorkbookActions;
}

export interface WorkbookActions {
  // Authentication
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Module navigation
  loadModules: () => Promise<void>;
  setCurrentModule: (moduleId: string) => Promise<void>;
  setCurrentLesson: (lessonId: string) => Promise<void>;
  markLessonComplete: (lessonId: string) => Promise<void>;

  // Progress tracking
  updateProgress: (moduleId: string, progress: Partial<import('./core').ModuleProgress>) => Promise<void>;
  getProgress: () => Promise<import('./core').ProgressMetrics>;

  // Audio management
  createRecording: (data: import('./audio').CreateAudioRecordingInput) => Promise<import('./audio').AudioRecording>;
  updateRecording: (id: string, updates: import('./audio').UpdateAudioRecordingInput) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  transcribeAudio: (audioId: string) => Promise<import('./audio').AudioTranscription>;

  // Note management
  createNote: (data: import('./notes').CreateNoteInput) => Promise<import('./notes').WorkbookNote>;
  updateNote: (id: string, updates: import('./notes').UpdateNoteInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (query: import('./notes').NoteSearchQuery) => Promise<import('./notes').NoteSearchResult[]>;

  // Category and tag management
  createCategory: (data: import('./notes').CreateCategoryInput) => Promise<import('./notes').NoteCategory>;
  updateCategory: (id: string, updates: import('./notes').UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Session management
  joinLiveSession: (sessionId: string) => Promise<void>;
  leaveLiveSession: () => Promise<void>;
  createPoll: (data: import('./sessions').CreatePollInput) => Promise<import('./sessions').SessionPoll>;
  votePoll: (pollId: string, selectedOptions: string[], textResponse?: string) => Promise<void>;
  sendChatMessage: (content: string, isPrivate?: boolean, recipientId?: string) => Promise<void>;

  // Export and sharing
  exportNotes: (options: import('./notes').NoteExportOptions) => Promise<import('./notes').NoteExportResult>;
  shareNote: (noteId: string, settings: import('./notes').NoteSharingSettings) => Promise<string>;

  // Search
  globalSearch: (query: string) => Promise<GlobalSearchResult[]>;
}

// Global search types
export interface GlobalSearchResult {
  type: 'module' | 'lesson' | 'note' | 'transcription' | 'recording';
  id: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  matchedFields: string[];
  url: string;
  metadata?: {
    moduleId?: string;
    lessonId?: string;
    duration?: number;
    wordCount?: number;
    createdAt?: string;
  };
}

// Error types specific to Workbook
export interface WorkbookError extends Error {
  code: string;
  context?: {
    moduleId?: string;
    lessonId?: string;
    noteId?: string;
    audioId?: string;
    sessionId?: string;
  };
  recoverable: boolean;
  retryable: boolean;
}

// Event types for analytics
export interface WorkbookEvent {
  type: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}

// Common component prop interfaces
export interface BaseWorkbookComponentProps {
  className?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
}

// Feature availability types
export interface FeatureAvailability {
  audioRecording: boolean;
  transcription: boolean;
  richTextNotes: boolean;
  liveSessions: boolean;
  collaboration: boolean;
  export: boolean;
  analytics: boolean;
  customization: boolean;
}

// Theme and customization types
export interface WorkbookTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Keyboard shortcuts and accessibility
export interface KeyboardShortcuts {
  [key: string]: {
    keys: string[];
    description: string;
    action: () => void;
    context?: string[];
  };
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimizations: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  alternativeText: boolean;
}