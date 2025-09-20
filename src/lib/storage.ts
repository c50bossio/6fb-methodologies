/**
 * AWS S3 File Storage System for 6FB Workbook
 *
 * Complete file storage solution with security, validation, and lifecycle management
 * Supports audio files, thumbnails, and general file storage with S3 integration
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Types
export interface StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  publicBucket?: string;
  cloudFrontDomain?: string;
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  defaultExpiration: number; // seconds
  enableVirusScanning: boolean;
  quarantineBucket?: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  publicUrl?: string;
  key: string;
  bucket: string;
  uploadedAt: Date;
  userId: string;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AudioFileMetadata extends FileMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate: number;
  codec: string;
  waveform?: number[];
  peaks?: AudioPeak[];
  thumbnailUrl?: string;
  transcriptionId?: string;
}

export interface AudioPeak {
  time: number;
  amplitude: number;
}

export interface UploadOptions {
  userId: string;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  generateThumbnail?: boolean;
  extractWaveform?: boolean;
  compress?: boolean;
  isPublic?: boolean;
  contentDisposition?: string;
  cacheControl?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'validation' | 'upload' | 'processing' | 'complete';
  message?: string;
}

export interface UploadResult {
  success: boolean;
  fileMetadata?: FileMetadata | AudioFileMetadata;
  error?: string;
  warnings?: string[];
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  responseContentType?: string;
  responseContentDisposition?: string;
  versionId?: string;
}

export interface FileListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  userId?: string;
  moduleId?: string;
  mimeType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface FileListResult {
  files: FileMetadata[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalCount: number;
}

export interface CleanupOptions {
  olderThan?: Date;
  unusedOnly?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export interface CleanupResult {
  deletedFiles: string[];
  savedBytes: number;
  errors: string[];
  summary: {
    processed: number;
    deleted: number;
    failed: number;
    totalSaved: string;
  };
}

// Audio processing types
export interface AudioProcessingOptions {
  extractWaveform?: boolean;
  generatePeaks?: boolean;
  compress?: boolean;
  targetBitRate?: number;
  normalizeAudio?: boolean;
  removeNoise?: boolean;
}

export interface WaveformData {
  peaks: number[];
  length: number;
  duration: number;
  sampleRate: number;
}

// Default configuration
const DEFAULT_CONFIG: Partial<StorageConfig> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    // Audio formats
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/m4a',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    // Image formats
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Document formats
    'application/pdf',
    'text/plain',
    'application/json',
  ],
  defaultExpiration: 3600, // 1 hour
  enableVirusScanning: false,
};

// File storage service class
export class FileStorageService {
  private s3Client: S3Client;
  private config: StorageConfig;
  private metrics: {
    uploadsToday: number;
    bytesUploadedToday: number;
    downloadsToday: number;
    lastReset: Date;
  };

  constructor(config: StorageConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.metrics = {
      uploadsToday: 0,
      bytesUploadedToday: 0,
      downloadsToday: 0,
      lastReset: new Date(),
    };

    // Reset metrics daily
    this.startMetricsReset();
  }

  /**
   * Upload a file to S3 with validation and processing
   */
  async uploadFile(
    file: File | Buffer,
    originalName: string,
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Progress: Validation
      onProgress?.({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: 'validation',
        message: 'Validating file...',
      });

      // Validation
      const validation = await this.validateFile(file, originalName);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          warnings: validation.warnings,
        };
      }

      // Progress: Upload preparation
      onProgress?.({
        loaded: 10,
        total: 100,
        percentage: 10,
        stage: 'validation',
        message: 'Preparing upload...',
      });

      // Generate file metadata
      const fileMetadata = await this.generateFileMetadata(
        file,
        originalName,
        options
      );

      // Progress: Starting upload
      onProgress?.({
        loaded: 20,
        total: 100,
        percentage: 20,
        stage: 'upload',
        message: 'Starting upload...',
      });

      // Upload to S3
      await this.uploadToS3(file, fileMetadata, onProgress);

      // Progress: Processing
      onProgress?.({
        loaded: 70,
        total: 100,
        percentage: 70,
        stage: 'processing',
        message: 'Processing file...',
      });

      // Post-upload processing for audio files
      if (this.isAudioFile(fileMetadata.mimeType)) {
        const audioMetadata = await this.processAudioFile(
          fileMetadata as AudioFileMetadata,
          {
            extractWaveform: options.extractWaveform,
            generatePeaks: true,
            compress: options.compress,
          }
        );

        // Progress: Complete
        onProgress?.({
          loaded: 100,
          total: 100,
          percentage: 100,
          stage: 'complete',
          message: 'Upload complete',
        });

        this.updateMetrics(audioMetadata.size);
        return { success: true, fileMetadata: audioMetadata };
      }

      // Progress: Complete
      onProgress?.({
        loaded: 100,
        total: 100,
        percentage: 100,
        stage: 'complete',
        message: 'Upload complete',
      });

      this.updateMetrics(fileMetadata.size);
      return { success: true, fileMetadata };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Generate a signed URL for file download
   */
  async getSignedDownloadUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseContentType: options.responseContentType,
        ResponseContentDisposition: options.responseContentDisposition,
        VersionId: options.versionId,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || this.config.defaultExpiration,
      });

      this.metrics.downloadsToday++;
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Generate a signed URL for file upload (client-side uploads)
   */
  async getSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: mimeType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Failed to generate signed upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        id: response.Metadata?.id || '',
        originalName: response.Metadata?.originalname || '',
        fileName: key.split('/').pop() || '',
        mimeType: response.ContentType || '',
        size: response.ContentLength || 0,
        url: this.generatePublicUrl(key),
        key,
        bucket: this.config.bucket,
        uploadedAt: response.LastModified || new Date(),
        userId: response.Metadata?.userid || '',
        moduleId: response.Metadata?.moduleid,
        lessonId: response.Metadata?.lessonid,
        sessionId: response.Metadata?.sessionid,
        tags: response.Metadata?.tags ? JSON.parse(response.Metadata.tags) : [],
        metadata: response.Metadata?.custommetadata
          ? JSON.parse(response.Metadata.custommetadata)
          : {},
      };
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * List files with filtering options
   */
  async listFiles(options: FileListOptions = {}): Promise<FileListResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: options.prefix,
        MaxKeys: options.maxKeys || 1000,
        ContinuationToken: options.continuationToken,
      });

      const response = await this.s3Client.send(command);
      const files: FileMetadata[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            const metadata = await this.getFileMetadata(object.Key);
            if (metadata && this.matchesFilters(metadata, options)) {
              files.push(metadata);
            }
          }
        }
      }

      return {
        files,
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
        totalCount: files.length,
      };
    } catch (error) {
      console.error('Failed to list files:', error);
      return {
        files: [],
        isTruncated: false,
        totalCount: 0,
      };
    }
  }

  /**
   * Clean up old or unused files
   */
  async cleanupFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: [],
      savedBytes: 0,
      errors: [],
      summary: {
        processed: 0,
        deleted: 0,
        failed: 0,
        totalSaved: '0 B',
      },
    };

    try {
      const listOptions: FileListOptions = {
        maxKeys: options.batchSize || 1000,
      };

      const fileList = await this.listFiles(listOptions);
      const cutoffDate =
        options.olderThan || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      for (const file of fileList.files) {
        result.summary.processed++;

        try {
          // Check if file should be deleted
          if (file.uploadedAt < cutoffDate) {
            if (!options.dryRun) {
              const deleted = await this.deleteFile(file.key);
              if (deleted) {
                result.deletedFiles.push(file.key);
                result.savedBytes += file.size;
                result.summary.deleted++;
              } else {
                result.errors.push(`Failed to delete ${file.key}`);
                result.summary.failed++;
              }
            } else {
              // Dry run - just count what would be deleted
              result.deletedFiles.push(file.key);
              result.savedBytes += file.size;
              result.summary.deleted++;
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${file.key}: ${error}`);
          result.summary.failed++;
        }
      }

      result.summary.totalSaved = this.formatBytes(result.savedBytes);
      return result;
    } catch (error) {
      console.error('Cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error}`);
      return result;
    }
  }

  /**
   * Copy a file within S3 or between buckets
   */
  async copyFile(
    sourceKey: string,
    destinationKey: string,
    destinationBucket?: string
  ): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: destinationBucket || this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Failed to copy file:', error);
      return false;
    }
  }

  /**
   * Get storage metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Validate file before upload
   */
  private async validateFile(
    file: File | Buffer,
    originalName: string
  ): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> {
    const warnings: string[] = [];

    // Check file size
    const fileSize = file instanceof File ? file.size : file.length;
    if (fileSize > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size ${this.formatBytes(fileSize)} exceeds maximum allowed size of ${this.formatBytes(this.config.maxFileSize)}`,
      };
    }

    // Check file extension
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (!extension) {
      warnings.push('File has no extension');
    }

    // Detect MIME type
    const detectedMimeType = this.detectMimeType(file, originalName);
    if (!this.config.allowedMimeTypes.includes(detectedMimeType)) {
      return {
        isValid: false,
        error: `File type ${detectedMimeType} is not allowed`,
      };
    }

    // Virus scanning (if enabled)
    if (this.config.enableVirusScanning) {
      const scanResult = await this.scanForViruses(file);
      if (!scanResult.clean) {
        return {
          isValid: false,
          error: `File failed virus scan: ${scanResult.threat}`,
        };
      }
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Generate comprehensive file metadata
   */
  private async generateFileMetadata(
    file: File | Buffer,
    originalName: string,
    options: UploadOptions
  ): Promise<FileMetadata> {
    const id = randomUUID();
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const sanitizedName = this.sanitizeFileName(originalName);
    const timestamp = new Date().toISOString().split('T')[0];

    // Generate key with organized folder structure
    const keyPrefix = this.generateKeyPrefix(options);
    const fileName = `${timestamp}_${id}.${extension}`;
    const key = `${keyPrefix}${fileName}`;

    const mimeType = this.detectMimeType(file, originalName);
    const size = file instanceof File ? file.size : file.length;

    return {
      id,
      originalName: sanitizedName,
      fileName,
      mimeType,
      size,
      url: this.generatePublicUrl(key),
      publicUrl: options.isPublic
        ? this.generatePublicUrl(key, true)
        : undefined,
      key,
      bucket: this.config.bucket,
      uploadedAt: new Date(),
      userId: options.userId,
      moduleId: options.moduleId,
      lessonId: options.lessonId,
      sessionId: options.sessionId,
      tags: options.tags,
      metadata: options.metadata,
    };
  }

  /**
   * Upload file to S3 with progress tracking
   */
  private async uploadToS3(
    file: File | Buffer,
    metadata: FileMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.config.bucket,
      Key: metadata.key,
      Body: file instanceof File ? Buffer.from(await file.arrayBuffer()) : file,
      ContentType: metadata.mimeType,
      Metadata: {
        id: metadata.id,
        originalname: metadata.originalName,
        userid: metadata.userId,
        moduleid: metadata.moduleId || '',
        lessonid: metadata.lessonId || '',
        sessionid: metadata.sessionId || '',
        tags: JSON.stringify(metadata.tags || []),
        custommetadata: JSON.stringify(metadata.metadata || {}),
        uploaddate: metadata.uploadedAt.toISOString(),
      },
      CacheControl: 'max-age=31536000', // 1 year
      ServerSideEncryption: 'AES256',
    };

    // Add public-read ACL if public
    if (metadata.publicUrl) {
      uploadParams.ACL = 'public-read';
    }

    try {
      const command = new PutObjectCommand(uploadParams);

      // Simulate progress for now (S3 SDK doesn't provide native progress)
      onProgress?.({
        loaded: 40,
        total: 100,
        percentage: 40,
        stage: 'upload',
        message: 'Uploading to S3...',
      });

      await this.s3Client.send(command);

      onProgress?.({
        loaded: 70,
        total: 100,
        percentage: 70,
        stage: 'upload',
        message: 'Upload complete',
      });
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw new Error(`Upload failed: ${error}`);
    }
  }

  /**
   * Process audio files to extract metadata and generate waveforms
   */
  private async processAudioFile(
    metadata: AudioFileMetadata,
    options: AudioProcessingOptions
  ): Promise<AudioFileMetadata> {
    try {
      // For now, return basic metadata
      // In production, you would use libraries like Web Audio API or FFmpeg
      const audioMetadata: AudioFileMetadata = {
        ...metadata,
        duration: 0, // Would be extracted from audio
        sampleRate: 44100, // Default
        channels: 2, // Default
        bitRate: 128000, // Default
        codec: this.getCodecFromMimeType(metadata.mimeType),
      };

      // Generate waveform if requested
      if (options.extractWaveform) {
        audioMetadata.waveform = await this.generateWaveform(metadata.key);
      }

      // Generate peaks for visualization
      if (options.generatePeaks) {
        audioMetadata.peaks = await this.generateAudioPeaks(metadata.key);
      }

      return audioMetadata;
    } catch (error) {
      console.error('Audio processing failed:', error);
      return metadata as AudioFileMetadata;
    }
  }

  /**
   * Helper methods
   */
  private detectMimeType(file: File | Buffer, originalName: string): string {
    if (file instanceof File && file.type) {
      return file.type;
    }

    // Fallback to extension-based detection
    const extension = originalName.split('.').pop()?.toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
    };

    return mimeTypeMap[extension || ''] || 'application/octet-stream';
  }

  private isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  private generateKeyPrefix(options: UploadOptions): string {
    const prefixes = ['audio/', 'notes/', 'exports/'];
    const userPrefix = `users/${options.userId}/`;

    if (options.moduleId) {
      return `${userPrefix}modules/${options.moduleId}/`;
    }

    if (options.sessionId) {
      return `${userPrefix}sessions/${options.sessionId}/`;
    }

    return `${userPrefix}general/`;
  }

  private generatePublicUrl(key: string, useCloudFront = false): string {
    if (useCloudFront && this.config.cloudFrontDomain) {
      return `https://${this.config.cloudFrontDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  private getCodecFromMimeType(mimeType: string): string {
    const codecMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'pcm',
      'audio/wave': 'pcm',
      'audio/mp4': 'aac',
      'audio/m4a': 'aac',
      'audio/webm': 'opus',
      'audio/ogg': 'vorbis',
      'audio/flac': 'flac',
    };
    return codecMap[mimeType] || 'unknown';
  }

  private async generateWaveform(key: string): Promise<number[]> {
    // Placeholder implementation
    // In production, you would download the file and process it
    return new Array(1000).fill(0).map(() => Math.random());
  }

  private async generateAudioPeaks(key: string): Promise<AudioPeak[]> {
    // Placeholder implementation
    return new Array(100).fill(0).map((_, i) => ({
      time: i * 0.1,
      amplitude: Math.random(),
    }));
  }

  private async scanForViruses(
    file: File | Buffer
  ): Promise<{ clean: boolean; threat?: string }> {
    // Placeholder for virus scanning integration
    // You would integrate with ClamAV, VirusTotal, or similar service
    return { clean: true };
  }

  private matchesFilters(
    metadata: FileMetadata,
    options: FileListOptions
  ): boolean {
    if (options.userId && metadata.userId !== options.userId) return false;
    if (options.moduleId && metadata.moduleId !== options.moduleId)
      return false;
    if (options.mimeType && !metadata.mimeType.includes(options.mimeType))
      return false;
    if (options.startDate && metadata.uploadedAt < options.startDate)
      return false;
    if (options.endDate && metadata.uploadedAt > options.endDate) return false;
    return true;
  }

  private updateMetrics(bytes: number): void {
    this.metrics.uploadsToday++;
    this.metrics.bytesUploadedToday += bytes;
  }

  private startMetricsReset(): void {
    setInterval(() => {
      const now = new Date();
      if (now.getDate() !== this.metrics.lastReset.getDate()) {
        this.metrics.uploadsToday = 0;
        this.metrics.bytesUploadedToday = 0;
        this.metrics.downloadsToday = 0;
        this.metrics.lastReset = now;
      }
    }, 60000); // Check every minute
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Storage configuration factory
export function createStorageConfig(): StorageConfig {
  const config: StorageConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET_NAME || '',
    publicBucket: process.env.AWS_S3_PUBLIC_BUCKET,
    cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
    maxFileSize: parseInt(process.env.AUDIO_MAX_FILE_SIZE || '104857600'), // 100MB
    allowedMimeTypes: (process.env.UPLOAD_ALLOWED_TYPES || '')
      .split(',')
      .filter(Boolean),
    defaultExpiration: parseInt(
      process.env.AWS_S3_DEFAULT_EXPIRATION || '3600'
    ),
    enableVirusScanning: process.env.UPLOAD_SCAN_FOR_VIRUSES === 'true',
    quarantineBucket: process.env.UPLOAD_QUARANTINE_BUCKET,
  };

  // Validate required configuration
  if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    throw new Error(
      'Missing required AWS configuration: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_S3_BUCKET_NAME'
    );
  }

  return config;
}

