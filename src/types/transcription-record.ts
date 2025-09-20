/**
 * T020: TranscriptionRecord Model - OpenAI Whisper API response types and processing
 *
 * This module provides comprehensive transcription management types with:
 * - OpenAI Whisper API response types and processing
 * - Search functionality with full-text indexing
 * - Confidence scoring and quality metrics
 * - Word-level timestamp support
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const TranscriptionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type TranscriptionStatusType =
  (typeof TranscriptionStatus)[keyof typeof TranscriptionStatus];

export const TranscriptionProvider = {
  OPENAI_WHISPER: 'openai_whisper',
  AZURE_SPEECH: 'azure_speech',
  GOOGLE_SPEECH: 'google_speech',
  AWS_TRANSCRIBE: 'aws_transcribe',
  ASSEMBLYAI: 'assemblyai',
  DEEPGRAM: 'deepgram',
  CUSTOM: 'custom',
} as const;

export type TranscriptionProviderType =
  (typeof TranscriptionProvider)[keyof typeof TranscriptionProvider];

export const WhisperModel = {
  TINY: 'whisper-1',
  BASE: 'whisper-1',
  SMALL: 'whisper-1',
  MEDIUM: 'whisper-1',
  LARGE: 'whisper-1',
} as const;

export type WhisperModelType = (typeof WhisperModel)[keyof typeof WhisperModel];

export const TranscriptionLanguage = {
  AUTO: 'auto',
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  ITALIAN: 'it',
  PORTUGUESE: 'pt',
  RUSSIAN: 'ru',
  JAPANESE: 'ja',
  KOREAN: 'ko',
  CHINESE: 'zh',
  ARABIC: 'ar',
  HINDI: 'hi',
  DUTCH: 'nl',
  POLISH: 'pl',
  TURKISH: 'tr',
} as const;

export type TranscriptionLanguageType =
  (typeof TranscriptionLanguage)[keyof typeof TranscriptionLanguage];

export const OutputFormat = {
  JSON: 'json',
  TEXT: 'text',
  SRT: 'srt',
  VTT: 'vtt',
  TSV: 'tsv',
  VERBOSE_JSON: 'verbose_json',
} as const;

export type OutputFormatType = (typeof OutputFormat)[keyof typeof OutputFormat];

// =============================================================================
// OpenAI Whisper API Types
// =============================================================================

export interface WhisperRequestOptions {
  // File and audio settings
  file: File | Blob;
  model: WhisperModelType;
  language?: TranscriptionLanguageType;
  prompt?: string; // Optional context to guide the model

  // Output formatting
  response_format?: OutputFormatType;
  temperature?: number; // 0-1, controls randomness

  // Advanced options
  timestamp_granularities?: ('word' | 'segment')[];
  enable_voice_activity_detection?: boolean;
  max_initial_timestamp?: number;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

export interface WhisperWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
  probability: number; // 0-1
}

export interface WhisperResponse {
  task?: string; // "transcribe" or "translate"
  language?: string;
  duration?: number; // seconds
  text: string;
  segments?: WhisperSegment[];
  words?: WhisperWord[];
}

export interface WhisperErrorResponse {
  error: {
    code: string;
    message: string;
    param?: string;
    type: string;
  };
}

// =============================================================================
// Transcription Quality and Confidence Metrics
// =============================================================================

export interface ConfidenceMetrics {
  // Overall confidence
  overall: number; // 0-100
  average: number; // 0-100
  minimum: number; // 0-100
  maximum: number; // 0-100

  // Word-level confidence distribution
  distribution: {
    high: number; // percentage of words with confidence > 80%
    medium: number; // percentage of words with confidence 60-80%
    low: number; // percentage of words with confidence < 60%
  };

  // Segment-level metrics
  segments: {
    totalSegments: number;
    highConfidenceSegments: number;
    lowConfidenceSegments: number;
    averageSegmentConfidence: number;
  };

  // Quality indicators
  qualityIndicators: {
    noSpeechProbability: number; // 0-1
    compressionRatio: number;
    avgLogProb: number;
    temperature: number;
  };
}

export interface TranscriptionQuality {
  // Overall quality score
  score: number; // 0-100

  // Quality dimensions
  accuracy: number; // 0-100 (estimated)
  completeness: number; // 0-100 (percentage of audio transcribed)
  readability: number; // 0-100 (grammar, punctuation quality)
  timing: number; // 0-100 (timestamp accuracy)

  // Issues detected
  issues: Array<{
    type:
      | 'low_confidence'
      | 'background_noise'
      | 'multiple_speakers'
      | 'poor_audio'
      | 'fast_speech'
      | 'accent';
    severity: 'low' | 'medium' | 'high';
    description: string;
    segments?: number[]; // affected segment IDs
    suggestions?: string[];
  }>;

  // Recommendations
  recommendations: Array<{
    type:
      | 'reprocess'
      | 'manual_review'
      | 'speaker_separation'
      | 'noise_reduction';
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimatedImpact: number; // 0-100 expected improvement
  }>;

  // Processing metadata
  processedAt: Timestamp;
  analysisVersion: string;
}

// =============================================================================
// Search and Indexing
// =============================================================================

export interface TranscriptionSearchIndex {
  id: UUID;
  transcriptionId: UUID;

  // Full-text search data
  searchableText: string;
  wordCount: number;
  uniqueWords: string[];

  // Keyword extraction
  keywords: Array<{
    word: string;
    frequency: number;
    importance: number; // 0-1
    positions: Array<{
      segmentId: number;
      wordIndex: number;
      timestamp: number;
    }>;
  }>;

  // Topic modeling
  topics: Array<{
    topic: string;
    confidence: number; // 0-1
    keywords: string[];
    segments: number[];
  }>;

  // Named entity recognition
  entities: Array<{
    text: string;
    type:
      | 'PERSON'
      | 'ORGANIZATION'
      | 'LOCATION'
      | 'DATE'
      | 'TIME'
      | 'MONEY'
      | 'PERCENTAGE'
      | 'OTHER';
    confidence: number; // 0-1
    positions: Array<{
      segmentId: number;
      start: number;
      end: number;
    }>;
  }>;

  // Semantic embeddings (for vector search)
  embeddings?: {
    model: string;
    version: string;
    vectors: number[][]; // One vector per segment
    dimensions: number;
  };

  // Search metadata
  indexedAt: Timestamp;
  lastUpdated: Timestamp;
  indexVersion: string;
}

export interface SearchQuery {
  // Basic search
  query: string;
  type: 'text' | 'semantic' | 'hybrid';

  // Filters
  filters?: {
    userId?: UUID;
    moduleId?: UUID;
    lessonId?: UUID;
    language?: TranscriptionLanguageType;
    dateRange?: {
      start: string; // YYYY-MM-DD
      end: string; // YYYY-MM-DD
    };
    confidenceThreshold?: number; // 0-100
    tags?: string[];
  };

  // Search options
  options?: {
    fuzzy?: boolean;
    caseSensitive?: boolean;
    wholeWords?: boolean;
    includeContext?: boolean;
    maxResults?: number;
    offset?: number;
    sortBy?: 'relevance' | 'timestamp' | 'confidence';
    sortOrder?: 'asc' | 'desc';
  };
}

export interface SearchResult {
  transcriptionId: UUID;
  relevanceScore: number; // 0-1
  matchedText: string;
  highlightedText: string;

  // Context
  context: {
    before: string;
    match: string;
    after: string;
  };

  // Location in transcription
  location: {
    segmentId: number;
    wordIndex: number;
    timestamp: number;
    duration: number;
  };

  // Metadata
  transcription: {
    title?: string;
    moduleId?: UUID;
    lessonId?: UUID;
    userId: UUID;
    createdAt: Timestamp;
    language: TranscriptionLanguageType;
    confidence: number;
  };
}

export interface SearchAnalytics {
  query: string;
  totalResults: number;
  searchTime: number; // milliseconds
  resultsSeen: number;
  resultsClicked: number;
  clickThroughRate: number;
  avgRelevanceScore: number;
  timestamp: Timestamp;
  userId: UUID;
  sessionId?: string;
}

// =============================================================================
// Speaker Identification and Diarization
// =============================================================================

export interface SpeakerDiarization {
  enabled: boolean;
  speakers: Array<{
    id: string; // speaker-1, speaker-2, etc.
    name?: string; // if identified
    segments: Array<{
      start: number; // seconds
      end: number; // seconds
      confidence: number; // 0-1
    }>;
    characteristics?: {
      gender?: 'male' | 'female' | 'unknown';
      ageGroup?: 'child' | 'adult' | 'elderly' | 'unknown';
      accent?: string;
      speakingRate?: number; // words per minute
    };
  }>;

  // Speaker identification
  identification?: {
    method: 'voice_print' | 'speaker_model' | 'manual';
    confidence: number; // 0-1
    alternatives?: Array<{
      speakerId: string;
      name: string;
      confidence: number;
    }>;
  };
}

// =============================================================================
// Main TranscriptionRecord Interface
// =============================================================================

export interface TranscriptionRecord {
  id: UUID;
  audioRecordingId: UUID;
  userId: UUID;

  // Context information
  moduleId?: UUID;
  lessonId?: UUID;
  sessionId?: UUID;
  noteId?: UUID;

  // Basic information
  title?: string;
  description?: string;
  tags: string[];

  // Processing information
  provider: TranscriptionProviderType;
  model?: string;
  status: TranscriptionStatusType;

  // Input configuration
  inputConfig: {
    language: TranscriptionLanguageType;
    model: string;
    responseFormat: OutputFormatType;
    temperature?: number;
    prompt?: string;
    timestampGranularities: ('word' | 'segment')[];
    enableSpeakerDiarization: boolean;
    customVocabulary?: string[];
  };

  // Audio metadata
  audioMetadata: {
    duration: number; // seconds
    fileSize: number; // bytes
    format: string;
    sampleRate: number;
    channels: number;
  };

  // Transcription content
  content: {
    text: string;
    wordCount: number;
    segmentCount: number;
    segments: Array<{
      id: number;
      start: number;
      end: number;
      text: string;
      confidence?: number;
      speaker?: string;
    }>;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
      speaker?: string;
    }>;
  };

  // Quality and confidence metrics
  confidence: ConfidenceMetrics;
  quality: TranscriptionQuality;

  // Speaker information
  speakerDiarization?: SpeakerDiarization;

  // Search and indexing
  searchIndexId?: UUID;
  isIndexed: boolean;

  // Raw provider response
  rawResponse: WhisperResponse | Record<string, any>;

  // Processing metadata
  processing: {
    startedAt: Timestamp;
    completedAt?: Timestamp;
    processingTime: number; // seconds
    retryCount: number;
    cost?: number; // USD
    tokensUsed?: number;
  };

  // Review and editing
  review?: {
    status: 'pending' | 'in_progress' | 'completed';
    reviewedBy?: UUID;
    reviewedAt?: Timestamp;
    corrections: Array<{
      segmentId: number;
      wordIndex?: number;
      originalText: string;
      correctedText: string;
      timestamp: Timestamp;
      reviewerId: UUID;
      reason?: string;
    }>;
    overallQualityRating?: number; // 1-5
    comments?: string;
  };

  // Export and sharing
  exports: Array<{
    format: OutputFormatType;
    url: string;
    fileSize: number;
    expiresAt?: Timestamp;
    createdAt: Timestamp;
  }>;

  // Version and history
  version: number;
  parentTranscriptionId?: UUID;
  changeLog?: Array<{
    version: number;
    changes: string;
    changedBy: UUID;
    changedAt: Timestamp;
  }>;

  // Access and sharing
  isPublic: boolean;
  shareUrl?: string;
  shareExpiry?: Timestamp;
  viewCount: number;
  downloadCount: number;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

// =============================================================================
// Batch Processing and Jobs
// =============================================================================

export interface TranscriptionJob {
  id: UUID;
  userId: UUID;
  batchId?: UUID;

  // Input files
  audioRecordings: Array<{
    id: UUID;
    filename: string;
    duration: number;
    fileSize: number;
  }>;

  // Processing configuration
  config: {
    provider: TranscriptionProviderType;
    model: string;
    language: TranscriptionLanguageType;
    outputFormats: OutputFormatType[];
    enableSpeakerDiarization: boolean;
    enableQualityAnalysis: boolean;
    enableSearchIndexing: boolean;
    customVocabulary?: string[];
  };

  // Progress tracking
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };

  // Results
  results: Array<{
    audioRecordingId: UUID;
    transcriptionId?: UUID;
    status: 'pending' | 'completed' | 'failed';
    error?: string;
    processingTime?: number;
    cost?: number;
  }>;

  // Timing and costs
  estimatedCost: number; // USD
  actualCost?: number; // USD
  estimatedDuration: number; // seconds
  actualDuration?: number; // seconds

  // Timestamps
  queuedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  // Error handling
  errors: Array<{
    audioRecordingId: UUID;
    error: string;
    timestamp: Timestamp;
    retryable: boolean;
  }>;

  // Metadata
  metadata: Record<string, any>;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const TranscriptionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'reviewing',
  'approved',
  'rejected',
]);
export const TranscriptionProviderSchema = z.enum([
  'openai_whisper',
  'azure_speech',
  'google_speech',
  'aws_transcribe',
  'assemblyai',
  'deepgram',
  'custom',
]);
export const TranscriptionLanguageSchema = z.enum([
  'auto',
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'ja',
  'ko',
  'zh',
  'ar',
  'hi',
  'nl',
  'pl',
  'tr',
]);
export const OutputFormatSchema = z.enum([
  'json',
  'text',
  'srt',
  'vtt',
  'tsv',
  'verbose_json',
]);

// Whisper response schemas
export const WhisperWordSchema = z.object({
  word: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  probability: z.number().min(0).max(1),
});

export const WhisperSegmentSchema = z.object({
  id: z.number(),
  seek: z.number(),
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string(),
  tokens: z.array(z.number()),
  temperature: z.number().min(0).max(1),
  avg_logprob: z.number(),
  compression_ratio: z.number(),
  no_speech_prob: z.number().min(0).max(1),
  words: z.array(WhisperWordSchema).optional(),
});

export const WhisperResponseSchema = z.object({
  task: z.string().optional(),
  language: z.string().optional(),
  duration: z.number().min(0).optional(),
  text: z.string(),
  segments: z.array(WhisperSegmentSchema).optional(),
  words: z.array(WhisperWordSchema).optional(),
});

// Confidence and quality schemas
export const ConfidenceMetricsSchema = z.object({
  overall: z.number().min(0).max(100),
  average: z.number().min(0).max(100),
  minimum: z.number().min(0).max(100),
  maximum: z.number().min(0).max(100),
  distribution: z.object({
    high: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    low: z.number().min(0).max(100),
  }),
  segments: z.object({
    totalSegments: z.number().min(0),
    highConfidenceSegments: z.number().min(0),
    lowConfidenceSegments: z.number().min(0),
    averageSegmentConfidence: z.number().min(0).max(100),
  }),
  qualityIndicators: z.object({
    noSpeechProbability: z.number().min(0).max(1),
    compressionRatio: z.number(),
    avgLogProb: z.number(),
    temperature: z.number(),
  }),
});

export const TranscriptionQualitySchema = z.object({
  score: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  readability: z.number().min(0).max(100),
  timing: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.enum([
        'low_confidence',
        'background_noise',
        'multiple_speakers',
        'poor_audio',
        'fast_speech',
        'accent',
      ]),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      segments: z.array(z.number()).optional(),
      suggestions: z.array(z.string()).optional(),
    })
  ),
  recommendations: z.array(
    z.object({
      type: z.enum([
        'reprocess',
        'manual_review',
        'speaker_separation',
        'noise_reduction',
      ]),
      priority: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      estimatedImpact: z.number().min(0).max(100),
    })
  ),
  processedAt: TimestampSchema,
  analysisVersion: z.string(),
});

// Search schemas
export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  type: z.enum(['text', 'semantic', 'hybrid']),
  filters: z
    .object({
      userId: UUIDSchema.optional(),
      moduleId: UUIDSchema.optional(),
      lessonId: UUIDSchema.optional(),
      language: TranscriptionLanguageSchema.optional(),
      dateRange: z
        .object({
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .optional(),
      confidenceThreshold: z.number().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  options: z
    .object({
      fuzzy: z.boolean().optional(),
      caseSensitive: z.boolean().optional(),
      wholeWords: z.boolean().optional(),
      includeContext: z.boolean().optional(),
      maxResults: z.number().min(1).max(1000).optional(),
      offset: z.number().min(0).optional(),
      sortBy: z.enum(['relevance', 'timestamp', 'confidence']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    })
    .optional(),
});

// Main transcription record schema
export const TranscriptionRecordSchema = z.object({
  id: UUIDSchema,
  audioRecordingId: UUIDSchema,
  userId: UUIDSchema,
  moduleId: UUIDSchema.optional(),
  lessonId: UUIDSchema.optional(),
  sessionId: UUIDSchema.optional(),
  noteId: UUIDSchema.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()),
  provider: TranscriptionProviderSchema,
  model: z.string().optional(),
  status: TranscriptionStatusSchema,
  inputConfig: z.object({
    language: TranscriptionLanguageSchema,
    model: z.string(),
    responseFormat: OutputFormatSchema,
    temperature: z.number().min(0).max(1).optional(),
    prompt: z.string().optional(),
    timestampGranularities: z.array(z.enum(['word', 'segment'])),
    enableSpeakerDiarization: z.boolean(),
    customVocabulary: z.array(z.string()).optional(),
  }),
  audioMetadata: z.object({
    duration: z.number().min(0),
    fileSize: z.number().min(0),
    format: z.string(),
    sampleRate: z.number().min(0),
    channels: z.number().min(1),
  }),
  content: z.object({
    text: z.string(),
    wordCount: z.number().min(0),
    segmentCount: z.number().min(0),
    segments: z.array(
      z.object({
        id: z.number(),
        start: z.number().min(0),
        end: z.number().min(0),
        text: z.string(),
        confidence: z.number().min(0).max(100).optional(),
        speaker: z.string().optional(),
      })
    ),
    words: z
      .array(
        z.object({
          word: z.string(),
          start: z.number().min(0),
          end: z.number().min(0),
          confidence: z.number().min(0).max(100),
          speaker: z.string().optional(),
        })
      )
      .optional(),
  }),
  confidence: ConfidenceMetricsSchema,
  quality: TranscriptionQualitySchema,
  searchIndexId: UUIDSchema.optional(),
  isIndexed: z.boolean(),
  rawResponse: z.record(z.any()),
  processing: z.object({
    startedAt: TimestampSchema,
    completedAt: TimestampSchema.optional(),
    processingTime: z.number().min(0),
    retryCount: z.number().min(0),
    cost: z.number().min(0).optional(),
    tokensUsed: z.number().min(0).optional(),
  }),
  version: z.number().min(1),
  parentTranscriptionId: UUIDSchema.optional(),
  isPublic: z.boolean(),
  shareUrl: z.string().url().optional(),
  shareExpiry: TimestampSchema.optional(),
  viewCount: z.number().min(0),
  downloadCount: z.number().min(0),
  metadata: z.record(z.any()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  deletedAt: TimestampSchema.optional(),
});

// Input schemas for API operations
export const CreateTranscriptionInputSchema = TranscriptionRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  downloadCount: true,
  version: true,
  confidence: true,
  quality: true,
  processing: true,
});

export const UpdateTranscriptionInputSchema =
  CreateTranscriptionInputSchema.partial();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Whisper response to our transcription format
 */
