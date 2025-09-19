/**
 * Audio Recording Service
 * Single responsibility: Handle audio recording operations only
 */

import {
  IAudioRecordingService,
  AudioRecordingConfig,
  AudioRecording,
  AudioChunk,
  RecordingState,
  ServiceResult,
  ServiceDependencies
} from './interfaces'

export class AudioRecordingService implements IAudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private currentRecording: AudioRecording | null = null
  private recordingState: RecordingState = 'idle'
  private config: AudioRecordingConfig
  private dependencies: ServiceDependencies
  private recordings: Map<string, AudioRecording> = new Map()
  private chunks: AudioChunk[] = []

  constructor(
    config: Partial<AudioRecordingConfig> = {},
    dependencies: ServiceDependencies = {}
  ) {
    this.config = {
      quality: 'standard',
      chunkDuration: 30,
      maxRecordingDuration: 3600,
      enableVoiceActivityDetection: false,
      enableNoiseSupression: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true,
      retryAttempts: 3,
      timeout: 5000,
      enableLogging: true,
      ...config
    }
    this.dependencies = dependencies
  }

  async startRecording(config?: Partial<AudioRecordingConfig>): Promise<ServiceResult<string>> {
    try {
      if (this.recordingState === 'recording') {
        return { success: false, error: 'Recording already in progress' }
      }

      // Merge config
      const recordingConfig = { ...this.config, ...config }

      // Check browser compatibility
      if (!this.isBrowserSupported()) {
        return { success: false, error: 'Browser does not support audio recording', code: 'UNSUPPORTED_BROWSER' }
      }

      // Request microphone permission
      const stream = await this.requestMicrophoneAccess(recordingConfig)
      if (!stream) {
        return { success: false, error: 'Microphone access denied', code: 'PERMISSION_DENIED' }
      }

      this.stream = stream
      this.recordingState = 'recording'

      // Initialize recording
      const recordingId = this.generateId()
      this.currentRecording = {
        id: recordingId,
        chunks: [],
        totalDuration: 0,
        totalSize: 0,
        startTime: new Date(),
        metadata: {
          quality: recordingConfig.quality,
          sampleRate: this.getSampleRate(stream),
          channels: this.getChannelCount(stream),
          mimeType: this.getBestMimeType()
        }
      }

      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.currentRecording.metadata.mimeType
      })

      this.setupMediaRecorderEvents()
      this.mediaRecorder.start(recordingConfig.chunkDuration * 1000)

      // Setup max duration timeout
      setTimeout(() => {
        if (this.recordingState === 'recording') {
          this.stopRecording()
        }
      }, recordingConfig.maxRecordingDuration * 1000)

      this.log('Recording started', 'info')
      return { success: true, data: recordingId }

    } catch (error) {
      this.recordingState = 'error'
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      this.log(`Recording start failed: ${message}`, 'error')
      return { success: false, error: message, code: 'START_FAILED' }
    }
  }

  async stopRecording(): Promise<ServiceResult<AudioRecording>> {
    try {
      if (this.recordingState !== 'recording' && this.recordingState !== 'paused') {
        return { success: false, error: 'No active recording to stop' }
      }

      this.recordingState = 'processing'

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }

      // Wait for final processing
      await this.waitForProcessingComplete()

      if (!this.currentRecording) {
        return { success: false, error: 'Recording data lost during processing' }
      }

      this.currentRecording.endTime = new Date()
      this.currentRecording.totalDuration = this.calculateTotalDuration()
      this.currentRecording.totalSize = this.calculateTotalSize()

      // Store recording
      this.recordings.set(this.currentRecording.id, this.currentRecording)
      const result = { ...this.currentRecording }

      // Cleanup
      this.currentRecording = null
      this.chunks = []
      this.recordingState = 'idle'

      this.log('Recording stopped successfully', 'info')
      return { success: true, data: result }

    } catch (error) {
      this.recordingState = 'error'
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      this.log(`Recording stop failed: ${message}`, 'error')
      return { success: false, error: message, code: 'STOP_FAILED' }
    }
  }

  async pauseRecording(): Promise<ServiceResult<void>> {
    try {
      if (this.recordingState !== 'recording') {
        return { success: false, error: 'No active recording to pause' }
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause()
        this.recordingState = 'paused'
        this.log('Recording paused', 'info')
        return { success: true, data: undefined }
      }

      return { success: false, error: 'Unable to pause recording' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      this.log(`Recording pause failed: ${message}`, 'error')
      return { success: false, error: message }
    }
  }

  async resumeRecording(): Promise<ServiceResult<void>> {
    try {
      if (this.recordingState !== 'paused') {
        return { success: false, error: 'No paused recording to resume' }
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume()
        this.recordingState = 'recording'
        this.log('Recording resumed', 'info')
        return { success: true, data: undefined }
      }

      return { success: false, error: 'Unable to resume recording' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      this.log(`Recording resume failed: ${message}`, 'error')
      return { success: false, error: message }
    }
  }

  getRecordingState(): RecordingState {
    return this.recordingState
  }

  async getRecording(id: string): Promise<ServiceResult<AudioRecording>> {
    const recording = this.recordings.get(id)
    if (!recording) {
      return { success: false, error: 'Recording not found', code: 'NOT_FOUND' }
    }
    return { success: true, data: recording }
  }

  async deleteRecording(id: string): Promise<ServiceResult<void>> {
    if (!this.recordings.has(id)) {
      return { success: false, error: 'Recording not found', code: 'NOT_FOUND' }
    }

    this.recordings.delete(id)
    this.log(`Recording deleted: ${id}`, 'info')
    return { success: true, data: undefined }
  }

  async exportRecording(id: string, format: 'wav' | 'mp3' | 'webm'): Promise<ServiceResult<Blob>> {
    const recordingResult = await this.getRecording(id)
    if (!recordingResult.success) {
      return recordingResult
    }

    try {
      const recording = recordingResult.data
      const combinedBlob = this.combineChunks(recording.chunks)

      // For now, return the original blob. In a full implementation,
      // you would convert between formats here using libraries like FFmpeg.js
      if (format === 'webm' || recording.metadata.mimeType.includes(format)) {
        return { success: true, data: combinedBlob }
      }

      // Placeholder for format conversion
      return {
        success: false,
        error: `Format conversion to ${format} not implemented`,
        code: 'FORMAT_NOT_SUPPORTED'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      return { success: false, error: message, code: 'EXPORT_FAILED' }
    }
  }

  // ==================== PRIVATE METHODS ====================

  private isBrowserSupported(): boolean {
    return !!(typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && window.MediaRecorder)
  }

  private async requestMicrophoneAccess(config: AudioRecordingConfig): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: config.enableEchoCancellation,
          noiseSuppression: config.enableNoiseSupression,
          autoGainControl: config.enableAutoGainControl,
          sampleRate: this.getSampleRateForQuality(config.quality)
        }
      }

      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      this.log(`Microphone access failed: ${error}`, 'error')
      return null
    }
  }

  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder || !this.currentRecording) return

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const chunk: AudioChunk = {
          id: this.generateId(),
          blob: event.data,
          timestamp: new Date(),
          duration: this.config.chunkDuration,
          sequenceNumber: this.chunks.length,
          size: event.data.size,
          mimeType: event.data.type
        }

        this.chunks.push(chunk)
        if (this.currentRecording) {
          this.currentRecording.chunks.push(chunk)
        }
      }
    }

    this.mediaRecorder.onerror = (event) => {
      this.recordingState = 'error'
      this.log(`MediaRecorder error: ${event}`, 'error')
    }
  }

  private async waitForProcessingComplete(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve()
        return
      }

      const checkState = () => {
        if (this.mediaRecorder?.state === 'inactive') {
          resolve()
        } else {
          setTimeout(checkState, 100)
        }
      }
      checkState()
    })
  }

  private calculateTotalDuration(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.duration, 0)
  }

  private calculateTotalSize(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.size, 0)
  }

  private combineChunks(chunks: AudioChunk[]): Blob {
    const blobs = chunks.map(chunk => chunk.blob)
    return new Blob(blobs, { type: chunks[0]?.mimeType || 'audio/webm' })
  }

  private getSampleRate(stream: MediaStream): number {
    const track = stream.getAudioTracks()[0]
    const settings = track.getSettings()
    return settings.sampleRate || 44100
  }

  private getChannelCount(stream: MediaStream): number {
    const track = stream.getAudioTracks()[0]
    const settings = track.getSettings()
    return settings.channelCount || 1
  }

  private getBestMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return 'audio/webm'
  }

  private getSampleRateForQuality(quality: string): number {
    switch (quality) {
      case 'high': return 48000
      case 'standard': return 44100
      case 'background': return 22050
      default: return 44100
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.config.enableLogging && this.dependencies.logger) {
      this.dependencies.logger(`[AudioRecordingService] ${message}`, level)
    }
  }
}