/**
 * Service Layer Interfaces
 * Defines contracts for all workbook services following SOLID principles
 */

// ==================== COMMON TYPES ====================

export type ServiceResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
  code?: string
}

export interface ServiceConfig {
  retryAttempts?: number
  timeout?: number
  enableLogging?: boolean
}

// ==================== AUDIO RECORDING SERVICE ====================

export type AudioQuality = 'high' | 'standard' | 'background'
export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'error'

export interface AudioRecordingConfig extends ServiceConfig {
  quality: AudioQuality
  chunkDuration: number // seconds
  maxRecordingDuration: number // seconds
  enableVoiceActivityDetection: boolean
  enableNoiseSupression: boolean
  enableEchoCancellation: boolean
  enableAutoGainControl: boolean
}

export interface AudioChunk {
  id: string
  blob: Blob
  timestamp: Date
  duration: number
  sequenceNumber: number
  size: number
  mimeType: string
}

export interface AudioRecording {
  id: string
  chunks: AudioChunk[]
  totalDuration: number
  totalSize: number
  startTime: Date
  endTime?: Date
  metadata: {
    quality: AudioQuality
    sampleRate: number
    channels: number
    mimeType: string
  }
}

export interface IAudioRecordingService {
  startRecording(config?: Partial<AudioRecordingConfig>): Promise<ServiceResult<string>>
  stopRecording(): Promise<ServiceResult<AudioRecording>>
  pauseRecording(): Promise<ServiceResult<void>>
  resumeRecording(): Promise<ServiceResult<void>>
  getRecordingState(): RecordingState
  getRecording(id: string): Promise<ServiceResult<AudioRecording>>
  deleteRecording(id: string): Promise<ServiceResult<void>>
  exportRecording(id: string, format: 'wav' | 'mp3' | 'webm'): Promise<ServiceResult<Blob>>
}

// ==================== TRANSCRIPTION SERVICE ====================

export type TranscriptionProvider = 'openai' | 'azure' | 'google' | 'local'
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface TranscriptionConfig extends ServiceConfig {
  provider: TranscriptionProvider
  fallbackProviders: TranscriptionProvider[]
  language?: string
  enableSpeakerIdentification?: boolean
  enablePunctuation?: boolean
  enableProfanityFilter?: boolean
}

export interface TranscriptionResult {
  id: string
  text: string
  confidence: number
  segments: TranscriptionSegment[]
  speakerInfo?: SpeakerInfo[]
  processingTime: number
  provider: TranscriptionProvider
  cost?: number
}

export interface TranscriptionSegment {
  text: string
  startTime: number
  endTime: number
  confidence: number
  speaker?: string
}

export interface SpeakerInfo {
  speakerId: string
  speakerName?: string
  segments: number[]
}

export interface ITranscriptionService {
  transcribeAudio(
    audioBlob: Blob,
    config?: Partial<TranscriptionConfig>
  ): Promise<ServiceResult<TranscriptionResult>>

  transcribeRecording(
    recordingId: string,
    config?: Partial<TranscriptionConfig>
  ): Promise<ServiceResult<TranscriptionResult>>

  getTranscription(id: string): Promise<ServiceResult<TranscriptionResult>>
  deleteTranscription(id: string): Promise<ServiceResult<void>>
  getProviderStatus(): Promise<ServiceResult<Record<TranscriptionProvider, boolean>>>
}

// ==================== NOTES SERVICE ====================

export type NoteCategory = 'session-note' | 'insight' | 'action-item' | 'question' | 'reflection'
export type NoteStatus = 'draft' | 'published' | 'archived'

export interface SessionNote {
  id: string
  userId: string
  sessionId: string
  title: string
  content: string
  category: NoteCategory
  status: NoteStatus
  tags: string[]
  createdAt: Date
  updatedAt: Date
  transcriptionId?: string
  audioRecordingId?: string
  metadata: {
    day?: 1 | 2
    speaker?: string
    timeInSession?: number
  }
}

export interface NotesSearchFilter {
  userId?: string
  sessionId?: string
  category?: NoteCategory
  status?: NoteStatus
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  hasTranscription?: boolean
  hasAudio?: boolean
}

export interface INotesService {
  createNote(note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<SessionNote>>
  updateNote(id: string, updates: Partial<SessionNote>): Promise<ServiceResult<SessionNote>>
  deleteNote(id: string): Promise<ServiceResult<void>>
  getNote(id: string): Promise<ServiceResult<SessionNote>>
  searchNotes(filter: NotesSearchFilter): Promise<ServiceResult<SessionNote[]>>
  linkTranscription(noteId: string, transcriptionId: string): Promise<ServiceResult<void>>
  linkAudioRecording(noteId: string, recordingId: string): Promise<ServiceResult<void>>
}

// ==================== SESSION SERVICE ====================

export type SessionType = 'workshop' | 'masterclass' | 'consultation' | 'practice'
export type SessionStatus = 'upcoming' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface WorkshopSession {
  id: string
  userId: string
  type: SessionType
  title: string
  description?: string
  status: SessionStatus
  startTime: Date
  endTime?: Date
  metadata: {
    day: 1 | 2
    speaker?: string
    topic?: string
    objectives?: string[]
  }
  recordings: string[] // AudioRecording IDs
  transcriptions: string[] // TranscriptionResult IDs
  notes: string[] // SessionNote IDs
  progress: {
    completedObjectives: string[]
    currentPhase?: string
    overallProgress: number // 0-100
  }
}

export interface ISessionService {
  createSession(session: Omit<WorkshopSession, 'id' | 'recordings' | 'transcriptions' | 'notes'>): Promise<ServiceResult<WorkshopSession>>
  updateSession(id: string, updates: Partial<WorkshopSession>): Promise<ServiceResult<WorkshopSession>>
  startSession(id: string): Promise<ServiceResult<WorkshopSession>>
  pauseSession(id: string): Promise<ServiceResult<WorkshopSession>>
  endSession(id: string): Promise<ServiceResult<WorkshopSession>>
  getSession(id: string): Promise<ServiceResult<WorkshopSession>>
  getUserSessions(userId: string): Promise<ServiceResult<WorkshopSession[]>>
  linkRecording(sessionId: string, recordingId: string): Promise<ServiceResult<void>>
  linkTranscription(sessionId: string, transcriptionId: string): Promise<ServiceResult<void>>
  linkNote(sessionId: string, noteId: string): Promise<ServiceResult<void>>
  updateProgress(sessionId: string, progress: Partial<WorkshopSession['progress']>): Promise<ServiceResult<void>>
}

// ==================== DEPENDENCY INJECTION ====================

export interface IServiceContainer {
  audioRecording: IAudioRecordingService
  transcription: ITranscriptionService
  notes: INotesService
  session: ISessionService
}

export interface ServiceDependencies {
  logger?: (message: string, level: 'info' | 'warn' | 'error') => void
  storage?: Storage
  apiClient?: (url: string, options: RequestInit) => Promise<Response>
}