/**
 * Store Middleware - Custom Zustand middleware for enhanced functionality
 * Provides logging, persistence, synchronization, and development tools
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';

// =============================================================================
// Types
// =============================================================================

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type PersistOptions<T> = {
  name: string;
  version?: number;
  storage?: Storage;
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: (state: T) => void;
  migrate?: (persistedState: any, version: number) => T;
};

// =============================================================================
// Logger Middleware
// =============================================================================

/**
 * Enhanced logger middleware with detailed action tracking
 */
export const logger: Logger = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (...args) => {
    const prevState = get();
    set(...args);
    const nextState = get();

    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed(
        `%c🗃️ ${name || 'store'} %c${new Date().toLocaleTimeString()}`,
        'color: #9CA3AF; font-weight: bold',
        'color: #6B7280; font-weight: normal'
      );

      console.log(
        '%cPrevious State',
        'color: #DC2626; font-weight: bold',
        prevState
      );
      console.log('%cAction', 'color: #2563EB; font-weight: bold', args);
      console.log(
        '%cNext State',
        'color: #059669; font-weight: bold',
        nextState
      );

      // Show diff for complex objects
      if (typeof prevState === 'object' && typeof nextState === 'object') {
        const changes = findChanges(prevState, nextState);
        if (Object.keys(changes).length > 0) {
          console.log(
            '%cChanges',
            'color: #7C2D12; font-weight: bold',
            changes
          );
        }
      }

      console.groupEnd();
    }
  };

  return f(loggedSet, get, store);
};

/**
 * Find differences between two objects
 */
function findChanges(prev: any, next: any, path = ''): Record<string, any> {
  const changes: Record<string, any> = {};

  if (prev === next) return changes;

  if (
    typeof prev !== 'object' ||
    typeof next !== 'object' ||
    prev === null ||
    next === null
  ) {
    changes[path || 'root'] = { from: prev, to: next };
    return changes;
  }

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;

    if (!(key in prev)) {
      changes[currentPath] = { from: undefined, to: next[key] };
    } else if (!(key in next)) {
      changes[currentPath] = { from: prev[key], to: undefined };
    } else if (prev[key] !== next[key]) {
      if (typeof prev[key] === 'object' && typeof next[key] === 'object') {
        const nestedChanges = findChanges(prev[key], next[key], currentPath);
        Object.assign(changes, nestedChanges);
      } else {
        changes[currentPath] = { from: prev[key], to: next[key] };
      }
    }
  }

  return changes;
}

// =============================================================================
// Performance Monitoring Middleware
// =============================================================================

/**
 * Performance monitoring middleware
 */
export const performanceMonitor =
  <T>(f: StateCreator<T, [], [], T>, name?: string) =>
  (set: any, get: any, store: any) => {
    const monitoredSet = (...args: any[]) => {
      const start = performance.now();
      set(...args);
      const end = performance.now();

      if (process.env.NODE_ENV === 'development') {
        const duration = end - start;
        if (duration > 16) {
          // Warn if update takes longer than 16ms (60fps)
          console.warn(
            `⚠️ Slow store update in ${name}: ${duration.toFixed(2)}ms`,
            args
          );
        }
      }
    };

    return f(monitoredSet, get, store);
  };

// =============================================================================
// Optimistic Updates Middleware
// =============================================================================

interface OptimisticState<T> {
  pending: Array<{
    id: string;
    optimisticUpdate: (state: T) => T;
    rollback: (state: T) => T;
    timestamp: number;
  }>;
}

/**
 * Optimistic updates middleware for async operations
 */
