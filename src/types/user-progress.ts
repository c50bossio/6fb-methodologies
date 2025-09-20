/**
 * T018: UserProgress Model - Progress tracking with state transitions
 *
 * This module provides comprehensive progress tracking types with:
 * - Progress tracking with state transitions (not_started → in_progress → completed)
 * - Time tracking and completion validation
 * - Prerequisites checking and unlocking logic
 * - Progress calculation utilities
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const ProgressStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  LOCKED: 'locked',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type ProgressStatusType =
  (typeof ProgressStatus)[keyof typeof ProgressStatus];

export const ActivityType = {
  LESSON_START: 'lesson_start',
  LESSON_PROGRESS: 'lesson_progress',
  LESSON_COMPLETE: 'lesson_complete',
  MODULE_START: 'module_start',
  MODULE_COMPLETE: 'module_complete',
  ASSESSMENT_START: 'assessment_start',
  ASSESSMENT_SUBMIT: 'assessment_submit',
  ASSESSMENT_COMPLETE: 'assessment_complete',
  NOTE_CREATE: 'note_create',
  AUDIO_RECORD: 'audio_record',
  SESSION_JOIN: 'session_join',
  SESSION_LEAVE: 'session_leave',
} as const;

export type ActivityTypeType = (typeof ActivityType)[keyof typeof ActivityType];

export const CompletionReasonType = {
  CONTENT_VIEWED: 'content_viewed',
  TIME_REQUIREMENT_MET: 'time_requirement_met',
  ASSESSMENT_PASSED: 'assessment_passed',
  INTERACTION_COMPLETED: 'interaction_completed',
  MANUAL_COMPLETION: 'manual_completion',
  AUTOMATIC_COMPLETION: 'automatic_completion',
} as const;

export type CompletionReason =
  (typeof CompletionReasonType)[keyof typeof CompletionReasonType];

// =============================================================================
// Progress Tracking Interfaces
// =============================================================================

export interface ProgressMetrics {
  // Overall metrics
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;

  // Time tracking
  totalTimeSpent: number; // in minutes
  averageSessionDuration: number; // in minutes
  lastActivity: Timestamp;

  // Completion tracking
  completionRate: number; // 0-100
  moduleCompletionRate: number; // 0-100
  lessonCompletionRate: number; // 0-100

  // Engagement metrics
  streak: {
    current: number; // consecutive days
    longest: number; // all-time longest streak
    lastDate: string; // YYYY-MM-DD format
  };

  // Performance metrics
  averageScore?: number; // 0-100 for assessments
  averageTimePerLesson: number; // minutes
  retakeCount: number;

  // Goals and targets
  weeklyGoal?: {
    target: number; // minutes or lessons
    current: number;
    achieved: boolean;
  };
}

export interface ModuleProgress {
  id: UUID;
  userId: UUID;
  moduleId: UUID;
  status: ProgressStatusType;

  // Timing information
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastAccessedAt?: Timestamp;
  timeSpent: number; // total minutes in this module

  // Lesson tracking
  lessonsCompleted: number;
  totalLessons: number;
  currentLessonId?: UUID;
  currentLessonPosition?: number; // 0-100 percentage within current lesson

  // Completion metrics
  completionRate: number; // 0-100
  completionReason?: CompletionReason;

  // Assessment tracking
  assessmentsCompleted: number;
  totalAssessments: number;
  averageScore?: number; // 0-100
  bestScore?: number; // 0-100
  attempts: number;

  // Unlock and access control
  unlockedAt?: Timestamp;
  expiresAt?: Timestamp;
  accessCount: number;

  // Metadata and tracking
  metadata: Record<string, any>;
  tags: string[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LessonProgress {
  id: UUID;
  userId: UUID;
  moduleId: UUID;
  lessonId: UUID;
  status: ProgressStatusType;

  // Timing information
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastAccessedAt?: Timestamp;
  timeSpent: number; // total minutes in this lesson

  // Content progress
  progress: number; // 0-100 for current position within lesson
  contentBlocksViewed: string[]; // IDs of viewed content blocks
  contentBlocksCompleted: string[]; // IDs of completed content blocks
  totalContentBlocks: number;

  // Interaction tracking
  interactionsCompleted: number;
  totalInteractions: number;
  downloadsCount: number;
  notesCount: number;

  // Assessment tracking
  hasAssessment: boolean;
  assessmentScore?: number; // 0-100
  assessmentAttempts: number;
  assessmentPassed: boolean;

  // Completion criteria tracking
  meetsCriteria: {
    viewAllContent: boolean;
    passAssessment: boolean;
    minimumTimeSpent: boolean;
    interactionRequired: boolean;
  };

  // Unlock and prerequisites
  prerequisitesMet: boolean;
  unlockedAt?: Timestamp;

  // Session tracking
  sessionCount: number;
  averageSessionLength: number; // minutes

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssessmentProgress {
  id: UUID;
  userId: UUID;
  moduleId: UUID;
  lessonId?: UUID;
  assessmentId: UUID;

  // Attempt tracking
  attemptNumber: number;
  maxAttempts?: number;
  status:
    | 'not_started'
    | 'in_progress'
    | 'submitted'
    | 'graded'
    | 'passed'
    | 'failed';

  // Timing
  startedAt?: Timestamp;
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
  timeSpent: number; // minutes
  timeLimit?: number; // minutes

  // Scoring
  score?: number; // 0-100
  passingScore: number; // 0-100
  passed: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;

  // Question tracking
  responses: {
    questionId: string;
    answer: any; // Could be string, number, array of strings, etc.
    isCorrect?: boolean;
    pointsEarned: number;
    timeSpent: number; // seconds
    attempts: number;
  }[];

  // Feedback and review
  feedback?: string;
  allowReview: boolean;
  reviewedAt?: Timestamp;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ActivityRecord {
  id: UUID;
  userId: UUID;
  type: ActivityTypeType;

  // Context information
  moduleId?: UUID;
  lessonId?: UUID;
  assessmentId?: UUID;
  noteId?: UUID;
  audioId?: UUID;
  sessionId?: UUID;

  // Activity details
  details: Record<string, any>;
  duration?: number; // minutes for time-based activities
  result?: string; // outcome or result of the activity

  // Tracking information
  timestamp: Timestamp;
  sessionId?: string; // user session ID
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  };

  // Location and IP (optional for analytics)
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };

  // Metadata
  metadata: Record<string, any>;
}

// =============================================================================
// Progress State Management
// =============================================================================

export interface ProgressStateTransition {
  from: ProgressStatusType;
  to: ProgressStatusType;
  condition?: (progress: ModuleProgress | LessonProgress) => boolean;
  action?: (
    progress: ModuleProgress | LessonProgress
  ) => Partial<ModuleProgress | LessonProgress>;
  validation?: (progress: ModuleProgress | LessonProgress) => {
    valid: boolean;
    errors?: string[];
  };
}

export interface ProgressUpdate {
  status?: ProgressStatusType;
  timeSpent?: number;
  progress?: number;
  metadata?: Record<string, any>;
  completedContentBlocks?: string[];
  assessmentScore?: number;
  customFields?: Record<string, any>;
}

export interface ProgressCalculation {
  overall: number; // 0-100
  modules: number; // 0-100
  lessons: number; // 0-100
  assessments: number; // 0-100
  timeBasedProgress: number; // 0-100
  weights: {
    content: number;
    time: number;
    assessments: number;
    interactions: number;
  };
}

// =============================================================================
// Analytics and Reporting
// =============================================================================

export interface LearningAnalytics {
  userId: UUID;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Engagement metrics
  activedays: number;
  totalTimeSpent: number; // minutes
  averageSessionDuration: number; // minutes
  sessionCount: number;

  // Progress metrics
  lessonsCompleted: number;
  modulesCompleted: number;
  assessmentsTaken: number;
  averageScore: number; // 0-100

  // Content interaction
  notesCreated: number;
  audioRecorded: number; // minutes
  downloadsCount: number;
  searchQueries: number;

  // Patterns and insights
  mostActiveHour: number; // 0-23
  mostActiveDay: number; // 0-6 (Sunday = 0)
  learningVelocity: number; // lessons per week
  dropoffPoints: string[]; // lesson/module IDs where user tends to stop

  // Predictions and recommendations
  estimatedCompletionDate?: string; // YYYY-MM-DD
  recommendedPace?: number; // minutes per day
  riskLevel: 'low' | 'medium' | 'high'; // risk of not completing
}

export interface ProgressReport {
  userId: UUID;
  generatedAt: Timestamp;
  period: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
    type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };

  // Summary metrics
  summary: ProgressMetrics;
  analytics: LearningAnalytics;

  // Detailed breakdowns
  moduleBreakdown: {
    moduleId: UUID;
    moduleName: string;
    status: ProgressStatusType;
    completionRate: number;
    timeSpent: number;
    averageScore?: number;
  }[];

  // Achievements and milestones
  achievements: {
    type: 'completion' | 'streak' | 'score' | 'time' | 'engagement';
    title: string;
    description: string;
    earnedAt: Timestamp;
    metadata: Record<string, any>;
  }[];

  // Goals and targets
  goals: {
    type: 'time' | 'lessons' | 'modules' | 'score';
    target: number;
    current: number;
    deadline?: string; // YYYY-MM-DD
    achieved: boolean;
  }[];

  // Recommendations
  recommendations: {
    type: 'pace' | 'content' | 'review' | 'break';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    actionUrl?: string;
  }[];
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const ProgressStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'locked',
  'failed',
  'expired',
]);
export const ActivityTypeSchema = z.enum([
  'lesson_start',
  'lesson_progress',
  'lesson_complete',
  'module_start',
  'module_complete',
  'assessment_start',
  'assessment_submit',
  'assessment_complete',
  'note_create',
  'audio_record',
  'session_join',
  'session_leave',
]);

// Progress metrics schema
export const ProgressMetricsSchema = z.object({
  totalModules: z.number().min(0),
  completedModules: z.number().min(0),
  totalLessons: z.number().min(0),
  completedLessons: z.number().min(0),
  totalTimeSpent: z.number().min(0),
  averageSessionDuration: z.number().min(0),
  lastActivity: TimestampSchema,
  completionRate: z.number().min(0).max(100),
  moduleCompletionRate: z.number().min(0).max(100),
  lessonCompletionRate: z.number().min(0).max(100),
  streak: z.object({
    current: z.number().min(0),
    longest: z.number().min(0),
    lastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  averageScore: z.number().min(0).max(100).optional(),
  averageTimePerLesson: z.number().min(0),
  retakeCount: z.number().min(0),
  weeklyGoal: z
    .object({
      target: z.number().min(0),
      current: z.number().min(0),
      achieved: z.boolean(),
    })
    .optional(),
});

// Module progress schema
export const ModuleProgressSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  moduleId: UUIDSchema,
  status: ProgressStatusSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  lastAccessedAt: TimestampSchema.optional(),
  timeSpent: z.number().min(0),
  lessonsCompleted: z.number().min(0),
  totalLessons: z.number().min(0),
  currentLessonId: UUIDSchema.optional(),
  currentLessonPosition: z.number().min(0).max(100).optional(),
  completionRate: z.number().min(0).max(100),
  completionReason: z
    .enum([
      'content_viewed',
      'time_requirement_met',
      'assessment_passed',
      'interaction_completed',
      'manual_completion',
      'automatic_completion',
    ])
    .optional(),
  assessmentsCompleted: z.number().min(0),
  totalAssessments: z.number().min(0),
  averageScore: z.number().min(0).max(100).optional(),
  bestScore: z.number().min(0).max(100).optional(),
  attempts: z.number().min(0),
  unlockedAt: TimestampSchema.optional(),
  expiresAt: TimestampSchema.optional(),
  accessCount: z.number().min(0),
  metadata: z.record(z.any()),
  tags: z.array(z.string()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Lesson progress schema
export const LessonProgressSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  moduleId: UUIDSchema,
  lessonId: UUIDSchema,
  status: ProgressStatusSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  lastAccessedAt: TimestampSchema.optional(),
  timeSpent: z.number().min(0),
  progress: z.number().min(0).max(100),
  contentBlocksViewed: z.array(z.string()),
  contentBlocksCompleted: z.array(z.string()),
  totalContentBlocks: z.number().min(0),
  interactionsCompleted: z.number().min(0),
  totalInteractions: z.number().min(0),
  downloadsCount: z.number().min(0),
  notesCount: z.number().min(0),
  hasAssessment: z.boolean(),
  assessmentScore: z.number().min(0).max(100).optional(),
  assessmentAttempts: z.number().min(0),
  assessmentPassed: z.boolean(),
  meetsCriteria: z.object({
    viewAllContent: z.boolean(),
    passAssessment: z.boolean(),
    minimumTimeSpent: z.boolean(),
    interactionRequired: z.boolean(),
  }),
  prerequisitesMet: z.boolean(),
  unlockedAt: TimestampSchema.optional(),
  sessionCount: z.number().min(0),
  averageSessionLength: z.number().min(0),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Assessment progress schema
export const AssessmentProgressSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  moduleId: UUIDSchema,
  lessonId: UUIDSchema.optional(),
  assessmentId: UUIDSchema,
  attemptNumber: z.number().min(1),
  maxAttempts: z.number().min(1).optional(),
  status: z.enum([
    'not_started',
    'in_progress',
    'submitted',
    'graded',
    'passed',
    'failed',
  ]),
  startedAt: TimestampSchema.optional(),
  submittedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  timeSpent: z.number().min(0),
  timeLimit: z.number().min(1).optional(),
  score: z.number().min(0).max(100).optional(),
  passingScore: z.number().min(0).max(100),
  passed: z.boolean(),
  totalQuestions: z.number().min(0),
  answeredQuestions: z.number().min(0),
  correctAnswers: z.number().min(0),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answer: z.any(),
      isCorrect: z.boolean().optional(),
      pointsEarned: z.number().min(0),
      timeSpent: z.number().min(0),
      attempts: z.number().min(1),
    })
  ),
  feedback: z.string().optional(),
  allowReview: z.boolean(),
  reviewedAt: TimestampSchema.optional(),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Activity record schema
export const ActivityRecordSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  type: ActivityTypeSchema,
  moduleId: UUIDSchema.optional(),
  lessonId: UUIDSchema.optional(),
  assessmentId: UUIDSchema.optional(),
  noteId: UUIDSchema.optional(),
  audioId: UUIDSchema.optional(),
  sessionId: UUIDSchema.optional(),
  details: z.record(z.any()),
  duration: z.number().min(0).optional(),
  result: z.string().optional(),
  timestamp: TimestampSchema,
  deviceInfo: z
    .object({
      type: z.enum(['desktop', 'mobile', 'tablet']),
      browser: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  ipAddress: z.string().optional(),
  location: z
    .object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.any()),
});

// Input schemas for API operations
export const CreateModuleProgressInputSchema = ModuleProgressSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateModuleProgressInputSchema =
  CreateModuleProgressInputSchema.partial();

export const CreateLessonProgressInputSchema = LessonProgressSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateLessonProgressInputSchema =
  CreateLessonProgressInputSchema.partial();

// =============================================================================
// State Transition Management
// =============================================================================

/**
 * Define valid state transitions for progress tracking
 */
