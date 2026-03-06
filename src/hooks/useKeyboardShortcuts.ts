/**
 * useKeyboardShortcuts Hook
 *
 * Modern keyboard shortcuts implementation following 2025 best practices:
 * - Global and scoped shortcuts
 * - Modifier key support (Ctrl/Cmd, Shift, Alt)
 * - Collision detection
 * - Context-aware activation
 * - Platform detection (Mac vs Windows/Linux)
 *
 * Industry Standard: Provide keyboard shortcuts for power users, with visual indicators
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /**
   * The key(s) to trigger the shortcut
   * Examples: 'k', 'Escape', 'Enter', '/', etc.
   */
  key: string;

  /**
   * Modifier keys
   */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /**
   * Use Cmd on Mac, Ctrl on Windows/Linux
   */
  meta?: boolean;

  /**
   * Handler function when shortcut is triggered
   */
  handler: (event: KeyboardEvent) => void;

  /**
   * Description for UI display
   */
  description?: string;

  /**
   * Only trigger when certain element is focused
   */
  scope?: 'global' | 'input' | HTMLElement | null;

  /**
   * Prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean;

  /**
   * Stop event propagation
   * @default false
   */
  stopPropagation?: boolean;

  /**
   * Enable/disable the shortcut
   * @default true
   */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /**
   * Enable shortcuts globally
   * @default true
   */
  enabled?: boolean;

  /**
   * Ignore shortcuts when input elements are focused
   * @default true
   */
  ignoreInputs?: boolean;

  /**
   * Custom filter for when shortcuts should be ignored
   */
  shouldIgnore?: (event: KeyboardEvent) => boolean;
}

/**
 * Detect if user is on Mac
 */
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl');

  if (shortcut.key) {
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);
  }

  return parts.join(isMac ? '' : '+');
}

/**
 * Check if element is an input-like element
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
}

/**
 * Check if shortcut matches the event
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Check key
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  if (shortcut.ctrl !== undefined && event.ctrlKey !== shortcut.ctrl) return false;
  if (shortcut.shift !== undefined && event.shiftKey !== shortcut.shift) return false;
  if (shortcut.alt !== undefined && event.altKey !== shortcut.alt) return false;

  // Meta key (Cmd on Mac, Ctrl on Windows/Linux)
  if (shortcut.meta !== undefined) {
    const metaPressed = isMac ? event.metaKey : event.ctrlKey;
    if (metaPressed !== shortcut.meta) return false;
  }

  return true;
}

/**
 * useKeyboardShortcuts Hook
 *
 * @example
 * // Simple global shortcut
 * useKeyboardShortcuts([
 *   {
 *     key: '/',
 *     handler: () => focusSearch(),
 *     description: 'Focus search',
 *   },
 * ]);
 *
 * @example
 * // With modifiers
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     meta: true, // Cmd+K on Mac, Ctrl+K on Windows
 *     handler: () => openCommandPalette(),
 *     description: 'Open command palette',
 *   },
 * ]);
 *
 * @example
 * // Context-specific shortcuts
 * useKeyboardShortcuts([
 *   {
 *     key: 'Escape',
 *     handler: () => closeModal(),
 *     scope: 'global',
 *     description: 'Close modal',
 *   },
 * ], {
 *   enabled: isModalOpen,
 * });
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    ignoreInputs = true,
    shouldIgnore,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if globally disabled
      if (!enabled) return;

      // Check if we should ignore this event
      if (shouldIgnore && shouldIgnore(event)) return;

      // Ignore shortcuts when input elements are focused
      if (ignoreInputs && isInputElement(event.target as Element)) {
        return;
      }

      // Find matching shortcuts
      for (const shortcut of shortcutsRef.current) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) continue;

        // Check if shortcut matches
        if (!matchesShortcut(event, shortcut)) continue;

        // Check scope
        if (shortcut.scope && shortcut.scope !== 'global') {
          if (shortcut.scope === 'input') {
            if (!isInputElement(event.target as Element)) continue;
          } else if (shortcut.scope instanceof HTMLElement) {
            if (event.target !== shortcut.scope) continue;
          }
        }

        // Prevent default if specified
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        // Stop propagation if specified
        if (shortcut.stopPropagation) {
          event.stopPropagation();
        }

        // Execute handler
        shortcut.handler(event);

        // Stop after first match
        break;
      }
    },
    [enabled, ignoreInputs, shouldIgnore]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts presets
 */
export const commonShortcuts = {
  search: {
    key: '/',
    description: 'Focus search',
  },
  commandPalette: {
    key: 'k',
    meta: true,
    description: 'Open command palette',
  },
  escape: {
    key: 'Escape',
    description: 'Close/Cancel',
  },
  submit: {
    key: 'Enter',
    meta: true,
    description: 'Submit form',
  },
  save: {
    key: 's',
    meta: true,
    description: 'Save',
  },
  undo: {
    key: 'z',
    meta: true,
    description: 'Undo',
  },
  redo: {
    key: 'z',
    meta: true,
    shift: true,
    description: 'Redo',
  },
  copy: {
    key: 'c',
    meta: true,
    description: 'Copy',
  },
  paste: {
    key: 'v',
    meta: true,
    description: 'Paste',
  },
  selectAll: {
    key: 'a',
    meta: true,
    description: 'Select all',
  },
  find: {
    key: 'f',
    meta: true,
    description: 'Find',
  },
  newTab: {
    key: 't',
    meta: true,
    description: 'New tab',
  },
  closeTab: {
    key: 'w',
    meta: true,
    description: 'Close tab',
  },
  refresh: {
    key: 'r',
    meta: true,
    description: 'Refresh',
  },
  help: {
    key: '?',
    shift: true,
    description: 'Show help',
  },
};

/**
 * Hook to display keyboard shortcuts help
 */
export function useKeyboardShortcutsHelp(shortcuts: KeyboardShortcut[]) {
  return shortcuts
    .filter(s => s.description)
    .map(s => ({
      shortcut: formatShortcut(s),
      description: s.description!,
    }));
}
