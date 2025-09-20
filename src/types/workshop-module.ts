/**
 * T017: WorkshopModule Model - Module and lesson content structure with JSONB support
 *
 * This module provides comprehensive workshop module management types with:
 * - Module and lesson content structure with JSONB support
 * - Content type validation and rendering utilities
 * - Prerequisites checking and navigation logic
 * - Module progression and completion tracking
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const ModuleStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  MAINTENANCE: 'maintenance',
} as const;

export type ModuleStatusType = (typeof ModuleStatus)[keyof typeof ModuleStatus];

export const ModuleType = {
  VIDEO: 'video',
  INTERACTIVE: 'interactive',
  DOCUMENT: 'document',
  QUIZ: 'quiz',
  WORKSHOP: 'workshop',
  LIVE_SESSION: 'live_session',
} as const;

export type ModuleTypeType = (typeof ModuleType)[keyof typeof ModuleType];

export const DifficultyLevel = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;

export type DifficultyLevelType =
  (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

export const ContentFormat = {
  TEXT: 'text',
  HTML: 'html',
  MARKDOWN: 'markdown',
  VIDEO: 'video',
  AUDIO: 'audio',
  IMAGE: 'image',
  PDF: 'pdf',
  INTERACTIVE: 'interactive',
  EMBED: 'embed',
} as const;

export type ContentFormatType =
  (typeof ContentFormat)[keyof typeof ContentFormat];

// =============================================================================
// Content Block Structures (JSONB Support)
// =============================================================================

export interface BaseContentBlock {
  id: string;
  type: ContentFormatType;
  order: number;
  required: boolean;
  title?: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface TextContentBlock extends BaseContentBlock {
  type: 'text';
  content: {
    text: string;
    format: 'plain' | 'markdown' | 'html';
    wordCount: number;
    readingTimeMinutes: number;
  };
}

export interface VideoContentBlock extends BaseContentBlock {
  type: 'video';
  content: {
    url: string;
    thumbnail?: string;
    duration: number; // seconds
    subtitles?: {
      language: string;
      url: string;
    }[];
    quality: {
      '720p'?: string;
      '1080p'?: string;
      '4k'?: string;
    };
    chapters?: {
      title: string;
      startTime: number;
      endTime: number;
    }[];
  };
}

export interface AudioContentBlock extends BaseContentBlock {
  type: 'audio';
  content: {
    url: string;
    duration: number; // seconds
    transcript?: string;
    waveformData?: number[];
    quality: {
      low?: string;
      medium?: string;
      high?: string;
    };
  };
}

export interface ImageContentBlock extends BaseContentBlock {
  type: 'image';
  content: {
    url: string;
    alt: string;
    caption?: string;
    dimensions: {
      width: number;
      height: number;
    };
    sizes?: {
      thumbnail: string;
      medium: string;
      large: string;
      original: string;
    };
  };
}

export interface InteractiveContentBlock extends BaseContentBlock {
  type: 'interactive';
  content: {
    interactionType: 'quiz' | 'exercise' | 'simulation' | 'calculator' | 'form';
    configuration: Record<string, any>;
    expectedOutcome?: string;
    validationRules?: Record<string, any>;
    feedback?: {
      correct: string;
      incorrect: string;
      hint?: string;
    };
  };
}

export interface EmbedContentBlock extends BaseContentBlock {
  type: 'embed';
  content: {
    embedType: 'youtube' | 'vimeo' | 'iframe' | 'codepen' | 'figma';
    url: string;
    embedCode?: string;
    aspectRatio?: string;
    allowFullscreen: boolean;
    sandbox?: string[];
  };
}

export type ContentBlock =
  | TextContentBlock
  | VideoContentBlock
  | AudioContentBlock
  | ImageContentBlock
  | InteractiveContentBlock
  | EmbedContentBlock;

// =============================================================================
// Assessment and Quiz Structures
// =============================================================================

export interface QuizQuestion {
  id: string;
  type:
    | 'multiple_choice'
    | 'single_choice'
    | 'text'
    | 'number'
    | 'essay'
    | 'code';
  question: string;
  explanation?: string;
  points: number;
  order: number;
  required: boolean;
  options?: {
    id: string;
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    correctAnswer?: string | number;
  };
  metadata: Record<string, any>;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  timeLimit?: number; // minutes
  maxAttempts?: number;
  passingScore: number; // percentage
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  questions: QuizQuestion[];
  metadata: Record<string, any>;
}

// =============================================================================
// Prerequisites and Dependencies
// =============================================================================

export interface Prerequisite {
  id: string;
  type: 'module' | 'lesson' | 'skill' | 'assessment' | 'time_spent';
  targetId?: string; // ID of required module/lesson
  title: string;
  description?: string;
  required: boolean;
  condition?: {
    // For skill-based prerequisites
    skillLevel?: number;
    // For time-based prerequisites
    minimumTime?: number;
    // For assessment prerequisites
    minimumScore?: number;
    // For completion prerequisites
    completionRequired?: boolean;
  };
}

export interface LearningObjective {
  id: string;
  description: string;
  category: 'knowledge' | 'skills' | 'behavior';
  measurable: boolean;
  assessmentMethods: string[];
  bloomLevel:
    | 'remember'
    | 'understand'
    | 'apply'
    | 'analyze'
    | 'evaluate'
    | 'create';
}

// =============================================================================
// Lesson Structure
// =============================================================================

export interface WorkshopLesson {
  id: UUID;
  moduleId: UUID;
  title: string;
  slug: string;
  description?: string;
  summary?: string;

  // Content and structure
  contentBlocks: ContentBlock[];
  objectives: LearningObjective[];
  keywords: string[];

  // Prerequisites and navigation
  prerequisites: Prerequisite[];
  order: number;
  isOptional: boolean;

  // Timing and difficulty
  estimatedDuration: number; // minutes
  difficulty: DifficultyLevelType;

  // Assessment
  hasAssessment: boolean;
  assessment?: Assessment;
  minPassingScore?: number;

  // Completion tracking
  completionCriteria: {
    viewAllContent: boolean;
    passAssessment: boolean;
    minimumTimeSpent: number; // minutes
    interactionRequired: boolean;
  };

  // Accessibility and localization
  accessibility: {
    altText: boolean;
    captions: boolean;
    transcripts: boolean;
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
  };

  // Metadata and versioning
  version: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Timestamp;
  lastModifiedBy: UUID;
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Module Structure
// =============================================================================

export interface ModuleSettings {
  // Navigation settings
  allowSkipping: boolean;
  enforceSequential: boolean;
  showProgress: boolean;

  // Content settings
  allowDownloads: boolean;
  allowPrinting: boolean;
  allowNotes: boolean;

  // Assessment settings
  showScores: boolean;
  allowRetakes: boolean;
  saveProgress: boolean;

  // Timing settings
  enforcePacing: boolean;
  minimumTimePerLesson: number; // minutes

  // Collaboration settings
  allowDiscussion: boolean;
  allowPeerReview: boolean;
  enableGroupWork: boolean;
}

export interface ModuleMetrics {
  totalLessons: number;
  totalDuration: number; // minutes
  averageCompletionRate: number;
  averageRating: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completions: number;
  dropoutRate: number;
  lastActivityAt?: Timestamp;
}

export interface WorkshopModule {
  id: UUID;
  title: string;
  slug: string;
  description: string;
  summary?: string;

  // Module organization
  category: string;
  subcategory?: string;
  tags: string[];
  type: ModuleTypeType;

  // Content structure
  lessons: WorkshopLesson[];
  totalLessons: number;

  // Learning information
  objectives: LearningObjective[];
  prerequisites: Prerequisite[];
  targetAudience: string[];
  skillsRequired: string[];
  skillsGained: string[];

  // Difficulty and timing
  difficulty: DifficultyLevelType;
  estimatedDuration: number; // total minutes
  selfPaced: boolean;

  // Instructor information
  instructorId?: UUID;
  instructorName?: string;
  instructorBio?: string;
  instructorImage?: string;

  // Media and branding
  thumbnail?: string;
  banner?: string;
  trailer?: {
    url: string;
    duration: number;
  };

  // Settings and configuration
  settings: ModuleSettings;

  // Certification and completion
  certificateEnabled: boolean;
  certificateTemplate?: string;
  completionCriteria: {
    minimumLessonsCompleted: number; // percentage
    minimumTimeSpent: number; // percentage of estimated duration
    minimumScore?: number; // percentage for assessments
    allAssessmentsRequired: boolean;
  };

  // Pricing and access
  isPremium: boolean;
  price?: {
    amount: number;
    currency: string;
  };
  accessLevel: 'free' | 'basic' | 'premium' | 'enterprise';

  // Availability and scheduling
  status: ModuleStatusType;
  publishedAt?: Timestamp;
  availableFrom?: Timestamp;
  availableUntil?: Timestamp;
  timezone?: string;

  // Analytics and metrics
  metrics: ModuleMetrics;

  // Versioning and maintenance
  version: string;
  previousVersionId?: UUID;
  changelogUrl?: string;
  lastModifiedBy: UUID;

  // Localization
  language: string;
  translations?: {
    [languageCode: string]: {
      title: string;
      description: string;
      summary?: string;
    };
  };

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Navigation and Progress Utilities
// =============================================================================

export interface NavigationState {
  currentModuleId?: UUID;
  currentLessonId?: UUID;
  canNavigateForward: boolean;
  canNavigateBackward: boolean;
  nextLessonId?: UUID;
  previousLessonId?: UUID;
  progressPercentage: number;
  estimatedTimeRemaining: number; // minutes
}

export interface ModuleProgressSummary {
  moduleId: UUID;
  lessonsCompleted: number;
  totalLessons: number;
  timeSpent: number; // minutes
  averageScore?: number;
  completionRate: number; // 0-100
  isCompleted: boolean;
  certificateEarned: boolean;
  lastAccessedAt?: Timestamp;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const ModuleStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'maintenance',
]);
export const ModuleTypeSchema = z.enum([
  'video',
  'interactive',
  'document',
  'quiz',
  'workshop',
  'live_session',
]);
export const DifficultyLevelSchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);
export const ContentFormatSchema = z.enum([
  'text',
  'html',
  'markdown',
  'video',
  'audio',
  'image',
  'pdf',
  'interactive',
  'embed',
]);

// Content block schemas
export const BaseContentBlockSchema = z.object({
  id: z.string(),
  type: ContentFormatSchema,
  order: z.number().min(0),
  required: z.boolean(),
  title: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()),
});

export const TextContentBlockSchema = BaseContentBlockSchema.extend({
  type: z.literal('text'),
  content: z.object({
    text: z.string(),
    format: z.enum(['plain', 'markdown', 'html']),
    wordCount: z.number().min(0),
    readingTimeMinutes: z.number().min(0),
  }),
});

export const VideoContentBlockSchema = BaseContentBlockSchema.extend({
  type: z.literal('video'),
  content: z.object({
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
    duration: z.number().min(0),
    subtitles: z
      .array(
        z.object({
          language: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
    quality: z.object({
      '720p': z.string().url().optional(),
      '1080p': z.string().url().optional(),
      '4k': z.string().url().optional(),
    }),
    chapters: z
      .array(
        z.object({
          title: z.string(),
          startTime: z.number().min(0),
          endTime: z.number().min(0),
        })
      )
      .optional(),
  }),
});

export const ContentBlockSchema = z.union([
  TextContentBlockSchema,
  VideoContentBlockSchema,
  // Add other content block schemas as needed
]);

// Assessment schemas
export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'multiple_choice',
    'single_choice',
    'text',
    'number',
    'essay',
    'code',
  ]),
  question: z.string(),
  explanation: z.string().optional(),
  points: z.number().min(0),
  order: z.number().min(0),
  required: z.boolean(),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean().optional(),
        explanation: z.string().optional(),
      })
    )
    .optional(),
  validation: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      correctAnswer: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
  metadata: z.record(z.any()),
});

export const AssessmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  instructions: z.string(),
  timeLimit: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).optional(),
  passingScore: z.number().min(0).max(100),
  shuffleQuestions: z.boolean(),
  showCorrectAnswers: z.boolean(),
  allowReview: z.boolean(),
  questions: z.array(QuizQuestionSchema),
  metadata: z.record(z.any()),
});

// Prerequisites and objectives schemas
export const PrerequisiteSchema = z.object({
  id: z.string(),
  type: z.enum(['module', 'lesson', 'skill', 'assessment', 'time_spent']),
  targetId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  required: z.boolean(),
  condition: z
    .object({
      skillLevel: z.number().optional(),
      minimumTime: z.number().optional(),
      minimumScore: z.number().optional(),
      completionRequired: z.boolean().optional(),
    })
    .optional(),
});

export const LearningObjectiveSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.enum(['knowledge', 'skills', 'behavior']),
  measurable: z.boolean(),
  assessmentMethods: z.array(z.string()),
  bloomLevel: z.enum([
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create',
  ]),
});

// Lesson schema
export const WorkshopLessonSchema = z.object({
  id: UUIDSchema,
  moduleId: UUIDSchema,
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().optional(),
  contentBlocks: z.array(ContentBlockSchema),
  objectives: z.array(LearningObjectiveSchema),
  keywords: z.array(z.string()),
  prerequisites: z.array(PrerequisiteSchema),
  order: z.number().min(0),
  isOptional: z.boolean(),
  estimatedDuration: z.number().min(1),
  difficulty: DifficultyLevelSchema,
  hasAssessment: z.boolean(),
  assessment: AssessmentSchema.optional(),
  minPassingScore: z.number().min(0).max(100).optional(),
  completionCriteria: z.object({
    viewAllContent: z.boolean(),
    passAssessment: z.boolean(),
    minimumTimeSpent: z.number().min(0),
    interactionRequired: z.boolean(),
  }),
  accessibility: z.object({
    altText: z.boolean(),
    captions: z.boolean(),
    transcripts: z.boolean(),
    keyboardNavigation: z.boolean(),
    screenReaderOptimized: z.boolean(),
  }),
  version: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  publishedAt: TimestampSchema.optional(),
  lastModifiedBy: UUIDSchema,
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Module schemas
export const ModuleSettingsSchema = z.object({
  allowSkipping: z.boolean(),
  enforceSequential: z.boolean(),
  showProgress: z.boolean(),
  allowDownloads: z.boolean(),
  allowPrinting: z.boolean(),
  allowNotes: z.boolean(),
  showScores: z.boolean(),
  allowRetakes: z.boolean(),
  saveProgress: z.boolean(),
  enforcePacing: z.boolean(),
  minimumTimePerLesson: z.number().min(0),
  allowDiscussion: z.boolean(),
  allowPeerReview: z.boolean(),
  enableGroupWork: z.boolean(),
});

export const ModuleMetricsSchema = z.object({
  totalLessons: z.number().min(0),
  totalDuration: z.number().min(0),
  averageCompletionRate: z.number().min(0).max(100),
  averageRating: z.number().min(0).max(5),
  totalEnrollments: z.number().min(0),
  activeEnrollments: z.number().min(0),
  completions: z.number().min(0),
  dropoutRate: z.number().min(0).max(100),
  lastActivityAt: TimestampSchema.optional(),
});

export const WorkshopModuleSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  description: z.string().min(1),
  summary: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()),
  type: ModuleTypeSchema,
  lessons: z.array(WorkshopLessonSchema),
  totalLessons: z.number().min(0),
  objectives: z.array(LearningObjectiveSchema),
  prerequisites: z.array(PrerequisiteSchema),
  targetAudience: z.array(z.string()),
  skillsRequired: z.array(z.string()),
  skillsGained: z.array(z.string()),
  difficulty: DifficultyLevelSchema,
  estimatedDuration: z.number().min(1),
  selfPaced: z.boolean(),
  instructorId: UUIDSchema.optional(),
  instructorName: z.string().optional(),
  instructorBio: z.string().optional(),
  instructorImage: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  banner: z.string().url().optional(),
  trailer: z
    .object({
      url: z.string().url(),
      duration: z.number().min(0),
    })
    .optional(),
  settings: ModuleSettingsSchema,
  certificateEnabled: z.boolean(),
  certificateTemplate: z.string().optional(),
  completionCriteria: z.object({
    minimumLessonsCompleted: z.number().min(0).max(100),
    minimumTimeSpent: z.number().min(0).max(100),
    minimumScore: z.number().min(0).max(100).optional(),
    allAssessmentsRequired: z.boolean(),
  }),
  isPremium: z.boolean(),
  price: z
    .object({
      amount: z.number().min(0),
      currency: z.string().length(3),
    })
    .optional(),
  accessLevel: z.enum(['free', 'basic', 'premium', 'enterprise']),
  status: ModuleStatusSchema,
  publishedAt: TimestampSchema.optional(),
  availableFrom: TimestampSchema.optional(),
  availableUntil: TimestampSchema.optional(),
  timezone: z.string().optional(),
  metrics: ModuleMetricsSchema,
  version: z.string(),
  previousVersionId: UUIDSchema.optional(),
  changelogUrl: z.string().url().optional(),
  lastModifiedBy: UUIDSchema,
  language: z.string().min(2).max(10),
  translations: z
    .record(
      z.object({
        title: z.string(),
        description: z.string(),
        summary: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Input schemas for API operations
export const CreateModuleInputSchema = WorkshopModuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  metrics: true,
});

export const UpdateModuleInputSchema = CreateModuleInputSchema.partial();

export const CreateLessonInputSchema = WorkshopLessonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateLessonInputSchema = CreateLessonInputSchema.partial();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a lesson's prerequisites are met
 */
