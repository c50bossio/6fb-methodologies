// Comprehensive TypeScript Types and Interfaces for 6FB Workbook APIs
// Centralized type definitions for all workbook system APIs

import {
  SubscriptionTier,
  ProgressStatus,
  LessonType,
  DifficultyLevel,
  ContentType,
  WorkbookUser,
  WorkbookSession,
  WorkshopModule,
  WorkshopLesson,
  UserProgress,
  ProgressSummary,
  ModuleCompletion,
  CompletionHistoryItem,
  ContentItem,
  UpdateProgressRequest,
  CompleteLessonRequest,
  CompleteModuleRequest,
  GetModulesQuery,
  GetLessonsQuery,
} from '@/lib/validation/workbook-schemas';

// ==============================================================
// API RESPONSE WRAPPER TYPES
// ==============================================================

/**
 * Standard API response structure for all endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * Paginated API response structure
 */
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: number;
}

// ==============================================================
// T026: WORKSHOP MODULES API TYPES
// ==============================================================

/**
 * Module list item with progress information
 */
export interface ModuleListItem {
  id: string;
  title: string;
  description?: string;
  moduleOrder: number;
  durationMinutes: number;
  difficultyLevel?: DifficultyLevel;
  tags: string[];
  isPublished: boolean;
  prerequisitesMet: boolean;
  progressPercentage: number;
  progressStatus: ProgressStatus;
  lastAccessedAt?: string;
  completedAt?: string;
}

/**
 * Detailed module with lessons and progress
 */
export interface DetailedModule extends WorkshopModule {
  progress?: {
    progressPercent: number;
    status: ProgressStatus;
    timeSpentMinutes: number;
    lastAccessedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  lessons: DetailedLesson[];
  prerequisitesMet: boolean;
  accessGranted: boolean;
}

/**
 * Module access validation result
 */
export interface ModuleAccessResult {
  hasAccess: boolean;
  module?: WorkshopModule;
  error?: string;
  code?: string;
  missingPrerequisites?: string[];
}

// GET /api/workbook/modules query parameters
export type ModulesQueryParams = GetModulesQuery;

// GET /api/workbook/modules response
export type ModulesListResponse = PaginatedApiResponse<ModuleListItem>;

// GET /api/workbook/modules/[id] response
export type ModuleDetailsResponse = ApiResponse<DetailedModule>;

// ==============================================================
// T027: WORKSHOP LESSONS API TYPES
// ==============================================================

/**
 * Lesson with progress information
 */
export interface LessonWithProgress extends WorkshopLesson {
  moduleInfo: {
    title: string;
    difficultyLevel?: DifficultyLevel;
    isPublished: boolean;
  };
  progress: {
    progressPercentage: number;
    completed: boolean;
    completedAt?: string;
    timeSpentSeconds: number;
    lastPosition: number;
    quizScore?: number;
    attemptsCount: number;
    notesCount: number;
  };
  prerequisitesMet: boolean;
  accessGranted: boolean;
}

/**
 * Detailed lesson with module information
 */
export interface DetailedLesson extends WorkshopLesson {
  module: {
    id: string;
    title: string;
    difficultyLevel?: DifficultyLevel;
    isPublished: boolean;
  };
  progress?: {
    progressPercentage: number;
    completed: boolean;
    completedAt?: string;
    timeSpentSeconds: number;
    lastPosition: number;
    quizScore?: number;
    attemptsCount: number;
    notesCount: number;
    createdAt: string;
    updatedAt: string;
  };
  accessGranted: boolean;
}

/**
 * Lesson completion result
 */
export interface LessonCompletionResult {
  lessonId: string;
  moduleId: string;
  completed: boolean;
  completedAt: string;
  progressPercentage: number;
  timeSpentSeconds: number;
  quizScore?: number;
  attemptsCount: number;
  noteId?: string;
  achievement?: {
    type: string;
    title: string;
    description: string;
  };
}

// GET /api/workbook/lessons query parameters
export type LessonsQueryParams = GetLessonsQuery;

// GET /api/workbook/lessons response
export type LessonsListResponse = PaginatedApiResponse<LessonWithProgress>;

// GET /api/workbook/lessons/[id] response
export type LessonDetailsResponse = ApiResponse<DetailedLesson>;

// POST /api/workbook/lessons/[id]/complete request
export type CompleteLessonRequestBody = CompleteLessonRequest;

// POST /api/workbook/lessons/[id]/complete response
export type CompleteLessonResponse = ApiResponse<LessonCompletionResult>;

// ==============================================================
// T028: USER PROGRESS API TYPES
// ==============================================================

/**
 * Enhanced progress summary with analytics
 */
export interface EnhancedProgressSummary extends ProgressSummary {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionTier: SubscriptionTier;
  };
}

