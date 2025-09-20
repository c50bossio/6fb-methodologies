/**
 * Store Selectors - Optimized selectors for complex state derivations
 * Provides memoized selectors to prevent unnecessary re-renders
 */

import { useAuthStore, useWorkbookStore, useLiveSessionStore } from './index';

// =============================================================================
// Auth Selectors
// =============================================================================

export const useIsAuthenticated = () =>
  useAuthStore(state => state.isAuthenticated);
export const useCurrentUser = () => useAuthStore(state => state.user);
export const useUserPermissions = () => useAuthStore(state => state.user?.role);
export const useSubscriptionTier = () =>
  useAuthStore(state => state.user?.subscriptionTier);

export const useAuthError = () => useAuthStore(state => state.error);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);

// Derived selectors
export const useCanAccessFeature = (feature: string) =>
  useAuthStore(state => state.hasPermission(feature));

export const useIsSubscriptionActive = () =>
  useAuthStore(state => state.isSubscriptionActive());

export const useSessionTimeRemaining = () =>
  useAuthStore(state => {
    const now = Date.now();
    const sessionTimeoutMs = state.sessionTimeout * 60 * 1000;
    const timeSinceActivity = now - state.lastActivity;
    return Math.max(0, sessionTimeoutMs - timeSinceActivity);
  });

// =============================================================================
// Workbook Selectors
// =============================================================================

export const useModules = () => useWorkbookStore(state => state.modules);
export const useFilteredModules = () =>
  useWorkbookStore(state => state.getFilteredModules());
export const useCurrentModule = () =>
  useWorkbookStore(state => {
    const { modules, currentModuleId } = state;
    return modules.find(m => m.id === currentModuleId) || null;
  });

export const useNotes = () => useWorkbookStore(state => state.notes);
export const useFilteredNotes = () =>
  useWorkbookStore(state => state.getFilteredNotes());
export const useActiveNote = () =>
  useWorkbookStore(state => {
    const { notes, activeNoteId } = state;
    return notes.find(n => n.id === activeNoteId) || null;
  });

export const useRecordings = () => useWorkbookStore(state => state.recordings);
export const useTranscriptions = () =>
  useWorkbookStore(state => state.transcriptions);

export const useProgress = () => useWorkbookStore(state => state.progress);
export const useOverallProgress = () =>
  useWorkbookStore(state => state.getOverallProgress());

export const useModuleProgress = (moduleId: string) =>
  useWorkbookStore(state => state.getModuleProgress(moduleId));

export const useCurrentLessons = () =>
  useWorkbookStore(state => {
    const { lessons, currentModuleId } = state;
    return currentModuleId ? lessons[currentModuleId] || [] : [];
  });

export const useCurrentLesson = () =>
  useWorkbookStore(state => {
    const { lessons, currentModuleId, currentLessonId } = state;
    if (!currentModuleId || !currentLessonId) return null;
    const moduleLessons = lessons[currentModuleId] || [];
    return moduleLessons.find(l => l.id === currentLessonId) || null;
  });

// Derived selectors
export const useCompletedModulesCount = () =>
  useWorkbookStore(state => {
    return Object.values(state.progress).filter(p => p.status === 'completed')
      .length;
  });

export const useInProgressModulesCount = () =>
  useWorkbookStore(state => {
    return Object.values(state.progress).filter(p => p.status === 'in_progress')
      .length;
  });