export const PROGRESS_STATE_TRANSITIONS: ProgressStateTransition[] = [
  // From NOT_STARTED
  {
    from: ProgressStatus.NOT_STARTED,
    to: ProgressStatus.IN_PROGRESS,
    condition: progress => true, // Always allowed
    action: progress => ({
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    }),
  },
  {
    from: ProgressStatus.NOT_STARTED,
    to: ProgressStatus.LOCKED,
    condition: progress =>
      !('prerequisitesMet' in progress) || !progress.prerequisitesMet,
  },

  // From LOCKED
  {
    from: ProgressStatus.LOCKED,
    to: ProgressStatus.NOT_STARTED,
    condition: progress =>
      'prerequisitesMet' in progress && progress.prerequisitesMet,
    action: progress => ({
      unlockedAt: new Date().toISOString(),
    }),
  },

  // From IN_PROGRESS
  {
    from: ProgressStatus.IN_PROGRESS,
    to: ProgressStatus.COMPLETED,
    condition: progress => progress.completionRate >= 100,
    action: progress => ({
      completedAt: new Date().toISOString(),
      status: ProgressStatus.COMPLETED,
    }),
    validation: progress => {
      if ('meetsCriteria' in progress) {
        const criteria = progress.meetsCriteria;
        const unmetCriteria = Object.entries(criteria)
          .filter(([key, value]) => !value)
          .map(([key]) => key);

        if (unmetCriteria.length > 0) {
          return {
            valid: false,
            errors: [
              `Completion criteria not met: ${unmetCriteria.join(', ')}`,
            ],
          };
        }
      }
      return { valid: true };
    },
  },
  {
    from: ProgressStatus.IN_PROGRESS,
    to: ProgressStatus.FAILED,
    condition: progress => {
      if (
        'assessmentScore' in progress &&
        progress.assessmentScore !== undefined
      ) {
        return (
          progress.assessmentScore <
          ('passingScore' in progress ? progress.passingScore || 70 : 70)
        );
      }
      return false;
    },
  },

  // From FAILED
  {
    from: ProgressStatus.FAILED,
    to: ProgressStatus.IN_PROGRESS,
    condition: progress => {
      if ('attempts' in progress && 'maxAttempts' in progress) {
        return (
          !progress.maxAttempts || progress.attempts < progress.maxAttempts
        );
      }
      return true;
    },
  },

  // From COMPLETED
  {
    from: ProgressStatus.COMPLETED,
    to: ProgressStatus.IN_PROGRESS,
    condition: progress => true, // Allow re-taking completed content
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: ProgressStatusType,
  to: ProgressStatusType,
  progress: ModuleProgress | LessonProgress
): { valid: boolean; errors?: string[] } {
  const transition = PROGRESS_STATE_TRANSITIONS.find(
    t => t.from === from && t.to === to
  );

  if (!transition) {
    return {
      valid: false,
      errors: [`Invalid transition from ${from} to ${to}`],
    };
  }

  if (transition.condition && !transition.condition(progress)) {
    return {
      valid: false,
      errors: [`Transition condition not met for ${from} to ${to}`],
    };
  }

  if (transition.validation) {
    return transition.validation(progress);
  }

  return { valid: true };
}

/**
 * Apply state transition to progress object
 */
export function applyStateTransition(
  progress: ModuleProgress | LessonProgress,
  newStatus: ProgressStatusType
): Partial<ModuleProgress | LessonProgress> {
  const transition = PROGRESS_STATE_TRANSITIONS.find(
    t => t.from === progress.status && t.to === newStatus
  );

  if (!transition) {
    throw new Error(
      `Invalid transition from ${progress.status} to ${newStatus}`
    );
  }

  const updates: Partial<ModuleProgress | LessonProgress> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  if (transition.action) {
    Object.assign(updates, transition.action(progress));
  }

  return updates;
}

/**
 * Calculate overall progress percentage
 */
export function calculateProgressPercentage(
  progress: ModuleProgress | LessonProgress,
  weights: {
    content: number;
    time: number;
    assessments: number;
    interactions: number;
  } = {
    content: 0.4,
    time: 0.2,
    assessments: 0.3,
    interactions: 0.1,
  }
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  // Content progress
  if ('lessonsCompleted' in progress) {
    const contentProgress =
      (progress.lessonsCompleted / progress.totalLessons) * 100;
    weightedSum += contentProgress * weights.content;
    totalWeight += weights.content;
  } else if ('contentBlocksCompleted' in progress) {
    const contentProgress =
      (progress.contentBlocksCompleted.length / progress.totalContentBlocks) *
      100;
    weightedSum += contentProgress * weights.content;
    totalWeight += weights.content;
  }

  // Assessment progress
  if ('assessmentScore' in progress && progress.assessmentScore !== undefined) {
    weightedSum += progress.assessmentScore * weights.assessments;
    totalWeight += weights.assessments;
  }

  // Interaction progress
  if ('interactionsCompleted' in progress) {
    const interactionProgress =
      (progress.interactionsCompleted / progress.totalInteractions) * 100;
    weightedSum += interactionProgress * weights.interactions;
    totalWeight += weights.interactions;
  }

  // Time-based progress (if estimated duration is available)
  // This would need to be passed as additional context
  // For now, we'll use the existing progress value if available
  if ('progress' in progress) {
    weightedSum += progress.progress * weights.time;
    totalWeight += weights.time;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Check if completion criteria are met
 */
export function checkCompletionCriteria(
  lessonProgress: LessonProgress,
  lesson: any // WorkshopLesson - avoiding circular dependency
): { met: boolean; missing: string[] } {
  const missing: string[] = [];
  const criteria = lesson.completionCriteria;

  // Check if all content blocks are viewed
  if (
    criteria.viewAllContent &&
    lessonProgress.contentBlocksViewed.length <
      lessonProgress.totalContentBlocks
  ) {
    missing.push('View all content blocks');
  }

  // Check assessment requirements
  if (
    criteria.passAssessment &&
    lessonProgress.hasAssessment &&
    !lessonProgress.assessmentPassed
  ) {
    missing.push('Pass assessment');
  }

  // Check minimum time spent
  if (
    criteria.minimumTimeSpent > 0 &&
    lessonProgress.timeSpent < criteria.minimumTimeSpent
  ) {
    missing.push(`Spend at least ${criteria.minimumTimeSpent} minutes`);
  }

  // Check interaction requirements
  if (
    criteria.interactionRequired &&
    lessonProgress.interactionsCompleted < lessonProgress.totalInteractions
  ) {
    missing.push('Complete all required interactions');
  }

  return { met: missing.length === 0, missing };
}

/**
 * Calculate learning streak
 */
export function calculateLearningStreak(
  activities: ActivityRecord[],
  currentDate: Date = new Date()
): { current: number; longest: number; lastDate: string } {
  // Sort activities by date (most recent first)
  const sortedActivities = activities
    .filter(
      activity =>
        activity.type === ActivityType.LESSON_COMPLETE ||
        activity.type === ActivityType.MODULE_COMPLETE
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  if (sortedActivities.length === 0) {
    return { current: 0, longest: 0, lastDate: '' };
  }

  // Group activities by date
  const activityDates = new Set(
    sortedActivities.map(
      activity => new Date(activity.timestamp).toISOString().split('T')[0]
    )
  );

  const uniqueDates = Array.from(activityDates).sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = currentDate.toISOString().split('T')[0];
  const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Calculate current streak
  for (let i = 0; i < uniqueDates.length; i++) {
    const date = uniqueDates[i];

    if (i === 0) {
      // Check if last activity was today or yesterday
      if (date === today || date === yesterday) {
        currentStreak = 1;
        tempStreak = 1;
      } else {
        currentStreak = 0;
        break;
      }
    } else {
      const prevDate = uniqueDates[i - 1];
      const daysDiff = Math.round(
        (new Date(prevDate).getTime() - new Date(date).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      if (daysDiff === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        // Current streak is broken, but continue to find longest
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        if (i === 0) currentStreak = 0;
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastDate: uniqueDates[0] || '',
  };
}

/**
 * Generate progress analytics
 */
export function generateProgressAnalytics(
  moduleProgress: ModuleProgress[],
  lessonProgress: LessonProgress[],
  activities: ActivityRecord[],
  period: { start: string; end: string }
): LearningAnalytics {
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);

  // Filter activities within the period
  const periodActivities = activities.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    return activityDate >= startDate && activityDate <= endDate;
  });

  // Calculate basic metrics
  const activeDays = new Set(
    periodActivities.map(
      activity => new Date(activity.timestamp).toISOString().split('T')[0]
    )
  ).size;

  const totalTimeSpent = periodActivities
    .filter(activity => activity.duration)
    .reduce((sum, activity) => sum + (activity.duration || 0), 0);

  const sessionCount = new Set(
    periodActivities.map(activity => activity.sessionId)
  ).size;

  const averageSessionDuration =
    sessionCount > 0 ? totalTimeSpent / sessionCount : 0;

  // Get completions in this period
  const lessonsCompleted = periodActivities.filter(
    activity => activity.type === ActivityType.LESSON_COMPLETE
  ).length;

  const modulesCompleted = periodActivities.filter(
    activity => activity.type === ActivityType.MODULE_COMPLETE
  ).length;

  const assessmentsTaken = periodActivities.filter(
    activity => activity.type === ActivityType.ASSESSMENT_COMPLETE
  ).length;

  // Calculate average score from assessment activities
  const assessmentActivities = periodActivities.filter(
    activity =>
      activity.type === ActivityType.ASSESSMENT_COMPLETE &&
      activity.details.score
  );
  const averageScore =
    assessmentActivities.length > 0
      ? assessmentActivities.reduce(
          (sum, activity) => sum + activity.details.score,
          0
        ) / assessmentActivities.length
      : 0;

  // Find most active patterns
  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);

  periodActivities.forEach(activity => {
    const date = new Date(activity.timestamp);
    hourCounts[date.getHours()]++;
    dayCounts[date.getDay()]++;
  });

  const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
  const mostActiveDay = dayCounts.indexOf(Math.max(...dayCounts));

  return {
    userId: moduleProgress[0]?.userId || '',
    period: 'custom',
    startDate: period.start,
    endDate: period.end,
    activedays: activeDays,
    totalTimeSpent,
    averageSessionDuration,
    sessionCount,
    lessonsCompleted,
    modulesCompleted,
    assessmentsTaken,
    averageScore,
    notesCreated: periodActivities.filter(
      a => a.type === ActivityType.NOTE_CREATE
    ).length,
    audioRecorded: periodActivities
      .filter(a => a.type === ActivityType.AUDIO_RECORD && a.duration)
      .reduce((sum, a) => sum + (a.duration || 0), 0),
    downloadsCount: periodActivities.filter(
      a => a.details.action === 'download'
    ).length,
    searchQueries: periodActivities.filter(a => a.details.action === 'search')
      .length,
    mostActiveHour,
    mostActiveDay,
    learningVelocity: lessonsCompleted / Math.max(1, activeDays / 7), // lessons per week
    dropoffPoints: [], // Would need more complex analysis
    riskLevel: activeDays < 2 ? 'high' : activeDays < 5 ? 'medium' : 'low',
  };
}

/**
 * Validate progress data
 */
export function validateProgressData(
  data: unknown,
  type: 'module' | 'lesson' | 'assessment' | 'activity'
): { valid: boolean; errors?: string[]; data?: any } {
  try {
    let schema;
    switch (type) {
      case 'module':
        schema = ModuleProgressSchema;
        break;
      case 'lesson':
        schema = LessonProgressSchema;
        break;
      case 'assessment':
        schema = AssessmentProgressSchema;
        break;
      case 'activity':
        schema = ActivityRecordSchema;
        break;
      default:
        return { valid: false, errors: ['Invalid progress type'] };
    }

    const validData = schema.parse(data);
    return { valid: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }
    return { valid: false, errors: ['Invalid data format'] };
  }
}

// =============================================================================
// Type Guards
// =============================================================================

export function isModuleProgress(obj: any): obj is ModuleProgress {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.moduleId === 'string' &&
    typeof obj.lessonsCompleted === 'number'
  );
}

export function isLessonProgress(obj: any): obj is LessonProgress {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.lessonId === 'string' &&
    typeof obj.progress === 'number'
  );
}

export function isAssessmentProgress(obj: any): obj is AssessmentProgress {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.assessmentId === 'string' &&
    typeof obj.attemptNumber === 'number'
  );
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateModuleProgressInput = z.infer<
  typeof CreateModuleProgressInputSchema
>;
export type UpdateModuleProgressInput = z.infer<
  typeof UpdateModuleProgressInputSchema
>;
export type CreateLessonProgressInput = z.infer<
  typeof CreateLessonProgressInputSchema
>;
export type UpdateLessonProgressInput = z.infer<
  typeof UpdateLessonProgressInputSchema
>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  ProgressMetrics: ProgressMetricsSchema,
  ModuleProgress: ModuleProgressSchema,
  LessonProgress: LessonProgressSchema,
  AssessmentProgress: AssessmentProgressSchema,
  ActivityRecord: ActivityRecordSchema,
  CreateModuleProgressInput: CreateModuleProgressInputSchema,
  UpdateModuleProgressInput: UpdateModuleProgressInputSchema,
  CreateLessonProgressInput: CreateLessonProgressInputSchema,
  UpdateLessonProgressInput: UpdateLessonProgressInputSchema,
} as const;