export const optimisticUpdates =
  <T extends Record<string, any>>(
    f: StateCreator<T & OptimisticState<T>, [], [], T & OptimisticState<T>>
  ) =>
  (set: any, get: any, store: any) => {
    const enhancedSet = (...args: any[]) => {
      set(...args);
    };

    const enhancedGet = () => {
      const state = get();
      // Apply pending optimistic updates
      return state.pending.reduce(
        (acc, update) => update.optimisticUpdate(acc),
        state
      );
    };

    const originalState = f(enhancedSet, enhancedGet, store);

    return {
      ...originalState,
      pending: [],

      // Add optimistic update
      addOptimisticUpdate: (
        id: string,
        optimisticUpdate: (state: T) => T,
        rollback: (state: T) => T
      ) => {
        set((state: T & OptimisticState<T>) => ({
          ...state,
          pending: [
            ...state.pending,
            {
              id,
              optimisticUpdate,
              rollback,
              timestamp: Date.now(),
            },
          ],
        }));
      },

      // Confirm optimistic update
      confirmOptimisticUpdate: (id: string) => {
        set((state: T & OptimisticState<T>) => ({
          ...state,
          pending: state.pending.filter(p => p.id !== id),
        }));
      },

      // Rollback optimistic update
      rollbackOptimisticUpdate: (id: string) => {
        set((state: T & OptimisticState<T>) => {
          const update = state.pending.find(p => p.id === id);
          if (!update) return state;

          return {
            ...update.rollback(state),
            pending: state.pending.filter(p => p.id !== id),
          };
        });
      },

      // Clear old optimistic updates (older than 30 seconds)
      clearStaleOptimisticUpdates: () => {
        const thirtySecondsAgo = Date.now() - 30000;
        set((state: T & OptimisticState<T>) => ({
          ...state,
          pending: state.pending.filter(p => p.timestamp > thirtySecondsAgo),
        }));
      },
    };
  };

// =============================================================================
// Sync Middleware
// =============================================================================

interface SyncOptions {
  syncKey: string;
  broadcastChannel?: string;
  syncInterval?: number;
}

/**
 * Cross-tab synchronization middleware
 */
export const crossTabSync =
  <T>(options: SyncOptions) =>
  (f: StateCreator<T, [], [], T>) =>
  (set: any, get: any, store: any) => {
    const {
      syncKey,
      broadcastChannel = 'zustand-sync',
      syncInterval = 1000,
    } = options;

    let channel: BroadcastChannel | null = null;
    let syncTimer: NodeJS.Timeout | null = null;

    // Initialize broadcast channel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(broadcastChannel);

      channel.addEventListener('message', event => {
        if (event.data.type === 'STATE_SYNC' && event.data.key === syncKey) {
          set(event.data.state);
        }
      });
    }

    const syncedSet = (...args: any[]) => {
      set(...args);

      // Broadcast changes to other tabs
      if (channel) {
        channel.postMessage({
          type: 'STATE_SYNC',
          key: syncKey,
          state: get(),
          timestamp: Date.now(),
        });
      }
    };

    const originalState = f(syncedSet, get, store);

    // Periodic sync check
    if (typeof window !== 'undefined') {
      syncTimer = setInterval(() => {
        const lastSync = localStorage.getItem(`${syncKey}-last-sync`);
        const localTimestamp = localStorage.getItem(`${syncKey}-timestamp`);

        if (lastSync && localTimestamp) {
          const lastSyncTime = parseInt(lastSync, 10);
          const localTime = parseInt(localTimestamp, 10);

          if (lastSyncTime > localTime) {
            // Another tab has newer state
            try {
              const syncedState = JSON.parse(
                localStorage.getItem(`${syncKey}-state`) || '{}'
              );
              set(syncedState);
            } catch (error) {
              console.warn('Failed to sync state from localStorage:', error);
            }
          }
        }
      }, syncInterval);
    }

    // Cleanup
    store.destroy = () => {
      if (channel) {
        channel.close();
      }
      if (syncTimer) {
        clearInterval(syncTimer);
      }
    };

    return originalState;
  };

// =============================================================================
// Validation Middleware
// =============================================================================

interface ValidationOptions<T> {
  validate?: (state: T) => boolean | string[];
  sanitize?: (state: T) => T;
}

/**
 * State validation middleware
 */
export const validation =
  <T>(options: ValidationOptions<T>) =>
  (f: StateCreator<T, [], [], T>) =>
  (set: any, get: any, store: any) => {
    const { validate, sanitize } = options;

    const validatedSet = (...args: any[]) => {
      // Apply the update
      set(...args);

      const newState = get();

      // Sanitize state if sanitizer is provided
      let sanitizedState = newState;
      if (sanitize) {
        sanitizedState = sanitize(newState);
        if (sanitizedState !== newState) {
          set(sanitizedState);
        }
      }

      // Validate state if validator is provided
      if (validate) {
        const validationResult = validate(sanitizedState);

        if (validationResult !== true) {
          const errors = Array.isArray(validationResult)
            ? validationResult
            : ['Validation failed'];

          if (process.env.NODE_ENV === 'development') {
            console.error('State validation failed:', errors, sanitizedState);
          }

          // In production, you might want to revert to previous state or handle errors differently
          if (process.env.NODE_ENV === 'production') {
            // Could implement error reporting here
          }
        }
      }
    };

    return f(validatedSet, get, store);
  };