export function convertWhisperResponse(
  whisperResponse: WhisperResponse,
  audioMetadata: {
    duration: number;
    fileSize: number;
    format: string;
    sampleRate: number;
    channels: number;
  }
): Partial<TranscriptionRecord['content']> {
  const segments =
    whisperResponse.segments?.map(segment => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      confidence: segment.avg_logprob
        ? Math.round((1 - Math.abs(segment.avg_logprob)) * 100)
        : undefined,
    })) || [];

  const words =
    whisperResponse.words?.map(word => ({
      word: word.word,
      start: word.start,
      end: word.end,
      confidence: Math.round(word.probability * 100),
    })) || [];

  return {
    text: whisperResponse.text.trim(),
    wordCount: whisperResponse.text.split(/\s+/).length,
    segmentCount: segments.length,
    segments,
    words: words.length > 0 ? words : undefined,
  };
}

/**
 * Calculate confidence metrics from Whisper response
 */
export function calculateConfidenceMetrics(
  whisperResponse: WhisperResponse
): ConfidenceMetrics {
  const segments = whisperResponse.segments || [];
  const words = whisperResponse.words || [];

  // Calculate word-level confidence if available
  let wordConfidences: number[] = [];
  if (words.length > 0) {
    wordConfidences = words.map(word => word.probability * 100);
  } else {
    // Fall back to segment avg_logprob
    wordConfidences = segments.map(segment =>
      segment.avg_logprob ? (1 - Math.abs(segment.avg_logprob)) * 100 : 50
    );
  }

  const overall =
    wordConfidences.length > 0
      ? Math.round(
          wordConfidences.reduce((sum, conf) => sum + conf, 0) /
            wordConfidences.length
        )
      : 0;

  const distribution = {
    high: Math.round(
      (wordConfidences.filter(conf => conf > 80).length /
        Math.max(1, wordConfidences.length)) *
        100
    ),
    medium: Math.round(
      (wordConfidences.filter(conf => conf >= 60 && conf <= 80).length /
        Math.max(1, wordConfidences.length)) *
        100
    ),
    low: Math.round(
      (wordConfidences.filter(conf => conf < 60).length /
        Math.max(1, wordConfidences.length)) *
        100
    ),
  };

  const segmentConfidences = segments.map(segment =>
    segment.avg_logprob ? (1 - Math.abs(segment.avg_logprob)) * 100 : 50
  );

  return {
    overall,
    average: overall,
    minimum:
      wordConfidences.length > 0 ? Math.round(Math.min(...wordConfidences)) : 0,
    maximum:
      wordConfidences.length > 0 ? Math.round(Math.max(...wordConfidences)) : 0,
    distribution,
    segments: {
      totalSegments: segments.length,
      highConfidenceSegments: segmentConfidences.filter(conf => conf > 80)
        .length,
      lowConfidenceSegments: segmentConfidences.filter(conf => conf < 60)
        .length,
      averageSegmentConfidence:
        segmentConfidences.length > 0
          ? Math.round(
              segmentConfidences.reduce((sum, conf) => sum + conf, 0) /
                segmentConfidences.length
            )
          : 0,
    },
    qualityIndicators: {
      noSpeechProbability:
        segments.length > 0
          ? segments.reduce((sum, segment) => sum + segment.no_speech_prob, 0) /
            segments.length
          : 0,
      compressionRatio:
        segments.length > 0
          ? segments.reduce(
              (sum, segment) => sum + segment.compression_ratio,
              0
            ) / segments.length
          : 0,
      avgLogProb:
        segments.length > 0
          ? segments.reduce((sum, segment) => sum + segment.avg_logprob, 0) /
            segments.length
          : 0,
      temperature:
        segments.length > 0
          ? segments.reduce((sum, segment) => sum + segment.temperature, 0) /
            segments.length
          : 0,
    },
  };
}