export function checkPrerequisites(
  lesson: WorkshopLesson,
  userProgress: any[], // ModuleProgress[] - avoiding circular dependency
  completedLessons: string[]
): { met: boolean; missing: Prerequisite[] } {
  const missing: Prerequisite[] = [];

  for (const prereq of lesson.prerequisites) {
    if (!prereq.required) continue;

    switch (prereq.type) {
      case 'lesson':
        if (prereq.targetId && !completedLessons.includes(prereq.targetId)) {
          missing.push(prereq);
        }
        break;
      case 'module':
        if (prereq.targetId) {
          const moduleProgress = userProgress.find(
            p => p.moduleId === prereq.targetId
          );
          if (!moduleProgress || moduleProgress.status !== 'completed') {
            missing.push(prereq);
          }
        }
        break;
      case 'time_spent':
        if (prereq.condition?.minimumTime) {
          // Check if user has spent minimum time - implementation depends on progress tracking
          // This is a placeholder for the actual implementation
        }
        break;
    }
  }

  return { met: missing.length === 0, missing };
}

/**
 * Calculate module completion percentage
 */
export function calculateModuleCompletion(
  module: WorkshopModule,
  completedLessons: string[],
  timeSpent: number
): number {
  const lessonCompletion =
    (completedLessons.length / module.totalLessons) * 100;
  const timeCompletion = Math.min(
    (timeSpent / module.estimatedDuration) * 100,
    100
  );

  // Weight lesson completion more heavily than time
  return Math.round(lessonCompletion * 0.7 + timeCompletion * 0.3);
}

