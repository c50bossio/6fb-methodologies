/**
 * T022: LiveSession Model - Real-time session management with WebSocket support
 *
 * This module provides comprehensive live session management types with:
 * - Real-time session management with WebSocket support
 * - Participant management and role-based permissions
 * - Interactive features (polls, Q&A, breakout rooms)
 * - Session state management and persistence
 */

import { z } from 'zod';

// =============================================================================
// Base Types and Enums
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 string

export const SessionStatus = {
  SCHEDULED: 'scheduled',
  WAITING: 'waiting',
  LIVE: 'live',
  PAUSED: 'paused',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatusType = typeof SessionStatus[keyof typeof SessionStatus];

export const SessionType = {
  WORKSHOP: 'workshop',
  LECTURE: 'lecture',
  DISCUSSION: 'discussion',
  Q_AND_A: 'q_and_a',
  OFFICE_HOURS: 'office_hours',
  COLLABORATION: 'collaboration',
  PRESENTATION: 'presentation',
  TRAINING: 'training',
} as const;

export type SessionTypeType = typeof SessionType[keyof typeof SessionType];

export const ParticipantRole = {
  HOST: 'host',
  CO_HOST: 'co_host',
  PRESENTER: 'presenter',
  MODERATOR: 'moderator',
  PARTICIPANT: 'participant',
  OBSERVER: 'observer',
} as const;

export type ParticipantRoleType = typeof ParticipantRole[keyof typeof ParticipantRole];

export const ParticipantStatus = {
  INVITED: 'invited',
  JOINED: 'joined',
  LEFT: 'left',
  KICKED: 'kicked',
  BANNED: 'banned',
} as const;

export type ParticipantStatusType = typeof ParticipantStatus[keyof typeof ParticipantStatus];

export const ConnectionStatus = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
} as const;

export type ConnectionStatusType = typeof ConnectionStatus[keyof typeof ConnectionStatus];

export const MediaType = {
  AUDIO: 'audio',
  VIDEO: 'video',
  SCREEN: 'screen',
  AUDIO_VIDEO: 'audio_video',
} as const;

export type MediaTypeType = typeof MediaType[keyof typeof MediaType];

// =============================================================================
// WebSocket and Real-time Communication
// =============================================================================

export interface WebSocketConnection {
  id: UUID;
  sessionId: UUID;
  userId: UUID;
  connectionId: string; // WebSocket connection identifier

  // Connection details
  status: ConnectionStatusType;
  connectedAt: Timestamp;
  lastHeartbeat: Timestamp;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Client information
  clientInfo: {
    userAgent: string;
    platform: string;
    browser: string;
    version: string;
    capabilities: {
      audio: boolean;
      video: boolean;
      screen: boolean;
      webRTC: boolean;
      fullscreen: boolean;
    };
  };

  // Network information
  networkInfo: {
    ipAddress: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    latency?: number; // milliseconds
    bandwidth?: {
      upload: number; // kbps
      download: number; // kbps
    };
  };

  // Quality metrics
  quality: {
    audioQuality: 'excellent' | 'good' | 'fair' | 'poor';
    videoQuality: 'excellent' | 'good' | 'fair' | 'poor';
    packetLoss: number; // percentage
    jitter: number; // milliseconds
    roundTripTime: number; // milliseconds
  };

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  disconnectedAt?: Timestamp;
}

export interface WebSocketMessage {
  id: UUID;
  type: string;
  sessionId: UUID;
  senderId: UUID;
  recipientId?: UUID; // for direct messages
  recipientType?: 'user' | 'role' | 'all' | 'group';

  // Message content
  payload: Record<string, any>;
  encrypted?: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Delivery tracking
  sentAt: Timestamp;
  deliveredTo: UUID[]; // user IDs who received the message
  readBy: UUID[]; // user IDs who read the message
  acknowledged: boolean;

  // Message metadata
  metadata: Record<string, any>;
}

// Message types for different WebSocket events
export interface SessionJoinMessage extends WebSocketMessage {
  type: 'session:join';
  payload: {
    participantId: UUID;
    participantInfo: {
      name: string;
      role: ParticipantRoleType;
      avatar?: string;
    };
  };
}

export interface SessionLeaveMessage extends WebSocketMessage {
  type: 'session:leave';
  payload: {
    participantId: UUID;
    reason?: string;
  };
}

export interface ChatMessage extends WebSocketMessage {
  type: 'chat:message';
  payload: {
    content: string;
    format: 'text' | 'markdown' | 'html';
    isPrivate: boolean;
    parentMessageId?: UUID;
    attachments?: Array<{
      type: 'image' | 'file' | 'link';
      url: string;
      filename?: string;
      size?: number;
    }>;
  };
}

export interface MediaStateMessage extends WebSocketMessage {
  type: 'media:state';
  payload: {
    participantId: UUID;
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    speaking: boolean;
    quality: WebSocketConnection['quality'];
  };
}