/**
 * Analyze transcription quality
 */
export function analyzeTranscriptionQuality(
  transcription: TranscriptionRecord,
  whisperResponse: WhisperResponse
): TranscriptionQuality {
  const confidence = transcription.confidence;
  const segments = whisperResponse.segments || [];

  // Base quality score from confidence
  let qualityScore = confidence.overall;

  // Analyze for potential issues
  const issues: TranscriptionQuality['issues'] = [];

  // Low confidence detection
  if (confidence.overall < 70) {
    issues.push({
      type: 'low_confidence',
      severity: confidence.overall < 50 ? 'high' : 'medium',
      description: `Overall confidence is ${confidence.overall}%, which may indicate audio quality issues`,
      suggestions: [
        'Consider re-recording with better audio quality',
        'Use noise reduction',
      ],
    });
  }

  // Background noise detection
  const avgNoSpeechProb = confidence.qualityIndicators.noSpeechProbability;
  if (avgNoSpeechProb > 0.3) {
    issues.push({
      type: 'background_noise',
      severity: avgNoSpeechProb > 0.5 ? 'high' : 'medium',
      description: 'High background noise detected',
      suggestions: ['Use noise reduction', 'Record in quieter environment'],
    });
    qualityScore *= 0.9;
  }

  // Audio quality assessment
  const compressionRatio = confidence.qualityIndicators.compressionRatio;
  if (compressionRatio > 2.5) {
    issues.push({
      type: 'poor_audio',
      severity: compressionRatio > 3.0 ? 'high' : 'medium',
      description: 'Audio compression indicates potential quality issues',
      suggestions: [
        'Check audio format and bitrate',
        'Use higher quality recording settings',
      ],
    });
    qualityScore *= 0.85;
  }

  // Generate recommendations
  const recommendations: TranscriptionQuality['recommendations'] = [];

  if (qualityScore < 70) {
    recommendations.push({
      type: 'manual_review',
      priority: 'high',
      description: 'Manual review recommended due to low quality score',
      estimatedImpact: 30,
    });
  }

  if (confidence.distribution.low > 30) {
    recommendations.push({
      type: 'reprocess',
      priority: 'medium',
      description: 'Reprocess with different settings or noise reduction',
      estimatedImpact: 20,
    });
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, qualityScore))),
    accuracy: Math.round(confidence.overall * 0.9), // Estimated based on confidence
    completeness: transcription.content.text.length > 0 ? 100 : 0,
    readability: Math.round(qualityScore * 0.95), // Estimated
    timing: whisperResponse.words ? 100 : 80, // Higher if word-level timestamps available
    issues,
    recommendations,
    processedAt: new Date().toISOString(),
    analysisVersion: '1.0.0',
  };
}

