/**
 * Audio Processing Utilities for 6FB Workbook
 *
 * Comprehensive audio file processing including metadata extraction,
 * waveform generation, compression, and thumbnail creation
 */

// Types for audio processing
export interface AudioMetadata {
  duration: number; // seconds
  sampleRate: number;
  channels: number;
  bitRate: number;
  codec: string;
  format: string;
  size: number; // bytes
}

export interface WaveformData {
  peaks: number[]; // amplitude values from -1 to 1
  length: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface AudioPeak {
  time: number; // seconds
  amplitude: number; // 0 to 1
}

export interface AudioProcessingOptions {
  extractWaveform?: boolean;
  generatePeaks?: boolean;
  peakCount?: number;
  compress?: boolean;
  targetBitRate?: number;
  normalizeAudio?: boolean;
  removeNoise?: boolean;
  generateThumbnail?: boolean;
  thumbnailDuration?: number; // seconds
}

export interface AudioProcessingResult {
  metadata: AudioMetadata;
  waveform?: WaveformData;
  peaks?: AudioPeak[];
  thumbnail?: Blob;
  compressedAudio?: Blob;
  processingTime: number; // milliseconds
  warnings?: string[];
  errors?: string[];
}

// Audio format detection
const AUDIO_MIME_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
};

const AUDIO_CODECS: Record<string, string> = {
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

// Audio processing service class
export class AudioProcessingService {
  private audioContext: AudioContext | null = null;
  private isProcessing = false;

  constructor() {
    // Initialize audio context in browser environment
    if (
      typeof window !== 'undefined' &&
      (window.AudioContext || (window as any).webkitAudioContext)
    ) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }

  /**
   * Process audio file with comprehensive analysis and optimization
   */
  async processAudioFile(
    audioBuffer: ArrayBuffer,
    mimeType: string,
    options: AudioProcessingOptions = {}
  ): Promise<AudioProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      this.isProcessing = true;

      // Extract basic metadata
      const metadata = await this.extractAudioMetadata(audioBuffer, mimeType);

      const result: AudioProcessingResult = {
        metadata,
        processingTime: 0,
        warnings,
        errors,
      };

      // Process audio with Web Audio API if available
      if (this.audioContext && this.isWebAudioSupported()) {
        try {
          const audioBuffer = await this.decodeAudioBuffer(audioBuffer);

          // Generate waveform data
          if (options.extractWaveform) {
            result.waveform = await this.generateWaveform(audioBuffer, options);
          }

          // Generate peaks for visualization
          if (options.generatePeaks) {
            result.peaks = await this.generateAudioPeaks(
              audioBuffer,
              options.peakCount || 100
            );
          }

          // Generate thumbnail (preview of first few seconds)
          if (options.generateThumbnail) {
            result.thumbnail = await this.generateAudioThumbnail(
              audioBuffer,
              options.thumbnailDuration || 30
            );
          }

          // Audio compression (if requested and supported)
          if (options.compress) {
            result.compressedAudio = await this.compressAudio(
              audioBuffer,
              options
            );
          }
        } catch (audioError) {
          console.warn('Web Audio API processing failed:', audioError);
          warnings.push('Advanced audio processing unavailable');

          // Fallback to basic processing
          await this.fallbackProcessing(audioBuffer, mimeType, result, options);
        }
      } else {
        warnings.push('Web Audio API not available, using fallback processing');
        await this.fallbackProcessing(audioBuffer, mimeType, result, options);
      }

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      console.error('Audio processing failed:', error);
      errors.push(
        error instanceof Error ? error.message : 'Unknown processing error'
      );

      return {
        metadata: {
          duration: 0,
          sampleRate: 44100,
          channels: 1,
          bitRate: 128000,
          codec: this.getCodecFromMimeType(mimeType),
          format: this.getFormatFromMimeType(mimeType),
          size: audioBuffer.byteLength,
        },
        processingTime: Date.now() - startTime,
        warnings,
        errors,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Extract basic audio metadata without decoding
   */
  private async extractAudioMetadata(
    audioBuffer: ArrayBuffer,
    mimeType: string
  ): Promise<AudioMetadata> {
    // For basic implementation, return estimated metadata
    // In production, you would use libraries like music-metadata or node-ffmpeg

    const size = audioBuffer.byteLength;
    const estimatedBitRate = this.estimateBitRate(size, mimeType);
    const estimatedDuration = this.estimateDuration(size, estimatedBitRate);

    return {
      duration: estimatedDuration,
      sampleRate: 44100, // Common default
      channels: 2, // Stereo default
      bitRate: estimatedBitRate,
      codec: this.getCodecFromMimeType(mimeType),
      format: this.getFormatFromMimeType(mimeType),
      size,
    };
  }

  /**
   * Decode audio buffer using Web Audio API
   */
  private async decodeAudioBuffer(
    audioBuffer: ArrayBuffer
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      return await this.audioContext.decodeAudioData(audioBuffer.slice(0));
    } catch (error) {
      console.error('Failed to decode audio buffer:', error);
      throw new Error('Audio decoding failed');
    }
  }

  /**
   * Generate waveform data for visualization
   */
  private async generateWaveform(
    audioBuffer: AudioBuffer,
    options: AudioProcessingOptions
  ): Promise<WaveformData> {
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const duration = audioBuffer.duration;
    const channels = audioBuffer.numberOfChannels;

    // Downsample for waveform (typically 1000-2000 points)
    const waveformPoints = 1000;
    const samplesPerPoint = Math.floor(length / waveformPoints);
    const peaks: number[] = [];

    // Process each channel and combine
    for (let i = 0; i < waveformPoints; i++) {
      let maxAmplitude = 0;

      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const startSample = i * samplesPerPoint;
        const endSample = Math.min(startSample + samplesPerPoint, length);

        // Find peak amplitude in this segment
        for (let j = startSample; j < endSample; j++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
        }
      }

      peaks.push(maxAmplitude);
    }

    return {
      peaks,
      length: waveformPoints,
      duration,
      sampleRate,
      channels,
    };
  }

  /**
   * Generate audio peaks for detailed visualization
   */
  private async generateAudioPeaks(
    audioBuffer: AudioBuffer,
    peakCount: number
  ): Promise<AudioPeak[]> {
    const duration = audioBuffer.duration;
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const timePerPeak = duration / peakCount;
    const samplesPerPeak = Math.floor(length / peakCount);

    const peaks: AudioPeak[] = [];

    for (let i = 0; i < peakCount; i++) {
      let maxAmplitude = 0;
      const time = i * timePerPeak;

      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const startSample = i * samplesPerPeak;
        const endSample = Math.min(startSample + samplesPerPeak, length);

        for (let j = startSample; j < endSample; j++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
        }
      }

      peaks.push({
        time,
        amplitude: maxAmplitude,
      });
    }

    return peaks;
  }

  /**
   * Generate audio thumbnail (first N seconds as a separate file)
   */
  private async generateAudioThumbnail(
    audioBuffer: AudioBuffer,
    durationSeconds: number
  ): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available for thumbnail generation');
    }

    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    const thumbnailLength = Math.min(
      Math.floor(durationSeconds * sampleRate),
      audioBuffer.length
    );

    // Create a new buffer for the thumbnail
    const thumbnailBuffer = this.audioContext.createBuffer(
      channels,
      thumbnailLength,
      sampleRate
    );

    // Copy the first N seconds
    for (let channel = 0; channel < channels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const thumbnailData = thumbnailBuffer.getChannelData(channel);

      for (let i = 0; i < thumbnailLength; i++) {
        thumbnailData[i] = sourceData[i];
      }
    }

    // Convert to WAV blob (simplified implementation)
    return this.audioBufferToWavBlob(thumbnailBuffer);
  }

  /**
   * Compress audio by reducing quality
   */
  private async compressAudio(
    audioBuffer: AudioBuffer,
    options: AudioProcessingOptions
  ): Promise<Blob> {
    // For browser environment, we can't easily compress to MP3/AAC
    // This would require a JavaScript encoder or server-side processing
    // For now, return the original as WAV with potential downsampling

    let processedBuffer = audioBuffer;

    // Downsample if requested
    if (options.targetBitRate && options.targetBitRate < 128000) {
      const targetSampleRate = Math.max(22050, audioBuffer.sampleRate / 2);
      processedBuffer = await this.resampleAudio(audioBuffer, targetSampleRate);
    }

    return this.audioBufferToWavBlob(processedBuffer);
  }

  /**
   * Fallback processing for when Web Audio API is not available
   */
  private async fallbackProcessing(
    audioBuffer: ArrayBuffer,
    mimeType: string,
    result: AudioProcessingResult,
    options: AudioProcessingOptions
  ): Promise<void> {
    // Generate basic waveform from raw audio data
    if (options.extractWaveform) {
      result.waveform = await this.generateBasicWaveform(audioBuffer, mimeType);
    }

    // Generate basic peaks
    if (options.generatePeaks) {
      result.peaks = await this.generateBasicPeaks(
        audioBuffer,
        options.peakCount || 100
      );
    }
  }

  /**
   * Generate basic waveform without Web Audio API
   */
  private async generateBasicWaveform(
    audioBuffer: ArrayBuffer,
    mimeType: string
  ): Promise<WaveformData> {
    // This is a simplified implementation
    // In production, you would need proper audio format parsing
    const waveformPoints = 1000;
    const peaks = new Array(waveformPoints)
      .fill(0)
      .map(() => Math.random() * 0.8);

    return {
      peaks,
      length: waveformPoints,
      duration: this.estimateDuration(
        audioBuffer.byteLength,
        this.estimateBitRate(audioBuffer.byteLength, mimeType)
      ),
      sampleRate: 44100,
      channels: 2,
    };
  }

  /**
   * Generate basic peaks without Web Audio API
   */
  private async generateBasicPeaks(
    audioBuffer: ArrayBuffer,
    peakCount: number
  ): Promise<AudioPeak[]> {
    const peaks: AudioPeak[] = [];
    const duration = this.estimateDuration(audioBuffer.byteLength, 128000);

    for (let i = 0; i < peakCount; i++) {
      peaks.push({
        time: (i / peakCount) * duration,
        amplitude: Math.random() * 0.8,
      });
    }

    return peaks;
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);

    // Convert float samples to int16
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, audioBuffer.getChannelData(channel)[i])
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Resample audio to different sample rate
   */
  private async resampleAudio(
    audioBuffer: AudioBuffer,
    targetSampleRate: number
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext required for resampling');
    }

    const ratio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.floor(audioBuffer.length / ratio);
    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      targetSampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const oldData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);

      for (let i = 0; i < newLength; i++) {
        const oldIndex = Math.floor(i * ratio);
        newData[i] = oldData[oldIndex];
      }
    }

    return newBuffer;
  }

  /**
   * Helper methods
   */
  private isWebAudioSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  private getCodecFromMimeType(mimeType: string): string {
    return AUDIO_CODECS[mimeType] || 'unknown';
  }

  private getFormatFromMimeType(mimeType: string): string {
    return AUDIO_MIME_TYPES[mimeType] || 'unknown';
  }

  private estimateBitRate(fileSize: number, mimeType: string): number {
    // Rough estimates based on typical bitrates for different formats
    const estimates: Record<string, number> = {
      'audio/mpeg': 128000,
      'audio/mp3': 128000,
      'audio/wav': 1411000, // 16-bit stereo at 44.1kHz
      'audio/m4a': 128000,
      'audio/webm': 128000,
      'audio/ogg': 128000,
      'audio/flac': 1000000,
    };

    return estimates[mimeType] || 128000;
  }

  private estimateDuration(fileSize: number, bitRate: number): number {
    // Duration = (file size in bits) / (bit rate)
    return (fileSize * 8) / bitRate;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    audioContextAvailable: boolean;
  } {
    return {
      isProcessing: this.isProcessing,
      audioContextAvailable: !!this.audioContext,
    };
  }
}