export interface PollMessage extends WebSocketMessage {
  type: 'poll:created' | 'poll:updated' | 'poll:closed' | 'poll:vote';
  payload: {
    pollId: UUID;
    poll?: SessionPoll;
    vote?: {
      optionIds: string[];
      textResponse?: string;
    };
  };
}

export interface HandRaiseMessage extends WebSocketMessage {
  type: 'hand:raise' | 'hand:lower';
  payload: {
    participantId: UUID;
    timestamp: Timestamp;
  };
}

export interface BreakoutRoomMessage extends WebSocketMessage {
  type: 'breakout:assign' | 'breakout:join' | 'breakout:leave';
  payload: {
    roomId: UUID;
    participantId: UUID;
    roomName?: string;
  };
}

// =============================================================================
// Session Participants and Roles
// =============================================================================

export interface SessionParticipant {
  id: UUID;
  sessionId: UUID;
  userId: UUID;

  // Participant information
  displayName: string;
  email?: string;
  avatar?: string;
  role: ParticipantRoleType;
  status: ParticipantStatusType;

  // Permissions
  permissions: {
    canSpeak: boolean;
    canVideo: boolean;
    canScreen: boolean;
    canChat: boolean;
    canPoll: boolean;
    canModerate: boolean;
    canRecord: boolean;
    canInvite: boolean;
    canKick: boolean;
    canMute: boolean;
  };

