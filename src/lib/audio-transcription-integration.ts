'use client'

// Audio Transcription Integration
// Connects the AudioRecorder with WhisperTranscriptionService
// Provides high-level API for workshop audio transcription

import { AudioRecorder, AudioChunk, AudioRecording } from './audio-recording'
import { WhisperTranscriptionService, TranscriptionResult, BatchTranscriptionJob, WORKSHOP_SPEAKERS } from './whisper-service'
import { saveNote } from './note-capture'
import { loadUserProgress, saveUserProgress } from './workbook-auth'

// ==================== TYPES ====================

export interface TranscriptionSession {
  id: string
  userId: string
  recordingId: string
  sessionInfo: {
    day: 1 | 2
    session: string
    speaker?: string
  }
  status: 'recording' | 'processing' | 'completed' | 'failed'
  transcriptionJob?: BatchTranscriptionJob
  finalTranscript?: string
  startTime: Date
  completionTime?: Date
  cost: number
  chunks: TranscriptionResult[]
}

export interface RealTimeTranscriptionState {
  isActive: boolean
  currentChunk?: AudioChunk
  lastTranscription?: TranscriptionResult
  sessionInfo?: {
    day: 1 | 2
    session: string
    speaker?: string
  }
}

// ==================== AUDIO TRANSCRIPTION MANAGER ====================

export class AudioTranscriptionManager {
  private audioRecorder: AudioRecorder
  private whisperService: WhisperTranscriptionService
  private activeSessions: Map<string, TranscriptionSession>
  private realTimeState: RealTimeTranscriptionState
  private eventListeners: Map<string, Function[]>

  constructor() {
    this.audioRecorder = new AudioRecorder({
      quality: 'standard', // Optimized for speech
      chunkDuration: 30, // 30-second chunks for Whisper
      enableVoiceActivityDetection: true,
      enableNoiseSupression: true,
      enableEchoCancellation: true
    })

    this.whisperService = new WhisperTranscriptionService({
      maxChunkSizeSeconds: 30,
      enableSpeakerDetection: true,
      temperature: 0.2, // Lower temperature for more consistent transcription
      language: 'en'
    })

    this.activeSessions = new Map()
    this.realTimeState = { isActive: false }
    this.eventListeners = new Map()

    this.setupEventHandlers()
  }

  // ==================== EVENT SYSTEM ====================

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

  // ==================== SESSION MANAGEMENT ====================

  async startTranscriptionSession(
    userId: string,
    sessionInfo: { day: 1 | 2; session: string; speaker?: string }
  ): Promise<string> {
    try {
      // Initialize audio recorder if needed
      await this.audioRecorder.initialize()

      // Start recording
      const recordingId = await this.audioRecorder.startRecording(sessionInfo)

      // Create transcription session
      const sessionId = this.generateSessionId()
      const session: TranscriptionSession = {
        id: sessionId,
        userId,
        recordingId,
        sessionInfo,
        status: 'recording',
        startTime: new Date(),
        cost: 0,
        chunks: []
      }

      this.activeSessions.set(sessionId, session)

      this.emit('sessionStarted', { sessionId, sessionInfo })

      return sessionId

    } catch (error) {
      console.error('Failed to start transcription session:', error)
      throw error
    }
  }