/**
 * Learning analytics data
 */
export interface LearningAnalytics {
  learningPatterns: Array<{
    hourOfDay: number;
    sessionCount: number;
    avgTimeSpent: number;
  }>;
  difficultyStats: Array<{
    difficulty: DifficultyLevel;
    totalModules: number;
    completedModules: number;
    avgProgress: number;
    completionRate: number;
  }>;
  streak: {
    currentStreak: number;
    streakStart?: string;
    streakEnd?: string;
  };
}

/**
 * Progress data with optional details and analytics
 */
export interface ProgressData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionTier: SubscriptionTier;
  };
  summary: ProgressSummary;
  moduleProgress?: UserProgress[];
  detailedProgress?: UserProgress[];
  analytics?: LearningAnalytics;
}

// GET /api/workbook/progress/enhanced query parameters
export interface ProgressQueryParams {
  analytics?: boolean;
  detailed?: boolean;
  moduleId?: string;
}

// GET /api/workbook/progress/enhanced response
export type ProgressDataResponse = ApiResponse<ProgressData>;

// POST /api/workbook/progress/enhanced request
export type UpdateProgressRequestBody = UpdateProgressRequest;

// POST /api/workbook/progress/enhanced response
export type UpdateProgressResponse = ApiResponse<{
  progress: UserProgress;
  module: {
    id: string;
    title: string;
  };
}>;

// ==============================================================
// T029: MODULE COMPLETION API TYPES
// ==============================================================

/**
 * Module completion with certificate information
 */
export interface ModuleCompletionResult {
  completion: ModuleCompletion;
  module: {
    id: string;
    title: string;
    description?: string;
    difficultyLevel?: DifficultyLevel;
    moduleOrder: number;
  };
  certificate?: {
    url: string;
    issuedAt: string;
    issuedTo: string;
  };
  achievement: {
    type: string;
    title: string;
    description: string;
  };
}

/**
 * Module completion status
 */
export interface ModuleCompletionStatus {
  moduleId: string;
  moduleName: string;
  isCompleted: boolean;
  canComplete?: boolean;
  reason?: string;
  completion?: ModuleCompletion;
  certificate?: {
    url: string;
    issuedAt: string;
  };
  progress?: any;
  lessonStats?: {
    totalLessons: number;
    completedLessons: number;
    completionRate: number;
    requiredRate?: number;
    incompleteLessons?: string[];
  };
}

// GET /api/workbook/completion query parameters
export interface CompletionHistoryQueryParams {
  page?: number;
  limit?: number;
}

// GET /api/workbook/completion response
export type CompletionHistoryResponse = PaginatedApiResponse<CompletionHistoryItem>;

// POST /api/workbook/completion request
export type CompleteModuleRequestBody = CompleteModuleRequest & {
  moduleId: string;
};

// POST /api/workbook/completion response
export type ModuleCompletionResponse = ApiResponse<{
  completion: ModuleCompletion;
  module: {
    id: string;
    title: string;
    difficultyLevel?: DifficultyLevel;
  };
  certificate?: {
    url: string;
    issuedAt: string;
  };
}>;

// GET /api/workbook/completion/[moduleId] response
export type ModuleCompletionStatusResponse = ApiResponse<ModuleCompletionStatus>;

// POST /api/workbook/completion/[moduleId] request
export type CompleteSpecificModuleRequestBody = CompleteModuleRequest;