  // Media state
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    isMuted: boolean; // muted by moderator
    isSpeaking: boolean;
    handRaised: boolean;
    lastSpokeAt?: Timestamp;
  };

  // Connection information
  connectionId?: string;
  connectionStatus: ConnectionStatusType;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };

  // Engagement metrics
  engagement: {
    joinedAt?: Timestamp;
    leftAt?: Timestamp;
    totalTimeSpent: number; // minutes
    messagesCount: number;
    reactionsCount: number;
    pollsParticipated: number;
    handRaisedCount: number;
    speakingTime: number; // minutes
  };

  // Breakout room assignment
  breakoutRoomId?: UUID;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  invitedAt: Timestamp;
  joinedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface ParticipantInvitation {
  id: UUID;
  sessionId: UUID;
  inviterId: UUID;

  // Invitee information
  email?: string;
  userId?: UUID;
  role: ParticipantRoleType;
  customMessage?: string;

  // Invitation status
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: Timestamp;

  // Response tracking
  respondedAt?: Timestamp;
  joinedAt?: Timestamp;

  // Invitation details
  invitationToken: string;
  invitationUrl: string;
  requiresRegistration: boolean;

  // Timestamps
  sentAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Interactive Features
// =============================================================================

export interface SessionPoll {
  id: UUID;
  sessionId: UUID;
  createdBy: UUID;

  // Poll content
  question: string;
  description?: string;
  type: 'multiple_choice' | 'single_choice' | 'text' | 'rating' | 'yes_no';

  // Options (for choice-based polls)
  options?: Array<{
    id: string;
    text: string;
    color?: string;
    image?: string;
  }>;

  // Settings
  settings: {
    allowMultipleAnswers: boolean;
    allowTextResponse: boolean;
    showResults: 'never' | 'after_vote' | 'after_close' | 'live';
    anonymousVoting: boolean;
    timeLimit?: number; // seconds
    correctAnswers?: string[]; // for quiz-style polls
  };

  // Status and timing
  status: 'draft' | 'active' | 'closed';
  startedAt?: Timestamp;
  closedAt?: Timestamp;
  timeRemaining?: number; // seconds

  // Results
  responses: Array<{
    participantId: UUID;
    selectedOptions?: string[];
    textResponse?: string;
    submittedAt: Timestamp;
  }>;

  // Analytics
  analytics: {
    totalVotes: number;
    participationRate: number; // percentage
    optionResults?: Array<{
      optionId: string;
      votes: number;
      percentage: number;
    }>;
    textResponses?: string[];
    averageRating?: number; // for rating polls
  };

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QAQuestion {
  id: UUID;
  sessionId: UUID;
  askedBy: UUID;

  // Question content
  question: string;
  details?: string;
  category?: string;
  isAnonymous: boolean;

  // Status and priority
  status: 'pending' | 'answered' | 'dismissed';
  priority: 'low' | 'normal' | 'high';
  upvotes: number;
  downvotes: number;

  // Answer
  answer?: {
    content: string;
    answeredBy: UUID;
    answeredAt: Timestamp;
    format: 'text' | 'markdown' | 'audio' | 'video';
    attachments?: Array<{
      type: 'image' | 'file' | 'link';
      url: string;
      filename?: string;
    }>;
  };

  // Engagement
  votes: Array<{
    participantId: UUID;
    type: 'up' | 'down';
    votedAt: Timestamp;
  }>;

  // Timestamps
  askedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BreakoutRoom {
  id: UUID;
  sessionId: UUID;
  createdBy: UUID;

  // Room details
  name: string;
  description?: string;
  capacity: number;
  isActive: boolean;

  // Participants
  participants: UUID[];
  hostId?: UUID;

  // Settings
  settings: {
    allowJoinAfterStart: boolean;
    autoAssignment: boolean;
    allowParticipantExchange: boolean;
    timeLimit?: number; // minutes
    recordSession: boolean;
  };

  // Features
  features: {
    hasWhiteboard: boolean;
    hasFileSharing: boolean;
    hasScreenSharing: boolean;
    hasChat: boolean;
  };

  // Activity tracking
  activity: {
    messageCount: number;
    speakingTime: Record<UUID, number>; // minutes per participant
    lastActivity: Timestamp;
  };

  // Timestamps
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface SessionReaction {
  id: UUID;
  sessionId: UUID;
  participantId: UUID;

  // Reaction details
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'applause' | 'thumbs_up' | 'thumbs_down';
  targetType: 'session' | 'message' | 'poll' | 'question' | 'participant';
  targetId?: UUID;

  // Duration and timing
  duration?: number; // seconds (for reactions that have duration)
  timestamp: Timestamp;

  // Metadata
  metadata: Record<string, any>;
}

// =============================================================================
// Session Recording and Analytics
// =============================================================================

export interface SessionRecording {
  id: UUID;
  sessionId: UUID;
  recordedBy: UUID;

  // Recording details
  title?: string;
  description?: string;
  status: 'recording' | 'processing' | 'ready' | 'failed';

  // File information
  files: Array<{
    type: 'video' | 'audio' | 'screen' | 'chat' | 'whiteboard';
    url: string;
    format: string;
    fileSize: number;
    duration?: number; // seconds
    quality: 'low' | 'medium' | 'high';
  }>;

  // Recording settings
  settings: {
    recordAudio: boolean;
    recordVideo: boolean;
    recordScreen: boolean;
    recordChat: boolean;
    recordWhiteboard: boolean;
    recordBreakoutRooms: boolean;
  };

  // Processing information
  processing: {
    startedAt: Timestamp;
    completedAt?: Timestamp;
    progress: number; // 0-100
    error?: string;
  };

  // Access and sharing
  isPublic: boolean;
  shareUrl?: string;
  downloadCount: number;
  viewCount: number;

  // Timestamps
  startedAt: Timestamp;
  endedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SessionAnalytics {
  sessionId: UUID;
  generatedAt: Timestamp;

  // Attendance metrics
  attendance: {
    totalInvited: number;
    totalJoined: number;
    peakConcurrent: number;
    averageConcurrent: number;
    attendanceRate: number; // percentage
    lateJoiners: number;
    earlyLeavers: number;
  };

  // Engagement metrics
  engagement: {
    totalMessages: number;
    totalReactions: number;
    totalPolls: number;
    totalQuestions: number;
    averageEngagementScore: number; // 0-100
    mostActiveParticipants: Array<{
      participantId: UUID;
      displayName: string;
      score: number;
    }>;
  };

  // Technical metrics
  technical: {
    averageLatency: number; // milliseconds
    connectionIssues: number;
    audioQualityIssues: number;
    videoQualityIssues: number;
    reconnections: number;
  };

  // Content metrics
  content: {
    totalSpeakingTime: number; // minutes
    speakerDistribution: Array<{
      participantId: UUID;
      speakingTime: number;
      percentage: number;
    }>;
    silenceTime: number; // minutes
    overlappingSpeech: number; // minutes
  };

  // Timeline analysis
  timeline: Array<{
    timestamp: Timestamp;
    event: string;
    details: Record<string, any>;
    participantCount: number;
    engagementLevel: number; // 0-100
  }>;

  // Satisfaction metrics
  satisfaction?: {
    averageRating: number; // 1-5
    responseRate: number; // percentage
    feedbackCount: number;
    recommendations: number; // Net Promoter Score
  };
}

// =============================================================================
// Main LiveSession Interface
// =============================================================================

export interface LiveSession {
  id: UUID;
  hostId: UUID;

  // Context and organization
  moduleId?: UUID;
  lessonId?: UUID;
  courseId?: UUID;
  organizationId?: UUID;

  // Basic information
  title: string;
  description?: string;
  type: SessionTypeType;
  status: SessionStatusType;

  // Scheduling
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  actualStart?: Timestamp;
  actualEnd?: Timestamp;
  timezone: string;
  duration: number; // planned duration in minutes

  // Capacity and limits
  capacity: {
    maximum: number;
    waitingRoom: number;
    breakoutRooms: number;
  };

  // Session settings
  settings: {
    // Entry settings
    requireApproval: boolean;
    allowGuests: boolean;
    requirePassword: boolean;
    password?: string;
    enableWaitingRoom: boolean;

    // Media settings
    muteOnEntry: boolean;
    cameraOnEntry: boolean;
    allowUnmute: boolean;
    allowVideo: boolean;
    allowScreenShare: boolean;

    // Interaction settings
    allowChat: boolean;
    allowPrivateChat: boolean;
    allowReactions: boolean;
    allowPolls: boolean;
    allowQA: boolean;
    allowHandRaise: boolean;

    // Recording settings
    autoRecord: boolean;
    recordingConsent: boolean;
    recordingNotification: boolean;

    // Security settings
    enableEncryption: boolean;
    restrictCopyPaste: boolean;
    preventScreenCapture: boolean;
    sessionLock: boolean;
  };

  // Participants
  participants: SessionParticipant[];
  currentParticipantCount: number;
  peakParticipantCount: number;

  // Interactive features
  polls: SessionPoll[];
  questions: QAQuestion[];
  breakoutRooms: BreakoutRoom[];
  reactions: SessionReaction[];

  // Chat and messaging
  messages: Array<{
    id: UUID;
    senderId: UUID;
    content: string;
    type: 'text' | 'file' | 'system';
    timestamp: Timestamp;
    isPrivate: boolean;
    recipientId?: UUID;
    isDeleted: boolean;
  }>;

  // Recording and playback
  recordings: SessionRecording[];
  isRecording: boolean;
  recordingStartedAt?: Timestamp;

  // Technical configuration
  webRTCConfig: {
    iceServers: Array<{
      urls: string[];
      username?: string;
      credential?: string;
    }>;
    mediaConstraints: {
      audio: boolean | MediaTrackConstraints;
      video: boolean | MediaTrackConstraints;
    };
    bandwidth: {
      audio: number; // kbps
      video: number; // kbps
      screen: number; // kbps
    };
  };

  // Session state
  state: {
    currentSlide?: number;
    sharedScreen?: {
      participantId: UUID;
      type: 'screen' | 'window' | 'tab';
      startedAt: Timestamp;
    };
    activePoll?: UUID;
    waitingRoomCount: number;
    lockedUntil?: Timestamp;
  };

  // Analytics and metrics
  analytics: SessionAnalytics;

  // Integration and webhooks
  integrations: {
    calendar?: {
      provider: 'google' | 'outlook' | 'zoom';
      eventId: string;
      syncEnabled: boolean;
    };
    streaming?: {
      provider: 'youtube' | 'twitch' | 'facebook';
      streamKey?: string;
      streamUrl?: string;
      isLive: boolean;
    };
    webhooks: Array<{
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };

  // Access and invitation
  invitations: ParticipantInvitation[];
  joinUrl: string;
  embedCode?: string;
  isPublic: boolean;
  publicJoinEnabled: boolean;

  // Metadata and custom fields
  metadata: Record<string, any>;
  tags: string[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

// Base schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const SessionStatusSchema = z.enum(['scheduled', 'waiting', 'live', 'paused', 'ended', 'cancelled']);
export const SessionTypeSchema = z.enum(['workshop', 'lecture', 'discussion', 'q_and_a', 'office_hours', 'collaboration', 'presentation', 'training']);
export const ParticipantRoleSchema = z.enum(['host', 'co_host', 'presenter', 'moderator', 'participant', 'observer']);
export const ParticipantStatusSchema = z.enum(['invited', 'joined', 'left', 'kicked', 'banned']);
export const ConnectionStatusSchema = z.enum(['connecting', 'connected', 'reconnecting', 'disconnected', 'failed']);

// WebSocket schemas
export const WebSocketConnectionSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  userId: UUIDSchema,
  connectionId: z.string(),
  status: ConnectionStatusSchema,
  connectedAt: TimestampSchema,
  lastHeartbeat: TimestampSchema,
  reconnectAttempts: z.number().min(0),
  maxReconnectAttempts: z.number().min(1),
  clientInfo: z.object({
    userAgent: z.string(),
    platform: z.string(),
    browser: z.string(),
    version: z.string(),
    capabilities: z.object({
      audio: z.boolean(),
      video: z.boolean(),
      screen: z.boolean(),
      webRTC: z.boolean(),
      fullscreen: z.boolean(),
    }),
  }),
  networkInfo: z.object({
    ipAddress: z.string(),
    location: z.object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
    latency: z.number().min(0).optional(),
    bandwidth: z.object({
      upload: z.number().min(0),
      download: z.number().min(0),
    }).optional(),
  }),
  quality: z.object({
    audioQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    videoQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    packetLoss: z.number().min(0).max(100),
    jitter: z.number().min(0),
    roundTripTime: z.number().min(0),
  }),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  disconnectedAt: TimestampSchema.optional(),
});

// Participant schema
export const SessionParticipantSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  userId: UUIDSchema,
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  role: ParticipantRoleSchema,
  status: ParticipantStatusSchema,
  permissions: z.object({
    canSpeak: z.boolean(),
    canVideo: z.boolean(),
    canScreen: z.boolean(),
    canChat: z.boolean(),
    canPoll: z.boolean(),
    canModerate: z.boolean(),
    canRecord: z.boolean(),
    canInvite: z.boolean(),
    canKick: z.boolean(),
    canMute: z.boolean(),
  }),
  mediaState: z.object({
    audioEnabled: z.boolean(),
    videoEnabled: z.boolean(),
    screenSharing: z.boolean(),
    isMuted: z.boolean(),
    isSpeaking: z.boolean(),
    handRaised: z.boolean(),
    lastSpokeAt: TimestampSchema.optional(),
  }),
  connectionId: z.string().optional(),
  connectionStatus: ConnectionStatusSchema,
  deviceInfo: z.object({
    type: z.enum(['desktop', 'mobile', 'tablet']),
    os: z.string(),
    browser: z.string(),
  }).optional(),
  engagement: z.object({
    joinedAt: TimestampSchema.optional(),
    leftAt: TimestampSchema.optional(),
    totalTimeSpent: z.number().min(0),
    messagesCount: z.number().min(0),
    reactionsCount: z.number().min(0),
    pollsParticipated: z.number().min(0),
    handRaisedCount: z.number().min(0),
    speakingTime: z.number().min(0),
  }),
  breakoutRoomId: UUIDSchema.optional(),
  metadata: z.record(z.any()),
  invitedAt: TimestampSchema,
  joinedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema,
});

// Interactive feature schemas
export const SessionPollSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  createdBy: UUIDSchema,
  question: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  type: z.enum(['multiple_choice', 'single_choice', 'text', 'rating', 'yes_no']),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    color: z.string().optional(),
    image: z.string().url().optional(),
  })).optional(),
  settings: z.object({
    allowMultipleAnswers: z.boolean(),
    allowTextResponse: z.boolean(),
    showResults: z.enum(['never', 'after_vote', 'after_close', 'live']),
    anonymousVoting: z.boolean(),
    timeLimit: z.number().min(1).optional(),
    correctAnswers: z.array(z.string()).optional(),
  }),
  status: z.enum(['draft', 'active', 'closed']),
  startedAt: TimestampSchema.optional(),
  closedAt: TimestampSchema.optional(),
  timeRemaining: z.number().min(0).optional(),
  responses: z.array(z.object({
    participantId: UUIDSchema,
    selectedOptions: z.array(z.string()).optional(),
    textResponse: z.string().optional(),
    submittedAt: TimestampSchema,
  })),
  analytics: z.object({
    totalVotes: z.number().min(0),
    participationRate: z.number().min(0).max(100),
    optionResults: z.array(z.object({
      optionId: z.string(),
      votes: z.number().min(0),
      percentage: z.number().min(0).max(100),
    })).optional(),
    textResponses: z.array(z.string()).optional(),
    averageRating: z.number().min(0).max(10).optional(),
  }),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const QAQuestionSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  askedBy: UUIDSchema,
  question: z.string().min(1).max(1000),
  details: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  isAnonymous: z.boolean(),
  status: z.enum(['pending', 'answered', 'dismissed']),
  priority: z.enum(['low', 'normal', 'high']),
  upvotes: z.number().min(0),
  downvotes: z.number().min(0),
  answer: z.object({
    content: z.string(),
    answeredBy: UUIDSchema,
    answeredAt: TimestampSchema,
    format: z.enum(['text', 'markdown', 'audio', 'video']),
    attachments: z.array(z.object({
      type: z.enum(['image', 'file', 'link']),
      url: z.string().url(),
      filename: z.string().optional(),
    })).optional(),
  }).optional(),
  votes: z.array(z.object({
    participantId: UUIDSchema,
    type: z.enum(['up', 'down']),
    votedAt: TimestampSchema,
  })),
  askedAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const BreakoutRoomSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  createdBy: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  capacity: z.number().min(2).max(50),
  isActive: z.boolean(),
  participants: z.array(UUIDSchema),
  hostId: UUIDSchema.optional(),
  settings: z.object({
    allowJoinAfterStart: z.boolean(),
    autoAssignment: z.boolean(),
    allowParticipantExchange: z.boolean(),
    timeLimit: z.number().min(1).optional(),
    recordSession: z.boolean(),
  }),
  features: z.object({
    hasWhiteboard: z.boolean(),
    hasFileSharing: z.boolean(),
    hasScreenSharing: z.boolean(),
    hasChat: z.boolean(),
  }),
  activity: z.object({
    messageCount: z.number().min(0),
    speakingTime: z.record(z.number().min(0)),
    lastActivity: TimestampSchema,
  }),
  createdAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  endedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema,
});