  async stopTranscriptionSession(sessionId: string): Promise<TranscriptionSession> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Transcription session ${sessionId} not found`)
    }

    try {
      session.status = 'processing'

      // Stop recording
      const recording = await this.audioRecorder.stopRecording()
      if (!recording) {
        throw new Error('Failed to stop recording')
      }

      // Save recording
      await this.audioRecorder.saveRecording(session.userId, recording, false)

      // Start transcription
      const transcriptionJob = await this.whisperService.transcribeBatch(
        recording.chunks,
        session.sessionInfo
      )

      session.transcriptionJob = transcriptionJob
      session.cost = transcriptionJob.estimatedCost

      // Process transcription results
      await this.processTranscriptionResults(session, transcriptionJob)

      session.status = 'completed'
      session.completionTime = new Date()

      this.emit('sessionCompleted', session)

      return session

    } catch (error) {
      session.status = 'failed'
      console.error('Failed to process transcription session:', error)
      throw error
    }
  }

  // ==================== REAL-TIME TRANSCRIPTION ====================

  async startRealTimeTranscription(
    sessionInfo: { day: 1 | 2; session: string; speaker?: string }
  ): Promise<void> {
    try {
      this.realTimeState = {
        isActive: true,
        sessionInfo
      }

      await this.audioRecorder.initialize()

      this.emit('realTimeStarted', sessionInfo)

    } catch (error) {
      console.error('Failed to start real-time transcription:', error)
      throw error
    }
  }

  async transcribeChunkRealTime(audioChunk: AudioChunk): Promise<TranscriptionResult> {
    if (!this.realTimeState.isActive) {
      throw new Error('Real-time transcription not active')
    }

    try {
      const result = await this.whisperService.transcribeRealTime(
        audioChunk,
        WORKSHOP_SPEAKERS.slice()
      )

      this.realTimeState.currentChunk = audioChunk
      this.realTimeState.lastTranscription = result

      this.emit('realTimeTranscription', {
        chunk: audioChunk,
        result,
        sessionInfo: this.realTimeState.sessionInfo
      })

      return result

    } catch (error) {
      console.error('Real-time transcription failed:', error)
      throw error
    }
  }

  stopRealTimeTranscription(): void {
    this.realTimeState.isActive = false
    this.emit('realTimeStopped')
  }

  // ==================== TRANSCRIPTION PROCESSING ====================

  private async processTranscriptionResults(
    session: TranscriptionSession,
    job: BatchTranscriptionJob
  ): Promise<void> {
    session.chunks = job.results
    session.finalTranscript = this.whisperService.combineTranscriptions(job.results)

    // Auto-generate note with transcription
    if (session.finalTranscript.trim().length > 0) {
      await this.generateTranscriptionNote(session)
    }

    // Save session data
    await this.saveTranscriptionSession(session)
  }

  private async generateTranscriptionNote(session: TranscriptionSession): Promise<void> {
    const { sessionInfo, finalTranscript, startTime, cost } = session
    const duration = this.calculateSessionDuration(session)

    const noteId = saveNote(session.userId, {
      title: `${sessionInfo.session} - Transcription`,
      content: `# ${sessionInfo.session} Session Transcription\n\n**Date:** ${startTime.toLocaleDateString()}\n**Time:** ${startTime.toLocaleTimeString()}\n**Duration:** ${duration}\n**Speaker:** ${sessionInfo.speaker || 'Multiple'}\n**Transcription Cost:** $${cost.toFixed(3)}\n\n---\n\n${finalTranscript}`,
      category: 'session-note',
      speaker: sessionInfo.speaker as any,
      day: sessionInfo.day,
      session: sessionInfo.session,
      tags: [
        'transcription',
        'audio',
        sessionInfo.session.toLowerCase().replace(/\s+/g, '-'),
        `day-${sessionInfo.day}`
      ],
      isPrivate: false // Transcriptions can be shared by default
    })

    session.transcriptionJob!.id = noteId
  }

  // ==================== DATA MANAGEMENT ====================

  private async saveTranscriptionSession(session: TranscriptionSession): Promise<void> {
    try {
      const sessions = loadUserProgress<TranscriptionSession[]>(
        session.userId,
        'transcription_sessions'
      ) || []

      // Remove the session if it already exists and add the updated version
      const filteredSessions = sessions.filter(s => s.id !== session.id)
      filteredSessions.push({
        ...session,
        // Don't save heavy data in session metadata
        transcriptionJob: session.transcriptionJob ? {
          ...session.transcriptionJob,
          chunks: [] // Save chunks separately if needed
        } : undefined
      })

      saveUserProgress(session.userId, 'transcription_sessions', filteredSessions)

      this.emit('sessionSaved', session)

    } catch (error) {
      console.error('Failed to save transcription session:', error)
      throw error
    }
  }

  getUserSessions(userId: string): TranscriptionSession[] {
    return loadUserProgress<TranscriptionSession[]>(userId, 'transcription_sessions') || []
  }

  getSession(sessionId: string): TranscriptionSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  // ==================== ANALYTICS & MONITORING ====================

  getUsageStats(): {
    sessions: number
    totalMinutes: number
    totalCost: number
    averageAccuracy: number
  } {
    const whisperStats = this.whisperService.getUsageStats()
    const allSessions = Array.from(this.activeSessions.values())

    return {
      sessions: allSessions.length,
      totalMinutes: whisperStats.totalMinutes,
      totalCost: whisperStats.estimatedCost,
      averageAccuracy: whisperStats.averageConfidence
    }
  }

  estimateSessionCost(durationMinutes: number): number {
    return this.whisperService.estimateCost([{
      duration: durationMinutes * 60,
      size: 0,
      blob: new Blob(),
      id: '',
      timestamp: new Date(),
      sequenceNumber: 0,
      mimeType: ''
    }])
  }

  // ==================== UTILITY METHODS ====================

  private setupEventHandlers(): void {
    // Handle audio chunks for real-time transcription
    this.audioRecorder.on('chunkAvailable', async (chunk: AudioChunk) => {
      if (this.realTimeState.isActive) {
        try {
          await this.transcribeChunkRealTime(chunk)
        } catch (error) {
          console.error('Real-time chunk transcription failed:', error)
        }
      }
    })

    // Handle recording errors
    this.audioRecorder.on('stateChanged', (state) => {
      if (state.state === 'error') {
        this.emit('recordingError', state.error)
      }
    })
  }

  private calculateSessionDuration(session: TranscriptionSession): string {
    if (!session.completionTime) {
      return 'In progress...'
    }

    const durationMs = session.completionTime.getTime() - session.startTime.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    // Stop all active sessions
    for (const [sessionId] of this.activeSessions) {
      try {
        this.stopTranscriptionSession(sessionId)
      } catch (error) {
        console.warn(`Failed to stop session ${sessionId}:`, error)
      }
    }

    // Stop real-time transcription
    this.stopRealTimeTranscription()

    // Cleanup audio recorder
    this.audioRecorder.destroy()

    // Clear completed jobs from whisper service
    this.whisperService.clearCompletedJobs()

    // Clear event listeners
    this.eventListeners.clear()
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a transcription manager instance for workshop use
 */
export function createWorkshopTranscriptionManager(): AudioTranscriptionManager {
  return new AudioTranscriptionManager()
}

/**
 * Quick transcription for a single audio file
 */
export async function transcribeAudioFile(
  audioBlob: Blob,
  sessionInfo?: { day: 1 | 2; session: string; speaker?: string }
): Promise<TranscriptionResult> {
  const whisperService = new WhisperTranscriptionService()

  return whisperService.transcribeChunk({
    audioBlob,
    speakerHints: WORKSHOP_SPEAKERS.slice(),
    sessionContext: sessionInfo,
    language: 'en'
  })
}

/**
 * Batch transcribe multiple audio chunks
 */
export async function transcribeAudioChunks(
  chunks: AudioChunk[],
  sessionInfo?: { day: 1 | 2; session: string; speaker?: string }
): Promise<BatchTranscriptionJob> {
  const whisperService = new WhisperTranscriptionService()
  return whisperService.transcribeBatch(chunks, sessionInfo)
}

// ==================== DEFAULT EXPORT ====================

export default AudioTranscriptionManager