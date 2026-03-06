/**
 * Workshop Content Type Definitions
 * Comprehensive content structure for the 6FB Workshop system
 */

// Basic content block types
export type ContentBlockType =
  | 'text'
  | 'video'
  | 'audio'
  | 'image'
  | 'quiz'
  | 'interactive'
  | 'checklist'
  | 'exercise'
  | 'reflection'
  | 'download'
  | 'separator'
  | 'callout';

// Interactive component types
export type InteractiveComponentType =
  | 'QuizEngine'
  | 'GoalSettingWorksheet'
  | 'RevenuePricingCalculator'
  | 'ServicePackageDesigner'
  | 'BusinessAssessmentTemplate';

// Content difficulty levels
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Content status
export type ContentStatus = 'draft' | 'published' | 'archived';

// Base content block interface
export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  order: number;
  title?: string;
  description?: string;
  isRequired?: boolean;
  estimatedMinutes?: number;
  metadata?: Record<string, any>;
}

// Text content block
export interface TextContentBlock extends BaseContentBlock {
  type: 'text';
  content: {
    text: string;
    format: 'plain' | 'markdown' | 'html';
    fontSize?: 'small' | 'normal' | 'large';
    alignment?: 'left' | 'center' | 'right';
  };
}

// Video content block
export interface VideoContentBlock extends BaseContentBlock {
  type: 'video';
  content: {
    videoUrl: string;
    posterUrl?: string;
    duration?: number;
    transcriptUrl?: string;
    chapters?: Array<{
      title: string;
      startTime: number;
      endTime?: number;
    }>;
    quality?: Array<{
      resolution: string;
      url: string;
    }>;
  };
}

// Audio content block
export interface AudioContentBlock extends BaseContentBlock {
  type: 'audio';
  content: {
    audioUrl: string;
    duration?: number;
    transcriptUrl?: string;
    waveformData?: number[];
    chapters?: Array<{
      title: string;
      startTime: number;
      endTime?: number;
    }>;
  };
}

// Image content block
export interface ImageContentBlock extends BaseContentBlock {
  type: 'image';
  content: {
    imageUrl: string;
    altText: string;
    caption?: string;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right' | 'full';
  };
}

// Quiz content block
export interface QuizContentBlock extends BaseContentBlock {
  type: 'quiz';
  content: {
    questions: Array<{
      id: string;
      question: string;
      type: 'multiple-choice' | 'true-false' | 'text' | 'number';
      options?: string[];
      correctAnswer: string | number | boolean;
      explanation?: string;
      points: number;
    }>;
    passingScore: number;
    allowRetries: boolean;
    showResults: boolean;
    timeLimit?: number;
  };
}

// Interactive content block
export interface InteractiveContentBlock extends BaseContentBlock {
  type: 'interactive';
  content: {
    component: InteractiveComponentType;
    props: Record<string, any>;
    saveProgress: boolean;
    requireCompletion: boolean;
  };
}

// Checklist content block
export interface ChecklistContentBlock extends BaseContentBlock {
  type: 'checklist';
  content: {
    items: Array<{
      id: string;
      text: string;
      isRequired: boolean;
      helpText?: string;
    }>;
    requireAll: boolean;
  };
}

// Exercise content block
export interface ExerciseContentBlock extends BaseContentBlock {
  type: 'exercise';
  content: {
    instructions: string;
    timeLimit?: number;
    materials?: string[];
    submissionType: 'text' | 'audio' | 'file' | 'photo';
    submissionRequired: boolean;
  };
}

// Reflection content block
export interface ReflectionContentBlock extends BaseContentBlock {
  type: 'reflection';
  content: {
    prompt: string;
    guidingQuestions?: string[];
    minLength?: number;
    private: boolean;
  };
}

// Download content block
export interface DownloadContentBlock extends BaseContentBlock {
  type: 'download';
  content: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    description?: string;
    requireCompletion: boolean;
  };
}

// Separator content block
export interface SeparatorContentBlock extends BaseContentBlock {
  type: 'separator';
  content: {
    style: 'line' | 'space' | 'decorative';
    height?: number;
  };
}

// Callout content block
export interface CalloutContentBlock extends BaseContentBlock {
  type: 'callout';
  content: {
    text: string;
    style: 'info' | 'warning' | 'success' | 'error' | 'tip';
    icon?: string;
    dismissible: boolean;
  };
}

// Union type for all content blocks
export type ContentBlock =
  | TextContentBlock
  | VideoContentBlock
  | AudioContentBlock
  | ImageContentBlock
  | QuizContentBlock
  | InteractiveContentBlock
  | ChecklistContentBlock
  | ExerciseContentBlock
  | ReflectionContentBlock
  | DownloadContentBlock
  | SeparatorContentBlock
  | CalloutContentBlock;

// Lesson structure
export interface WorkshopLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'interactive' | 'exercise' | 'quiz';
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
  prerequisites?: string[];
  content: {
    blocks: ContentBlock[];
    completionCriteria: {
      type: 'time' | 'interaction' | 'quiz' | 'exercise';
      threshold?: number;
    };
    resources?: Array<{
      title: string;
      url: string;
      type: 'link' | 'download' | 'reference';
    }>;
  };
  searchVector?: string;
  createdAt: string;
  updatedAt: string;
}

// Module structure
export interface WorkshopModule {
  id: string;
  title: string;
  description: string;
  moduleOrder: number;
  durationMinutes: number;
  difficultyLevel: DifficultyLevel;
  tags: string[];
  coverImageUrl?: string;
  videoIntroUrl?: string;
  prerequisites: string[];
  isPublished: boolean;
  content: {
    overview: {
      objectives: string[];
      outcomes: string[];
      keyTakeaways: string[];
    };
    lessons: WorkshopLesson[];
    resources: Array<{
      title: string;
      url: string;
      type: 'document' | 'template' | 'tool' | 'reference';
      description?: string;
    }>;
    assessment?: {
      type: 'quiz' | 'project' | 'reflection';
      passingScore?: number;
      questions?: any[];
    };
    certificate?: {
      templateUrl: string;
      criteria: {
        type: 'completion' | 'score' | 'time';
        threshold: number;
      };
    };
  };
  searchVector?: string;
  createdAt: string;
  updatedAt: string;
}

// Workshop program structure
export interface WorkshopProgram {
  id: string;
  title: string;
  description: string;
  version: string;
  modules: WorkshopModule[];
  totalDuration: number;
  difficulty: DifficultyLevel;
  accessLevel: 'basic' | 'premium' | 'vip' | 'enterprise';
  completionCertificate?: {
    templateUrl: string;
    criteria: {
      requiredModules: string[];
      minimumScore?: number;
      timeLimit?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Content validation schemas
export interface ContentValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}

// Export utility types
export type ModuleContentStructure = WorkshopModule['content'];
export type LessonContentStructure = WorkshopLesson['content'];
export type ContentBlockTypes = ContentBlock['type'];