/**
 * Get next lesson in sequence
 */
export function getNextLesson(
  module: WorkshopModule,
  currentLessonId: string,
  completedLessons: string[],
  userProgress: any[]
): WorkshopLesson | null {
  const currentIndex = module.lessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex === -1) return null;

  for (let i = currentIndex + 1; i < module.lessons.length; i++) {
    const lesson = module.lessons[i];
    const { met } = checkPrerequisites(lesson, userProgress, completedLessons);

    if (met) {
      return lesson;
    }
  }

  return null;
}

/**
 * Get previous lesson in sequence
 */
export function getPreviousLesson(
  module: WorkshopModule,
  currentLessonId: string
): WorkshopLesson | null {
  const currentIndex = module.lessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex <= 0) return null;

  return module.lessons[currentIndex - 1] || null;
}

/**
 * Validate content block structure
 */
export function validateContentBlock(block: any): {
  valid: boolean;
  errors?: string[];
} {
  try {
    ContentBlockSchema.parse(block);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }
    return { valid: false, errors: ['Invalid content block format'] };
  }
}

/**
 * Calculate estimated reading time for text content
 */
export function calculateReadingTime(
  text: string,
  wordsPerMinute: number = 200
): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Generate lesson navigation state
 */
export function generateNavigationState(
  module: WorkshopModule,
  currentLessonId: string,
  completedLessons: string[],
  userProgress: any[]
): NavigationState {
  const currentLesson = module.lessons.find(l => l.id === currentLessonId);
  if (!currentLesson) {
    return {
      canNavigateForward: false,
      canNavigateBackward: false,
      progressPercentage: 0,
      estimatedTimeRemaining: module.estimatedDuration,
    };
  }

  const nextLesson = getNextLesson(
    module,
    currentLessonId,
    completedLessons,
    userProgress
  );
  const previousLesson = getPreviousLesson(module, currentLessonId);

  const completionPercentage = calculateModuleCompletion(
    module,
    completedLessons,
    0
  );
  const remainingLessons = module.lessons.slice(
    module.lessons.findIndex(l => l.id === currentLessonId) + 1
  );
  const estimatedTimeRemaining = remainingLessons.reduce(
    (total, lesson) => total + lesson.estimatedDuration,
    0
  );

  return {
    currentModuleId: module.id,
    currentLessonId,
    canNavigateForward: !!nextLesson,
    canNavigateBackward: !!previousLesson,
    nextLessonId: nextLesson?.id,
    previousLessonId: previousLesson?.id,
    progressPercentage: completionPercentage,
    estimatedTimeRemaining,
  };
}

