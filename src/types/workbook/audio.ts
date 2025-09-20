/**
 * Audio recording and transcription type definitions
 * Complete types for audio features in the workbook system
 */

import { UUID, Timestamp, JSONObject } from './core';

// Audio Recording Types
export interface AudioRecording {
  id: UUID;
  userId: UUID;
  moduleId?: UUID;
  lessonId?: UUID;
  sessionId?: UUID;
  title: string;
  description?: string;
  filename: string;
  url: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  mimeType: string;
  quality: AudioQuality;
  metadata: AudioMetadata;
  transcription?: AudioTranscription;
  status: AudioProcessingStatus;
  tags: string[];
  isPrivate: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AudioQuality = 'low' | 'medium' | 'high' | 'lossless';
export type AudioProcessingStatus =
  | 'uploading'
  | 'processing'
  | 'transcribing'
  | 'completed'
  | 'failed'
  | 'deleted';

export interface AudioMetadata {
  sampleRate: number;
  bitRate: number;
  channels: number;
  codec: string;
  recordingDevice?: string;
  environment?: 'quiet' | 'moderate' | 'noisy';
  noiseReduction?: boolean;
  originalFilename?: string;
  recordingSettings: RecordingSettings;
}

export interface RecordingSettings {
  autoGainControl: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  maxDuration: number; // in seconds
  quality: AudioQuality;
}

// Audio Transcription Types
export interface AudioTranscription {
  id: UUID;
  audioId: UUID;
  userId: UUID;
  text: string;
  language: string;
  confidence: number; // 0-1
  model: string; // AI model used (e.g., 'whisper-1')
  wordCount: number;
  segments: TranscriptionSegment[];
  metadata: TranscriptionMetadata;
  status: TranscriptionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TranscriptionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'manual_review';

export interface TranscriptionSegment {
  id: UUID;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  confidence: number; // 0-1
  words?: TranscriptionWord[];
  speakerId?: string; // for speaker identification
}

export interface TranscriptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionMetadata {
  processingTime: number; // in milliseconds
  model: string;
  language: string;
  detectedLanguage?: string;
  qualityScore: number; // 0-1
  noiseLevel: number; // 0-1
  speakerCount?: number;
  audioQualityIssues?: string[];
}

// Audio Player Types
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0-1
  playbackRate: number; // 0.5-2.0
  isLoading: boolean;
  isBuffering: boolean;
  error?: string;
}

export interface AudioPlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
}

export interface PlaylistItem {
  id: UUID;
  audioId: UUID;
  title: string;
  duration: number;
  url: string;
  thumbnail?: string;
}

export interface Playlist {
  id: UUID;
  title: string;
  description?: string;
  items: PlaylistItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

// Audio Recording Interface Types
export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // current recording duration in seconds
  volume: number; // current input volume level 0-1
  error?: string;
  deviceId?: string;
  isInitialized: boolean;
}

export interface AudioRecorderControls {
  startRecording: (options?: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  reset: () => void;
  getDevices: () => Promise<MediaDeviceInfo[]>;
  setDevice: (deviceId: string) => Promise<void>;
}

export interface RecordingOptions {
  deviceId?: string;
  sampleRate?: number;
  channelCount?: number;
  maxDuration?: number; // in seconds
  quality?: AudioQuality;
  autoGainControl?: boolean;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
}

// Audio Analysis Types
export interface AudioAnalysis {
  id: UUID;
  audioId: UUID;
  waveform: number[]; // amplitude values for visualization
  spectrogram?: number[][]; // frequency analysis
  peaks: AudioPeak[];
  silences: AudioSegment[];
  loudestSection: AudioSegment;
  averageVolume: number;
  dynamicRange: number;
  totalSilenceTime: number; // in seconds
  speechToSilenceRatio: number;
  qualityScore: number; // 0-1
  recommendations: string[];
  createdAt: Timestamp;
}

export interface AudioPeak {
  time: number; // in seconds
  amplitude: number; // 0-1
}

export interface AudioSegment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  type: 'speech' | 'silence' | 'noise' | 'music';
  confidence: number; // 0-1
}

