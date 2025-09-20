'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Volume2,
  GraduationCap,
  Upload,
  FileAudio,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  Waveform,
  RotateCcw,
  Save,
  Cloud,
  CloudOff,
  Headphones,
  Mic2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AudioRecorder,
  AudioRecording,
  RecordingState,
  AudioQuality,
  AudioChunk,
  BrowserCompatibility,
  formatDuration,
  formatFileSize,
  getAudioLevelColor,
  detectBrowserCompatibility,
} from '@/lib/audio-recording';

// Type imports for API integration
type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';
type UploadStatus = 'idle' | 'uploading' | 'completed' | 'failed';

// Workshop modules for tagging
const WORKSHOP_MODULES = [
  { id: 'intro', name: 'Introduction to 6FB Methodologies' },
  { id: 'foundations', name: 'Business Foundations' },
  { id: 'marketing', name: 'Marketing Strategies' },
  { id: 'operations', name: 'Operations Excellence' },
  { id: 'growth', name: 'Growth and Scaling' },
  { id: 'conclusion', name: 'Implementation and Next Steps' },
];

// Audio quality options for user selection
const AUDIO_QUALITY_OPTIONS: { value: AudioQuality; label: string; description: string }[] = [
  { value: 'high', label: 'High Quality', description: '44.1kHz, Stereo - Best for music or detailed audio' },
  { value: 'standard', label: 'Standard', description: '16kHz, Mono - Recommended for voice recordings' },
  { value: 'background', label: 'Background', description: '8kHz, Mono - Efficient for background capture' },
];

// File upload configuration
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac'];
const CHUNK_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB chunks

/**
 * Enhanced audio recording metadata
 */
interface RecordingMetadata {
  title?: string;
  description?: string;
  moduleId?: string;
  lessonId?: string;
  sessionId?: string;
  tags: string[];
  isPrivate: boolean;
  autoTranscribe: boolean;
}

/**
 * Upload progress tracking
 */
interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  uploadedBytes: number;
  totalBytes: number;
  chunkIndex: number;
  totalChunks: number;
  error?: string;
}

/**
 * Transcription result
 */
