// 6FB Methodologies - Workbook System Validation Schemas
// Comprehensive Zod schemas for all workbook API endpoints and data structures

import { z } from 'zod';

// ==============================================================
// CORE DATA TYPE SCHEMAS
// ==============================================================

// User subscription tiers
export const SubscriptionTierSchema = z.enum(['basic', 'premium', 'vip', 'enterprise'], {
  errorMap: () => ({ message: 'Invalid subscription tier' })
});

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

// Progress status enum
export const ProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'paused'], {
  errorMap: () => ({ message: 'Invalid progress status' })
});

export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;

// Lesson types
export const LessonTypeSchema = z.enum(['video', 'audio', 'text', 'interactive', 'exercise', 'quiz'], {
  errorMap: () => ({ message: 'Invalid lesson type' })
});

export type LessonType = z.infer<typeof LessonTypeSchema>;

// Difficulty levels
export const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'], {
  errorMap: () => ({ message: 'Invalid difficulty level' })
});

export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

// Content types
export const ContentTypeSchema = z.enum(['text', 'video', 'audio', 'image', 'document', 'interactive'], {
  errorMap: () => ({ message: 'Invalid content type' })
});

export type ContentType = z.infer<typeof ContentTypeSchema>;

// ==============================================================
// USER AND SESSION SCHEMAS
// ==============================================================

// Workbook user profile schema
export const WorkbookUserSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  subscriptionTier: SubscriptionTierSchema,
  workshopAccessGranted: z.boolean(),
  workshopAccessExpiresAt: z.string().datetime().optional(),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkbookUser = z.infer<typeof WorkbookUserSchema>;

// User session with permissions
export const WorkbookSessionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  subscriptionTier: SubscriptionTierSchema,
  permissions: z.array(z.string()).min(1, 'At least one permission required'),
  workshopAccessGranted: z.boolean(),
  expiresAt: z.number().int().positive('Invalid expiration timestamp'),
});

export type WorkbookSession = z.infer<typeof WorkbookSessionSchema>;

// ==============================================================
// MODULE SCHEMAS
// ==============================================================

// Module content structure (JSONB field validation)
export const ModuleContentSchema = z.object({
  overview: z.string().min(1, 'Overview is required'),
  learningObjectives: z.array(z.string().min(1)).min(1, 'At least one learning objective required'),
  keyTakeaways: z.array(z.string().min(1)).optional(),
  practicalExercises: z.array(z.string().min(1)).optional(),
  resources: z.array(z.string().min(1)).optional(),
  coreTopics: z.array(z.string().min(1)).optional(),
  practicalApplication: z.array(z.string().min(1)).optional(),
  casestudies: z.array(z.string().min(1)).optional(),
  systemsAndProcesses: z.array(z.string().min(1)).optional(),
});

export type ModuleContent = z.infer<typeof ModuleContentSchema>;