/**
 * Extract keywords from transcription text
 */
export function extractKeywords(
  text: string,
  segments: TranscriptionRecord['content']['segments']
): Array<{
  word: string;
  frequency: number;
  importance: number;
  positions: Array<{ segmentId: number; wordIndex: number; timestamp: number }>;
}> {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCounts = new Map<string, number>();
  const positions = new Map<
    string,
    Array<{ segmentId: number; wordIndex: number; timestamp: number }>
  >();

  // Count word frequencies and track positions
  segments.forEach(segment => {
    const segmentWords = segment.text.toLowerCase().match(/\b\w+\b/g) || [];
    segmentWords.forEach((word, index) => {
      if (word.length > 3) {
        // Filter out short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);

        if (!positions.has(word)) {
          positions.set(word, []);
        }
        positions.get(word)!.push({
          segmentId: segment.id,
          wordIndex: index,
          timestamp: segment.start,
        });
      }
    });
  });

  // Calculate importance (TF-IDF like scoring)
  const totalWords = words.length;
  const uniqueWords = Array.from(wordCounts.keys());

  return uniqueWords
    .map(word => {
      const frequency = wordCounts.get(word) || 0;
      const tf = frequency / totalWords;
      const importance = tf; // Simplified - in production, use proper TF-IDF

      return {
        word,
        frequency,
        importance,
        positions: positions.get(word) || [],
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 50); // Top 50 keywords
}

/**
 * Search transcriptions
 */
export function searchTranscriptions(
  transcriptions: TranscriptionRecord[],
  query: SearchQuery
): SearchResult[] {
  const results: SearchResult[] = [];
  const searchTerms = query.query.toLowerCase().split(/\s+/);

  transcriptions.forEach(transcription => {
    // Apply filters
    if (query.filters) {
      if (query.filters.userId && transcription.userId !== query.filters.userId)
        return;
      if (
        query.filters.moduleId &&
        transcription.moduleId !== query.filters.moduleId
      )
        return;
      if (
        query.filters.lessonId &&
        transcription.lessonId !== query.filters.lessonId
      )
        return;
      if (
        query.filters.language &&
        transcription.inputConfig.language !== query.filters.language
      )
        return;
      if (
        query.filters.confidenceThreshold &&
        transcription.confidence.overall < query.filters.confidenceThreshold
      )
        return;
    }

    // Search in content
    transcription.content.segments.forEach(segment => {
      const segmentText = segment.text.toLowerCase();
      let relevanceScore = 0;
      let matchFound = false;

      searchTerms.forEach(term => {
        if (segmentText.includes(term)) {
          matchFound = true;
          relevanceScore += 1 / searchTerms.length;
        }
      });

      if (matchFound) {
        const contextStart = Math.max(
          0,
          segment.text.indexOf(query.query) - 50
        );
        const contextEnd = Math.min(
          segment.text.length,
          segment.text.indexOf(query.query) + query.query.length + 50
        );

        results.push({
          transcriptionId: transcription.id,
          relevanceScore,
          matchedText: segment.text,
          highlightedText: segment.text.replace(
            new RegExp(`(${searchTerms.join('|')})`, 'gi'),
            '<mark>$1</mark>'
          ),
          context: {
            before: segment.text.substring(
              contextStart,
              segment.text.indexOf(query.query)
            ),
            match: query.query,
            after: segment.text.substring(
              segment.text.indexOf(query.query) + query.query.length,
              contextEnd
            ),
          },
          location: {
            segmentId: segment.id,
            wordIndex: 0, // Would need word-level search for accurate position
            timestamp: segment.start,
            duration: segment.end - segment.start,
          },
          transcription: {
            title: transcription.title,
            moduleId: transcription.moduleId,
            lessonId: transcription.lessonId,
            userId: transcription.userId,
            createdAt: transcription.createdAt,
            language: transcription.inputConfig.language,
            confidence: transcription.confidence.overall,
          },
        });
      }
    });
  });

  // Sort by relevance
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, query.options?.maxResults || 50);
}

/**
 * Validate transcription data
 */
export function validateTranscriptionRecord(data: unknown): {
  valid: boolean;
  errors?: string[];
  data?: TranscriptionRecord;
} {
  try {
    const validData = TranscriptionRecordSchema.parse(data);
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

/**
 * Export transcription to different formats
 */
export function exportTranscription(
  transcription: TranscriptionRecord,
  format: OutputFormatType
): string {
  switch (format) {
    case 'text':
      return transcription.content.text;

    case 'srt':
      return transcription.content.segments
        .map((segment, index) => {
          const start = formatSRTTime(segment.start);
          const end = formatSRTTime(segment.end);
          return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
        })
        .join('\n');

    case 'vtt':
      const vttHeader = 'WEBVTT\n\n';
      const vttContent = transcription.content.segments
        .map(segment => {
          const start = formatVTTTime(segment.start);
          const end = formatVTTTime(segment.end);
          return `${start} --> ${end}\n${segment.text}\n`;
        })
        .join('\n');
      return vttHeader + vttContent;

    case 'json':
      return JSON.stringify(transcription, null, 2);

    default:
      return transcription.content.text;
  }
}

/**
 * Format time for SRT subtitle format
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format time for VTT subtitle format
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isTranscriptionRecord(obj: any): obj is TranscriptionRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.audioRecordingId === 'string' &&
    typeof obj.status === 'string'
  );
}

export function isWhisperResponse(obj: any): obj is WhisperResponse {
  return (
    typeof obj === 'object' && obj !== null && typeof obj.text === 'string'
  );
}

export function isSearchResult(obj: any): obj is SearchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.transcriptionId === 'string' &&
    typeof obj.relevanceScore === 'number'
  );
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateTranscriptionInput = z.infer<
  typeof CreateTranscriptionInputSchema
>;
export type UpdateTranscriptionInput = z.infer<
  typeof UpdateTranscriptionInputSchema
>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  TranscriptionRecord: TranscriptionRecordSchema,
  WhisperResponse: WhisperResponseSchema,
  ConfidenceMetrics: ConfidenceMetricsSchema,
  TranscriptionQuality: TranscriptionQualitySchema,
  SearchQuery: SearchQuerySchema,
  CreateTranscriptionInput: CreateTranscriptionInputSchema,
  UpdateTranscriptionInput: UpdateTranscriptionInputSchema,
} as const;
