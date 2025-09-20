/**
 * Live session management type definitions
 * Real-time learning sessions, collaboration, and interactive features
 */

import { UUID, Timestamp, JSONObject } from './core';

// Live Session Types
export interface LiveSession {
  id: UUID;
  title: string;
  description?: string;
  type: SessionType;
  moduleId?: UUID;
  instructorId: UUID;
  capacity: number;
  status: SessionStatus;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  actualStart?: Timestamp;
  actualEnd?: Timestamp;
  timezone: string;
  settings: SessionSettings;
  participants: SessionParticipant[];
  features: SessionFeature[];
  recording?: SessionRecording;
  metadata: SessionMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SessionType =
  | 'workshop'
  | 'lecture'
  | 'discussion'
  | 'office_hours'
  | 'study_group'
  | 'assessment';
export type SessionStatus =
  | 'scheduled'
  | 'starting'
  | 'active'
  | 'paused'
  | 'ended'
  | 'cancelled';

export interface SessionSettings {
  isPublic: boolean;
  requireApproval: boolean;
  allowLateJoin: boolean;
  allowEarlyJoin: boolean; // how many minutes before scheduled start
  earlyJoinMinutes: number;
  recordSession: boolean;
  enableChat: boolean;
  enableAudio: boolean;
  enableVideo: boolean;
  enableScreenShare: boolean;
  enableBreakoutRooms: boolean;
  enableWhiteboard: boolean;
  enablePolls: boolean;
  enableQuizzes: boolean;
  enableRaiseHand: boolean;
  mutePariticipantsOnJoin: boolean;
  moderatorApprovalRequired: boolean;
  waitingRoomEnabled: boolean;
}

export interface SessionParticipant {
  id: UUID;
  userId: UUID;
  sessionId: UUID;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt?: Timestamp;
  leftAt?: Timestamp;
  permissions: ParticipantPermissions;
  connection: ConnectionInfo;
  engagement: EngagementMetrics;
}

export type ParticipantRole =
  | 'instructor'
  | 'moderator'
  | 'student'
  | 'observer'
  | 'guest';
export type ParticipantStatus =
  | 'waiting'
  | 'connected'
  | 'disconnected'
  | 'kicked'
  | 'banned';

export interface ParticipantPermissions {
  canSpeak: boolean;
  canVideo: boolean;
  canScreenShare: boolean;
  canChat: boolean;
  canRaiseHand: boolean;
  canUseWhiteboard: boolean;
  canCreatePolls: boolean;
  canManageBreakouts: boolean;
  canRecordSession: boolean;
}

export interface ConnectionInfo {
  connectionId: string;
  ipAddress: string;
  userAgent: string;
  quality: ConnectionQuality;
  bandwidth: {
    upload: number; // kbps
    download: number; // kbps
  };
  latency: number; // milliseconds
  lastPing: Timestamp;
}

export type ConnectionQuality =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'unknown';

export interface EngagementMetrics {
  totalTimeSpent: number; // in seconds
  chatMessages: number;
  questionsAsked: number;
  pollsParticipated: number;
  handsRaised: number;
  screenshareTime: number; // in seconds
  microphoneTime: number; // in seconds
  lastActivity: Timestamp;
}

// Session Features
export interface SessionFeature {
  id: UUID;
  type: FeatureType;
  isActive: boolean;
  config: JSONObject;
  createdAt: Timestamp;
  activatedAt?: Timestamp;
}

export type FeatureType =
  | 'poll'
  | 'quiz'
  | 'breakout_room'
  | 'whiteboard'
  | 'screen_share'
  | 'file_share'
  | 'group_activity';

// Chat System
export interface ChatMessage {
  id: UUID;
  sessionId: UUID;
  userId: UUID;
  content: string;
  type: MessageType;
  replyToId?: UUID;
  mentions: UUID[];
  attachments: MessageAttachment[];
  isPrivate: boolean;
  recipientId?: UUID; // for private messages
  timestamp: Timestamp;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
}

export type MessageType =
  | 'text'
  | 'emoji'
  | 'file'
  | 'image'
  | 'poll_result'
  | 'system'
  | 'announcement';

export interface MessageAttachment {
  id: UUID;
  filename: string;
  url: string;
  fileSize: number;
  mimeType: string;
  thumbnail?: string;
}

export interface ChatSettings {
  enabled: boolean;
  allowPrivateMessages: boolean;
  allowFileSharing: boolean;
  allowEmojis: boolean;
  moderationEnabled: boolean;
  profanityFilter: boolean;
  maxMessageLength: number;
  rateLimitPerMinute: number;
}

// Interactive Features
export interface SessionPoll {
  id: UUID;
  sessionId: UUID;
  createdBy: UUID;
  question: string;
  type: PollType;
  options: PollOption[];
  settings: PollSettings;
  responses: PollResponse[];
  status: 'draft' | 'active' | 'closed' | 'archived';
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

export type PollType =
  | 'multiple_choice'
  | 'single_choice'
  | 'yes_no'
  | 'rating'
  | 'open_ended'
  | 'word_cloud';

export interface PollOption {
  id: UUID;
  text: string;
  color?: string;
  isCorrect?: boolean; // for quiz-style polls
}

export interface PollSettings {
  allowMultipleResponses: boolean;
  showResults: 'never' | 'after_vote' | 'live' | 'after_close';
  isAnonymous: boolean;
  requireLogin: boolean;
  timeLimit?: number; // in seconds
  autoClose?: boolean;
}

export interface PollResponse {
  id: UUID;
  pollId: UUID;
  userId?: UUID; // null for anonymous responses
  selectedOptions: UUID[];
  textResponse?: string; // for open-ended polls
  submittedAt: Timestamp;
}

export interface PollResults {
  pollId: UUID;
  totalResponses: number;
  optionResults: OptionResult[];
  textResponses: string[];
  statistics: PollStatistics;
}

export interface OptionResult {
  optionId: UUID;
  count: number;
  percentage: number;
}

export interface PollStatistics {
  averageResponseTime: number; // in seconds
  participationRate: number; // percentage of participants who responded
  responseDistribution: number[]; // responses over time
}

// Breakout Rooms
export interface BreakoutRoom {
  id: UUID;
  sessionId: UUID;
  name: string;
  capacity: number;
  participants: UUID[];
  settings: BreakoutRoomSettings;
  status: 'created' | 'active' | 'closed';
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

export interface BreakoutRoomSettings {
  duration: number; // in minutes
  allowSelfJoin: boolean;
  enableAudio: boolean;
  enableVideo: boolean;
  enableChat: boolean;
  enableScreenShare: boolean;
  autoReturnToMain: boolean;
}

export interface BreakoutAssignment {
  roomId: UUID;
  userId: UUID;
  assignedBy: UUID;
  assignedAt: Timestamp;
}

// Whiteboard/Collaboration Tools
export interface WhiteboardSession {
  id: UUID;
  sessionId: UUID;
  name: string;
  canvas: WhiteboardCanvas;
  participants: UUID[];
  settings: WhiteboardSettings;
  history: WhiteboardAction[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WhiteboardCanvas {
  width: number;
  height: number;
  background: string;
  objects: WhiteboardObject[];
}

export interface WhiteboardObject {
  id: UUID;
  type: 'text' | 'shape' | 'line' | 'image' | 'sticky_note';
  data: JSONObject;
  position: { x: number; y: number };
  style: JSONObject;
  createdBy: UUID;
  createdAt: Timestamp;
}

export interface WhiteboardSettings {
  allowAllEdit: boolean;
  allowedTools: string[];
  maxObjects: number;
  enableTemplates: boolean;
  saveHistory: boolean;
}

export interface WhiteboardAction {
  id: UUID;
  type: 'create' | 'update' | 'delete' | 'move';
  objectId: UUID;
  userId: UUID;
  data: JSONObject;
  timestamp: Timestamp;
}

// Session Recording
export interface SessionRecording {
  id: UUID;
  sessionId: UUID;
  filename: string;
  url: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  format: string;
  quality: 'low' | 'medium' | 'high';
  status: 'recording' | 'processing' | 'ready' | 'failed';
  startedAt: Timestamp;
  endedAt?: Timestamp;
  processedAt?: Timestamp;
  metadata: RecordingMetadata;
}

export interface RecordingMetadata {
  audioTracks: number;
  videoTracks: number;
  screenShareIncluded: boolean;
  chatIncluded: boolean;
  whiteboardIncluded: boolean;
  participantCount: number;
  avgBitrate: number;
  thumbnail?: string;
}

// Session Analytics
export interface SessionAnalytics {
  sessionId: UUID;
  attendance: AttendanceAnalytics;
  engagement: EngagementAnalytics;
  interaction: InteractionAnalytics;
  technical: TechnicalAnalytics;
  feedback: FeedbackAnalytics;
  generatedAt: Timestamp;
}

export interface AttendanceAnalytics {
  totalRegistered: number;
  totalAttended: number;
  attendanceRate: number;
  peakConcurrentUsers: number;
  averageSessionDuration: number;
  dropoffPoints: number[];
  joinTimes: Timestamp[];
  leaveTimes: Timestamp[];
}

export interface EngagementAnalytics {
  chatActivity: number[];
  pollParticipation: number;
  handsRaised: number;
  questionsAsked: number;
  averageEngagementScore: number;
  mostActiveParticipants: UUID[];
  engagementOverTime: number[];
}

export interface InteractionAnalytics {
  totalChatMessages: number;
  totalPolls: number;
  pollResponseRate: number;
  whiteboardUsage: number;
  screenShareDuration: number;
  breakoutRoomUsage: number;
  fileShareCount: number;
}

export interface TechnicalAnalytics {
  averageLatency: number;
  connectionIssues: number;
  qualityIssues: number;
  bandwidthUsage: number;
  deviceTypes: Record<string, number>;
  browserTypes: Record<string, number>;
}

export interface FeedbackAnalytics {
  averageRating: number;
  feedbackCount: number;
  satisfaction: Record<string, number>;
  improvements: string[];
  highlights: string[];
}

// Real-time Events
export interface SessionEvent {
  id: UUID;
  sessionId: UUID;
  type: SessionEventType;
  data: JSONObject;
  userId?: UUID;
  timestamp: Timestamp;
}

export type SessionEventType =
  | 'participant_joined'
  | 'participant_left'
  | 'chat_message'
  | 'poll_created'
  | 'poll_started'
  | 'poll_ended'
  | 'hand_raised'
  | 'hand_lowered'
  | 'screen_share_started'
  | 'screen_share_ended'
  | 'breakout_created'
  | 'breakout_started'
  | 'breakout_ended'
  | 'session_started'
  | 'session_ended'
  | 'session_paused'
  | 'session_resumed';

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: JSONObject;
  timestamp: Timestamp;
  sessionId: UUID;
  userId?: UUID;
}

export interface WebSocketConnection {
  sessionId: UUID;
  userId: UUID;
  connectionId: string;
  connectedAt: Timestamp;
  lastPing: Timestamp;
  isActive: boolean;
}

// Component Props Types
export interface SessionRoomProps {
  session: LiveSession;
  participant: SessionParticipant;
  onLeave: () => void;
  onError: (error: string) => void;
  className?: string;
}

export interface ChatPanelProps {
  sessionId: UUID;
  currentUserId: UUID;
  messages: ChatMessage[];
  onSendMessage: (
    content: string,
    isPrivate?: boolean,
    recipientId?: UUID
  ) => void;
  settings: ChatSettings;
  className?: string;
}

export interface PollWidgetProps {
  poll: SessionPoll;
  canVote: boolean;
  hasVoted: boolean;
  onVote: (selectedOptions: UUID[], textResponse?: string) => void;
  showResults?: boolean;
  className?: string;
}

// API Types
export type CreateSessionInput = Omit<
  LiveSession,
  'id' | 'participants' | 'features' | 'metadata' | 'createdAt' | 'updatedAt'
>;
export type UpdateSessionInput = Partial<CreateSessionInput>;

export type JoinSessionInput = {
  sessionId: UUID;
  role?: ParticipantRole;
  permissions?: Partial<ParticipantPermissions>;
};

export type CreatePollInput = Omit<
  SessionPoll,
  'id' | 'responses' | 'status' | 'createdAt' | 'startedAt' | 'endedAt'
>;
export type UpdatePollInput = Partial<
  Pick<SessionPoll, 'question' | 'options' | 'settings'>
>;

export type CreateBreakoutRoomInput = Omit<
  BreakoutRoom,
  'id' | 'participants' | 'status' | 'createdAt' | 'startedAt' | 'endedAt'
>;

// Session Management Types
export interface SessionManager {
  createSession: (input: CreateSessionInput) => Promise<LiveSession>;
  updateSession: (id: UUID, input: UpdateSessionInput) => Promise<LiveSession>;
  deleteSession: (id: UUID) => Promise<void>;
  joinSession: (input: JoinSessionInput) => Promise<SessionParticipant>;
  leaveSession: (sessionId: UUID, userId: UUID) => Promise<void>;
  startSession: (sessionId: UUID) => Promise<void>;
  endSession: (sessionId: UUID) => Promise<void>;
  getSessionAnalytics: (sessionId: UUID) => Promise<SessionAnalytics>;
}