// POST /api/workbook/completion/[moduleId] response
export type CompleteSpecificModuleResponse = ApiResponse<ModuleCompletionResult>;

// ==============================================================
// T030: CONTENT MANAGEMENT API TYPES
// ==============================================================

/**
 * Content search and filter parameters
 */
export interface ContentQueryParams {
  page?: number;
  limit?: number;
  type?: ContentType;
  moduleId?: string;
  lessonId?: string;
  tag?: string;
  search?: string;
  published?: boolean;
  accessLevel?: SubscriptionTier;
}

/**
 * Content list response with filters
 */
export interface ContentListResponse extends PaginatedApiResponse<ContentItem> {
  filters: {
    type?: ContentType;
    moduleId?: string;
    lessonId?: string;
    tag?: string;
    search?: string;
    published?: boolean;
    accessLevel?: SubscriptionTier;
  };
}

/**
 * Content access result
 */
export interface ContentAccessResult {
  found: boolean;
  item?: ContentItem;
  error?: string;
  code?: string;
}

// GET /api/workbook/content query parameters
export type ContentQueryParameters = ContentQueryParams;

// GET /api/workbook/content response
export type ContentListApiResponse = ContentListResponse;

// GET /api/workbook/content/[id] response
export type ContentItemResponse = ApiResponse<ContentItem>;

// ==============================================================
// AUTHENTICATION AND SESSION TYPES
// ==============================================================

/**
 * Extended workbook session with permissions
 */
export interface WorkbookAuthSession extends WorkbookSession {
  workshopAccessGranted: boolean;
  workshopAccessExpiresAt?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  isAuthenticated: boolean;
  session?: WorkbookAuthSession;
  error?: string;
  status?: number;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  hasPermission: boolean;
  requiredPermission: string;
  userPermissions: string[];
}

// ==============================================================
// VALIDATION AND ERROR TYPES
// ==============================================================

/**
 * Validation error details
 */
export interface ValidationErrorDetails {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

/**
 * API validation error
 */
export interface ApiValidationError extends ErrorResponse {
  code: 'VALIDATION_ERROR';
  details: {
    errors: ValidationErrorDetails[];
  };
}

/**
 * Access control error
 */
export interface AccessControlError extends ErrorResponse {
  code: 'ACCESS_DENIED' | 'SUBSCRIPTION_REQUIRED' | 'PREREQUISITES_NOT_MET';
  details?: {
    currentTier?: SubscriptionTier;
    requiredTier?: SubscriptionTier;
    missingPrerequisites?: string[];
  };
}

/**
 * Rate limit error
 */
export interface RateLimitError extends ErrorResponse {
  code: 'RATE_LIMIT_EXCEEDED';
  details: {
    limit: number;
    windowMs: number;
    resetTime: number;
  };
}

// ==============================================================
// UTILITY TYPES
// ==============================================================

/**
 * API endpoint paths
 */
export type WorkbookApiEndpoint =
  | '/api/workbook/modules'
  | '/api/workbook/modules/[id]'
  | '/api/workbook/lessons'
  | '/api/workbook/lessons/[id]'
  | '/api/workbook/lessons/[id]/complete'
  | '/api/workbook/progress'
  | '/api/workbook/progress/enhanced'
  | '/api/workbook/completion'
  | '/api/workbook/completion/[moduleId]'
  | '/api/workbook/content'
  | '/api/workbook/content/[id]';

/**
 * HTTP methods supported by APIs
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * API operation descriptor
 */
export interface ApiOperation {
  endpoint: WorkbookApiEndpoint;
  method: ApiMethod;
  requiresAuth: boolean;
  requiredPermissions: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Search metadata
 */
export interface SearchMetadata {
  query?: string;
  filters: Record<string, any>;
  resultCount: number;
  searchTime?: number;
}

/**
 * API performance metrics
 */
export interface ApiMetrics {
  requestId: string;
  responseTime: number;
  databaseQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

// ==============================================================
// CLIENT SDK TYPES
// ==============================================================

/**
 * Client configuration for API access
 */
export interface WorkbookClientConfig {
  baseUrl: string;
  apiKey?: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
  rateLimitStrategy?: 'throw' | 'retry' | 'ignore';
}

/**
 * Client request options
 */
export interface ClientRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  cache?: 'default' | 'no-cache' | 'reload';
}

/**
 * Workbook API client interface
 */
export interface WorkbookApiClient {
  // Modules
  getModules(params?: ModulesQueryParams, options?: ClientRequestOptions): Promise<ModulesListResponse>;
  getModule(id: string, options?: ClientRequestOptions): Promise<ModuleDetailsResponse>;

