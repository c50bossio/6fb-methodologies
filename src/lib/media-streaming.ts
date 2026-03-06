/**
 * Media Streaming Optimization for 6FB Workbook System
 * Handles audio/video streaming, chunked uploads, and progressive loading
 */

import { cache, generateCacheKey, CACHE_PREFIXES, CACHE_TTL } from './redis-cache';

// Audio streaming configuration
export const AUDIO_CONFIG = {
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'ogg'],
  QUALITY_LEVELS: {
    low: { bitrate: 64, sampleRate: 22050 },
    medium: { bitrate: 128, sampleRate: 44100 },
    high: { bitrate: 192, sampleRate: 44100 },
    premium: { bitrate: 320, sampleRate: 48000 },
  },
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DURATION: 3600, // 1 hour
} as const;

// Video streaming configuration
export const VIDEO_CONFIG = {
  CHUNK_SIZE: 2 * 1024 * 1024, // 2MB chunks
  SUPPORTED_FORMATS: ['mp4', 'webm', 'mov'],
  QUALITY_LEVELS: {
    '240p': { width: 426, height: 240, bitrate: 500 },
    '360p': { width: 640, height: 360, bitrate: 800 },
    '480p': { width: 854, height: 480, bitrate: 1200 },
    '720p': { width: 1280, height: 720, bitrate: 2500 },
    '1080p': { width: 1920, height: 1080, bitrate: 5000 },
  },
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_DURATION: 3600, // 1 hour
} as const;

/**
 * Progressive audio loading for better user experience
 */
export class AudioStreamManager {
  private audio: HTMLAudioElement | null = null;
  private chunks: ArrayBuffer[] = [];
  private totalSize: number = 0;
  private loadedSize: number = 0;
  private isLoading: boolean = false;

  constructor(private url: string, private options: {
    preload?: 'none' | 'metadata' | 'auto';
    autoplay?: boolean;
    quality?: keyof typeof AUDIO_CONFIG.QUALITY_LEVELS;
  } = {}) {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    this.audio = new Audio();
    this.audio.preload = this.options.preload || 'metadata';
    this.audio.autoplay = this.options.autoplay || false;

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener('loadstart', () => {
      this.isLoading = true;
    });

    this.audio.addEventListener('canplaythrough', () => {
      this.isLoading = false;
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio loading error:', e);
      this.isLoading = false;
    });

    // Progressive loading
    this.audio.addEventListener('progress', () => {
      if (this.audio?.buffered.length > 0) {
        const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
        const duration = this.audio.duration;
        if (duration > 0) {
          const percentLoaded = (bufferedEnd / duration) * 100;
          this.onProgress?.(percentLoaded);
        }
      }
    });
  }

  async loadAudio(): Promise<void> {
    if (!this.audio) throw new Error('Audio element not initialized');

    // Check cache first
    const cacheKey = generateCacheKey(CACHE_PREFIXES.TRANSCRIPTION, 'audio', { url: this.url });
    const cachedData = await cache.get<string>(cacheKey);

    if (cachedData) {
      this.audio.src = cachedData;
      return;
    }

    // Load with optimized quality
    const optimizedUrl = this.getOptimizedUrl();
    this.audio.src = optimizedUrl;

    // Cache the optimized URL
    await cache.set(cacheKey, optimizedUrl, CACHE_TTL.LONG);
  }

  private getOptimizedUrl(): string {
    const quality = this.options.quality || 'medium';
    const config = AUDIO_CONFIG.QUALITY_LEVELS[quality];

    // Add quality parameters to URL
    const url = new URL(this.url);
    url.searchParams.set('bitrate', config.bitrate.toString());
    url.searchParams.set('sampleRate', config.sampleRate.toString());
    url.searchParams.set('format', 'mp3'); // Optimal format for web

    return url.toString();
  }

  play(): Promise<void> {
    if (!this.audio) throw new Error('Audio element not initialized');
    return this.audio.play();
  }

  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  setCurrentTime(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  getVolume(): number {
    return this.audio?.volume || 1;
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.chunks = [];
  }

  // Callback for loading progress
  onProgress?: (percent: number) => void;
}

/**
 * Chunked file upload with resume capability
 */
export class ChunkedUploader {
  private chunks: Blob[] = [];
  private uploadedChunks: Set<number> = new Set();
  private totalChunks: number = 0;
  private currentChunk: number = 0;

  constructor(
    private file: File,
    private uploadUrl: string,
    private options: {
      chunkSize?: number;
      maxRetries?: number;
      onProgress?: (percent: number) => void;
      onComplete?: (url: string) => void;
      onError?: (error: Error) => void;
    } = {}
  ) {
    this.chunkSize = options.chunkSize || AUDIO_CONFIG.CHUNK_SIZE;
    this.maxRetries = options.maxRetries || 3;
    this.prepareChunks();
  }

  private chunkSize: number;
  private maxRetries: number;

  private prepareChunks(): void {
    this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
    this.chunks = [];

    for (let i = 0; i < this.totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      this.chunks.push(this.file.slice(start, end));
    }
  }

