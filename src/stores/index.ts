/**
 * Store Index - Centralized exports for all Zustand stores
 * Provides unified access to all application state management
 */

// Store exports
export { useAuthStore } from './authStore';
export { useWorkbookStore } from './workbookStore';
export { useLiveSessionStore } from './liveSessionStore';

// Type exports
export type { User, AuthState } from './authStore';
export type {
  WorkshopModule,
  Lesson,
  WorkbookNote,
  AudioRecording,
  TranscriptionRecord,
  UserProgress,
  WorkbookState,
} from './workbookStore';
export type {
  ChatMessage,
  MediaPermissions,
  ConnectionQuality,
  LiveSessionState,
} from './liveSessionStore';

// Store selectors and utilities
export * from './selectors';
export * from './middleware';

/**
 * Combined store hook for accessing multiple stores
 * Useful for components that need data from multiple stores
 */
export const useAppStores = () => {
  const auth = useAuthStore();
  const workbook = useWorkbookStore();
  const liveSession = useLiveSessionStore();

  return {
    auth,
    workbook,
    liveSession,
  };
};

/**
 * Store initialization utility
 * Call this on app startup to initialize stores with data
 */
export const initializeStores = async () => {
  const { user, token, checkSession } = useAuthStore.getState();
  const { loadModules, loadNotes, loadProgress } = useWorkbookStore.getState();

  // Check if user session is still valid
  if (user && token && checkSession()) {
    try {
      // Load workbook data in parallel
      await Promise.allSettled([
        loadModules(),
        loadNotes(),
        loadProgress(),
      ]);
    } catch (error) {
      console.error('Failed to initialize store data:', error);
    }
  }
};

/**
 * Store cleanup utility
 * Call this on app unmount or user logout
 */
export const cleanupStores = () => {
  const { logout } = useAuthStore.getState();
  const { cleanup: cleanupLiveSession } = useLiveSessionStore.getState();

  // Clean up all stores
  logout();
  cleanupLiveSession();

  // Reset workbook store to initial state
  useWorkbookStore.setState({
    modules: [],
    lessons: {},
    notes: [],
    recordings: [],
    transcriptions: [],
    progress: {},
    currentModuleId: null,
    currentLessonId: null,
    activeNoteId: null,
    searchQuery: '',
    selectedTags: [],
    loadingStates: {},
    errors: {},
  });
};

/**
 * Store persistence configuration
 */
export const storePersistConfig = {
  auth: {
    name: 'workbook-auth',
    version: 1,
    migrate: (persistedState: any, version: number) => {
      // Handle migration between versions
      if (version === 0) {
        // Migrate from version 0 to 1
        return {
          ...persistedState,
          sessionTimeout: 120, // Add new field
        };
      }
      return persistedState;
    },
  },
  workbook: {
    name: 'workbook-data',
    version: 1,
    // Only persist UI preferences, not data
    partialize: (state: any) => ({
      sidebarOpen: state.sidebarOpen,
      viewMode: state.viewMode,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    }),
  },
};

/**
 * Development utilities
 */
export const devUtils = {
  /**
   * Get current state of all stores (development only)
   */
  getAllStoreStates: () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('getAllStoreStates is only available in development');
      return {};
    }

    return {
      auth: useAuthStore.getState(),
      workbook: useWorkbookStore.getState(),
      liveSession: useLiveSessionStore.getState(),
    };
  },

  /**
   * Reset all stores to initial state (development only)
   */
  resetAllStores: () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('resetAllStores is only available in development');
      return;
    }

    // Reset auth store
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivity: Date.now(),
    });

    // Reset workbook store
    useWorkbookStore.setState({
      modules: [],
      lessons: {},
      notes: [],
      recordings: [],
      transcriptions: [],
      progress: {},
      currentModuleId: null,
      currentLessonId: null,
      activeNoteId: null,
      loadingStates: {},
      errors: {},
    });

    // Reset live session store
    useLiveSessionStore.getState().cleanup();
  },

  /**
   * Subscribe to all store changes (development only)
   */
  subscribeToAllStores: (callback: (storeName: string, state: any) => void) => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('subscribeToAllStores is only available in development');
      return () => {};
    }

    const unsubscribeAuth = useAuthStore.subscribe((state) => {
      callback('auth', state);
    });

    const unsubscribeWorkbook = useWorkbookStore.subscribe((state) => {
      callback('workbook', state);
    });

    const unsubscribeLiveSession = useLiveSessionStore.subscribe((state) => {
      callback('liveSession', state);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeWorkbook();
      unsubscribeLiveSession();
    };
  },
};

// Export devUtils only in development
if (process.env.NODE_ENV === 'development') {
  (globalThis as any).__6FB_DEV_UTILS__ = devUtils;
}