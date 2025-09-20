/**
 * Session Service
 * Single responsibility: Handle workshop session lifecycle management
 */

import {
  ISessionService,
  WorkshopSession,
  SessionType,
  SessionStatus,
  ServiceResult,
  ServiceDependencies,
} from './interfaces';

export class SessionService implements ISessionService {
  private dependencies: ServiceDependencies;
  private sessions: Map<string, WorkshopSession> = new Map();
  private sessionsByUser: Map<string, string[]> = new Map();
  private activeSession: string | null = null;
  private enableLogging: boolean;

  constructor(
    dependencies: ServiceDependencies = {},
    enableLogging: boolean = true
  ) {
    this.dependencies = dependencies;
    this.enableLogging = enableLogging;
  }

  async createSession(
    session: Omit<
      WorkshopSession,
      'id' | 'recordings' | 'transcriptions' | 'notes'
    >
  ): Promise<ServiceResult<WorkshopSession>> {
    try {
      // Validate session data
      const validation = this.validateSessionData(session);
      if (!validation.success) {
        return validation;
      }

      const newSession: WorkshopSession = {
        ...session,
        id: this.generateId(),
        recordings: [],
        transcriptions: [],
        notes: [],
      };

      // Store session
      this.sessions.set(newSession.id, newSession);

      // Update user index
      this.addToUserIndex(newSession.userId, newSession.id);

      this.log(
        `Session created: ${newSession.id} for user ${newSession.userId}`,
        'info'
      );
      return { success: true, data: newSession };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create session';
      this.log(`Session creation failed: ${message}`, 'error');
      return { success: false, error: message, code: 'CREATE_FAILED' };
    }
  }

  async updateSession(
    id: string,
    updates: Partial<WorkshopSession>
  ): Promise<ServiceResult<WorkshopSession>> {
    try {
      const existingSession = this.sessions.get(id);
      if (!existingSession) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      // Validate updates
      if (updates.id && updates.id !== id) {
        return {
          success: false,
          error: 'Cannot change session ID',
          code: 'INVALID_UPDATE',
        };
      }

      // Prevent direct manipulation of linked arrays
      if (updates.recordings || updates.transcriptions || updates.notes) {
        return {
          success: false,
          error:
            'Use specific link methods to manage recordings, transcriptions, and notes',
          code: 'INVALID_UPDATE',
        };
      }

      // Apply updates
      const updatedSession: WorkshopSession = {
        ...existingSession,
        ...updates,
        id, // Ensure ID doesn't change
      };

      // Re-validate the updated session
      const validation = this.validateSessionData(updatedSession);
      if (!validation.success) {
        return validation;
      }

      // Update user index if userId changed
      if (updates.userId && updates.userId !== existingSession.userId) {
        this.removeFromUserIndex(existingSession.userId, id);
        this.addToUserIndex(updates.userId, id);
      }

      // Store updated session
      this.sessions.set(id, updatedSession);

      this.log(`Session updated: ${id}`, 'info');
      return { success: true, data: updatedSession };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update session';
      this.log(`Session update failed: ${message}`, 'error');
      return { success: false, error: message, code: 'UPDATE_FAILED' };
    }
  }

  async startSession(id: string): Promise<ServiceResult<WorkshopSession>> {
    try {
      const session = this.sessions.get(id);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (session.status === 'active') {
        return {
          success: false,
          error: 'Session is already active',
          code: 'ALREADY_ACTIVE',
        };
      }

      if (session.status === 'completed' || session.status === 'cancelled') {
        return {
          success: false,
          error: 'Cannot start a completed or cancelled session',
          code: 'INVALID_STATE',
        };
      }

      // Check if another session is active
      if (this.activeSession && this.activeSession !== id) {
        const activeSession = this.sessions.get(this.activeSession);
        if (activeSession && activeSession.status === 'active') {
          return {
            success: false,
            error:
              'Another session is currently active. Pause or end it first.',
            code: 'ANOTHER_SESSION_ACTIVE',
          };
        }
      }

      const updatedSession: WorkshopSession = {
        ...session,
        status: 'active',
        startTime: session.startTime || new Date(),
      };

      this.sessions.set(id, updatedSession);
      this.activeSession = id;

      this.log(`Session started: ${id}`, 'info');
      return { success: true, data: updatedSession };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start session';
      this.log(`Session start failed: ${message}`, 'error');
      return { success: false, error: message, code: 'START_FAILED' };
    }
  }

