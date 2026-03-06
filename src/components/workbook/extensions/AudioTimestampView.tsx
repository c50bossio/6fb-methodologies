import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Play, Clock } from 'lucide-react';
import { formatTimestamp } from './AudioTimestamp';

interface AudioTimestampViewProps {
  node: {
    attrs: {
      timestamp: number;
      label: string;
      sessionId: string;
      recordingId: string;
    };
  };
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
  selected: boolean;
}

/**
 * React component for rendering audio timestamp links in the editor
 */
export const AudioTimestampView: React.FC<AudioTimestampViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { timestamp, label, sessionId, recordingId } = node.attrs;

  const handleTimestampClick = () => {
    // Emit custom event for audio playback
    const event = new CustomEvent('audioTimestampClick', {
      detail: {
        timestamp,
        sessionId,
        recordingId,
      },
    });
    window.dispatchEvent(event);
  };

  const displayLabel = label || formatTimestamp(timestamp);

  return (
    <NodeViewWrapper
      as="span"
      className={`
        inline-flex items-center gap-1 px-2 py-1 mx-1 rounded-md
        bg-tomb45-green/10 text-tomb45-green
        border border-tomb45-green/20
        cursor-pointer transition-all duration-200
        hover:bg-tomb45-green/20 hover:border-tomb45-green/40
        ${selected ? 'ring-2 ring-tomb45-green/40' : ''}
      `}
      onClick={handleTimestampClick}
      data-timestamp={timestamp}
      data-session-id={sessionId}
      data-recording-id={recordingId}
      title={`Jump to ${displayLabel}${sessionId ? ` in session ${sessionId}` : ''}`}
    >
      <Clock className="w-3 h-3" />
      <span className="text-xs font-medium">{displayLabel}</span>
      <Play className="w-3 h-3 opacity-60" />
    </NodeViewWrapper>
  );
};