// Workshop module schema
export const WorkshopModuleSchema = z.object({
  id: z.string().uuid('Invalid module ID'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  description: z.string().optional(),
  moduleOrder: z.number().int().min(1, 'Module order must be positive').max(50, 'Module order too high'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  content: ModuleContentSchema,
  prerequisites: z.array(z.string().uuid()).default([]),
  isPublished: z.boolean().default(false),
  difficultyLevel: DifficultyLevelSchema.optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkshopModule = z.infer<typeof WorkshopModuleSchema>;

// Module list item (for listing endpoints)
export const ModuleListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  moduleOrder: z.number().int(),
  durationMinutes: z.number().int(),
  difficultyLevel: DifficultyLevelSchema.optional(),
  tags: z.array(z.string()),
  isPublished: z.boolean(),
  prerequisitesMet: z.boolean(),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  progressStatus: ProgressStatusSchema.default('not_started'),
  lastAccessedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export type ModuleListItem = z.infer<typeof ModuleListItemSchema>;

// ==============================================================
// LESSON SCHEMAS
// ==============================================================

// Lesson content structure (varies by type)
export const LessonContentSchema = z.union([
  // Video lesson content
  z.object({
    type: z.literal('video'),
    videoUrl: z.string().url('Invalid video URL'),
    description: z.string().optional(),
    transcript: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
    downloadableResources: z.array(z.string()).optional(),
  }),
  // Audio lesson content
  z.object({
    type: z.literal('audio'),
    audioUrl: z.string().url('Invalid audio URL'),
    description: z.string().optional(),
    transcript: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
  }),
  // Text lesson content
  z.object({
    type: z.literal('text'),
    content: z.string().min(1, 'Content is required'),
    downloadableResources: z.array(z.string()).optional(),
  }),
  // Interactive lesson content
  z.object({
    type: z.literal('interactive'),
    description: z.string().min(1, 'Description is required'),
    exercises: z.array(z.object({
      type: z.string(),
      title: z.string(),
      description: z.string().optional(),
      questions: z.array(z.string()).optional(),
      timeMinutes: z.number().int().positive().optional(),
    })),
    resources: z.array(z.string()).optional(),
  }),
  // Exercise lesson content
  z.object({
    type: z.literal('exercise'),
    description: z.string().min(1, 'Description is required'),
    steps: z.array(z.object({
      title: z.string(),
      description: z.string(),
      timeMinutes: z.number().int().positive(),
    })),
    templates: z.array(z.string()).optional(),
  }),
]);

export type LessonContent = z.infer<typeof LessonContentSchema>;

// Workshop lesson schema
export const WorkshopLessonSchema = z.object({
  id: z.string().min(1, 'Lesson ID is required'),
  moduleId: z.string().uuid('Invalid module ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  type: LessonTypeSchema,
  content: LessonContentSchema,
  estimatedMinutes: z.number().int().positive('Estimated time must be positive'),
  sortOrder: z.number().int().positive('Sort order must be positive'),
  isPublished: z.boolean().default(false),
  prerequisites: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkshopLesson = z.infer<typeof WorkshopLessonSchema>;

// ==============================================================
// PROGRESS SCHEMAS
// ==============================================================

// User progress for a module/lesson
export const UserProgressSchema = z.object({
  id: z.string().uuid('Invalid progress ID'),
  userId: z.string().uuid('Invalid user ID'),
  moduleId: z.string().uuid('Invalid module ID'),
  lessonId: z.string().optional(),
  progressPercent: z.number().int().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100'),
  status: ProgressStatusSchema,
  timeSpentMinutes: z.number().int().min(0, 'Time spent cannot be negative'),
  lastAccessedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserProgress = z.infer<typeof UserProgressSchema>;

// Progress summary for dashboard
export const ProgressSummarySchema = z.object({
  userId: z.string().uuid(),
  overallProgress: z.number().min(0).max(100),
  modulesStarted: z.number().int().min(0),
  modulesCompleted: z.number().int().min(0),
  totalTimeSpent: z.number().int().min(0),
  lastActivityAt: z.string().datetime().optional(),
  recentActivity: z.array(z.object({
    moduleId: z.string().uuid(),
    moduleName: z.string(),
    progressPercent: z.number().int().min(0).max(100),
    lastAccessedAt: z.string().datetime(),
  })).max(10),
});

export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;

// ==============================================================
// COMPLETION SCHEMAS
// ==============================================================

// Module completion record
export const ModuleCompletionSchema = z.object({
  id: z.string().uuid('Invalid completion ID'),
  userId: z.string().uuid('Invalid user ID'),
  moduleId: z.string().uuid('Invalid module ID'),
  completedAt: z.string().datetime(),
  timeSpentMinutes: z.number().int().min(0),
  completionScore: z.number().min(0).max(100).optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type ModuleCompletion = z.infer<typeof ModuleCompletionSchema>;

// Completion history item
export const CompletionHistoryItemSchema = z.object({
  moduleId: z.string().uuid(),
  moduleName: z.string(),
  completedAt: z.string().datetime(),
  timeSpentMinutes: z.number().int(),
  completionScore: z.number().min(0).max(100).optional(),
  certificateUrl: z.string().url().optional(),
});

export type CompletionHistoryItem = z.infer<typeof CompletionHistoryItemSchema>;

// ==============================================================
// CONTENT MANAGEMENT SCHEMAS
// ==============================================================

// Content item schema
export const ContentItemSchema = z.object({
  id: z.string().uuid('Invalid content ID'),
  type: ContentTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  url: z.string().url('Invalid content URL').optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  moduleId: z.string().uuid().optional(),
  lessonId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  accessLevel: SubscriptionTierSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContentItem = z.infer<typeof ContentItemSchema>;

// ==============================================================
// API REQUEST/RESPONSE SCHEMAS
// ==============================================================

// Get modules request query parameters
export const GetModulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  published: z.coerce.boolean().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  tag: z.string().optional(),
  includeProgress: z.coerce.boolean().default(true),
});

export type GetModulesQuery = z.infer<typeof GetModulesQuerySchema>;

// Get lessons request query parameters
export const GetLessonsQuerySchema = z.object({
  moduleId: z.string().uuid('Invalid module ID').optional(),
  type: LessonTypeSchema.optional(),
  published: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GetLessonsQuery = z.infer<typeof GetLessonsQuerySchema>;

// Update progress request
export const UpdateProgressRequestSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),
  lessonId: z.string().optional(),
  progressPercent: z.number().int().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100'),
  timeSpentMinutes: z.number().int().min(0, 'Time spent cannot be negative').optional(),
  status: ProgressStatusSchema.optional(),
});

export type UpdateProgressRequest = z.infer<typeof UpdateProgressRequestSchema>;

// Complete lesson request
export const CompleteLessonRequestSchema = z.object({
  timeSpentMinutes: z.number().int().min(0, 'Time spent cannot be negative').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  score: z.number().min(0).max(100).optional(),
});

export type CompleteLessonRequest = z.infer<typeof CompleteLessonRequestSchema>;

// Complete module request
export const CompleteModuleRequestSchema = z.object({
  timeSpentMinutes: z.number().int().min(0, 'Time spent cannot be negative'),
  notes: z.string().max(2000, 'Notes too long').optional(),
  requestCertificate: z.boolean().default(false),
});

export type CompleteModuleRequest = z.infer<typeof CompleteModuleRequestSchema>;

// ==============================================================
// RESPONSE WRAPPER SCHEMAS
// ==============================================================

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    message: z.string().optional(),
    timestamp: z.number().int().positive(),
  });

// Success response schema
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.number().int().positive(),
  });

// Error response schema
export const WorkbookErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1, 'Error message is required'),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.number().int().positive(),
});

export type WorkbookErrorResponse = z.infer<typeof WorkbookErrorResponseSchema>;

// ==============================================================
// VALIDATION HELPER FUNCTIONS
// ==============================================================

// Validate user has access to module based on subscription tier
export const validateModuleAccess = (userTier: SubscriptionTier, moduleRequiredTier?: SubscriptionTier): boolean => {
  if (!moduleRequiredTier) return true;

  const tierHierarchy: Record<SubscriptionTier, number> = {
    basic: 1,
    premium: 2,
    vip: 3,
    enterprise: 4,
  };

  return tierHierarchy[userTier] >= tierHierarchy[moduleRequiredTier];
};

// Validate prerequisites are met
export const validatePrerequisites = (
  completedModules: string[],
  prerequisites: string[]
): boolean => {
  return prerequisites.every(prereq => completedModules.includes(prereq));
};

// Sanitize and validate search input
export const sanitizeSearchInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove potential XSS characters
    .substring(0, 100); // Limit length
};

// Validate pagination parameters
export const validatePagination = (page: number, limit: number) => {
  const validatedPage = Math.max(1, Math.floor(page));
  const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  return { page: validatedPage, limit: validatedLimit };
};

// Calculate progress percentage
export const calculateProgressPercentage = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
};

// ==============================================================
// VALIDATION MIDDLEWARE CREATORS
// ==============================================================

// Create validation middleware for request body
export const createBodyValidationMiddleware = <T extends z.ZodType>(schema: T) => {
  return (data: unknown): z.infer<T> => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Body validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  };
};