  async upload(): Promise<string> {
    try {
      // Initialize upload session
      const sessionId = await this.initializeSession();

      // Upload chunks
      for (let i = 0; i < this.totalChunks; i++) {
        if (!this.uploadedChunks.has(i)) {
          await this.uploadChunk(i, sessionId);
        }
        this.updateProgress();
      }

      // Finalize upload
      const finalUrl = await this.finalizeUpload(sessionId);
      this.options.onComplete?.(finalUrl);
      return finalUrl;
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  private async initializeSession(): Promise<string> {
    const response = await fetch(`${this.uploadUrl}/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: this.file.name,
        fileSize: this.file.size,
        totalChunks: this.totalChunks,
        mimeType: this.file.type,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize upload session');
    }

    const data = await response.json();
    return data.sessionId;
  }

  private async uploadChunk(chunkIndex: number, sessionId: string): Promise<void> {
    const chunk = this.chunks[chunkIndex];
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('sessionId', sessionId);

        const response = await fetch(`${this.uploadUrl}/chunk`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          this.uploadedChunks.add(chunkIndex);
          return;
        } else {
          throw new Error(`Chunk upload failed: ${response.statusText}`);
        }
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }

  private async finalizeUpload(sessionId: string): Promise<string> {
    const response = await fetch(`${this.uploadUrl}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        totalChunks: this.totalChunks,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to finalize upload');
    }

    const data = await response.json();
    return data.url;
  }

  private updateProgress(): void {
    const percent = (this.uploadedChunks.size / this.totalChunks) * 100;
    this.options.onProgress?.(percent);
  }

  pause(): void {
    // Implementation for pausing upload
    this.currentChunk = -1;
  }

  resume(): Promise<string> {
    // Implementation for resuming upload
    return this.upload();
  }

  cancel(): void {
    // Implementation for canceling upload
    this.uploadedChunks.clear();
  }
}

/**
 * Adaptive bitrate streaming for variable network conditions
 */
export class AdaptiveStreamManager {
  private qualities: (keyof typeof AUDIO_CONFIG.QUALITY_LEVELS)[] = ['low', 'medium', 'high', 'premium'];
  private currentQuality: keyof typeof AUDIO_CONFIG.QUALITY_LEVELS = 'medium';
  private networkMonitor: NetworkMonitor;

  constructor(private baseUrl: string) {
    this.networkMonitor = new NetworkMonitor();
    this.setupAdaptiveStreaming();
  }

  private setupAdaptiveStreaming(): void {
    this.networkMonitor.onNetworkChange = (speed) => {
      const newQuality = this.getOptimalQuality(speed);
      if (newQuality !== this.currentQuality) {
        this.switchQuality(newQuality);
      }
    };
  }

  private getOptimalQuality(networkSpeed: number): keyof typeof AUDIO_CONFIG.QUALITY_LEVELS {
    // Network speed in Mbps
    if (networkSpeed < 0.5) return 'low';
    if (networkSpeed < 1) return 'medium';
    if (networkSpeed < 3) return 'high';
    return 'premium';
  }

  private switchQuality(quality: keyof typeof AUDIO_CONFIG.QUALITY_LEVELS): void {
    this.currentQuality = quality;
    // Implementation would switch the audio stream quality
    console.log(`Switching to ${quality} quality`);
  }

  getStreamUrl(path: string): string {
    const config = AUDIO_CONFIG.QUALITY_LEVELS[this.currentQuality];
    const url = new URL(`${this.baseUrl}/${path}`);
    url.searchParams.set('quality', this.currentQuality);
    url.searchParams.set('bitrate', config.bitrate.toString());
    return url.toString();
  }
}

/**
 * Network speed monitoring for adaptive streaming
 */
class NetworkMonitor {
  private connection: any;

  constructor() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      this.connection = (navigator as any).connection;
      this.setupConnectionListener();
    }
  }

  private setupConnectionListener(): void {
    if (this.connection) {
      this.connection.addEventListener('change', () => {
        const speed = this.getNetworkSpeed();
        this.onNetworkChange?.(speed);
      });
    }
  }

  private getNetworkSpeed(): number {
    if (!this.connection) return 1; // Default to medium speed

    // Get effective bandwidth estimate
    const downlink = this.connection.downlink || 1;
    const effectiveType = this.connection.effectiveType;

    // Map effective types to approximate speeds
    const typeSpeedMap: { [key: string]: number } = {
      'slow-2g': 0.05,
      '2g': 0.1,
      '3g': 0.5,
      '4g': 5,
      '5g': 20,
    };

    return typeSpeedMap[effectiveType] || downlink;
  }

  onNetworkChange?: (speed: number) => void;
}

/**
 * Media preloading for better UX
 */
export class MediaPreloader {
  private preloadedUrls: Set<string> = new Set();

  async preloadAudio(url: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    if (this.preloadedUrls.has(url)) return;

    try {
      // Create a link element for preloading
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'audio';
      link.href = url;
      if (priority === 'high') {
        link.setAttribute('importance', 'high');
      }

      document.head.appendChild(link);
      this.preloadedUrls.add(url);
    } catch (error) {
      console.warn('Failed to preload audio:', error);
    }
  }

  async preloadVideo(url: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    if (this.preloadedUrls.has(url)) return;

    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = url;
      if (priority === 'high') {
        link.setAttribute('importance', 'high');
      }

      document.head.appendChild(link);
      this.preloadedUrls.add(url);
    } catch (error) {
      console.warn('Failed to preload video:', error);
    }
  }

  clear(): void {
    this.preloadedUrls.clear();
  }
}

// Export singleton instances
export const audioStreamManager = new AudioStreamManager('');
export const adaptiveStreamManager = new AdaptiveStreamManager('/api/stream');
export const mediaPreloader = new MediaPreloader();