  async pauseSession(id: string): Promise<ServiceResult<WorkshopSession>> {
    try {
      const session = this.sessions.get(id);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (session.status !== 'active') {
        return {
          success: false,
          error: 'Session is not active',
          code: 'NOT_ACTIVE',
        };
      }

      const updatedSession: WorkshopSession = {
        ...session,
        status: 'paused',
      };

      this.sessions.set(id, updatedSession);
      if (this.activeSession === id) {
        this.activeSession = null;
      }

      this.log(`Session paused: ${id}`, 'info');
      return { success: true, data: updatedSession };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to pause session';
      this.log(`Session pause failed: ${message}`, 'error');
      return { success: false, error: message, code: 'PAUSE_FAILED' };
    }
  }

  async endSession(id: string): Promise<ServiceResult<WorkshopSession>> {
    try {
      const session = this.sessions.get(id);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (session.status === 'completed' || session.status === 'cancelled') {
        return {
          success: false,
          error: 'Session is already ended',
          code: 'ALREADY_ENDED',
        };
      }

      const updatedSession: WorkshopSession = {
        ...session,
        status: 'completed',
        endTime: new Date(),
      };

      this.sessions.set(id, updatedSession);
      if (this.activeSession === id) {
        this.activeSession = null;
      }

      this.log(`Session ended: ${id}`, 'info');
      return { success: true, data: updatedSession };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to end session';
      this.log(`Session end failed: ${message}`, 'error');
      return { success: false, error: message, code: 'END_FAILED' };
    }
  }

  async getSession(id: string): Promise<ServiceResult<WorkshopSession>> {
    const session = this.sessions.get(id);
    if (!session) {
      return { success: false, error: 'Session not found', code: 'NOT_FOUND' };
    }
    return { success: true, data: session };
  }