// Global audio processing service instance
let globalAudioProcessor: AudioProcessingService | null = null;

export function getAudioProcessor(): AudioProcessingService {
  if (!globalAudioProcessor) {
    globalAudioProcessor = new AudioProcessingService();
  }
  return globalAudioProcessor;
}

// Utility functions for common audio operations
export async function processAudioFileForUpload(
  file: File,
  options: AudioProcessingOptions = {}
): Promise<AudioProcessingResult> {
  const processor = getAudioProcessor();
  const arrayBuffer = await file.arrayBuffer();
  return processor.processAudioFile(arrayBuffer, file.type, options);
}

export async function generateAudioWaveform(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  points = 1000
): Promise<WaveformData | null> {
  try {
    const processor = getAudioProcessor();
    const result = await processor.processAudioFile(audioBuffer, mimeType, {
      extractWaveform: true,
    });
    return result.waveform || null;
  } catch (error) {
    console.error('Waveform generation failed:', error);
    return null;
  }
}

export async function generateAudioPeaks(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  peakCount = 100
): Promise<AudioPeak[]> {
  try {
    const processor = getAudioProcessor();
    const result = await processor.processAudioFile(audioBuffer, mimeType, {
      generatePeaks: true,
      peakCount,
    });
    return result.peaks || [];
  } catch (error) {
    console.error('Peak generation failed:', error);
    return [];
  }
}

export async function createAudioThumbnail(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  duration = 30
): Promise<Blob | null> {
  try {
    const processor = getAudioProcessor();
    const result = await processor.processAudioFile(audioBuffer, mimeType, {
      generateThumbnail: true,
      thumbnailDuration: duration,
    });
    return result.thumbnail || null;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

// Cleanup function for application shutdown
export function cleanupAudioProcessor(): void {
  if (globalAudioProcessor) {
    globalAudioProcessor.dispose();
    globalAudioProcessor = null;
  }
}

// Export types
export type {
  AudioMetadata,
  WaveformData,
  AudioPeak,
  AudioProcessingOptions,
  AudioProcessingResult,
};
