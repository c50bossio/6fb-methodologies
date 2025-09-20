/**
 * T019: AudioRecording Model - File metadata and S3 integration
 *
 * This module provides comprehensive audio recording management types with:
 * - File metadata and validation for multiple audio formats
 * - S3 integration types and upload/download utilities
 * - Audio processing metadata (duration, quality, etc.)
 * - Integration with transcription system
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const AudioFormat = {
  MP3: 'mp3',
  WAV: 'wav',
  M4A: 'm4a',
  OGG: 'ogg',
  FLAC: 'flac',
  AAC: 'aac',
  WEBM: 'webm',
} as const;

export type AudioFormatType = typeof AudioFormat[keyof typeof AudioFormat];

export const AudioQuality = {
  LOW: 'low',        // 64kbps
  MEDIUM: 'medium',  // 128kbps
  HIGH: 'high',      // 256kbps
  LOSSLESS: 'lossless', // FLAC/uncompressed
} as const;

export type AudioQualityType = typeof AudioQuality[keyof typeof AudioQuality];

export const RecordingStatus = {
  RECORDING: 'recording',
  PROCESSING: 'processing',
  READY: 'ready',
  TRANSCRIBING: 'transcribing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const;

export type RecordingStatusType = typeof RecordingStatus[keyof typeof RecordingStatus];

export const RecordingSource = {
  BROWSER_MIC: 'browser_mic',
  MOBILE_APP: 'mobile_app',
  UPLOAD: 'upload',
  LIVE_SESSION: 'live_session',
  PHONE_CALL: 'phone_call',
  SCREEN_RECORDING: 'screen_recording',
} as const;

export type RecordingSourceType = typeof RecordingSource[keyof typeof RecordingSource];

export const StorageProvider = {
  AWS_S3: 'aws_s3',
  CLOUDFLARE_R2: 'cloudflare_r2',
  GOOGLE_CLOUD: 'google_cloud',
  AZURE_BLOB: 'azure_blob',
  LOCAL: 'local',
} as const;

export type StorageProviderType = typeof StorageProvider[keyof typeof StorageProvider];

// =============================================================================
// Audio File Metadata
// =============================================================================

export interface AudioMetadata {
  // Basic file information
  filename: string;
  originalFilename?: string;
  format: AudioFormatType;
  mimeType: string;
  fileSize: number; // bytes

  // Audio properties
  duration: number; // seconds
  bitrate: number; // kbps
  sampleRate: number; // Hz
  channels: number; // 1 for mono, 2 for stereo
  quality: AudioQualityType;

  // Recording information
  recordedAt: Timestamp;
  timezone?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    city?: string;
    country?: string;
  };

  // Device information
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'server';
    os?: string;
    browser?: string;
    microphone?: string;
    inputDevice?: string;
  };

  // Processing information
  processedAt?: Timestamp;
  processingDuration?: number; // seconds
  compressionRatio?: number;

  // Audio analysis
  analysis?: {
    volume: {
      average: number; // dB
      peak: number; // dB
      rms: number; // dB
    };
    frequency: {
      fundamental?: number; // Hz
      harmonics?: number[];
    };
    silenceDetection: {
      silentSegments: Array<{
        start: number; // seconds
        end: number; // seconds
      }>;
      speechPercentage: number; // 0-100
    };
    noiseLevel?: number; // dB
    qualityScore?: number; // 0-100
  };
}

// =============================================================================
// S3 Storage Configuration
// =============================================================================

export interface S3Configuration {
  provider: StorageProviderType;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string; // for S3-compatible services

  // Path configuration
  pathPattern: string; // e.g., "audio/{userId}/{year}/{month}/{filename}"
  publicUrl?: string; // base URL for public access

  // Upload settings
  multipartThreshold: number; // bytes
  partSize: number; // bytes
  maxRetries: number;
  timeout: number; // milliseconds

  // Access control
  acl: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  storageClass: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';

  // Lifecycle management
  lifecycleRules?: Array<{
    id: string;
    enabled: boolean;
    filter?: {
      prefix?: string;
      tags?: Record<string, string>;
    };
    transitions?: Array<{
      days: number;
      storageClass: string;
    }>;
    expiration?: {
      days: number;
    };
  }>;
}

export interface S3FileLocation {
  provider: StorageProviderType;
  bucket: string;
  key: string; // S3 object key
  region: string;
  etag?: string;
  versionId?: string;

  // URLs
  url: string; // direct S3 URL
  presignedUrl?: string; // temporary access URL
  presignedUrlExpiry?: Timestamp;
  publicUrl?: string; // CDN or public URL

  // Metadata
  contentType: string;
  contentLength: number;
  lastModified: Timestamp;
  metadata: Record<string, string>;
  tags?: Record<string, string>;
}

// =============================================================================
// Upload and Download Management
// =============================================================================

export interface UploadSession {
  id: UUID;
  recordingId: UUID;
  userId: UUID;

  // Upload details
  filename: string;
  fileSize: number;
  mimeType: string;

  // Multipart upload tracking
  uploadId?: string; // S3 multipart upload ID
  partSize: number;
  totalParts: number;
  completedParts: number;
  failedParts: number[];

  // Progress tracking
  bytesUploaded: number;
  progressPercentage: number; // 0-100
  uploadSpeed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds

  // Status and error handling
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  retryCount: number;
  maxRetries: number;

  // Timestamps
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastProgressAt?: Timestamp;

  // Metadata
  metadata: Record<string, any>;
}

export interface DownloadRequest {
  id: UUID;
  recordingId: UUID;
  userId: UUID;

  // Download options
  format?: AudioFormatType;
  quality?: AudioQualityType;
  startTime?: number; // seconds - for partial downloads
  endTime?: number; // seconds - for partial downloads

  // Processing options
  normalize?: boolean;
  noiseReduction?: boolean;
  speedAdjustment?: number; // 0.5 to 2.0 (playback speed)

  // Output configuration
  outputFilename?: string;
  includeTranscript?: boolean;
  transcriptFormat?: 'srt' | 'vtt' | 'txt' | 'json';

  // Request tracking
  status: 'requested' | 'processing' | 'ready' | 'expired' | 'failed';
  downloadUrl?: string;
  downloadExpiry?: Timestamp;
  fileSize?: number;

  // Timestamps
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  downloadedAt?: Timestamp;
  expiresAt?: Timestamp;
}

// =============================================================================
// Main AudioRecording Interface
// =============================================================================

export interface AudioRecording {
  id: UUID;
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
  category?: string;

  // Recording details
  source: RecordingSourceType;
  status: RecordingStatusType;

  // File and storage information
  metadata: AudioMetadata;
  storage: S3FileLocation;

  // Processing status
  processing: {
    uploaded: boolean;
    processed: boolean;
    transcribed: boolean;
    analyzed: boolean;
  };

  // Transcription information
  transcriptionId?: UUID;
  hasTranscription: boolean;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptionLanguage?: string;
  transcriptionConfidence?: number; // 0-100

  // Access and sharing
  isPublic: boolean;
  shareUrl?: string;
  shareExpiry?: Timestamp;
  downloadCount: number;
  playCount: number;

  // Collaboration
  collaborators?: Array<{
    userId: UUID;
    permission: 'view' | 'edit' | 'admin';
    addedAt: Timestamp;
  }>;

  // Versioning
  version: number;
  parentRecordingId?: UUID; // for edits/revisions

  // Quality and analysis
  qualityScore?: number; // 0-100
  analysisData?: Record<string, any>;

  // Timestamps
  recordedAt: Timestamp;
  uploadedAt?: Timestamp;
  processedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;

  // Metadata
  metadata: Record<string, any>;
}

// =============================================================================
// Audio Processing Pipeline
// =============================================================================

export interface AudioProcessingJob {
  id: UUID;
  recordingId: UUID;
  userId: UUID;

  // Job configuration
  jobType: 'upload' | 'transcode' | 'analyze' | 'transcribe' | 'enhance';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Processing parameters
  parameters: {
    // Transcoding
    targetFormat?: AudioFormatType;
    targetQuality?: AudioQualityType;
    targetBitrate?: number;

    // Analysis
    enableVolumeAnalysis?: boolean;
    enableSilenceDetection?: boolean;
    enableNoiseAnalysis?: boolean;
    enableQualityScoring?: boolean;

    // Enhancement
    enableNoiseReduction?: boolean;
    enableNormalization?: boolean;
    enableEqualizer?: boolean;

    // Transcription
    language?: string;
    enablePunctuation?: boolean;
    enableTimestamps?: boolean;
    enableSpeakerDiarization?: boolean;
    customVocabulary?: string[];
  };

  // Progress tracking
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep?: string;
  totalSteps?: number;

  // Result information
  result?: {
    outputFiles?: Array<{
      type: string;
      url: string;
      size: number;
      format: string;
    }>;
    analysis?: Record<string, any>;
    transcription?: {
      id: UUID;
      text: string;
      confidence: number;
      language: string;
    };
    quality?: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
  };

  // Error handling
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    retryable: boolean;
  };

  // Timestamps
  queuedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  // Resource usage
  computeTime?: number; // seconds
  memoryUsage?: number; // MB
  cost?: number; // USD
}

// =============================================================================
// Audio Streaming and Playback
// =============================================================================

export interface AudioStream {
  id: UUID;
  recordingId: UUID;
  userId: UUID;

  // Stream configuration
  format: AudioFormatType;
  quality: AudioQualityType;
  startTime: number; // seconds
  endTime?: number; // seconds

  // Streaming URLs
  streamUrl: string;
  fallbackUrls: string[];

  // Playback tracking
  currentTime: number; // seconds
  playbackSpeed: number; // 0.5 to 2.0
  volume: number; // 0-100

  // Session information
  sessionId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Analytics
  startedAt: Timestamp;
  lastHeartbeat: Timestamp;
  totalDuration: number; // seconds actually played
  bufferEvents: number;
  errorEvents: number;

  // Status
  isActive: boolean;
  endedAt?: Timestamp;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const AudioFormatSchema = z.enum(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm']);
export const AudioQualitySchema = z.enum(['low', 'medium', 'high', 'lossless']);
export const RecordingStatusSchema = z.enum(['recording', 'processing', 'ready', 'transcribing', 'completed', 'failed', 'deleted']);
export const RecordingSourceSchema = z.enum(['browser_mic', 'mobile_app', 'upload', 'live_session', 'phone_call', 'screen_recording']);
export const StorageProviderSchema = z.enum(['aws_s3', 'cloudflare_r2', 'google_cloud', 'azure_blob', 'local']);

// Audio metadata schema
export const AudioMetadataSchema = z.object({
  filename: z.string().min(1),
  originalFilename: z.string().optional(),
  format: AudioFormatSchema,
  mimeType: z.string(),
  fileSize: z.number().min(0),
  duration: z.number().min(0),
  bitrate: z.number().min(0),
  sampleRate: z.number().min(0),
  channels: z.number().min(1).max(8),
  quality: AudioQualitySchema,
  recordedAt: TimestampSchema,
  timezone: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  device: z.object({
    type: z.enum(['desktop', 'mobile', 'tablet', 'server']),
    os: z.string().optional(),
    browser: z.string().optional(),
    microphone: z.string().optional(),
    inputDevice: z.string().optional(),
  }),
  processedAt: TimestampSchema.optional(),
  processingDuration: z.number().min(0).optional(),
  compressionRatio: z.number().min(0).optional(),
  analysis: z.object({
    volume: z.object({
      average: z.number(),
      peak: z.number(),
      rms: z.number(),
    }),
    frequency: z.object({
      fundamental: z.number().optional(),
      harmonics: z.array(z.number()).optional(),
    }),
    silenceDetection: z.object({
      silentSegments: z.array(z.object({
        start: z.number().min(0),
        end: z.number().min(0),
      })),
      speechPercentage: z.number().min(0).max(100),
    }),
    noiseLevel: z.number().optional(),
    qualityScore: z.number().min(0).max(100).optional(),
  }).optional(),
});

// S3 storage schema
export const S3FileLocationSchema = z.object({
  provider: StorageProviderSchema,
  bucket: z.string().min(1),
  key: z.string().min(1),
  region: z.string().min(1),
  etag: z.string().optional(),
  versionId: z.string().optional(),
  url: z.string().url(),
  presignedUrl: z.string().url().optional(),
  presignedUrlExpiry: TimestampSchema.optional(),
  publicUrl: z.string().url().optional(),
  contentType: z.string(),
  contentLength: z.number().min(0),
  lastModified: TimestampSchema,
  metadata: z.record(z.string()),
  tags: z.record(z.string()).optional(),
});

// Upload session schema
export const UploadSessionSchema = z.object({
  id: UUIDSchema,
  recordingId: UUIDSchema,
  userId: UUIDSchema,
  filename: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string(),
  uploadId: z.string().optional(),
  partSize: z.number().min(1),
  totalParts: z.number().min(1),
  completedParts: z.number().min(0),
  failedParts: z.array(z.number()),
  bytesUploaded: z.number().min(0),
  progressPercentage: z.number().min(0).max(100),
  uploadSpeed: z.number().min(0).optional(),
  estimatedTimeRemaining: z.number().min(0).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  error: z.string().optional(),
  retryCount: z.number().min(0),
  maxRetries: z.number().min(0),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  lastProgressAt: TimestampSchema.optional(),
  metadata: z.record(z.any()),
});

// Main audio recording schema
export const AudioRecordingSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  moduleId: UUIDSchema.optional(),
  lessonId: UUIDSchema.optional(),
  sessionId: UUIDSchema.optional(),
  noteId: UUIDSchema.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  source: RecordingSourceSchema,
  status: RecordingStatusSchema,
  metadata: AudioMetadataSchema,
  storage: S3FileLocationSchema,
  processing: z.object({
    uploaded: z.boolean(),
    processed: z.boolean(),
    transcribed: z.boolean(),
    analyzed: z.boolean(),
  }),
  transcriptionId: UUIDSchema.optional(),
  hasTranscription: z.boolean(),
  transcriptionStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  transcriptionLanguage: z.string().optional(),
  transcriptionConfidence: z.number().min(0).max(100).optional(),
  isPublic: z.boolean(),
  shareUrl: z.string().url().optional(),
  shareExpiry: TimestampSchema.optional(),
  downloadCount: z.number().min(0),
  playCount: z.number().min(0),
  collaborators: z.array(z.object({
    userId: UUIDSchema,
    permission: z.enum(['view', 'edit', 'admin']),
    addedAt: TimestampSchema,
  })).optional(),
  version: z.number().min(1),
  parentRecordingId: UUIDSchema.optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  analysisData: z.record(z.any()).optional(),
  recordedAt: TimestampSchema,
  uploadedAt: TimestampSchema.optional(),
  processedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  deletedAt: TimestampSchema.optional(),
  metadata: z.record(z.any()),
});

// Processing job schema
export const AudioProcessingJobSchema = z.object({
  id: UUIDSchema,
  recordingId: UUIDSchema,
  userId: UUIDSchema,
  jobType: z.enum(['upload', 'transcode', 'analyze', 'transcribe', 'enhance']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  parameters: z.object({
    targetFormat: AudioFormatSchema.optional(),
    targetQuality: AudioQualitySchema.optional(),
    targetBitrate: z.number().min(0).optional(),
    enableVolumeAnalysis: z.boolean().optional(),
    enableSilenceDetection: z.boolean().optional(),
    enableNoiseAnalysis: z.boolean().optional(),
    enableQualityScoring: z.boolean().optional(),
    enableNoiseReduction: z.boolean().optional(),
    enableNormalization: z.boolean().optional(),
    enableEqualizer: z.boolean().optional(),
    language: z.string().optional(),
    enablePunctuation: z.boolean().optional(),
    enableTimestamps: z.boolean().optional(),
    enableSpeakerDiarization: z.boolean().optional(),
    customVocabulary: z.array(z.string()).optional(),
  }),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  totalSteps: z.number().min(0).optional(),
  result: z.object({
    outputFiles: z.array(z.object({
      type: z.string(),
      url: z.string().url(),
      size: z.number().min(0),
      format: z.string(),
    })).optional(),
    analysis: z.record(z.any()).optional(),
    transcription: z.object({
      id: UUIDSchema,
      text: z.string(),
      confidence: z.number().min(0).max(100),
      language: z.string(),
    }).optional(),
    quality: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      recommendations: z.array(z.string()),
    }).optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    retryable: z.boolean(),
  }).optional(),
  queuedAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  computeTime: z.number().min(0).optional(),
  memoryUsage: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
});

// Input schemas for API operations
export const CreateAudioRecordingInputSchema = AudioRecordingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processing: true,
  downloadCount: true,
  playCount: true,
  version: true,
});

export const UpdateAudioRecordingInputSchema = CreateAudioRecordingInputSchema.partial();

export const CreateUploadSessionInputSchema = UploadSessionSchema.omit({
  id: true,
  startedAt: true,
  completedAt: true,
  lastProgressAt: true,
  bytesUploaded: true,
  progressPercentage: true,
  retryCount: true,
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate S3 key for audio file
 */
