/**
 * Mock Storage Service for Development
 * Provides file storage fallback when AWS S3 is not available
 */

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface MockFileMetadata {
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
  metadata?: Record<string, any>;
}

export interface MockUploadResult {
  success: boolean;
  fileMetadata?: MockFileMetadata;
  error?: string;
}

export interface MockAudioFileMetadata extends MockFileMetadata {
  duration?: number;
  waveform?: number[];
  peaks?: number[];
}

export class MockStorageService {
  private storageDir: string;
  private mockFiles: Map<string, MockFileMetadata> = new Map();

  constructor() {
    this.storageDir = path.join(process.cwd(), 'tmp', 'mock-storage');
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      console.log('📁 Mock storage initialized at:', this.storageDir);
    } catch (error) {
      console.error('❌ Failed to initialize mock storage:', error);
    }
  }

  async uploadFile(
    file: File,
    userId: string,
    options: {
      moduleId?: string;
      lessonId?: string;
      sessionId?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      extractWaveform?: boolean;
      compress?: boolean;
      isPublic?: boolean;
    }
  ): Promise<MockUploadResult> {
    try {
      const fileId = randomUUID();
      const fileExtension = path.extname(file.name) || '.webm';
      const fileName = `${fileId}${fileExtension}`;
      const filePath = path.join(this.storageDir, fileName);

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save file to local storage
      await fs.writeFile(filePath, buffer);

      // Create mock metadata
      const mockMetadata: MockAudioFileMetadata = {
        id: fileId,
        originalName: file.name,
        fileName,
        mimeType: file.type,
        size: file.size,
        url: `/api/mock-storage/${fileName}`,
        publicUrl: options.isPublic ? `/api/mock-storage/public/${fileName}` : undefined,
        key: fileName,
        bucket: 'mock-bucket',
        uploadedAt: new Date(),
        userId,
        moduleId: options.moduleId,
        lessonId: options.lessonId,
        metadata: {
          ...options.metadata,
          sessionId: options.sessionId,
          tags: options.tags,
          filePath,
          mockStorage: true,
        },
      };

      // Mock audio processing
      if (options.extractWaveform && file.type.startsWith('audio/')) {
        mockMetadata.duration = Math.floor(Math.random() * 300) + 30; // Random 30-330 seconds
        mockMetadata.waveform = this.generateMockWaveform(100);
        mockMetadata.peaks = this.generateMockPeaks(50);
      }

      // Store in memory map
      this.mockFiles.set(fileId, mockMetadata);

      console.log(`📁 Mock file uploaded: ${fileName} (${file.size} bytes)`);

      return {
        success: true,
        fileMetadata: mockMetadata,
      };
    } catch (error) {
      console.error('❌ Mock storage upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  private generateMockWaveform(points: number): number[] {
    return Array.from({ length: points }, () => Math.random() * 0.8 - 0.4);
  }

  private generateMockPeaks(points: number): number[] {
    return Array.from({ length: points }, () => Math.random() * 1.0);
  }

  async getFile(fileId: string): Promise<MockFileMetadata | null> {
    return this.mockFiles.get(fileId) || null;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const file = this.mockFiles.get(fileId);
    if (!file) return false;

    try {
      const filePath = path.join(this.storageDir, file.fileName);
      await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
      this.mockFiles.delete(fileId);
      return true;
    } catch (error) {
      console.error('❌ Mock storage delete failed:', error);
      return false;
    }
  }

  async getFileBuffer(fileName: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.storageDir, fileName);
      return await fs.readFile(filePath);
    } catch (error) {
      console.error('❌ Mock storage read failed:', error);
      return null;
    }
  }

  getStorageStats() {
    return {
      totalFiles: this.mockFiles.size,
      storageDir: this.storageDir,
      files: Array.from(this.mockFiles.values()),
    };
  }
}

// Export singleton instance
let mockStorageInstance: MockStorageService | null = null;

export function getMockStorage(): MockStorageService {
  if (!mockStorageInstance) {
    mockStorageInstance = new MockStorageService();
  }
  return mockStorageInstance;
}

// Utility function to check if mock storage should be used
export function shouldUseMockStorage(): boolean {
  return process.env.USE_MOCK_STORAGE === 'true' ||
         process.env.NODE_ENV === 'development' && !process.env.AWS_ACCESS_KEY_ID;
}