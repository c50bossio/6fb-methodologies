/**
 * Core TypeScript type definitions for the 6FB Workbook system
 * Based on the comprehensive specification for interactive learning platform
 */

// Base types
export type UUID = string;
export type Timestamp = string; // ISO 8601 string
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}

// User and Authentication Types
export interface WorkbookUser {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'admin';
  profileImage?: string;
  timezone: string;
  preferences: UserPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sessionReminders: boolean;
    progressUpdates: boolean;
  };
  audio: {
    autoplay: boolean;
    defaultVolume: number;
    transcriptionEnabled: boolean;
  };
  interface: {
    sidebarCollapsed: boolean;
    showProgressIndicators: boolean;
    compactMode: boolean;
  };
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  expiresAt: Timestamp;
  user: WorkbookUser;
}

export interface AuthResponse {
  success: boolean;
  session?: AuthSession;
  error?: string;
  message?: string;
}

// Progress and Analytics Types
export interface ProgressMetrics {
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  totalTimeSpent: number; // in minutes
  averageSessionDuration: number; // in minutes
  lastActivity: Timestamp;
  completionRate: number; // 0-100
  streak: {
    current: number;
    longest: number;
    lastDate: string; // YYYY-MM-DD
  };
}

export interface ModuleProgress {
  moduleId: UUID;
  userId: UUID;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  timeSpent: number; // in minutes
  lessonsCompleted: number;
  totalLessons: number;
  completionRate: number; // 0-100
  lastAccessedAt?: Timestamp;
}

export interface LessonProgress {
  lessonId: UUID;
  moduleId: UUID;
  userId: UUID;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  timeSpent: number; // in minutes
  progress: number; // 0-100 for current position in lesson
  metadata?: JSONObject; // Additional tracking data
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query: string;
  filters?: {
    type?: 'module' | 'lesson' | 'note' | 'transcription';
    dateRange?: {
      start: string;
      end: string;
    };
    tags?: string[];
  };
}

// Error and Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: ValidationError[];
  statusCode: number;
}

// Feature Flags and Configuration
export interface FeatureFlags {
  audioTranscription: boolean;
  realTimeCollaboration: boolean;
  advancedAnalytics: boolean;
  exportFeatures: boolean;
  liveSessionSupport: boolean;
  mobileOptimizations: boolean;
  aiAssistant: boolean;
}

export interface SystemConfiguration {
  features: FeatureFlags;
  limits: {
    maxAudioDuration: number; // in minutes
    maxFileSize: number; // in bytes
    maxNotesPerUser: number;
    maxSessionDuration: number; // in minutes
  };
  integrations: {
    openai: {
      enabled: boolean;
      model: string;
    };
    aws: {
      enabled: boolean;
      region: string;
    };
    analytics: {
      enabled: boolean;
      provider: string;
    };
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Component Props Base Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface AsyncOperation<T> extends LoadingState {
  data?: T | null;
  refetch?: () => Promise<void>;
}