// Recording schema
export const SessionRecordingSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema,
  recordedBy: UUIDSchema,
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['recording', 'processing', 'ready', 'failed']),
  files: z.array(z.object({
    type: z.enum(['video', 'audio', 'screen', 'chat', 'whiteboard']),
    url: z.string().url(),
    format: z.string(),
    fileSize: z.number().min(0),
    duration: z.number().min(0).optional(),
    quality: z.enum(['low', 'medium', 'high']),
  })),
  settings: z.object({
    recordAudio: z.boolean(),
    recordVideo: z.boolean(),
    recordScreen: z.boolean(),
    recordChat: z.boolean(),
    recordWhiteboard: z.boolean(),
    recordBreakoutRooms: z.boolean(),
  }),
  processing: z.object({
    startedAt: TimestampSchema,
    completedAt: TimestampSchema.optional(),
    progress: z.number().min(0).max(100),
    error: z.string().optional(),
  }),
  isPublic: z.boolean(),
  shareUrl: z.string().url().optional(),
  downloadCount: z.number().min(0),
  viewCount: z.number().min(0),
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// Main live session schema
export const LiveSessionSchema = z.object({
  id: UUIDSchema,
  hostId: UUIDSchema,
  moduleId: UUIDSchema.optional(),
  lessonId: UUIDSchema.optional(),
  courseId: UUIDSchema.optional(),
  organizationId: UUIDSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: SessionTypeSchema,
  status: SessionStatusSchema,
  scheduledStart: TimestampSchema,
  scheduledEnd: TimestampSchema,
  actualStart: TimestampSchema.optional(),
  actualEnd: TimestampSchema.optional(),
  timezone: z.string(),
  duration: z.number().min(1),
  capacity: z.object({
    maximum: z.number().min(1),
    waitingRoom: z.number().min(0),
    breakoutRooms: z.number().min(0),
  }),
  settings: z.object({
    requireApproval: z.boolean(),
    allowGuests: z.boolean(),
    requirePassword: z.boolean(),
    password: z.string().optional(),
    enableWaitingRoom: z.boolean(),
    muteOnEntry: z.boolean(),
    cameraOnEntry: z.boolean(),
    allowUnmute: z.boolean(),
    allowVideo: z.boolean(),
    allowScreenShare: z.boolean(),
    allowChat: z.boolean(),
    allowPrivateChat: z.boolean(),
    allowReactions: z.boolean(),
    allowPolls: z.boolean(),
    allowQA: z.boolean(),
    allowHandRaise: z.boolean(),
    autoRecord: z.boolean(),
    recordingConsent: z.boolean(),
    recordingNotification: z.boolean(),
    enableEncryption: z.boolean(),
    restrictCopyPaste: z.boolean(),
    preventScreenCapture: z.boolean(),
    sessionLock: z.boolean(),
  }),
  participants: z.array(SessionParticipantSchema),
  currentParticipantCount: z.number().min(0),
  peakParticipantCount: z.number().min(0),
  polls: z.array(SessionPollSchema),
  questions: z.array(QAQuestionSchema),
  breakoutRooms: z.array(BreakoutRoomSchema),
  messages: z.array(z.object({
    id: UUIDSchema,
    senderId: UUIDSchema,
    content: z.string(),
    type: z.enum(['text', 'file', 'system']),
    timestamp: TimestampSchema,
    isPrivate: z.boolean(),
    recipientId: UUIDSchema.optional(),
    isDeleted: z.boolean(),
  })),
  recordings: z.array(SessionRecordingSchema),
  isRecording: z.boolean(),
  recordingStartedAt: TimestampSchema.optional(),
  webRTCConfig: z.object({
    iceServers: z.array(z.object({
      urls: z.array(z.string().url()),
      username: z.string().optional(),
      credential: z.string().optional(),
    })),
    mediaConstraints: z.object({
      audio: z.union([z.boolean(), z.record(z.any())]),
      video: z.union([z.boolean(), z.record(z.any())]),
    }),
    bandwidth: z.object({
      audio: z.number().min(0),
      video: z.number().min(0),
      screen: z.number().min(0),
    }),
  }),
  state: z.object({
    currentSlide: z.number().min(0).optional(),
    sharedScreen: z.object({
      participantId: UUIDSchema,
      type: z.enum(['screen', 'window', 'tab']),
      startedAt: TimestampSchema,
    }).optional(),
    activePoll: UUIDSchema.optional(),
    waitingRoomCount: z.number().min(0),
    lockedUntil: TimestampSchema.optional(),
  }),
  invitations: z.array(z.object({
    id: UUIDSchema,
    sessionId: UUIDSchema,
    inviterId: UUIDSchema,
    email: z.string().email().optional(),
    userId: UUIDSchema.optional(),
    role: ParticipantRoleSchema,
    customMessage: z.string().optional(),
    status: z.enum(['pending', 'accepted', 'declined', 'expired']),
    expiresAt: TimestampSchema.optional(),
    respondedAt: TimestampSchema.optional(),
    joinedAt: TimestampSchema.optional(),
    invitationToken: z.string(),
    invitationUrl: z.string().url(),
    requiresRegistration: z.boolean(),
    sentAt: TimestampSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })),
  joinUrl: z.string().url(),
  embedCode: z.string().optional(),
  isPublic: z.boolean(),
  publicJoinEnabled: z.boolean(),
  metadata: z.record(z.any()),
  tags: z.array(z.string()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  deletedAt: TimestampSchema.optional(),
});

// Input schemas for API operations
export const CreateLiveSessionInputSchema = LiveSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  participants: true,
  currentParticipantCount: true,
  peakParticipantCount: true,
  polls: true,
  questions: true,
  breakoutRooms: true,
  messages: true,
  recordings: true,
  isRecording: true,
  state: true,
  invitations: true,
  joinUrl: true,
});