  async getUserSessions(
    userId: string
  ): Promise<ServiceResult<WorkshopSession[]>> {
    try {
      const userSessionIds = this.sessionsByUser.get(userId) || [];
      const sessions = userSessionIds
        .map(id => this.sessions.get(id)!)
        .filter(Boolean)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()); // Newest first

      return { success: true, data: sessions };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get user sessions';
      this.log(`Get user sessions failed: ${message}`, 'error');
      return { success: false, error: message, code: 'GET_SESSIONS_FAILED' };
    }
  }

  async linkRecording(
    sessionId: string,
    recordingId: string
  ): Promise<ServiceResult<void>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (!session.recordings.includes(recordingId)) {
        const updatedSession = {
          ...session,
          recordings: [...session.recordings, recordingId],
        };
        this.sessions.set(sessionId, updatedSession);
        this.log(
          `Recording linked to session: ${sessionId} -> ${recordingId}`,
          'info'
        );
      }

      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to link recording';
      this.log(`Recording linking failed: ${message}`, 'error');
      return { success: false, error: message, code: 'LINK_FAILED' };
    }
  }

  async linkTranscription(
    sessionId: string,
    transcriptionId: string
  ): Promise<ServiceResult<void>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (!session.transcriptions.includes(transcriptionId)) {
        const updatedSession = {
          ...session,
          transcriptions: [...session.transcriptions, transcriptionId],
        };
        this.sessions.set(sessionId, updatedSession);
        this.log(
          `Transcription linked to session: ${sessionId} -> ${transcriptionId}`,
          'info'
        );
      }

      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to link transcription';
      this.log(`Transcription linking failed: ${message}`, 'error');
      return { success: false, error: message, code: 'LINK_FAILED' };
    }
  }

  async linkNote(
    sessionId: string,
    noteId: string
  ): Promise<ServiceResult<void>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      if (!session.notes.includes(noteId)) {
        const updatedSession = {
          ...session,
          notes: [...session.notes, noteId],
        };
        this.sessions.set(sessionId, updatedSession);
        this.log(`Note linked to session: ${sessionId} -> ${noteId}`, 'info');
      }

      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to link note';
      this.log(`Note linking failed: ${message}`, 'error');
      return { success: false, error: message, code: 'LINK_FAILED' };
    }
  }

  async updateProgress(
    sessionId: string,
    progress: Partial<WorkshopSession['progress']>
  ): Promise<ServiceResult<void>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        };
      }

      const updatedSession = {
        ...session,
        progress: {
          ...session.progress,
          ...progress,
        },
      };

      // Validate progress values
      if (
        updatedSession.progress.overallProgress < 0 ||
        updatedSession.progress.overallProgress > 100
      ) {
        return {
          success: false,
          error: 'Progress must be between 0 and 100',
          code: 'INVALID_PROGRESS',
        };
      }

      this.sessions.set(sessionId, updatedSession);
      this.log(`Session progress updated: ${sessionId}`, 'info');
      return { success: true, data: undefined };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update progress';
      this.log(`Progress update failed: ${message}`, 'error');
      return { success: false, error: message, code: 'PROGRESS_UPDATE_FAILED' };
    }
  }

  // ==================== UTILITY METHODS ====================

  getActiveSession(): WorkshopSession | null {
    if (!this.activeSession) return null;
    return this.sessions.get(this.activeSession) || null;
  }

  async getSessionStats(userId?: string): Promise<
    ServiceResult<{
      total: number;
      byType: Record<SessionType, number>;
      byStatus: Record<SessionStatus, number>;
      totalDuration: number;
      averageProgress: number;
    }>
  > {
    try {
      let sessions: WorkshopSession[];

      if (userId) {
        const userSessionsResult = await this.getUserSessions(userId);
        if (!userSessionsResult.success) {
          return userSessionsResult;
        }
        sessions = userSessionsResult.data;
      } else {
        sessions = Array.from(this.sessions.values());
      }

      const stats = {
        total: sessions.length,
        byType: {
          workshop: 0,
          masterclass: 0,
          consultation: 0,
          practice: 0,
        } as Record<SessionType, number>,
        byStatus: {
          upcoming: 0,
          active: 0,
          paused: 0,
          completed: 0,
          cancelled: 0,
        } as Record<SessionStatus, number>,
        totalDuration: 0,
        averageProgress: 0,
      };

      let totalProgress = 0;

      sessions.forEach(session => {
        stats.byType[session.type]++;
        stats.byStatus[session.status]++;
        totalProgress += session.progress.overallProgress;

        if (session.endTime && session.startTime) {
          stats.totalDuration +=
            session.endTime.getTime() - session.startTime.getTime();
        }
      });

      stats.averageProgress =
        sessions.length > 0 ? totalProgress / sessions.length : 0;

      return { success: true, data: stats };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get stats';
      return { success: false, error: message, code: 'STATS_FAILED' };
    }
  }

  // ==================== PRIVATE METHODS ====================

  private validateSessionData(
    session: Partial<WorkshopSession>
  ): ServiceResult<void> {
    if (!session.userId?.trim()) {
      return {
        success: false,
        error: 'User ID is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (!session.title?.trim()) {
      return {
        success: false,
        error: 'Title is required',
        code: 'VALIDATION_FAILED',
      };
    }

    if (session.title && session.title.length > 200) {
      return {
        success: false,
        error: 'Title too long (max 200 characters)',
        code: 'VALIDATION_FAILED',
      };
    }

    const validTypes: SessionType[] = [
      'workshop',
      'masterclass',
      'consultation',
      'practice',
    ];
    if (session.type && !validTypes.includes(session.type)) {
      return {
        success: false,
        error: 'Invalid session type',
        code: 'VALIDATION_FAILED',
      };
    }

    const validStatuses: SessionStatus[] = [
      'upcoming',
      'active',
      'paused',
      'completed',
      'cancelled',
    ];
    if (session.status && !validStatuses.includes(session.status)) {
      return {
        success: false,
        error: 'Invalid session status',
        code: 'VALIDATION_FAILED',
      };
    }

    if (session.metadata?.day && ![1, 2].includes(session.metadata.day)) {
      return {
        success: false,
        error: 'Day must be 1 or 2',
        code: 'VALIDATION_FAILED',
      };
    }

    if (session.progress?.overallProgress !== undefined) {
      if (
        session.progress.overallProgress < 0 ||
        session.progress.overallProgress > 100
      ) {
        return {
          success: false,
          error: 'Progress must be between 0 and 100',
          code: 'VALIDATION_FAILED',
        };
      }
    }

    return { success: true, data: undefined };
  }

  private addToUserIndex(userId: string, sessionId: string): void {
    const userSessions = this.sessionsByUser.get(userId) || [];
    if (!userSessions.includes(sessionId)) {
      userSessions.push(sessionId);
      this.sessionsByUser.set(userId, userSessions);
    }
  }

  private removeFromUserIndex(userId: string, sessionId: string): void {
    const userSessions = this.sessionsByUser.get(userId) || [];
    const index = userSessions.indexOf(sessionId);
    if (index > -1) {
      userSessions.splice(index, 1);
      this.sessionsByUser.set(userId, userSessions);
    }
  }

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.enableLogging && this.dependencies.logger) {
      this.dependencies.logger(`[SessionService] ${message}`, level);
    }
  }
}