export const useRecentNotes = (limit: number = 5) =>
  useWorkbookStore(state => {
    return [...state.notes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  });

export const useModulesByDifficulty = (
  difficulty: 'beginner' | 'intermediate' | 'advanced'
) =>
  useWorkbookStore(state => {
    return state.modules.filter(m => m.difficulty === difficulty);
  });

export const useAvailableTags = () =>
  useWorkbookStore(state => state.getAvailableTags());

export const useSearchResults = () =>
  useWorkbookStore(state => {
    const { searchQuery } = state;
    if (!searchQuery.trim()) return { notes: [], transcriptions: [] };

    return {
      notes: state.searchNotes(searchQuery),
      transcriptions: state.searchTranscriptions(searchQuery),
    };
  });

export const useWorkbookStats = () =>
  useWorkbookStore(state => {
    const totalModules = state.modules.length;
    const totalNotes = state.notes.length;
    const totalRecordings = state.recordings.length;
    const totalTranscriptions = state.transcriptions.length;
    const completedModules = Object.values(state.progress).filter(
      p => p.status === 'completed'
    ).length;

    const totalTimeSpent = Object.values(state.progress).reduce(
      (total, p) => total + p.timeSpentMinutes,
      0
    );

    return {
      totalModules,
      totalNotes,
      totalRecordings,
      totalTranscriptions,
      completedModules,
      completionRate:
        totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0,
      totalTimeSpent,
      averageTimePerModule:
        totalModules > 0 ? Math.round(totalTimeSpent / totalModules) : 0,
    };
  });

// =============================================================================
// Live Session Selectors
// =============================================================================

export const useCurrentSession = () =>
  useLiveSessionStore(state => state.currentSession);
export const useSessionParticipants = () =>
  useLiveSessionStore(state => state.participants);
export const useLocalParticipant = () =>
  useLiveSessionStore(state => state.getLocalParticipant());

export const useChatMessages = () =>
  useLiveSessionStore(state => state.chatMessages);
export const useUnreadMessageCount = () =>
  useLiveSessionStore(state => state.unreadMessageCount);

export const useActivePolls = () =>
  useLiveSessionStore(state => state.activePolls);
export const useCurrentPoll = () =>
  useLiveSessionStore(state => {
    const { activePolls, activePollId } = state;
    return activePolls.find(p => p.id === activePollId) || null;
  });

export const useQAQuestions = () =>
  useLiveSessionStore(state => state.qaQuestions);

export const useMediaState = () =>
  useLiveSessionStore(state => state.mediaState);
export const useConnectionState = () =>
  useLiveSessionStore(state => state.connectionState);

export const useSessionPermissions = () =>
  useLiveSessionStore(state => state.permissions);
export const useIsSessionHost = () =>
  useLiveSessionStore(state => state.isHost);
export const useIsSessionModerator = () =>
  useLiveSessionStore(state => state.isModerator);

// Derived selectors
export const useActiveSpeakers = () =>
  useLiveSessionStore(state => state.getActiveSpeakers());

export const useSessionDuration = () =>
  useLiveSessionStore(state => state.getSessionDuration());
export const useFormattedSessionTime = () =>
  useLiveSessionStore(state => state.formatSessionTime());

export const useCanPerformSessionAction = (action: string) =>
  useLiveSessionStore(state => state.canPerformAction(action));

export const useConnectionQuality = () =>
  useLiveSessionStore(state => {
    const quality = state.connectionState.quality;
    if (!quality) return null;

    const getQualityColor = (q: string) => {
      switch (q) {
        case 'excellent':
          return 'green';
        case 'good':
          return 'blue';
        case 'fair':
          return 'yellow';
        case 'poor':
          return 'red';
        default:
          return 'gray';
      }
    };

    return {
      ...quality,
      color: getQualityColor(quality.quality),
      isGood: ['excellent', 'good'].includes(quality.quality),
    };
  });

export const useSessionStats = () =>
  useLiveSessionStore(state => {
    const participants = state.participants;
    const chatMessages = state.chatMessages.filter(m => !m.isDeleted);
    const polls = state.activePolls;
    const questions = state.qaQuestions;

    return {
      participantCount: participants.length,
      messageCount: chatMessages.length,
      pollCount: polls.length,
      questionCount: questions.length,
      activeSpeakers: participants.filter(p => p.mediaState.isSpeaking).length,
      handsRaised: participants.filter(p => p.mediaState.handRaised).length,
      participantsWithVideo: participants.filter(p => p.mediaState.videoEnabled)
        .length,
      participantsWithAudio: participants.filter(
        p => p.mediaState.audioEnabled && !p.mediaState.isMuted
      ).length,
    };
  });

export const useRecentChatMessages = (limit: number = 50) =>
  useLiveSessionStore(state => {
    return state.chatMessages.filter(m => !m.isDeleted).slice(-limit);
  });

export const usePendingQuestions = () =>
  useLiveSessionStore(state => {
    return state.qaQuestions.filter(q => q.status === 'pending');
  });

export const useAnsweredQuestions = () =>
  useLiveSessionStore(state => {
    return state.qaQuestions.filter(q => q.status === 'answered');
  });

// =============================================================================
// Cross-Store Selectors
// =============================================================================

/**
 * Selectors that combine data from multiple stores
 */

export const useUserSessionData = () => {
  const user = useCurrentUser();
  const sessionStats = useWorkbookStats();
  const sessionDuration = useSessionTimeRemaining();

  return {
    user,
    stats: sessionStats,
    sessionTimeRemaining: sessionDuration,
    isSessionExpiringSoon: sessionDuration < 300000, // 5 minutes
  };
};

export const useWorkbookNavigation = () => {
  const modules = useFilteredModules();
  const currentModule = useCurrentModule();
  const currentLesson = useCurrentLesson();
  const progress = useProgress();

  const getNextLesson = () => {
    if (!currentModule || !currentLesson) return null;

    const currentModuleLessons =
      useWorkbookStore.getState().lessons[currentModule.id] || [];
    const currentIndex = currentModuleLessons.findIndex(
      l => l.id === currentLesson.id
    );

    if (currentIndex < currentModuleLessons.length - 1) {
      return currentModuleLessons[currentIndex + 1];
    }

    // Check next module
    const currentModuleIndex = modules.findIndex(
      m => m.id === currentModule.id
    );
    if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1];
      const nextModuleLessons =
        useWorkbookStore.getState().lessons[nextModule.id] || [];
      return nextModuleLessons[0] || null;
    }

    return null;
  };

  const getPreviousLesson = () => {
    if (!currentModule || !currentLesson) return null;

    const currentModuleLessons =
      useWorkbookStore.getState().lessons[currentModule.id] || [];
    const currentIndex = currentModuleLessons.findIndex(
      l => l.id === currentLesson.id
    );

    if (currentIndex > 0) {
      return currentModuleLessons[currentIndex - 1];
    }

    // Check previous module
    const currentModuleIndex = modules.findIndex(
      m => m.id === currentModule.id
    );
    if (currentModuleIndex > 0) {
      const prevModule = modules[currentModuleIndex - 1];
      const prevModuleLessons =
        useWorkbookStore.getState().lessons[prevModule.id] || [];
      return prevModuleLessons[prevModuleLessons.length - 1] || null;
    }

    return null;
  };

  return {
    modules,
    currentModule,
    currentLesson,
    nextLesson: getNextLesson(),
    previousLesson: getPreviousLesson(),
    canGoNext: getNextLesson() !== null,
    canGoPrevious: getPreviousLesson() !== null,
  };
};

export const useLiveSessionWithAuth = () => {
  const user = useCurrentUser();
  const permissions = useUserPermissions();
  const sessionData = useCurrentSession();
  const isHost = useIsSessionHost();
  const isModerator = useIsSessionModerator();

  return {
    user,
    permissions,
    session: sessionData,
    isHost,
    isModerator,
    canManageSession: isHost || isModerator,
    canCreatePolls: isHost || isModerator || permissions === 'premium',
    canRecord: isHost || permissions === 'enterprise',
  };
};