export const UpdateLiveSessionInputSchema = CreateLiveSessionInputSchema.partial();

export const CreatePollInputSchema = SessionPollSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  responses: true,
  analytics: true,
  status: true,
  startedAt: true,
  closedAt: true,
  timeRemaining: true,
});

export const CreateQAQuestionInputSchema = QAQuestionSchema.omit({
  id: true,
  upvotes: true,
  downvotes: true,
  votes: true,
  askedAt: true,
  updatedAt: true,
  answer: true,
  status: true,
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate join URL for session
 */
export function generateJoinUrl(sessionId: UUID, baseUrl: string = 'https://app.example.com'): string {
  return `${baseUrl}/sessions/${sessionId}/join`;
}

/**
 * Generate embed code for session
 */
export function generateEmbedCode(
  sessionId: UUID,
  options: {
    width?: number;
    height?: number;
    autoplay?: boolean;
    controls?: boolean;
  } = {}
): string {
  const { width = 800, height = 600, autoplay = false, controls = true } = options;
  const joinUrl = generateJoinUrl(sessionId);

  return `<iframe
    src="${joinUrl}?embed=true&autoplay=${autoplay}&controls=${controls}"
    width="${width}"
    height="${height}"
    frameborder="0"
    allowfullscreen
    allow="camera; microphone; display-capture">
  </iframe>`;
}

/**
 * Check if user can join session
 */
export function canUserJoinSession(
  session: LiveSession,
  userId: UUID,
  userRole?: string
): { canJoin: boolean; reason?: string } {
  // Check session status
  if (session.status === 'ended' || session.status === 'cancelled') {
    return { canJoin: false, reason: 'Session has ended' };
  }

  // Check if session is locked
  if (session.state.lockedUntil && new Date(session.state.lockedUntil) > new Date()) {
    return { canJoin: false, reason: 'Session is locked' };
  }

  // Check capacity
  if (session.currentParticipantCount >= session.capacity.maximum) {
    return { canJoin: false, reason: 'Session is at capacity' };
  }

  // Check if user is invited or session allows guests
  const isInvited = session.invitations.some(inv => inv.userId === userId && inv.status === 'accepted');
  const isParticipant = session.participants.some(p => p.userId === userId);

  if (!isInvited && !isParticipant && !session.settings.allowGuests && !session.isPublic) {
    return { canJoin: false, reason: 'Not invited to this session' };
  }

  return { canJoin: true };
}

/**
 * Calculate session engagement score
 */
export function calculateEngagementScore(participant: SessionParticipant): number {
  const weights = {
    messages: 0.3,
    reactions: 0.2,
    polls: 0.25,
    handRaises: 0.15,
    speakingTime: 0.1,
  };

  // Normalize values (assuming reasonable maximums)
  const normalizedMessages = Math.min(participant.engagement.messagesCount / 50, 1);
  const normalizedReactions = Math.min(participant.engagement.reactionsCount / 20, 1);
  const normalizedPolls = Math.min(participant.engagement.pollsParticipated / 10, 1);
  const normalizedHandRaises = Math.min(participant.engagement.handRaisedCount / 5, 1);
  const normalizedSpeaking = Math.min(participant.engagement.speakingTime / 30, 1); // 30 minutes max

  const score =
    normalizedMessages * weights.messages +
    normalizedReactions * weights.reactions +
    normalizedPolls * weights.polls +
    normalizedHandRaises * weights.handRaises +
    normalizedSpeaking * weights.speakingTime;

  return Math.round(score * 100);
}

/**
 * Get participant permissions based on role
 */
export function getPermissionsForRole(role: ParticipantRoleType): SessionParticipant['permissions'] {
  const basePermissions: SessionParticipant['permissions'] = {
    canSpeak: false,
    canVideo: false,
    canScreen: false,
    canChat: false,
    canPoll: false,
    canModerate: false,
    canRecord: false,
    canInvite: false,
    canKick: false,
    canMute: false,
  };

  switch (role) {
    case ParticipantRole.HOST:
      return Object.keys(basePermissions).reduce((permissions, key) => {
        permissions[key as keyof SessionParticipant['permissions']] = true;
        return permissions;
      }, {} as SessionParticipant['permissions']);

    case ParticipantRole.CO_HOST:
      return {
        ...basePermissions,
        canSpeak: true,
        canVideo: true,
        canScreen: true,
        canChat: true,
        canPoll: true,
        canModerate: true,
        canRecord: true,
        canInvite: true,
        canMute: true,
      };

    case ParticipantRole.PRESENTER:
      return {
        ...basePermissions,
        canSpeak: true,
        canVideo: true,
        canScreen: true,
        canChat: true,
        canPoll: true,
      };

    case ParticipantRole.MODERATOR:
      return {
        ...basePermissions,
        canSpeak: true,
        canVideo: true,
        canChat: true,
        canModerate: true,
        canMute: true,
      };

    case ParticipantRole.PARTICIPANT:
      return {
        ...basePermissions,
        canSpeak: true,
        canVideo: true,
        canChat: true,
      };

    case ParticipantRole.OBSERVER:
      return basePermissions;

    default:
      return basePermissions;
  }
}

/**
 * Create WebRTC configuration
 */
export function createWebRTCConfig(customSettings?: Partial<LiveSession['webRTCConfig']>): LiveSession['webRTCConfig'] {
  const defaultConfig: LiveSession['webRTCConfig'] = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] },
    ],
    mediaConstraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    },
    bandwidth: {
      audio: 64, // kbps
      video: 1024, // kbps
      screen: 2048, // kbps
    },
  };

  return { ...defaultConfig, ...customSettings };
}