// Create validation middleware for query parameters
export const createQueryValidationMiddleware = <T extends z.ZodType>(schema: T) => {
  return (data: unknown): z.infer<T> => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Query validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  };
};

// Create validation middleware for path parameters
export const createParamsValidationMiddleware = <T extends z.ZodType>(schema: T) => {
  return (data: unknown): z.infer<T> => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Path parameter validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  };
};

// Export validation middleware helpers
export const validateModulesQuery = createQueryValidationMiddleware(GetModulesQuerySchema);
export const validateLessonsQuery = createQueryValidationMiddleware(GetLessonsQuerySchema);
export const validateUpdateProgressBody = createBodyValidationMiddleware(UpdateProgressRequestSchema);
export const validateCompleteLessonBody = createBodyValidationMiddleware(CompleteLessonRequestSchema);
export const validateCompleteModuleBody = createBodyValidationMiddleware(CompleteModuleRequestSchema);

// Common parameter validators
export const validateUuidParam = createParamsValidationMiddleware(z.object({
  id: z.string().uuid('Invalid ID format'),
}));

export const validateModuleIdParam = createParamsValidationMiddleware(z.object({
  moduleId: z.string().uuid('Invalid module ID format'),
}));

export const validateLessonIdParam = createParamsValidationMiddleware(z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
}));

// Type guards for runtime validation
export const isValidSubscriptionTier = (tier: any): tier is SubscriptionTier => {
  return SubscriptionTierSchema.safeParse(tier).success;
};

export const isValidProgressStatus = (status: any): status is ProgressStatus => {
  return ProgressStatusSchema.safeParse(status).success;
};

export const isValidLessonType = (type: any): type is LessonType => {
  return LessonTypeSchema.safeParse(type).success;
};

// Database query result validators
export const validateModuleQueryResult = (data: unknown): WorkshopModule => {
  const result = WorkshopModuleSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid module data from database: ${result.error.message}`);
  }
  return result.data;
};

export const validateProgressQueryResult = (data: unknown): UserProgress => {
  const result = UserProgressSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid progress data from database: ${result.error.message}`);
  }
  return result.data;
};

// All schemas are already exported individually above as const declarations