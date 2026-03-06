import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AudioTimestampView } from './AudioTimestampView';

export interface AudioTimestampOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audioTimestamp: {
      /**
       * Insert an audio timestamp link
       */
      insertAudioTimestamp: (options: {
        timestamp: number;
        label?: string;
        sessionId?: string;
        recordingId?: string;
      }) => ReturnType;
    };
  }
}

/**
 * Custom Tiptap extension for audio timestamp links
 * Allows users to insert clickable timestamps that link to specific audio moments
 */
export const AudioTimestamp = Node.create<AudioTimestampOptions>({
  name: 'audioTimestamp',

  group: 'inline',

  inline: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      timestamp: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-timestamp') || '0'),
        renderHTML: attributes => ({
          'data-timestamp': attributes.timestamp,
        }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label') || '',
        renderHTML: attributes => ({
          'data-label': attributes.label,
        }),
      },
      sessionId: {
        default: '',
        parseHTML: element => element.getAttribute('data-session-id') || '',
        renderHTML: attributes => ({
          'data-session-id': attributes.sessionId,
        }),
      },
      recordingId: {
        default: '',
        parseHTML: element => element.getAttribute('data-recording-id') || '',
        renderHTML: attributes => ({
          'data-recording-id': attributes.recordingId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'audio-timestamp',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio-timestamp', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioTimestampView);
  },

  addCommands() {
    return {
      insertAudioTimestamp:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      // Match @timestamp format (e.g., @1:23 or @01:23:45)
      nodeInputRule({
        find: /@(\d{1,2}):(\d{2})(?::(\d{2}))?/g,
        type: this.type,
        getAttributes: match => {
          const [, hours, minutes, seconds = '0'] = match;
          const timestamp =
            parseInt(hours, 10) * 3600 +
            parseInt(minutes, 10) * 60 +
            parseInt(seconds, 10);

          return {
            timestamp,
            label: match[0],
          };
        },
      }),
    ];
  },
});

/**
 * Utility function to format timestamp as human-readable time
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Utility function to parse time string to seconds
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':').map(Number);

  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}