/**
 * Validate session timing
 */
export function validateSessionTiming(
  scheduledStart: string,
  scheduledEnd: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const startTime = new Date(scheduledStart);
  const endTime = new Date(scheduledEnd);
  const now = new Date();

  if (startTime < now) {
    errors.push('Session start time must be in the future');
  }

  if (endTime <= startTime) {
    errors.push('Session end time must be after start time');
  }

  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  if (duration < 5) {
    errors.push('Session must be at least 5 minutes long');
  }

  if (duration > 480) { // 8 hours
    errors.push('Session cannot be longer than 8 hours');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate session analytics summary
 */
export function generateSessionSummary(session: LiveSession): string {
  const duration = session.actualEnd && session.actualStart
    ? Math.round((new Date(session.actualEnd).getTime() - new Date(session.actualStart).getTime()) / (1000 * 60))
    : 0;

  const totalMessages = session.messages.length;
  const totalPolls = session.polls.length;
  const totalQuestions = session.questions.length;
  const averageEngagement = session.participants.length > 0
    ? Math.round(session.participants.reduce((sum, p) => sum + calculateEngagementScore(p), 0) / session.participants.length)
    : 0;

  return `
Session "${session.title}" Summary:
- Duration: ${duration} minutes
- Peak Participants: ${session.peakParticipantCount}
- Messages Sent: ${totalMessages}
- Polls Created: ${totalPolls}
- Questions Asked: ${totalQuestions}
- Average Engagement: ${averageEngagement}%
- Status: ${session.status}
  `.trim();
}

// =============================================================================
// Type Guards
// =============================================================================

export function isLiveSession(obj: any): obj is LiveSession {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.id === 'string' &&
         typeof obj.title === 'string' &&
         typeof obj.type === 'string';
}

export function isSessionParticipant(obj: any): obj is SessionParticipant {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.sessionId === 'string' &&
         typeof obj.userId === 'string';
}

export function isSessionPoll(obj: any): obj is SessionPoll {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.sessionId === 'string' &&
         typeof obj.question === 'string';
}

export function isWebSocketMessage(obj: any): obj is WebSocketMessage {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.type === 'string' &&
         typeof obj.sessionId === 'string';
}

// =============================================================================
// Input/Output Types for API
// =============================================================================

export type CreateLiveSessionInput = z.infer<typeof CreateLiveSessionInputSchema>;
export type UpdateLiveSessionInput = z.infer<typeof UpdateLiveSessionInputSchema>;
export type CreatePollInput = z.infer<typeof CreatePollInputSchema>;
export type CreateQAQuestionInput = z.infer<typeof CreateQAQuestionInputSchema>;

// Export all validation schemas for use in API routes
export const ValidationSchemas = {
  LiveSession: LiveSessionSchema,
  SessionParticipant: SessionParticipantSchema,
  SessionPoll: SessionPollSchema,
  QAQuestion: QAQuestionSchema,
  BreakoutRoom: BreakoutRoomSchema,
  SessionRecording: SessionRecordingSchema,
  WebSocketConnection: WebSocketConnectionSchema,
  CreateLiveSessionInput: CreateLiveSessionInputSchema,
  UpdateLiveSessionInput: UpdateLiveSessionInputSchema,
  CreatePollInput: CreatePollInputSchema,
  CreateQAQuestionInput: CreateQAQuestionInputSchema,
} as const;