export function generateS3Key(
  userId: UUID,
  recordingId: UUID,
  filename: string,
  pattern: string = 'audio/{userId}/{year}/{month}/{recordingId}_{filename}'
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return pattern
    .replace('{userId}', userId)
    .replace('{recordingId}', recordingId)
    .replace('{filename}', filename)
    .replace('{year}', String(year))
    .replace('{month}', month)
    .replace('{day}', day)
    .replace('{timestamp}', now.toISOString());
}

/**
 * Get presigned URL for S3 upload
 */
export function generatePresignedUploadUrl(
  s3Config: S3Configuration,
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<{ url: string; fields: Record<string, string> }> {
  // Implementation would use AWS SDK or similar
  // This is a placeholder for the actual implementation
  return Promise.resolve({
    url: `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/`,
    fields: {
      key,
      'Content-Type': contentType,
      // Additional required fields would be here
    },
  });
}

/**
 * Get presigned URL for S3 download
 */
export function generatePresignedDownloadUrl(
  s3Config: S3Configuration,
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  // Implementation would use AWS SDK or similar
  // This is a placeholder for the actual implementation
  return Promise.resolve(
    `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}?expires=${expiresIn}`
  );
}

/**
 * Calculate audio file duration from file size and bitrate
 */
export function estimateAudioDuration(
  fileSizeBytes: number,
  bitrate: number,
  channels: number = 2
): number {
  // Duration = (file_size_bits) / (bitrate * channels)
  const fileSizeBits = fileSizeBytes * 8;
  return fileSizeBits / (bitrate * 1000 * channels);
}

/**
 * Get recommended bitrate for quality level
 */
export function getRecommendedBitrate(
  quality: AudioQualityType,
  format: AudioFormatType,
  channels: number = 2
): number {
  const baseBitrates: Record<AudioQualityType, number> = {
    low: 64,
    medium: 128,
    high: 256,
    lossless: format === AudioFormat.FLAC ? 1411 : 320,
  };

  const bitrate = baseBitrates[quality];
  return channels === 1 ? Math.round(bitrate * 0.6) : bitrate;
}

/**
 * Validate audio file format
 */
export function isValidAudioFormat(mimeType: string): boolean {
  const validMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/x-flac',
  ];

  return validMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Get audio format from MIME type
 */
export function getAudioFormatFromMimeType(mimeType: string): AudioFormatType | null {
  const mimeToFormat: Record<string, AudioFormatType> = {
    'audio/mpeg': AudioFormat.MP3,
    'audio/mp3': AudioFormat.MP3,
    'audio/wav': AudioFormat.WAV,
    'audio/wave': AudioFormat.WAV,
    'audio/x-wav': AudioFormat.WAV,
    'audio/mp4': AudioFormat.M4A,
    'audio/m4a': AudioFormat.M4A,
    'audio/aac': AudioFormat.AAC,
    'audio/ogg': AudioFormat.OGG,
    'audio/webm': AudioFormat.WEBM,
    'audio/flac': AudioFormat.FLAC,
    'audio/x-flac': AudioFormat.FLAC,
  };

  return mimeToFormat[mimeType.toLowerCase()] || null;
}

/**
 * Calculate storage cost estimate
 */
export function calculateStorageCost(
  fileSizeBytes: number,
  storageClass: string = 'STANDARD',
  region: string = 'us-east-1'
): number {
  // Simplified cost calculation - would use actual AWS pricing
  const costPerGBPerMonth: Record<string, number> = {
    STANDARD: 0.023,
    STANDARD_IA: 0.0125,
    ONEZONE_IA: 0.01,
    GLACIER: 0.004,
    DEEP_ARCHIVE: 0.00099,
  };

  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
  const monthlyCost = costPerGBPerMonth[storageClass] || costPerGBPerMonth.STANDARD;

  return fileSizeGB * monthlyCost;
}

/**
 * Validate audio recording data
 */
export function validateAudioRecording(data: unknown): { valid: boolean; errors?: string[]; data?: AudioRecording } {
  try {
    const validData = AudioRecordingSchema.parse(data);
    return { valid: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return { valid: false, errors: ['Invalid data format'] };
  }
}

/**
 * Check if user can access recording
 */
export function canUserAccessRecording(
  recording: AudioRecording,
  userId: UUID,
  userRole?: string
): boolean {
  // Owner can always access
  if (recording.userId === userId) return true;

  // Public recordings can be accessed by anyone
  if (recording.isPublic) return true;

  // Check collaborator permissions
  if (recording.collaborators) {
    const collaboration = recording.collaborators.find(c => c.userId === userId);
    if (collaboration) return true;
  }

  // Admin users can access all recordings
  if (userRole === 'admin') return true;

  return false;
}

/**
 * Get audio quality score based on technical metrics
 */
export function calculateAudioQualityScore(metadata: AudioMetadata): number {
  let score = 100;

  // Bitrate score (0-30 points)
  const bitrateScore = Math.min(30, (metadata.bitrate / 320) * 30);
  score = score - 30 + bitrateScore;

  // Sample rate score (0-20 points)
  const sampleRateScore = metadata.sampleRate >= 44100 ? 20 : (metadata.sampleRate / 44100) * 20;
  score = score - 20 + sampleRateScore;

  // Duration penalty for very short recordings
  if (metadata.duration < 10) {
    score *= 0.8;
  }

  // Analysis-based adjustments
  if (metadata.analysis) {
    // Noise level penalty
    if (metadata.analysis.noiseLevel && metadata.analysis.noiseLevel > -40) {
      score *= 0.9;
    }

    // Speech percentage bonus
    if (metadata.analysis.silenceDetection.speechPercentage > 70) {
      score *= 1.1;
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// =============================================================================
// Type Guards
// =============================================================================

export function isAudioRecording(obj: any): obj is AudioRecording {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.id === 'string' &&
         typeof obj.userId === 'string' &&
         typeof obj.status === 'string';
}

export function isUploadSession(obj: any): obj is UploadSession {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.recordingId === 'string' &&
         typeof obj.filename === 'string';
}

export function isAudioProcessingJob(obj: any): obj is AudioProcessingJob {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.recordingId === 'string' &&
         typeof obj.jobType === 'string';
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateAudioRecordingInput = z.infer<typeof CreateAudioRecordingInputSchema>;
export type UpdateAudioRecordingInput = z.infer<typeof UpdateAudioRecordingInputSchema>;
export type CreateUploadSessionInput = z.infer<typeof CreateUploadSessionInputSchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  AudioRecording: AudioRecordingSchema,
  AudioMetadata: AudioMetadataSchema,
  S3FileLocation: S3FileLocationSchema,
  UploadSession: UploadSessionSchema,
  AudioProcessingJob: AudioProcessingJobSchema,
  CreateAudioRecordingInput: CreateAudioRecordingInputSchema,
  UpdateAudioRecordingInput: UpdateAudioRecordingInputSchema,
  CreateUploadSessionInput: CreateUploadSessionInputSchema,
} as const;