// Audio Search and Filtering Types
export interface AudioSearchQuery {
  query?: string;
  moduleId?: UUID;
  lessonId?: UUID;
  userId?: UUID;
  dateRange?: {
    start: string;
    end: string;
  };
  duration?: {
    min: number;
    max: number;
  };
  hasTranscription?: boolean;
  quality?: AudioQuality;
  tags?: string[];
  isPrivate?: boolean;
}

export interface AudioSearchResult {
  recording: AudioRecording;
  transcriptionMatches?: TranscriptionMatch[];
  relevanceScore: number;
}

export interface TranscriptionMatch {
  segmentId: UUID;
  text: string;
  startTime: number;
  endTime: number;
  matchScore: number;
  context: string; // surrounding text for context
}

// Audio Processing Types
export interface AudioProcessingJob {
  id: UUID;
  audioId: UUID;
  type: 'transcription' | 'analysis' | 'enhancement' | 'compression';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  parameters: JSONObject;
  result?: JSONObject;
  error?: string;
  estimatedDuration?: number; // in seconds
  actualDuration?: number; // in seconds
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface AudioProcessingQueue {
  jobs: AudioProcessingJob[];
  activeJobs: number;
  queueLength: number;
  estimatedWaitTime: number; // in minutes
}

// Audio Upload Types
export interface AudioUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // in seconds
}

export interface AudioUploadResult {
  success: boolean;
  audioId?: UUID;
  url?: string;
  error?: string;
  metadata?: {
    duration: number;
    fileSize: number;
    format: string;
  };
}

// Audio Settings Types
export interface AudioSettings {
  recording: {
    defaultQuality: AudioQuality;
    autoGainControl: boolean;
    noiseSuppression: boolean;
    echoCancellation: boolean;
    maxDuration: number; // in seconds
    autoStop: boolean;
    silenceDetection: boolean;
  };
  playback: {
    defaultVolume: number; // 0-1
    autoplay: boolean;
    skipSilence: boolean;
    defaultPlaybackRate: number;
    showWaveform: boolean;
    showTranscript: boolean;
  };
  transcription: {
    autoTranscribe: boolean;
    language: string;
    includeTimestamps: boolean;
    includeSpeakers: boolean;
    confidenceThreshold: number; // 0-1
  };
  storage: {
    autoDelete: boolean;
    deleteAfterDays: number;
    maxStorageSize: number; // in MB
    compressionLevel: number; // 0-10
  };
}

// Component Props Types
export interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, metadata: AudioMetadata) => void;
  onError: (error: string) => void;
  maxDuration?: number;
  quality?: AudioQuality;
  showWaveform?: boolean;
  showTimer?: boolean;
  autoStart?: boolean;
  className?: string;
}

export interface AudioPlayerProps {
  audioId?: UUID;
  url?: string;
  title?: string;
  showTranscript?: boolean;
  showWaveform?: boolean;
  autoplay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
}

export interface TranscriptionViewerProps {
  transcription: AudioTranscription;
  currentTime?: number;
  onSeek?: (time: number) => void;
  onTextSelect?: (text: string, startTime: number, endTime: number) => void;
  editable?: boolean;
  showTimestamps?: boolean;
  showConfidence?: boolean;
  className?: string;
}

// API Types
export type CreateAudioRecordingInput = Omit<
  AudioRecording,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'url'
>;
export type UpdateAudioRecordingInput = Partial<
  Pick<AudioRecording, 'title' | 'description' | 'tags' | 'isPrivate'>
>;

export type CreateTranscriptionInput = Omit<
  AudioTranscription,
  'id' | 'createdAt' | 'updatedAt' | 'status'
>;
export type UpdateTranscriptionInput = Partial<
  Pick<AudioTranscription, 'text' | 'segments'>
>;