interface TranscriptionResult {
  id: string;
  text: string;
  status: TranscriptionStatus;
  confidence?: number;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Enhanced component props with comprehensive recording features
 */
interface VoiceRecorderProps {
  /** User ID for authentication and storage */
  userId?: string;
  /** Session information for automatic tagging */
  sessionInfo?: {
    day: 1 | 2;
    session: string;
    speaker?: string;
    sessionId?: string;
  };
  /** Module ID for automatic tagging */
  moduleId?: string;
  /** Lesson ID for automatic tagging */
  lessonId?: string;
  /** Whether to automatically save recordings */
  autoSave?: boolean;
  /** Whether to show audio visualizer */
  showVisualizer?: boolean;
  /** Whether to automatically transcribe recordings */
  autoTranscribe?: boolean;
  /** Whether to show advanced settings */
  showAdvancedSettings?: boolean;
  /** Whether to enable file upload functionality */
  enableFileUpload?: boolean;
  /** Default audio quality */
  defaultQuality?: AudioQuality;
  /** Maximum recording duration in seconds */
  maxDuration?: number;
  /** Custom class name for styling */
  className?: string;
  /** Callback when a recording is completed */
  onRecordingComplete?: (recording: AudioRecording, transcription?: TranscriptionResult) => void;
  /** Callback when a file is uploaded */
  onFileUpload?: (file: File, metadata: RecordingMetadata) => void;
  /** Callback when transcription is completed */
  onTranscriptionComplete?: (transcription: TranscriptionResult) => void;
  /** Callback for error handling */
  onError?: (error: string, context?: string) => void;
  /** Callback for upload progress */
  onUploadProgress?: (progress: UploadProgress) => void;
}

/**
 * Enhanced waveform visualizer with real-time audio analysis
 */
const AudioLevelVisualizer: React.FC<{
  level: number;
  isActive: boolean;
  quality: AudioQuality;
  showFrequencyData?: boolean;
  className?: string;
}> = ({ level, isActive, quality, showFrequencyData = false, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  // Generate realistic frequency visualization
  useEffect(() => {
    if (showFrequencyData && isActive) {
      const data = new Uint8Array(32);
      for (let i = 0; i < data.length; i++) {
        // Simulate frequency response with some randomness
        const baseLevel = level * 255;
        const variation = (Math.random() - 0.5) * 50;
        data[i] = Math.max(0, Math.min(255, baseLevel + variation));
      }
      setFrequencyData(data);
    }
  }, [level, isActive, showFrequencyData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background with quality indicator
    const qualityColor = quality === 'high' ? '#10B981' : quality === 'standard' ? '#F59E0B' : '#6B7280';
    ctx.fillStyle = isActive ? '#1F2937' : '#374151';
    ctx.fillRect(0, 0, width, height);

    if (showFrequencyData && frequencyData) {
      // Draw frequency bars
      const barWidth = width / frequencyData.length;
      frequencyData.forEach((value, index) => {
        const barHeight = (value / 255) * height;
        const alpha = isActive ? 0.8 : 0.3;

        ctx.fillStyle = `rgba(${parseInt(qualityColor.slice(1, 3), 16)}, ${parseInt(qualityColor.slice(3, 5), 16)}, ${parseInt(qualityColor.slice(5, 7), 16)}, ${alpha})`;
        ctx.fillRect(
          index * barWidth,
          height - barHeight,
          barWidth - 1,
          barHeight
        );
      });
    } else {
      // Draw simple level bars
      const barCount = 20;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const barHeight = (Math.random() * 0.3 + 0.7) * level * height;
        const alpha = isActive ? 0.8 : 0.3;

        const color = level > 0.7 ? '220, 53, 69' : level > 0.3 ? '255, 193, 7' : '0, 200, 81';
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fillRect(
          i * barWidth,
          height - barHeight,
          barWidth - 2,
          barHeight
        );
      }
    }

    // Draw quality indicator
    ctx.fillStyle = qualityColor;
    ctx.fillRect(0, 0, 4, height);

  }, [level, isActive, quality, showFrequencyData, frequencyData]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={240}
        height={80}
        className='border border-border-primary rounded bg-background-accent'
      />
      <div className='absolute top-1 right-1 text-xs text-text-secondary bg-black/50 px-1 rounded'>
        {quality.toUpperCase()}
      </div>
      {isActive && (
        <div className='absolute bottom-1 left-1 flex items-center gap-1 text-xs text-text-secondary bg-black/50 px-1 rounded'>
          <div className='w-2 h-2 bg-red-500 rounded-full animate-pulse' />
          REC
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced recording status with detailed information
 */
const RecordingStatus: React.FC<{
  state: RecordingState;
  duration: number;
  quality: AudioQuality;
  uploadProgress?: UploadProgress;
  transcriptionStatus?: TranscriptionStatus;
  chunkCount?: number;
  fileSize?: number;
}> = ({ state, duration, quality, uploadProgress, transcriptionStatus, chunkCount = 0, fileSize = 0 }) => {
  const getStatusIcon = () => {
    switch (state) {
      case 'recording':
        return <div className='w-3 h-3 rounded-full bg-red-500 animate-pulse' />;
      case 'paused':
        return <Pause className='w-4 h-4 text-yellow-500' />;
      case 'processing':
        return <Loader2 className='w-4 h-4 text-blue-500 animate-spin' />;
      case 'error':
        return <AlertCircle className='w-4 h-4 text-red-500' />;
      default:
        return <Mic className='w-4 h-4 text-gray-400' />;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'recording':
        return 'Recording';
      case 'paused':
        return 'Paused';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'recording':
        return 'text-red-500';
      case 'paused':
        return 'text-yellow-500';
      case 'processing':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className='space-y-3'>
      {/* Main Status */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {getStatusIcon()}
          <div>
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {duration > 0 && (
              <span className='text-text-secondary ml-2'>
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 text-sm text-text-secondary'>
          <Badge variant='outline' className='text-xs'>
            {quality}
          </Badge>
          {chunkCount > 0 && (
            <Badge variant='outline' className='text-xs'>
              {chunkCount} chunks
            </Badge>
          )}
          {fileSize > 0 && (
            <Badge variant='outline' className='text-xs'>
              {formatFileSize(fileSize)}
            </Badge>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && uploadProgress.status !== 'idle' && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-text-secondary'>Upload Progress</span>
            <span className='font-medium'>
              {uploadProgress.progress.toFixed(1)}%
            </span>
          </div>
          <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                uploadProgress.status === 'completed'
                  ? 'bg-green-500'
                  : uploadProgress.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <div className='flex items-center justify-between text-xs text-text-secondary'>
            <span>
              {formatFileSize(uploadProgress.uploadedBytes)} / {formatFileSize(uploadProgress.totalBytes)}
            </span>
            <span>
              Chunk {uploadProgress.chunkIndex + 1} / {uploadProgress.totalChunks}
            </span>
          </div>
        </div>
      )}

      {/* Transcription Status */}
      {transcriptionStatus && transcriptionStatus !== 'pending' && (
        <div className='flex items-center gap-2 text-sm'>
          {transcriptionStatus === 'processing' && (
            <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
          )}
          {transcriptionStatus === 'completed' && (
            <CheckCircle className='w-4 h-4 text-green-500' />
          )}
          {transcriptionStatus === 'failed' && (
            <AlertCircle className='w-4 h-4 text-red-500' />
          )}
          <span className='text-text-secondary'>
            Transcription: {transcriptionStatus}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced file upload component for audio files
 */
const FileUploadArea: React.FC<{
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadProgress?: UploadProgress;
  className?: string;
}> = ({ onFileSelect, isUploading, uploadProgress, className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));

    if (audioFile) {
      onFileSelect(audioFile);
    }
  }, [onFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-tomb45-green bg-tomb45-green/5'
            : 'border-border-primary hover:border-tomb45-green/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className='flex flex-col items-center gap-3'>
          {isUploading ? (
            <Loader2 className='w-12 h-12 text-tomb45-green animate-spin' />
          ) : (
            <FileAudio className='w-12 h-12 text-tomb45-green' />
          )}

          <div>
            <h3 className='font-medium text-text-primary mb-1'>
              {isUploading ? 'Uploading...' : 'Upload Audio File'}
            </h3>
            <p className='text-sm text-text-secondary'>
              {isUploading
                ? `${uploadProgress?.progress.toFixed(1)}% complete`
                : 'Drag and drop an audio file or click to browse'}
            </p>
          </div>

          <div className='text-xs text-text-secondary'>
            Supported formats: {SUPPORTED_AUDIO_FORMATS.join(', ')}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept={SUPPORTED_AUDIO_FORMATS.join(',')}
          onChange={handleFileInputChange}
          className='hidden'
        />
      </div>

      {uploadProgress && uploadProgress.status !== 'idle' && (
        <div className='space-y-2'>
          <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
            <div
              className='bg-tomb45-green h-2 rounded-full transition-all duration-300'
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <div className='flex justify-between text-xs text-text-secondary'>
            <span>{formatFileSize(uploadProgress.uploadedBytes)} uploaded</span>
            <span>{formatFileSize(uploadProgress.totalBytes)} total</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Advanced recording controls with comprehensive functionality
 */
interface RecordingControlsProps {
  state: RecordingState;
  quality: AudioQuality;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  onSave: () => void;
  onQualityChange: (quality: AudioQuality) => void;
  disabled: boolean;
  canSave: boolean;
  isUploading: boolean;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  state,
  quality,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
  onSave,
  onQualityChange,
  disabled,
  canSave,
  isUploading,
}) => {
  const [showQualitySelector, setShowQualitySelector] = useState(false);

  return (
    <div className='space-y-4'>
      {/* Main Controls */}
      <div className='flex items-center justify-center gap-3'>
        {state === 'idle' && (
          <>
            <Button
              onClick={onStart}
              disabled={disabled}
              size='lg'
              className='bg-red-500 hover:bg-red-600 text-white px-8'
            >
              <Mic className='w-5 h-5 mr-3' />
              Start Recording
            </Button>

            <Button
              onClick={() => setShowQualitySelector(!showQualitySelector)}
              variant='outline'
              size='lg'
            >
              <Settings className='w-4 h-4' />
            </Button>
          </>
        )}

        {state === 'recording' && (
          <>
            <Button
              onClick={onPause}
              disabled={disabled}
              size='lg'
              className='bg-yellow-500 hover:bg-yellow-600 text-white'
            >
              <Pause className='w-5 h-5 mr-2' />
              Pause
            </Button>
            <Button
              onClick={onStop}
              disabled={disabled}
              size='lg'
              variant='outline'
            >
              <Square className='w-5 h-5 mr-2' />
              Stop
            </Button>
          </>
        )}

        {state === 'paused' && (
          <>
            <Button
              onClick={onResume}
              disabled={disabled}
              size='lg'
              className='bg-green-500 hover:bg-green-600 text-white'
            >
              <Play className='w-5 h-5 mr-2' />
              Resume
            </Button>
            <Button
              onClick={onStop}
              disabled={disabled}
              size='lg'
              variant='outline'
            >
              <Square className='w-5 h-5 mr-2' />
              Stop
            </Button>
          </>
        )}

        {(state === 'idle' || state === 'error') && canSave && (
          <>
            <Button
              onClick={onSave}
              disabled={disabled || isUploading}
              variant='outline'
              size='lg'
            >
              {isUploading ? (
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              ) : (
                <Save className='w-4 h-4 mr-2' />
              )}
              Save
            </Button>
            <Button
              onClick={onClear}
              disabled={disabled}
              variant='ghost'
              size='lg'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Quality Selector */}
      {showQualitySelector && (
        <Card className='bg-background-accent border-border-primary'>
          <CardContent className='p-4'>
            <h4 className='font-medium text-text-primary mb-3'>Audio Quality</h4>
            <div className='space-y-2'>
              {AUDIO_QUALITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className='flex items-start gap-3 p-3 rounded-lg border border-border-primary cursor-pointer hover:bg-background-secondary transition-colors'
                >
                  <input
                    type='radio'
                    name='quality'
                    value={option.value}
                    checked={quality === option.value}
                    onChange={() => onQualityChange(option.value)}
                    className='mt-1'
                  />
                  <div className='flex-1'>
                    <div className='font-medium text-text-primary'>{option.label}</div>
                    <div className='text-sm text-text-secondary'>{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Main Enhanced VoiceRecorder Component
 */
export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  userId,
  sessionInfo,
  moduleId: initialModuleId,
  lessonId,
  autoSave = true,
  showVisualizer = true,
  autoTranscribe = true,
  showAdvancedSettings = false,
  enableFileUpload = true,
  defaultQuality = 'standard',
  maxDuration = 3600,
  className = '',
  onRecordingComplete,
  onFileUpload,
  onTranscriptionComplete,
  onError,
  onUploadProgress,
}) => {
  // Core recorder state
  const [recorder] = useState(() => new AudioRecorder({
    quality: defaultQuality,
    maxRecordingDuration: maxDuration
  }));
  const [state, setState] = useState<RecordingState>('idle');
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced state
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId || '');
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(defaultQuality);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    chunkIndex: 0,
    totalChunks: 0
  });
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [showSettings, setShowSettings] = useState(showAdvancedSettings);
  const [recordingMetadata, setRecordingMetadata] = useState<RecordingMetadata>({
    tags: [],
    isPrivate: true,
    autoTranscribe: autoTranscribe,
  });

  // Refs
  const durationInterval = useRef<number | null>(null);
  const startTime = useRef<Date | null>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  // Initialize recorder and check compatibility
  useEffect(() => {
    const compatibility = detectBrowserCompatibility();
    setIsSupported(compatibility !== 'unsupported');

    if (compatibility === 'unsupported') {
      const errorMsg = 'Audio recording is not supported in this browser';
      setError(errorMsg);
      onError?.(errorMsg, 'initialization');
      return;
    }

    // Update recorder quality
    recorder.updateConfig({ quality: audioQuality });

    // Initialize metadata
    setRecordingMetadata(prev => ({
      ...prev,
      moduleId: selectedModuleId,
      lessonId,
      sessionId: sessionInfo?.sessionId,
      tags: [
        ...(selectedModuleId ? [`module:${selectedModuleId}`] : []),
        ...(lessonId ? [`lesson:${lessonId}`] : []),
        ...(sessionInfo?.session ? [`session:${sessionInfo.session.toLowerCase().replace(/\s+/g, '-')}`] : []),
        ...(sessionInfo?.speaker ? [`speaker:${sessionInfo.speaker.toLowerCase()}`] : []),
      ].filter(Boolean),
    }));

    /**
     * Upload a single audio chunk to the backend
     */
    const uploadChunk = async (chunk: AudioChunk) => {
      if (!userId) return;

      try {
        const formData = new FormData();
        formData.append('chunk', chunk.blob);
        formData.append('chunkId', chunk.id);
        formData.append('sequenceNumber', chunk.sequenceNumber.toString());
        formData.append('recordingId', currentRecording?.id || '');
        formData.append('metadata', JSON.stringify(recordingMetadata));

        const response = await fetch('/api/workbook/audio/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Chunk upload failed');
        }

        const result = await response.json();
        console.log('Chunk uploaded:', result);
      } catch (error) {
        console.error('Chunk upload error:', error);
        onError?.(error instanceof Error ? error.message : 'Chunk upload failed', 'upload');
      }
    };

    /**
     * Upload complete recording with chunked upload
     */
    const uploadRecording = async (recording: AudioRecording): Promise<string | null> => {
      if (!userId) return null;

      try {
        uploadAbortController.current = new AbortController();
        const signal = uploadAbortController.current.signal;

        // Combine all chunks into a single blob
        const combinedBlob = await recorder.combineChunks(recording);
        const totalSize = combinedBlob.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_UPLOAD_SIZE);

        setUploadProgress({
          status: 'uploading',
          progress: 0,
          uploadedBytes: 0,
          totalBytes: totalSize,
          chunkIndex: 0,
          totalChunks,
        });

        // Upload in chunks
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let uploadedBytes = 0;

        for (let i = 0; i < totalChunks; i++) {
          if (signal.aborted) throw new Error('Upload aborted');

          const start = i * CHUNK_UPLOAD_SIZE;
          const end = Math.min(start + CHUNK_UPLOAD_SIZE, totalSize);
          const chunk = combinedBlob.slice(start, end);

          const formData = new FormData();
          formData.append('file', chunk);
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', i.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('originalName', `recording_${recording.id}.webm`);
          formData.append('metadata', JSON.stringify({
            ...recordingMetadata,
            recordingId: recording.id,
            duration: recording.totalDuration,
            quality: recording.metadata.quality,
          }));

          const response = await fetch('/api/workbook/audio/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            signal,
          });

          if (!response.ok) {
            throw new Error(`Upload chunk ${i + 1} failed`);
          }

          uploadedBytes += chunk.size;
          const progress = (uploadedBytes / totalSize) * 100;

          setUploadProgress({
            status: 'uploading',
            progress,
            uploadedBytes,
            totalBytes: totalSize,
            chunkIndex: i,
            totalChunks,
          });

          onUploadProgress?.({
            status: 'uploading',
            progress,
            uploadedBytes,
            totalBytes: totalSize,
            chunkIndex: i,
            totalChunks,
          });
        }

        // Complete upload
        const completeResponse = await fetch('/api/workbook/audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadId,
            metadata: {
              ...recordingMetadata,
              recordingId: recording.id,
              duration: recording.totalDuration,
              quality: recording.metadata.quality,
            },
          }),
        });

        if (!completeResponse.ok) {
          throw new Error('Failed to complete upload');
        }

        const result = await completeResponse.json();

        setUploadProgress({
          status: 'completed',
          progress: 100,
          uploadedBytes: totalSize,
          totalBytes: totalSize,
          chunkIndex: totalChunks - 1,
          totalChunks,
        });

        onUploadProgress?.({
          status: 'completed',
          progress: 100,
          uploadedBytes: totalSize,
          totalBytes: totalSize,
          chunkIndex: totalChunks - 1,
          totalChunks,
        });

        return result.data?.id || null;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
        setUploadProgress(prev => ({ ...prev, status: 'failed', error: errorMsg }));
        onError?.(errorMsg, 'upload');
        return null;
      }
    };

    /**
     * Transcribe recording using backend API
     */
    const handleTranscribeRecording = async (recording: AudioRecording) => {
      if (!userId || !autoTranscribe) return;

      try {
        // Start transcription
        const response = await fetch('/api/workbook/audio/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            recordingId: recording.id,
            language: 'en',
            model: 'whisper-1',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start transcription');
        }

        const result = await response.json();
        const transcriptionId = result.data?.id;

        if (transcriptionId) {
          // Poll for transcription completion
          const pollTranscription = async (): Promise<void> => {
            try {
              const statusResponse = await fetch(`/api/workbook/audio/transcription/${transcriptionId}`, {
                credentials: 'include',
              });

              if (statusResponse.ok) {
                const statusResult = await statusResponse.json();
                const transcription = statusResult.data;

                setTranscriptionResult(transcription);

                if (transcription.status === 'completed') {
                  onTranscriptionComplete?.(transcription);
                } else if (transcription.status === 'failed') {
                  onError?.(transcription.error || 'Transcription failed', 'transcription');
                } else if (transcription.status === 'processing') {
                  // Continue polling
                  setTimeout(pollTranscription, 2000);
                }
              }
            } catch (error) {
              console.error('Transcription polling error:', error);
            }
          };

          // Start polling
          setTimeout(pollTranscription, 1000);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Transcription failed';
        onError?.(errorMsg, 'transcription');
      }
    };

    /**
     * Save recording with upload and transcription
     */
    const handleSaveRecording = async (recording?: AudioRecording) => {
      const recordingToSave = recording || currentRecording;
      if (!recordingToSave || !userId) return;

      try {
        // Upload recording
        const uploadedId = await uploadRecording(recordingToSave);

        if (uploadedId) {
          // Save recording metadata locally
          await recorder.saveRecording(userId, recordingToSave, true);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to save recording';
        onError?.(errorMsg, 'save');
      }
    };

    // Setup enhanced event listeners
    const handleStateChange = (recorderState: any) => {
      setState(recorderState.state);
      if (recorderState.error) {
        const errorMsg = recorderState.error;
        setError(errorMsg);
        onError?.(errorMsg, 'recording');
      }
    };

    const handleAudioLevel = (level: number) => {
      setAudioLevel(level);
    };

    const handleRecordingStarted = () => {
      startTime.current = new Date();
      setDuration(0);
      setError(null);
      setTranscriptionResult(null);

      // Start duration timer
      durationInterval.current = window.setInterval(() => {
        if (startTime.current) {
          const elapsed = (Date.now() - startTime.current.getTime()) / 1000;
          setDuration(elapsed);

          // Check max duration
          if (elapsed >= maxDuration) {
            handleStopRecording();
          }
        }
      }, 100);
    };

    const handleStopRecording = async () => {
      try {
        await recorder.stopRecording();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
        setError(errorMessage);
        onError?.(errorMessage, 'stop');
      }
    };

    const handleRecordingStopped = async (recording: AudioRecording) => {
      setCurrentRecording(recording);

      // Stop duration timer
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Enhanced auto-save with upload and transcription
      if (autoSave && userId) {
        try {
          await handleSaveRecording(recording);
        } catch (error) {
          console.error('Auto-save failed:', error);
          const errorMsg = 'Failed to save recording';
          setError(errorMsg);
          onError?.(errorMsg, 'save');
        }
      }

      // Trigger transcription if enabled
      if (autoTranscribe) {
        await handleTranscribeRecording(recording);
      }

      // Call completion callback with transcription
      onRecordingComplete?.(recording, transcriptionResult || undefined);
    };

    const handleRecordingPaused = () => {
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    };

    const handleRecordingResumed = () => {
      if (!durationInterval.current && startTime.current) {
        durationInterval.current = window.setInterval(() => {
          if (startTime.current) {
            const elapsed = (Date.now() - startTime.current.getTime()) / 1000;
            setDuration(elapsed);

            if (elapsed >= maxDuration) {
              handleStopRecording();
            }
          }
        }, 100);
      }
    };

    const handleChunkAvailable = (chunk: AudioChunk) => {
      // Auto-upload chunks if enabled
      if (autoSave && userId) {
        uploadChunk(chunk);
      }
    };

    // Attach event listeners
    recorder.on('stateChanged', handleStateChange);
    recorder.on('audioLevel', handleAudioLevel);
    recorder.on('recordingStarted', handleRecordingStarted);
    recorder.on('recordingStopped', handleRecordingStopped);
    recorder.on('recordingPaused', handleRecordingPaused);
    recorder.on('recordingResumed', handleRecordingResumed);
    recorder.on('chunkAvailable', handleChunkAvailable);

    // Cleanup
    return () => {
      recorder.off('stateChanged', handleStateChange);
      recorder.off('audioLevel', handleAudioLevel);
      recorder.off('recordingStarted', handleRecordingStarted);
      recorder.off('recordingStopped', handleRecordingStopped);
      recorder.off('recordingPaused', handleRecordingPaused);
      recorder.off('recordingResumed', handleRecordingResumed);
      recorder.off('chunkAvailable', handleChunkAvailable);

      if (durationInterval.current) {
        window.clearInterval(durationInterval.current);
      }

      // Abort any ongoing uploads
      if (uploadAbortController.current) {
        uploadAbortController.current.abort();
      }

      recorder.destroy();
    };
  }, [recorder, userId, autoSave, autoTranscribe, maxDuration, selectedModuleId, lessonId, sessionInfo, audioQuality, onRecordingComplete, onError]);

  /**
   * Enhanced action handlers
   */
  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      await recorder.initialize();

      // Enhance session info with module data
      const enhancedSessionInfo = {
        ...sessionInfo,
        moduleId: selectedModuleId,
        moduleName: WORKSHOP_MODULES.find(m => m.id === selectedModuleId)?.name,
      };

      await recorder.startRecording(enhancedSessionInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      onError?.(errorMessage, 'start');
    }
  }, [recorder, sessionInfo, selectedModuleId, onError]);

  const handlePauseRecording = useCallback(() => {
    recorder.pauseRecording();
  }, [recorder]);

  const handleResumeRecording = useCallback(() => {
    recorder.resumeRecording();
  }, [recorder]);

  const handleStopRecording = useCallback(async () => {
    try {
      await recorder.stopRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
      setError(errorMessage);
      onError?.(errorMessage, 'stop');
    }
  }, [recorder, onError]);

  const handleClearRecording = useCallback(() => {
    setCurrentRecording(null);
    setDuration(0);
    setAudioLevel(0);
    setError(null);
    setTranscriptionResult(null);
    setUploadProgress({ status: 'idle', progress: 0, uploadedBytes: 0, totalBytes: 0, chunkIndex: 0, totalChunks: 0 });
    startTime.current = null;

    if (durationInterval.current) {
      window.clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }
  }, []);

  const handleQualityChange = useCallback((quality: AudioQuality) => {
    setAudioQuality(quality);
    recorder.updateConfig({ quality });
  }, [recorder]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!userId) return;

    try {
      // Validate file
      if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`File too large. Maximum size is ${formatFileSize(MAX_UPLOAD_SIZE)}`);
      }

      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!SUPPORTED_AUDIO_FORMATS.includes(fileExtension)) {
        throw new Error(`Unsupported file format. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`);
      }

      // Create recording-like object for the file
      const fileRecording: AudioRecording = {
        id: `file_upload_${Date.now()}`,
        userId,
        chunks: [],
        totalDuration: 0, // Will be determined by backend
        totalSize: file.size,
        startTime: new Date(),
        endTime: new Date(),
        metadata: {
          quality: 'standard',
          sampleRate: 16000,
          channels: 1,
          mimeType: file.type,
        },
      };

      // Notify parent component
      onFileUpload?.(file, recordingMetadata);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'File upload failed';
      onError?.(errorMsg, 'file_upload');
    }
  }, [userId, recordingMetadata, onFileUpload, onError]);

  const handleDownloadRecording = useCallback(async () => {
    if (!currentRecording || !userId) return;

    try {
      const audioUrl = (await recorder.exportRecording(
        userId,
        currentRecording.id,
        'url'
      )) as string;

      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `recording_${currentRecording.id}_${new Date().toISOString().split('T')[0]}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('Download failed:', error);
      const errorMsg = 'Failed to download recording';
      setError(errorMsg);
      onError?.(errorMsg, 'download');
    }
  }, [currentRecording, recorder, userId, onError]);

  /**
   * Computed values
   */
  const compatibility = useMemo(() => detectBrowserCompatibility(), []);
  const canSave = useMemo(() => {
    return currentRecording && state === 'idle' && uploadProgress.status !== 'uploading';
  }, [currentRecording, state, uploadProgress.status]);
  const isUploading = useMemo(() => {
    return uploadProgress.status === 'uploading';
  }, [uploadProgress.status]);

  // Don't render if not supported
  if (!isSupported) {
    return (
      <Card className={`bg-red-900/20 border-red-500/30 ${className}`}>
        <CardContent className='p-6'>
          <div className='flex items-center gap-3 text-red-400'>
            <MicOff className='w-6 h-6' />
            <div>
              <h3 className='font-medium mb-1'>Audio Recording Not Supported</h3>
              <p className='text-sm text-red-300'>
                Your browser doesn't support audio recording. Please try using Chrome, Firefox, or Safari.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Recording Card */}
      <Card className='bg-background-secondary border-border-primary shadow-dark-lg'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-tomb45-green/20 rounded-lg'>
                <Volume2 className='w-6 h-6 text-tomb45-green' />
              </div>
              <div>
                <CardTitle className='text-xl font-bold text-text-primary'>
                  Enhanced Voice Recorder
                </CardTitle>
                <p className='text-text-secondary text-sm'>
                  Record audio with automatic transcription and smart organization
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-xs'>
                {compatibility === 'full' ? 'Full Support' : 'Partial Support'}
              </Badge>
              {showAdvancedSettings && (
                <Button
                  onClick={() => setShowSettings(!showSettings)}
                  variant='ghost'
                  size='sm'
                >
                  <Settings className='w-4 h-4' />
                </Button>
              )}
            </div>
          </div>

          {sessionInfo && (
            <div className='flex items-center gap-4 text-sm text-text-secondary bg-background-accent p-3 rounded-lg'>
              <div className='flex items-center gap-2'>
                <GraduationCap className='w-4 h-4' />
                <span>{sessionInfo.session}</span>
              </div>
              <div className='flex items-center gap-2'>
                <span>Day {sessionInfo.day}</span>
              </div>
              {sessionInfo.speaker && (
                <div className='flex items-center gap-2'>
                  <Headphones className='w-4 h-4' />
                  <span>{sessionInfo.speaker}</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className='space-y-6'>
          {/* Enhanced Module and Settings */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Module Selector */}
            <div className='space-y-2'>
              <label htmlFor='module-select' className='block text-sm font-medium text-text-primary'>
                Workshop Module
              </label>
              <div className='relative'>
                <select
                  id='module-select'
                  value={selectedModuleId}
                  onChange={e => {
                    setSelectedModuleId(e.target.value);
                    setRecordingMetadata(prev => ({
                      ...prev,
                      moduleId: e.target.value,
                      tags: prev.tags.filter(tag => !tag.startsWith('module:')).concat(
                        e.target.value ? [`module:${e.target.value}`] : []
                      ),
                    }));
                  }}
                  disabled={state !== 'idle'}
                  className='w-full px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <option value=''>General Recording</option>
                  {WORKSHOP_MODULES.map(module => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
                <GraduationCap className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none' />
              </div>
            </div>

            {/* Recording Settings */}
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-text-primary'>
                Recording Options
              </label>
              <div className='flex flex-wrap gap-2'>
                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={recordingMetadata.autoTranscribe}
                    onChange={e => setRecordingMetadata(prev => ({ ...prev, autoTranscribe: e.target.checked }))}
                    disabled={state !== 'idle'}
                    className='rounded border-border-primary'
                  />
                  <span className='text-text-secondary'>Auto-transcribe</span>
                </label>
                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={recordingMetadata.isPrivate}
                    onChange={e => setRecordingMetadata(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    disabled={state !== 'idle'}
                    className='rounded border-border-primary'
                  />
                  <span className='text-text-secondary'>Private</span>
                </label>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
              <div className='flex items-start gap-3 text-red-400'>
                <AlertCircle className='w-5 h-5 mt-0.5 flex-shrink-0' />
                <div>
                  <h4 className='font-medium mb-1'>Recording Error</h4>
                  <p className='text-sm text-red-300'>{error}</p>
                  <Button
                    onClick={() => setError(null)}
                    variant='ghost'
                    size='sm'
                    className='mt-2 text-red-300 hover:text-red-200'
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Recording Status */}
          <RecordingStatus
            state={state}
            duration={duration}
            quality={audioQuality}
            uploadProgress={uploadProgress}
            transcriptionStatus={transcriptionResult?.status}
            chunkCount={currentRecording?.chunks.length}
            fileSize={currentRecording?.totalSize}
          />

          {/* Enhanced Audio Visualizer */}
          {showVisualizer && (
            <div className='flex justify-center'>
              <AudioLevelVisualizer
                level={audioLevel}
                isActive={state === 'recording'}
                quality={audioQuality}
                showFrequencyData={showAdvancedSettings}
                className='rounded-lg overflow-hidden'
              />
            </div>
          )}

          {/* Enhanced Recording Controls */}
          <RecordingControls
            state={state}
            quality={audioQuality}
            onStart={handleStartRecording}
            onPause={handlePauseRecording}
            onResume={handleResumeRecording}
            onStop={handleStopRecording}
            onClear={handleClearRecording}
            onSave={() => {}} // Implement save handler
            onQualityChange={handleQualityChange}
            disabled={!!error}
            canSave={canSave}
            isUploading={isUploading}
          />

          {/* Enhanced Recording Info */}
          {currentRecording && (
            <Card className='bg-background-accent border-border-primary'>
              <CardContent className='p-4 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-green-500/20 rounded-lg'>
                      <CheckCircle className='w-5 h-5 text-green-500' />
                    </div>
                    <div>
                      <h4 className='font-medium text-text-primary'>Recording Complete</h4>
                      <p className='text-sm text-text-secondary'>
                        {currentRecording.endTime && currentRecording.startTime &&
                          `Recorded on ${new Date(currentRecording.endTime).toLocaleString()}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Button
                      onClick={handleDownloadRecording}
                      variant='outline'
                      size='sm'
                    >
                      <Download className='w-4 h-4 mr-2' />
                      Download
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                  <div className='space-y-1'>
                    <span className='text-text-muted block'>Duration</span>
                    <span className='font-medium text-text-primary'>
                      {formatDuration(currentRecording.totalDuration)}
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-text-muted block'>Size</span>
                    <span className='font-medium text-text-primary'>
                      {formatFileSize(currentRecording.totalSize)}
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-text-muted block'>Quality</span>
                    <span className='font-medium text-text-primary capitalize'>
                      {currentRecording.metadata.quality}
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <span className='text-text-muted block'>Chunks</span>
                    <span className='font-medium text-text-primary'>
                      {currentRecording.chunks.length}
                    </span>
                  </div>
                </div>

                {/* Tags and Metadata */}
                {recordingMetadata.tags.length > 0 && (
                  <div className='space-y-2'>
                    <span className='text-text-muted text-sm'>Tags:</span>
                    <div className='flex flex-wrap gap-1'>
                      {recordingMetadata.tags.map((tag, index) => (
                        <Badge key={index} variant='outline' className='text-xs'>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcription Results */}
                {transcriptionResult && (
                  <div className='space-y-2 border-t border-border-primary pt-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-text-muted text-sm'>Transcription:</span>
                      <Badge
                        variant='outline'
                        className={`text-xs ${
                          transcriptionResult.status === 'completed' ? 'text-green-600' :
                          transcriptionResult.status === 'processing' ? 'text-blue-600' :
                          transcriptionResult.status === 'failed' ? 'text-red-600' : ''
                        }`}
                      >
                        {transcriptionResult.status}
                      </Badge>
                    </div>
                    {transcriptionResult.status === 'completed' && transcriptionResult.text && (
                      <div className='bg-background-secondary p-3 rounded-lg text-sm max-h-32 overflow-y-auto'>
                        <p className='text-text-primary'>{transcriptionResult.text}</p>
                      </div>
                    )}
                    {transcriptionResult.status === 'failed' && (
                      <p className='text-red-500 text-sm'>{transcriptionResult.error}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* File Upload Section */}
      {enableFileUpload && (
        <Card className='bg-background-secondary border-border-primary'>
          <CardHeader>
            <CardTitle className='flex items-center gap-3'>
              <Upload className='w-5 h-5 text-tomb45-green' />
              Upload Audio File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadArea
              onFileSelect={handleFileUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {showSettings && (
        <Card className='bg-background-secondary border-border-primary'>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              <span className='flex items-center gap-2'>
                <Settings className='w-5 h-5 text-tomb45-green' />
                Advanced Settings
              </span>
              <Button
                onClick={() => setShowSettings(false)}
                variant='ghost'
                size='sm'
              >
                <ChevronUp className='w-4 h-4' />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-text-primary'>Recording Title</label>
                <input
                  type='text'
                  value={recordingMetadata.title || ''}
                  onChange={e => setRecordingMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder='Enter a title for this recording...'
                  className='w-full px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-text-primary'>Description</label>
                <textarea
                  value={recordingMetadata.description || ''}
                  onChange={e => setRecordingMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder='Add a description...'
                  rows={2}
                  className='w-full px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green resize-none'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-text-primary'>Custom Tags</label>
              <input
                type='text'
                placeholder='Add custom tags (comma-separated)...'
                onChange={e => {
                  const customTags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                  const systemTags = recordingMetadata.tags.filter(tag => tag.includes(':'));
                  setRecordingMetadata(prev => ({ ...prev, tags: [...systemTags, ...customTags] }));
                }}
                className='w-full px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <div className='bg-background-accent rounded-lg p-4'>
        <h4 className='font-medium text-text-primary mb-2'>Tips for Better Recordings</h4>
        <div className='text-sm text-text-secondary space-y-1'>
          <p>• Ensure a quiet environment for optimal audio quality</p>
          <p>• Speak clearly and maintain consistent distance from microphone</p>
          <p>• Use "Standard" quality for voice recordings to balance quality and file size</p>
          <p>• Enable auto-transcription for searchable text content</p>
          {sessionInfo && (
            <p>• Recordings are automatically tagged with session information</p>
          )}
          {autoSave && (
            <p>• Recordings are automatically saved and uploaded to the cloud</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Export enhanced VoiceRecorder and related types
 */
export default VoiceRecorder;
export type {
  VoiceRecorderProps,
  RecordingMetadata,
  UploadProgress,
  TranscriptionResult,
};
export { AudioLevelVisualizer, FileUploadArea };