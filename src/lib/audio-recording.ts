'use client'

import { saveUserProgress, loadUserProgress, type UserSession } from './workbook-auth'
import { saveNote, type SessionNote } from './note-capture'

// Audio Recording Types
export type AudioQuality = 'high' | 'standard' | 'background'
export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'error'
export type BrowserCompatibility = 'full' | 'partial' | 'unsupported'

export interface AudioRecordingConfig {
  quality: AudioQuality
  enableVoiceActivityDetection: boolean
  chunkDuration: number // seconds
  enableNoiseSupression: boolean
  enableEchoCancellation: boolean
  enableAutoGainControl: boolean
  maxRecordingDuration: number // seconds
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
  userId: string
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
    sessionInfo?: {
      day: 1 | 2
      session: string
      speaker?: string
    }
  }
  transcription?: string
  noteId?: string
}

export interface VoiceActivityState {
  isActive: boolean
  level: number
  threshold: number
  lastActivityTime: Date
}

export interface AudioRecorderState {
  state: RecordingState
  recording?: AudioRecording
  currentChunk?: AudioChunk
  voiceActivity: VoiceActivityState
  error?: string
  permissions: {
    granted: boolean
    denied: boolean
  }
}

// Browser Compatibility Detection
export function detectBrowserCompatibility(): BrowserCompatibility {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'unsupported'
  }

  if (!window.MediaRecorder) {
    return 'unsupported'
  }

  // Check for modern codec support
  const opusSupport = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  const aacSupport = MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')

  if (opusSupport || aacSupport) {
    return 'full'
  }

  // Fallback support
  if (MediaRecorder.isTypeSupported('audio/webm') || MediaRecorder.isTypeSupported('audio/ogg')) {
    return 'partial'
  }

  return 'unsupported'
}

// Audio Quality Configurations
export const audioQualityConfigs: Record<AudioQuality, MediaTrackConstraints> = {
  high: {
    sampleRate: 44100,
    channelCount: 2,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleSize: 16
  },
  standard: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleSize: 16
  },
  background: {
    sampleRate: 8000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    sampleSize: 16
  }
}

// Default Configuration
export const defaultRecordingConfig: AudioRecordingConfig = {
  quality: 'standard',
  enableVoiceActivityDetection: true,
  chunkDuration: 30,
  enableNoiseSupression: true,
  enableEchoCancellation: true,
  enableAutoGainControl: true,
  maxRecordingDuration: 3600 // 1 hour
}

