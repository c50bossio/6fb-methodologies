/**
 * Service Container
 * Dependency injection container for all workbook services
 */

import {
  IServiceContainer,
  ServiceDependencies,
  AudioRecordingConfig,
  TranscriptionConfig,
} from './interfaces';

import { AudioRecordingService } from './AudioRecordingService';
import { TranscriptionService } from './TranscriptionService';
import { NotesService } from './NotesService';
import { SessionService } from './SessionService';

interface ServiceContainerConfig {
  audioRecording?: Partial<AudioRecordingConfig>;
  transcription?: Partial<TranscriptionConfig>;
  dependencies?: ServiceDependencies;
  enableLogging?: boolean;
}

export class ServiceContainer implements IServiceContainer {
  public readonly audioRecording: AudioRecordingService;
  public readonly transcription: TranscriptionService;
  public readonly notes: NotesService;
  public readonly session: SessionService;

  private static instance: ServiceContainer | null = null;

  constructor(config: ServiceContainerConfig = {}) {
    const {
      audioRecording: audioConfig = {},
      transcription: transcriptionConfig = {},
      dependencies = {},
      enableLogging = true,
    } = config;

    // Create default logger if not provided
    const logger = dependencies.logger || this.createDefaultLogger();
    const enhancedDependencies: ServiceDependencies = {
      ...dependencies,
      logger,
    };

    // Initialize services with dependency injection
    this.audioRecording = new AudioRecordingService(
      audioConfig,
      enhancedDependencies
    );
    this.transcription = new TranscriptionService(
      transcriptionConfig,
      enhancedDependencies
    );
    this.notes = new NotesService(enhancedDependencies, enableLogging);
    this.session = new SessionService(enhancedDependencies, enableLogging);

    if (enableLogging) {
      logger?.('ServiceContainer initialized', 'info');
    }
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config?: ServiceContainerConfig): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(config);
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    ServiceContainer.instance = null;
  }

  /**
   * Create a new service container with custom configuration
   */
  static create(config: ServiceContainerConfig): ServiceContainer {
    return new ServiceContainer(config);
  }

  // ==================== HIGH-LEVEL ORCHESTRATION METHODS ====================

  /**
   * Complete workflow: Start recording, link to session
   */
  async startRecordingForSession(
    sessionId: string,
    audioConfig?: Partial<AudioRecordingConfig>
  ) {
    const recordingResult =
      await this.audioRecording.startRecording(audioConfig);
    if (!recordingResult.success) {
      return recordingResult;
    }

    const linkResult = await this.session.linkRecording(
      sessionId,
      recordingResult.data
    );
    if (!linkResult.success) {
      // If linking fails, stop the recording to clean up
      await this.audioRecording.stopRecording();
      return linkResult;
    }

    return recordingResult;
  }

  /**
   * Complete workflow: Stop recording, transcribe, create note
   */
  async stopRecordingAndProcess(
    sessionId: string,
    userId: string,
    noteTitle: string,
    transcriptionConfig?: Partial<TranscriptionConfig>
  ) {
    // Stop recording
    const recordingResult = await this.audioRecording.stopRecording();
    if (!recordingResult.success) {
      return recordingResult;
    }

    const recording = recordingResult.data;

    // Start transcription (async)
    const transcriptionPromise = this.transcribeRecording(
      recording.id,
      transcriptionConfig
    );

    // Create note immediately
    const noteResult = await this.notes.createNote({
      userId,
      sessionId,
      title: noteTitle,
      content: 'Recording completed. Transcription in progress...',
      category: 'session-note',
      status: 'draft',
      tags: ['audio-recording'],
      audioRecordingId: recording.id,
      metadata: {},
    });

    if (!noteResult.success) {
      return noteResult;
    }

    // Link note to session
    await this.session.linkNote(sessionId, noteResult.data.id);

    // Wait for transcription and update note
    const transcriptionResult = await transcriptionPromise;
    if (transcriptionResult.success) {
      await this.notes.linkTranscription(
        noteResult.data.id,
        transcriptionResult.data.id
      );
      await this.session.linkTranscription(
        sessionId,
        transcriptionResult.data.id
      );

      // Update note with transcription
      await this.notes.updateNote(noteResult.data.id, {
        content: transcriptionResult.data.text,
        status: 'published',
        tags: [...noteResult.data.tags, 'transcribed'],
      });
    }

    return {
      success: true,
      data: {
        recording: recording,
        note: noteResult.data,
        transcription: transcriptionResult.success
          ? transcriptionResult.data
          : null,
      },
    };
  }

  /**
   * Transcribe an existing recording
   */
  async transcribeRecording(
    recordingId: string,
    config?: Partial<TranscriptionConfig>
  ) {
    const recordingResult = await this.audioRecording.getRecording(recordingId);
    if (!recordingResult.success) {
      return recordingResult;
    }

    // Convert recording chunks to single blob
    const recording = recordingResult.data;
    const combinedBlob = new Blob(
      recording.chunks.map(chunk => chunk.blob),
      { type: recording.metadata.mimeType }
    );

    return await this.transcription.transcribeAudio(combinedBlob, config);
  }

  /**
   * Get comprehensive session data including all linked content
   */
  async getSessionWithContent(sessionId: string) {
    const sessionResult = await this.session.getSession(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.data;

    // Get all linked recordings
    const recordings = await Promise.all(
      session.recordings.map(id => this.audioRecording.getRecording(id))
    );

    // Get all linked transcriptions
    const transcriptions = await Promise.all(
      session.transcriptions.map(id => this.transcription.getTranscription(id))
    );

    // Get all linked notes
    const notes = await Promise.all(
      session.notes.map(id => this.notes.getNote(id))
    );

    return {
      success: true,
      data: {
        session,
        recordings: recordings.filter(r => r.success).map(r => r.data),
        transcriptions: transcriptions.filter(t => t.success).map(t => t.data),
        notes: notes.filter(n => n.success).map(n => n.data),
      },
    };
  }

  /**
   * Search notes with optional session and content filtering
   */
  async searchNotesWithContent(
    userId: string,
    searchTerm?: string,
    sessionId?: string
  ) {
    const searchResult = await this.notes.searchNotes({
      userId,
      sessionId,
      status: 'published',
    });

    if (!searchResult.success) {
      return searchResult;
    }

    let notes = searchResult.data;

    // Filter by search term if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      notes = notes.filter(
        note =>
          note.title.toLowerCase().includes(term) ||
          note.content.toLowerCase().includes(term) ||
          note.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    return { success: true, data: notes };
  }

  /**
   * Get dashboard data for a user
   */
  async getUserDashboard(userId: string) {
    try {
      // Get user sessions
      const sessionsResult = await this.session.getUserSessions(userId);
      if (!sessionsResult.success) {
        return sessionsResult;
      }

      // Get session stats
      const sessionStatsResult = await this.session.getSessionStats(userId);
      if (!sessionStatsResult.success) {
        return sessionStatsResult;
      }

      // Get note stats
      const noteStatsResult = await this.notes.getNoteStats(userId);
      if (!noteStatsResult.success) {
        return noteStatsResult;
      }

      // Get active session
      const activeSession = this.session.getActiveSession();

      return {
        success: true,
        data: {
          sessions: sessionsResult.data,
          sessionStats: sessionStatsResult.data,
          noteStats: noteStatsResult.data,
          activeSession:
            activeSession?.userId === userId ? activeSession : null,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get dashboard data';
      return { success: false, error: message, code: 'DASHBOARD_FAILED' };
    }
  }

  // ==================== HEALTH CHECK METHODS ====================

  /**
   * Check health of all services
   */
  async healthCheck() {
    const health = {
      audioRecording: this.audioRecording.getRecordingState() !== 'error',
      transcription: await this.transcription.getProviderStatus(),
      notes: true, // NotesService is always healthy in memory
      session: true, // SessionService is always healthy in memory
      timestamp: new Date().toISOString(),
    };

    const allHealthy =
      health.audioRecording &&
      (health.transcription.success
        ? Object.values(health.transcription.data || {}).some(status => status)
        : false) &&
      health.notes &&
      health.session;

    return {
      success: allHealthy,
      data: health,
    };
  }

  // ==================== PRIVATE METHODS ====================

  private createDefaultLogger(): ServiceDependencies['logger'] {
    return (message: string, level: 'info' | 'warn' | 'error') => {
      const timestamp = new Date().toISOString();
      const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
          break;
      }
    };
  }
}

// Export singleton access
export const services = ServiceContainer.getInstance();

// Export factory for custom configurations
export const createServiceContainer = (config: ServiceContainerConfig) =>
  ServiceContainer.create(config);
