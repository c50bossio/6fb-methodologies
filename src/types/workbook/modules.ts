/**
 * Workshop Module and Lesson type definitions
 * Comprehensive types for content structure and delivery
 */

import type { UUID, Timestamp, JSONObject } from './core';

// Content Types
export type ContentType =
  | 'video'
  | 'text'
  | 'interactive'
  | 'exercise'
  | 'quiz'
  | 'discussion';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ModuleStatus = 'draft' | 'published' | 'archived' | 'maintenance';

// Workshop Module Types
export interface WorkshopModule {
  id: UUID;
  title: string;
  description: string;
  slug: string;
  moduleOrder: number;
  duration: number; // estimated completion time in minutes
  difficultyLevel: DifficultyLevel;
  status: ModuleStatus;
  lessons: WorkshopLesson[];
  prerequisites: UUID[]; // module IDs that must be completed first
  learningObjectives: string[];
  tags: string[];
  metadata: ModuleMetadata;
  resources: Resource[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

export interface ModuleMetadata {
  estimatedReadingTime: number; // in minutes
  wordCount: number;
  videoCount: number;
  exerciseCount: number;
  resourceCount: number;
  lastContentUpdate: Timestamp;
  version: string;
  author: {
    id: UUID;
    name: string;
  };
}

export interface WorkshopLesson {
  id: UUID;
  moduleId: UUID;
  title: string;
  description?: string;
  slug: string;
  lessonOrder: number;
  content: LessonContent;
  type: ContentType;
  estimatedTime: number; // in minutes
  isRequired: boolean;
  prerequisites: UUID[]; // lesson IDs
  resources: Resource[];
  metadata: LessonMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LessonContent {
  id: UUID;
  type: ContentType;
  data:
    | VideoContent
    | TextContent
    | InteractiveContent
    | ExerciseContent
    | QuizContent;
  settings: ContentSettings;
}

export interface ContentSettings {
  allowSkip: boolean;
  requireCompletion: boolean;
  timeTracking: boolean;
  autoAdvance: boolean;
  showProgress: boolean;
  enableNotes: boolean;
  enableBookmarks: boolean;
}

// Specific Content Types
export interface VideoContent {
  url: string;
  duration: number; // in seconds
  thumbnail: string;
  captions?: {
    language: string;
    url: string;
  }[];
  chapters?: VideoChapter[];
  quality: {
    '720p'?: string;
    '1080p'?: string;
    '480p'?: string;
  };
}

export interface VideoChapter {
  title: string;
  startTime: number; // in seconds
  endTime: number;
  description?: string;
}

export interface TextContent {
  markdown: string;
  wordCount: number;
  readingTime: number; // estimated in minutes
  tableOfContents: TableOfContentsItem[];
  images: ContentImage[];
  highlights: TextHighlight[];
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number; // 1-6 for heading levels
  anchor: string;
}

export interface ContentImage {
  id: UUID;
  url: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
}

export interface TextHighlight {
  id: UUID;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  note?: string;
}

export interface InteractiveContent {
  type: 'simulation' | 'calculator' | 'diagram' | 'timeline' | 'quiz_inline';
  config: JSONObject;
  instructions: string;
  completionCriteria: CompletionCriteria;
}

export interface ExerciseContent {
  instructions: string;
  type: 'written' | 'practical' | 'project' | 'assessment';
  submissionFormat: 'text' | 'file' | 'audio' | 'video' | 'multiple';
  rubric?: AssessmentRubric;
  exampleSubmissions?: ExampleSubmission[];
  completionCriteria: CompletionCriteria;
}

export interface QuizContent {
  questions: QuizQuestion[];
  settings: QuizSettings;
  passingScore: number; // 0-100
  maxAttempts: number;
  timeLimit?: number; // in minutes
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
}

export interface QuizQuestion {
  id: UUID;
  type:
    | 'multiple_choice'
    | 'true_false'
    | 'short_answer'
    | 'essay'
    | 'matching'
    | 'ordering';
  question: string;
  explanation?: string;
  points: number;
  options?: QuizOption[];
  correctAnswer: string | string[];
  media?: {
    type: 'image' | 'audio' | 'video';
    url: string;
  };
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizSettings {
  randomizeOptions: boolean;
  showProgressBar: boolean;
  allowBackNavigation: boolean;
  showQuestionNumbers: boolean;
  immediateTheme: boolean;
}

// Assessment and Completion Types
export interface CompletionCriteria {
  type: 'time_based' | 'interaction_based' | 'assessment_based' | 'manual';
  requirements: {
    minTimeSpent?: number; // in minutes
    minScore?: number; // 0-100
    requiredInteractions?: string[];
    manualReview?: boolean;
  };
}

export interface AssessmentRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
  passingThreshold: number;
}

export interface RubricCriterion {
  id: UUID;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface ExampleSubmission {
  id: UUID;
  title: string;
  content: string;
  score: number;
  feedback: string;
  isPublic: boolean;
}

// Resource Types
export interface Resource {
  id: UUID;
  title: string;
  description?: string;
  type: 'pdf' | 'link' | 'video' | 'audio' | 'document' | 'template' | 'tool';
  url: string;
  fileSize?: number; // in bytes
  downloadable: boolean;
  external: boolean;
  metadata?: JSONObject;
  createdAt: Timestamp;
}

// Lesson Metadata
export interface LessonMetadata {
  estimatedTime: number;
  actualAverageTime?: number; // computed from user data
  completionRate?: number; // 0-100
  difficultyRating?: number; // 1-5 from user feedback
  lastUpdated: Timestamp;
  version: string;
  interactions: InteractionMetadata[];
}

export interface InteractionMetadata {
  type: string;
  count: number;
  averageTime: number;
  successRate?: number;
}

// Navigation and Structure Types
export interface ModuleNavigation {
  currentModule: UUID;
  currentLesson: UUID;
  previousLesson?: UUID;
  nextLesson?: UUID;
  moduleProgress: number; // 0-100
  canNavigateToNext: boolean;
  canNavigateToPrevious: boolean;
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  id: UUID;
  title: string;
  type: 'module' | 'lesson';
  url: string;
  isActive: boolean;
}

// Content Management Types
export interface ContentVersion {
  id: UUID;
  contentId: UUID;
  version: string;
  changes: string;
  author: {
    id: UUID;
    name: string;
  };
  createdAt: Timestamp;
  isActive: boolean;
}

export interface ContentApproval {
  id: UUID;
  contentId: UUID;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewer: {
    id: UUID;
    name: string;
  };
  comments?: string;
  reviewedAt: Timestamp;
}

// API Input Types
export type CreateModuleInput = Omit<
  WorkshopModule,
  'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'lessons'
> & {
  lessons?: CreateLessonInput[];
};

export type UpdateModuleInput = Partial<CreateModuleInput>;

export type CreateLessonInput = Omit<
  WorkshopLesson,
  'id' | 'createdAt' | 'updatedAt' | 'moduleId'
>;

export type UpdateLessonInput = Partial<CreateLessonInput>;

// Workshop Content Query Types
export interface ModuleQuery {
  status?: ModuleStatus;
  difficultyLevel?: DifficultyLevel;
  tags?: string[];
  search?: string;
  includeUnpublished?: boolean;
}

export interface LessonQuery {
  moduleId?: UUID;
  type?: ContentType;
  isRequired?: boolean;
  search?: string;
}