// Audio Recorder Class
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private chunks: AudioChunk[] = []
  private chunkSequence = 0
  private recordingId: string | null = null
  private chunkTimer: number | null = null
  private voiceActivityTimer: number | null = null
  private state: AudioRecorderState
  private config: AudioRecordingConfig
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(config: Partial<AudioRecordingConfig> = {}) {
    this.config = { ...defaultRecordingConfig, ...config }
    this.state = {
      state: 'idle',
      voiceActivity: {
        isActive: false,
        level: 0,
        threshold: 0.01,
        lastActivityTime: new Date()
      },
      permissions: {
        granted: false,
        denied: false
      }
    }
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // Initialize Audio Recording
  async initialize(): Promise<void> {
    try {
      // Check browser compatibility
      const compatibility = detectBrowserCompatibility()
      if (compatibility === 'unsupported') {
        throw new Error('Audio recording is not supported in this browser')
      }

      // Request microphone permissions
      await this.requestPermissions()

      this.emit('initialized', { compatibility })
    } catch (error) {
      this.setState('error', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  private async requestPermissions(): Promise<void> {
    try {
      const constraints = audioQualityConfigs[this.config.quality]
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })

      this.state.permissions.granted = true
      this.state.permissions.denied = false

      this.emit('permissionsGranted')
    } catch (error) {
      this.state.permissions.granted = false
      this.state.permissions.denied = true

      this.emit('permissionsDenied', error)
      throw new Error('Microphone access denied')
    }
  }

  // Voice Activity Detection
  private setupVoiceActivityDetection(): void {
    if (!this.stream || !this.config.enableVoiceActivityDetection) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyserNode = this.audioContext.createAnalyser()
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)

      this.analyserNode.fftSize = 256
      this.sourceNode.connect(this.analyserNode)

      this.startVoiceActivityMonitoring()
    } catch (error) {
      console.warn('Voice activity detection setup failed:', error)
    }
  }

  private startVoiceActivityMonitoring(): void {
    if (!this.analyserNode) return

    const bufferLength = this.analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const checkVoiceActivity = () => {
      if (this.state.state !== 'recording') return

      this.analyserNode!.getByteFrequencyData(dataArray)

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      const normalizedLevel = average / 255

      const wasActive = this.state.voiceActivity.isActive
      const isActive = normalizedLevel > this.state.voiceActivity.threshold

      this.state.voiceActivity.level = normalizedLevel
      this.state.voiceActivity.isActive = isActive

      if (isActive) {
        this.state.voiceActivity.lastActivityTime = new Date()
      }

      // Emit voice activity events
      if (wasActive !== isActive) {
        this.emit('voiceActivityChanged', {
          isActive,
          level: normalizedLevel,
          timestamp: new Date()
        })
      }

      this.emit('audioLevel', normalizedLevel)

      this.voiceActivityTimer = window.setTimeout(checkVoiceActivity, 100)
    }

    checkVoiceActivity()
  }

  // Recording Control
  async startRecording(sessionInfo?: { day: 1 | 2; session: string; speaker?: string }): Promise<string> {
    try {
      if (this.state.state !== 'idle') {
        throw new Error('Recording already in progress')
      }

      if (!this.stream) {
        await this.requestPermissions()
      }

      // Generate recording ID
      this.recordingId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.chunks = []
      this.chunkSequence = 0

      // Setup MediaRecorder
      const mimeType = this.getBestMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.handleChunk(event.data, mimeType)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop()
      }

      this.mediaRecorder.onerror = (event) => {
        this.handleRecordingError(event)
      }

      // Start recording with chunked intervals
      this.mediaRecorder.start()
      this.setupChunkTimer()
      this.setupVoiceActivityDetection()

      // Create recording metadata
      const recording: AudioRecording = {
        id: this.recordingId,
        userId: '', // Will be set when saving
        chunks: [],
        totalDuration: 0,
        totalSize: 0,
        startTime: new Date(),
        metadata: {
          quality: this.config.quality,
          sampleRate: audioQualityConfigs[this.config.quality].sampleRate as number,
          channels: audioQualityConfigs[this.config.quality].channelCount as number,
          mimeType,
          sessionInfo
        }
      }

      this.state.recording = recording
      this.setState('recording')

      this.emit('recordingStarted', { recordingId: this.recordingId, sessionInfo })

      return this.recordingId
    } catch (error) {
      this.setState('error', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  pauseRecording(): void {
    if (this.state.state === 'recording' && this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause()
      this.setState('paused')
      this.emit('recordingPaused')
    }
  }

  resumeRecording(): void {
    if (this.state.state === 'paused' && this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume()
      this.setState('recording')
      this.emit('recordingResumed')
    }
  }

  async stopRecording(): Promise<AudioRecording | null> {
    try {
      if (this.state.state !== 'recording' && this.state.state !== 'paused') {
        return null
      }

      this.setState('processing')

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }

      this.cleanup()

      const recording = this.state.recording
      if (recording) {
        recording.chunks = [...this.chunks]
        recording.totalDuration = this.calculateTotalDuration()
        recording.totalSize = this.calculateTotalSize()
        recording.endTime = new Date()

        this.emit('recordingStopped', recording)
        return recording
      }

      return null
    } catch (error) {
      this.setState('error', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    } finally {
      this.setState('idle')
    }
  }

  // Chunk Management
  private setupChunkTimer(): void {
    this.chunkTimer = window.setInterval(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData()
      }
    }, this.config.chunkDuration * 1000)
  }

  private handleChunk(data: Blob, mimeType: string): void {
    const chunk: AudioChunk = {
      id: `chunk_${this.chunkSequence}_${Date.now()}`,
      blob: data,
      timestamp: new Date(),
      duration: this.config.chunkDuration,
      sequenceNumber: this.chunkSequence++,
      size: data.size,
      mimeType
    }

    this.chunks.push(chunk)
    this.state.currentChunk = chunk

    this.emit('chunkAvailable', chunk)

    // Auto-save chunk for reliability
    this.saveChunkToStorage(chunk)
  }

  // Storage Management
  private async saveChunkToStorage(chunk: AudioChunk): Promise<void> {
    try {
      if (!this.recordingId) return

      const chunkData = {
        id: chunk.id,
        timestamp: chunk.timestamp.toISOString(),
        duration: chunk.duration,
        sequenceNumber: chunk.sequenceNumber,
        size: chunk.size,
        mimeType: chunk.mimeType,
        // Convert blob to base64 for storage
        data: await this.blobToBase64(chunk.blob)
      }

      // Save to localStorage with a unique key
      const storageKey = `audio_chunk_${this.recordingId}_${chunk.sequenceNumber}`
      localStorage.setItem(storageKey, JSON.stringify(chunkData))
    } catch (error) {
      console.warn('Failed to save audio chunk to storage:', error)
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(base64)
    return response.blob()
  }

  // Recording Management
  async saveRecording(userId: string, recording: AudioRecording, autoGenerateNote = true): Promise<void> {
    try {
      recording.userId = userId

      // Save recording metadata
      const recordings = loadUserProgress<AudioRecording[]>(userId, 'audio_recordings') || []
      recordings.push({
        ...recording,
        chunks: [] // Don't duplicate chunk data in metadata
      })
      saveUserProgress(userId, 'audio_recordings', recordings)

      // Auto-generate note if requested
      if (autoGenerateNote && recording.metadata.sessionInfo) {
        const noteId = await this.generateNoteFromRecording(userId, recording)
        recording.noteId = noteId
      }

      this.emit('recordingSaved', { recording, userId })
    } catch (error) {
      console.error('Failed to save recording:', error)
      throw error
    }
  }

  private async generateNoteFromRecording(userId: string, recording: AudioRecording): Promise<string> {
    const sessionInfo = recording.metadata.sessionInfo!
    const duration = Math.round(recording.totalDuration / 60) // minutes

    const noteId = saveNote(userId, {
      title: `Audio Recording - ${sessionInfo.session}`,
      content: `Audio recording from ${sessionInfo.session} session (${duration} minutes).\n\nRecorded on ${recording.startTime.toLocaleDateString()} at ${recording.startTime.toLocaleTimeString()}.`,
      category: 'session-note',
      speaker: sessionInfo.speaker as 'Dre' | 'Nate' | 'Bossio' | 'Attendee' | undefined,
      day: sessionInfo.day,
      session: sessionInfo.session,
      tags: ['audio', 'recording', sessionInfo.session.toLowerCase().replace(/\s+/g, '-')],
      isPrivate: true
    })

    return noteId
  }

  async loadRecording(userId: string, recordingId: string): Promise<AudioRecording | null> {
    try {
      const recordings = loadUserProgress<AudioRecording[]>(userId, 'audio_recordings') || []
      const recording = recordings.find(r => r.id === recordingId)

      if (!recording) return null

      // Load chunks from storage
      const chunks: AudioChunk[] = []
      let sequenceNumber = 0

      while (true) {
        const storageKey = `audio_chunk_${recordingId}_${sequenceNumber}`
        const chunkData = localStorage.getItem(storageKey)

        if (!chunkData) break

        try {
          const parsed = JSON.parse(chunkData)
          const blob = await this.base64ToBlob(parsed.data, parsed.mimeType)

          chunks.push({
            id: parsed.id,
            blob,
            timestamp: new Date(parsed.timestamp),
            duration: parsed.duration,
            sequenceNumber: parsed.sequenceNumber,
            size: parsed.size,
            mimeType: parsed.mimeType
          })

          sequenceNumber++
        } catch (error) {
          console.warn(`Failed to load chunk ${sequenceNumber}:`, error)
          break
        }
      }

      recording.chunks = chunks
      return recording
    } catch (error) {
      console.error('Failed to load recording:', error)
      return null
    }
  }

  getUserRecordings(userId: string): AudioRecording[] {
    return loadUserProgress<AudioRecording[]>(userId, 'audio_recordings') || []
  }

  async deleteRecording(userId: string, recordingId: string): Promise<void> {
    try {
      // Remove from user recordings
      const recordings = loadUserProgress<AudioRecording[]>(userId, 'audio_recordings') || []
      const filteredRecordings = recordings.filter(r => r.id !== recordingId)
      saveUserProgress(userId, 'audio_recordings', filteredRecordings)

      // Clean up chunk storage
      let sequenceNumber = 0
      while (true) {
        const storageKey = `audio_chunk_${recordingId}_${sequenceNumber}`
        if (localStorage.getItem(storageKey)) {
          localStorage.removeItem(storageKey)
          sequenceNumber++
        } else {
          break
        }
      }

      this.emit('recordingDeleted', { recordingId, userId })
    } catch (error) {
      console.error('Failed to delete recording:', error)
      throw error
    }
  }

  // Audio Processing
  async combineChunks(recording: AudioRecording): Promise<Blob> {
    if (recording.chunks.length === 0) {
      throw new Error('No audio chunks to combine')
    }

    // Simple blob concatenation for same mime type
    const blobs = recording.chunks
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map(chunk => chunk.blob)

    return new Blob(blobs, { type: recording.metadata.mimeType })
  }

  async exportRecording(userId: string, recordingId: string, format: 'blob' | 'base64' | 'url' = 'blob'): Promise<string | Blob> {
    const recording = await this.loadRecording(userId, recordingId)
    if (!recording) {
      throw new Error('Recording not found')
    }

    const combinedBlob = await this.combineChunks(recording)

    switch (format) {
      case 'blob':
        return combinedBlob
      case 'base64':
        return this.blobToBase64(combinedBlob)
      case 'url':
        return URL.createObjectURL(combinedBlob)
      default:
        return combinedBlob
    }
  }

  // Utility Methods
  private getBestMimeType(): string {
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ]

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm' // Fallback
  }

  private calculateTotalDuration(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.duration, 0)
  }

  private calculateTotalSize(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.size, 0)
  }

  private setState(newState: RecordingState, additionalData?: Partial<AudioRecorderState>): void {
    this.state.state = newState
    if (additionalData) {
      Object.assign(this.state, additionalData)
    }
    this.emit('stateChanged', this.state)
  }

  private handleRecordingStop(): void {
    this.cleanup()
  }

  private handleRecordingError(event: Event): void {
    console.error('MediaRecorder error:', event)
    this.setState('error', { error: 'Recording error occurred' })
    this.cleanup()
  }

  private cleanup(): void {
    if (this.chunkTimer) {
      window.clearInterval(this.chunkTimer)
      this.chunkTimer = null
    }

    if (this.voiceActivityTimer) {
      window.clearTimeout(this.voiceActivityTimer)
      this.voiceActivityTimer = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyserNode = null
    this.sourceNode = null
  }

  // Public API
  getState(): AudioRecorderState {
    return { ...this.state }
  }

  getConfig(): AudioRecordingConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<AudioRecordingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', this.config)
  }

  // Cleanup
  destroy(): void {
    if (this.state.state === 'recording' || this.state.state === 'paused') {
      this.stopRecording()
    }

    this.cleanup()

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    this.eventListeners.clear()
  }
}