/**
 * Get default module settings
 */
export function getDefaultModuleSettings(): ModuleSettings {
  return {
    allowSkipping: false,
    enforceSequential: true,
    showProgress: true,
    allowDownloads: false,
    allowPrinting: false,
    allowNotes: true,
    showScores: true,
    allowRetakes: true,
    saveProgress: true,
    enforcePacing: false,
    minimumTimePerLesson: 0,
    allowDiscussion: true,
    allowPeerReview: false,
    enableGroupWork: false,
  };
}

/**
 * Check if user can access module based on subscription
 */
export function canAccessModule(
  module: WorkshopModule,
  userSubscriptionTier: string
): boolean {
  if (module.accessLevel === 'free') return true;

  const tierHierarchy = {
    free: 0,
    basic: 1,
    premium: 2,
    enterprise: 3,
  };

  const userTierLevel =
    tierHierarchy[userSubscriptionTier as keyof typeof tierHierarchy] || 0;
  const moduleTierLevel =
    tierHierarchy[module.accessLevel as keyof typeof tierHierarchy] || 0;

  return userTierLevel >= moduleTierLevel;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isWorkshopModule(obj: any): obj is WorkshopModule {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.lessons)
  );
}

export function isWorkshopLesson(obj: any): obj is WorkshopLesson {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.moduleId === 'string' &&
    typeof obj.title === 'string'
  );
}

export function isContentBlock(obj: any): obj is ContentBlock {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.order === 'number'
  );
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateModuleInput = z.infer<typeof CreateModuleInputSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleInputSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonInputSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonInputSchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  WorkshopModule: WorkshopModuleSchema,
  WorkshopLesson: WorkshopLessonSchema,
  CreateModuleInput: CreateModuleInputSchema,
  UpdateModuleInput: UpdateModuleInputSchema,
  CreateLessonInput: CreateLessonInputSchema,
  UpdateLessonInput: UpdateLessonInputSchema,
  ContentBlock: ContentBlockSchema,
  Assessment: AssessmentSchema,
  QuizQuestion: QuizQuestionSchema,
  Prerequisite: PrerequisiteSchema,
  LearningObjective: LearningObjectiveSchema,
  ModuleSettings: ModuleSettingsSchema,
} as const;
