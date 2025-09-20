/**
 * Services Index
 * Centralized export for all workbook services
 */

// ==================== SERVICE INTERFACES ====================
export type {
  // Common types
  ServiceResult,
  ServiceConfig,
  ServiceDependencies,

  // Audio Recording
  IAudioRecordingService,
  AudioRecording,
  AudioChunk,
  AudioRecordingConfig,
  AudioQuality,
  RecordingState,

  // Transcription
  ITranscriptionService,
  TranscriptionResult,
  TranscriptionConfig,
  TranscriptionProvider,
  TranscriptionStatus,
  TranscriptionSegment,
  SpeakerInfo,

  // Notes
  INotesService,
  SessionNote,
  NotesSearchFilter,
  NoteCategory,
  NoteStatus,

  // Session
  ISessionService,
  WorkshopSession,
  SessionType,
  SessionStatus,

  // Container
  IServiceContainer,
} from './interfaces';

// ==================== SERVICE IMPLEMENTATIONS ====================
export { AudioRecordingService } from './AudioRecordingService';
export { TranscriptionService } from './TranscriptionService';
export { NotesService } from './NotesService';
export { SessionService } from './SessionService';

// ==================== SERVICE CONTAINER ====================
export {
  ServiceContainer,
  services,
  createServiceContainer,
} from './ServiceContainer';

// ==================== USAGE EXAMPLES AND UTILITIES ====================

/**
 * Example: Basic audio recording workflow
 *
 * ```typescript
 * import { services } from '@/lib/services'
 *
 * // Start recording
 * const recordingResult = await services.audioRecording.startRecording({
 *   quality: 'high',
 *   enableVoiceActivityDetection: true
 * })
 *
 * if (recordingResult.success) {
 *   console.log('Recording started:', recordingResult.data)
 *
 *   // Stop recording after some time
 *   setTimeout(async () => {
 *     const recording = await services.audioRecording.stopRecording()
 *     if (recording.success) {
 *       console.log('Recording completed:', recording.data)
 *     }
 *   }, 10000)
 * }
 * ```
 */

/**
 * Example: Complete workshop session workflow
 *
 * ```typescript
 * import { services } from '@/lib/services'
 *
 * // Create session
 * const session = await services.session.createSession({
 *   userId: 'user123',
 *   type: 'workshop',
 *   title: '6FB Day 1 - Foundation',
 *   status: 'upcoming',
 *   startTime: new Date(),
 *   metadata: { day: 1, speaker: 'Chris Bossio' },
 *   progress: { completedObjectives: [], overallProgress: 0 }
 * })
 *
 * if (session.success) {
 *   // Start session
 *   await services.session.startSession(session.data.id)
 *
 *   // Start recording for session
 *   await services.startRecordingForSession(session.data.id)
 *
 *   // Later: stop recording and create note
 *   await services.stopRecordingAndProcess(
 *     session.data.id,
 *     'user123',
 *     'Key insights from foundation session'
 *   )
 * }
 * ```
 */

/**
 * Example: Search and filter notes
 *
 * ```typescript
 * import { services } from '@/lib/services'
 *
 * // Search user's notes
 * const notes = await services.searchNotesWithContent(
 *   'user123',
 *   'pricing strategy', // search term
 *   'session456' // optional session filter
 * )
 *
 * if (notes.success) {
 *   console.log('Found notes:', notes.data)
 * }
 *
 * // Get comprehensive session data
 * const sessionData = await services.getSessionWithContent('session456')
 * if (sessionData.success) {
 *   const { session, recordings, transcriptions, notes } = sessionData.data
 *   console.log('Complete session data:', { session, recordings, transcriptions, notes })
 * }
 * ```
 */

/**
 * Example: Custom service configuration
 *
 * ```typescript
 * import { createServiceContainer } from '@/lib/services'
 *
 * const customServices = createServiceContainer({
 *   audioRecording: {
 *     quality: 'high',
 *     enableVoiceActivityDetection: true,
 *     enableNoiseSupression: true
 *   },
 *   transcription: {
 *     provider: 'openai',
 *     fallbackProviders: ['azure'],
 *     enableSpeakerIdentification: true
 *   },
 *   dependencies: {
 *     logger: (message, level) => {
 *       // Custom logging implementation
 *       console.log(`[${level}] ${message}`)
 *     }
 *   },
 *   enableLogging: true
 * })
 * ```
 */

/**
 * Example: Error handling patterns
 *
 * ```typescript
 * import { services, ServiceResult } from '@/lib/services'
 *
 * function handleServiceResult<T>(result: ServiceResult<T>): T | null {
 *   if (result.success) {
 *     return result.data
 *   } else {
 *     console.error(`Service error [${result.code}]: ${result.error}`)
 *     // Handle specific error codes
 *     switch (result.code) {
 *       case 'PERMISSION_DENIED':
 *         // Show permission dialog
 *         break
 *       case 'NOT_FOUND':
 *         // Show not found message
 *         break
 *       default:
 *         // Show generic error
 *         break
 *     }
 *     return null
 *   }
 * }
 *
 * // Usage
 * const recording = handleServiceResult(await services.audioRecording.getRecording('id'))
 * if (recording) {
 *   // Use recording data
 * }
 * ```
 */

/**
 * Utility: Service health monitoring
 *
 * ```typescript
 * import { services } from '@/lib/services'
 *
 * async function monitorServiceHealth() {
 *   const health = await services.healthCheck()
 *
 *   if (!health.success) {
 *     console.warn('Service health issues detected:', health.data)
 *
 *     // Check specific service status
 *     const transcriptionStatus = await services.transcription.getProviderStatus()
 *     if (transcriptionStatus.success) {
 *       const providers = transcriptionStatus.data
 *       Object.entries(providers).forEach(([provider, isHealthy]) => {
 *         if (!isHealthy) {
 *           console.warn(`Transcription provider ${provider} is unavailable`)
 *         }
 *       })
 *     }
 *   }
 * }
 *
 * // Run health check every 5 minutes
 * setInterval(monitorServiceHealth, 5 * 60 * 1000)
 * ```
 */