// =============================================================================
// Undo/Redo Middleware
// =============================================================================

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Undo/Redo middleware
 */
export const undoRedo =
  <T>(maxHistorySize = 50) =>
  (f: StateCreator<T, [], [], T>) =>
  (set: any, get: any, store: any) => {
    let history: UndoRedoState<T> = {
      past: [],
      present: {} as T,
      future: [],
    };

    const undoRedoSet = (...args: any[]) => {
      const prevState = get();

      // Save current state to history
      history = {
        past: [...history.past, prevState].slice(-maxHistorySize),
        present: prevState,
        future: [], // Clear future when new action is performed
      };

      set(...args);
    };

    const originalState = f(undoRedoSet, get, store);

    return {
      ...originalState,

      // Undo action
      undo: () => {
        if (history.past.length === 0) return;

        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, history.past.length - 1);

        history = {
          past: newPast,
          present: previous,
          future: [get(), ...history.future],
        };

        set(previous);
      },

      // Redo action
      redo: () => {
        if (history.future.length === 0) return;

        const next = history.future[0];
        const newFuture = history.future.slice(1);

        history = {
          past: [...history.past, get()],
          present: next,
          future: newFuture,
        };

        set(next);
      },

      // Check if undo/redo is available
      canUndo: () => history.past.length > 0,
      canRedo: () => history.future.length > 0,

      // Clear history
      clearHistory: () => {
        history = {
          past: [],
          present: get(),
          future: [],
        };
      },

      // Get history info
      getHistoryInfo: () => ({
        pastLength: history.past.length,
        futureLength: history.future.length,
        maxSize: maxHistorySize,
      }),
    };
  };

// =============================================================================
// Computed Values Middleware
// =============================================================================

/**
 * Computed values middleware for derived state
 */
export const computed =
  <T, C>(computedValues: (state: T) => C) =>
  (f: StateCreator<T, [], [], T>) =>
  (set: any, get: any, store: any) => {
    const originalState = f(set, get, store);

    // Create a proxy to add computed values
    return new Proxy(originalState, {
      get(target, prop) {
        if (prop in target) {
          return target[prop as keyof T];
        }

        // Calculate computed values
        const computed = computedValues(target);
        if (prop in computed) {
          return computed[prop as keyof C];
        }

        return undefined;
      },
    });
  };

// =============================================================================
// Export Combined Middleware
// =============================================================================

/**
 * Combine multiple middleware functions
 */
export const combine = <T>(
  ...middlewares: Array<
    (f: StateCreator<T, [], [], T>) => StateCreator<T, [], [], T>
  >
) => {
  return (f: StateCreator<T, [], [], T>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), f);
  };
};

// =============================================================================
// Preset Middleware Combinations
// =============================================================================

/**
 * Development preset with logging and performance monitoring
 */
export const devPreset = <T>(name?: string) => {
  if (process.env.NODE_ENV === 'development') {
    return combine<T>(logger as any, performanceMonitor);
  }
  return (f: StateCreator<T, [], [], T>) => f;
};

/**
 * Production preset with validation and optimistic updates
 */
export const prodPreset = <T>(validationOptions?: ValidationOptions<T>) => {
  return combine<T>(
    ...(validationOptions ? [validation(validationOptions)] : []),
    optimisticUpdates as any
  );
};

/**
 * Full featured preset with all middleware
 */
export const fullPreset = <T>(options: {
  name?: string;
  validation?: ValidationOptions<T>;
  sync?: SyncOptions;
  maxHistory?: number;
}) => {
  const { name, validation: validationOpts, sync, maxHistory } = options;

  return combine<T>(
    ...(process.env.NODE_ENV === 'development'
      ? [logger as any, performanceMonitor]
      : []),
    ...(validationOpts ? [validation(validationOpts)] : []),
    ...(sync ? [crossTabSync(sync)] : []),
    optimisticUpdates as any,
    ...(maxHistory ? [undoRedo(maxHistory)] : [])
  );
};