// Utility Functions
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function getAudioLevelColor(level: number): string {
  if (level < 0.1) return '#6B7280' // Gray
  if (level < 0.3) return '#10B981' // Green
  if (level < 0.7) return '#F59E0B' // Yellow
  return '#EF4444' // Red
}

// Session Integration Helpers
export function createSessionRecorder(
  userSession: UserSession,
  sessionInfo: { day: 1 | 2; session: string; speaker?: string },
  config?: Partial<AudioRecordingConfig>
): AudioRecorder {
  const recorder = new AudioRecorder(config)

  // Auto-save recordings when stopped
  recorder.on('recordingStopped', async (recording: AudioRecording) => {
    try {
      await recorder.saveRecording(userSession.userId, recording, true)
    } catch (error) {
      console.error('Failed to auto-save recording:', error)
    }
  })

  // Enhanced voice activity detection for workshop sessions
  recorder.on('voiceActivityChanged', ({ isActive, timestamp }: { isActive: boolean; timestamp: number }) => {
    if (sessionInfo.speaker && isActive) {
      // Could trigger auto-note capture based on speaker activity
      console.log(`Voice activity detected for ${sessionInfo.speaker} at ${timestamp}`)
    }
  })

  return recorder
}

// Export the main recorder instance for global use
export const globalAudioRecorder = new AudioRecorder()