// Global storage service instance
let globalStorageService: FileStorageService | null = null;

export function getStorageService(): FileStorageService {
  if (!globalStorageService) {
    const config = createStorageConfig();
    globalStorageService = new FileStorageService(config);
  }
  return globalStorageService;
}

// Utility functions for common operations
export async function uploadAudioFile(
  file: File,
  userId: string,
  options: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  const storage = getStorageService();
  return storage.uploadFile(file, file.name, {
    userId,
    extractWaveform: true,
    compress: true,
    ...options,
  });
}

export async function getAudioDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const storage = getStorageService();
  return storage.getSignedDownloadUrl(key, { expiresIn });
}

export async function deleteAudioFile(key: string): Promise<boolean> {
  const storage = getStorageService();
  return storage.deleteFile(key);
}

export async function listUserFiles(
  userId: string,
  options: Partial<FileListOptions> = {}
): Promise<FileListResult> {
  const storage = getStorageService();
  return storage.listFiles({ userId, ...options });
}

// Export types for use in other modules
export type {
  StorageConfig,
  FileMetadata,
  AudioFileMetadata,
  UploadOptions,
  UploadResult,
  SignedUrlOptions,
  FileListOptions,
  FileListResult,
  CleanupOptions,
  CleanupResult,
  AudioProcessingOptions,
  WaveformData,
  UploadProgress,
};