  // Lessons
  getLessons(params?: LessonsQueryParams, options?: ClientRequestOptions): Promise<LessonsListResponse>;
  getLesson(id: string, options?: ClientRequestOptions): Promise<LessonDetailsResponse>;
  completeLesson(id: string, data: CompleteLessonRequestBody, options?: ClientRequestOptions): Promise<CompleteLessonResponse>;

  // Progress
  getProgress(params?: ProgressQueryParams, options?: ClientRequestOptions): Promise<ProgressDataResponse>;
  updateProgress(data: UpdateProgressRequestBody, options?: ClientRequestOptions): Promise<UpdateProgressResponse>;

  // Completion
  getCompletionHistory(params?: CompletionHistoryQueryParams, options?: ClientRequestOptions): Promise<CompletionHistoryResponse>;
  getModuleCompletionStatus(moduleId: string, options?: ClientRequestOptions): Promise<ModuleCompletionStatusResponse>;
  completeModule(moduleId: string, data: CompleteSpecificModuleRequestBody, options?: ClientRequestOptions): Promise<CompleteSpecificModuleResponse>;

  // Content
  getContent(params?: ContentQueryParameters, options?: ClientRequestOptions): Promise<ContentListApiResponse>;
  getContentItem(id: string, options?: ClientRequestOptions): Promise<ContentItemResponse>;
}

// ==============================================================
// EVENT TYPES FOR REAL-TIME UPDATES
// ==============================================================

/**
 * Progress update event
 */
export interface ProgressUpdateEvent {
  type: 'progress_update';
  userId: string;
  moduleId?: string;
  lessonId?: string;
  progressPercent: number;
  status: ProgressStatus;
  timestamp: number;
}

/**
 * Lesson completion event
 */
export interface LessonCompletionEvent {
  type: 'lesson_completed';
  userId: string;
  lessonId: string;
  moduleId: string;
  completedAt: string;
  score?: number;
  timestamp: number;
}

/**
 * Module completion event
 */
export interface ModuleCompletionEvent {
  type: 'module_completed';
  userId: string;
  moduleId: string;
  completedAt: string;
  certificateUrl?: string;
  timestamp: number;
}

/**
 * Achievement earned event
 */
export interface AchievementEvent {
  type: 'achievement_earned';
  userId: string;
  achievementType: string;
  achievementId: string;
  title: string;
  description: string;
  timestamp: number;
}

/**
 * Union type for all workbook events
 */
export type WorkbookEvent =
  | ProgressUpdateEvent
  | LessonCompletionEvent
  | ModuleCompletionEvent
  | AchievementEvent;

/**
 * Event handler type
 */
export type EventHandler<T extends WorkbookEvent = WorkbookEvent> = (event: T) => void;

/**
 * Event subscription interface
 */
export interface EventSubscription {
  unsubscribe(): void;
}

// ==============================================================
// EXPORT ALL TYPES
// ==============================================================

export type {
  // Schema types (re-exported)
  SubscriptionTier,
  ProgressStatus,
  LessonType,
  DifficultyLevel,
  ContentType,
  WorkbookUser,
  WorkbookSession,
  WorkshopModule,
  WorkshopLesson,
  UserProgress,
  ProgressSummary,
  ModuleCompletion,
  CompletionHistoryItem,
  ContentItem,
  UpdateProgressRequest,
  CompleteLessonRequest,
  CompleteModuleRequest,
  GetModulesQuery,
  GetLessonsQuery,
};