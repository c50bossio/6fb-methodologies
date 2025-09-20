/**
 * Live Session Store - Zustand store for real-time session management
 * Manages live sessions, participants, chat, polls, and collaborative features
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { LiveSession, SessionParticipant, SessionPoll, QAQuestion, WebSocketMessage } from '@/types/live-session';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'system';
  timestamp: string;
  isPrivate: boolean;
  recipientId?: string;
  isDeleted: boolean;
  reactions: Array<{
    userId: string;
    type: string;
    timestamp: string;
  }>;
}

export interface MediaPermissions {
  canSpeak: boolean;
  canVideo: boolean;
  canScreen: boolean;
  canChat: boolean;
  canPoll: boolean;
  canModerate: boolean;
  canRecord: boolean;
}

export interface ConnectionQuality {
  latency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: {
    upload: number;
    download: number;
  };
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface LiveSessionState {
  // Current session data
  currentSession: LiveSession | null;
  participants: SessionParticipant[];
  chatMessages: ChatMessage[];
  activePolls: SessionPoll[];
  qaQuestions: QAQuestion[];

  // Local user state
  localUserId: string | null;
  isHost: boolean;
  isModerator: boolean;
  permissions: MediaPermissions;

  // Media state
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    volume: number;
    outputMuted: boolean;
    speaking: boolean;
    handRaised: boolean;
  };

  // Connection state
  connectionState: {
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
    quality: ConnectionQuality | null;
    reconnectAttempts: number;
    lastHeartbeat: string | null;
  };

  // UI state
  activeView: 'grid' | 'speaker' | 'presentation';
  sidebarTab: 'chat' | 'participants' | 'polls' | 'qa' | 'settings';
  sidebarOpen: boolean;
  fullscreen: boolean;
  pipMode: boolean;

  // Recording state
  isRecording: boolean;
  recordingStartTime: string | null;
  recordingDuration: number;

  // Polling state
  activePollId: string | null;
  userVotes: Record<string, string[]>; // pollId -> optionIds

  // Chat state
  unreadMessageCount: number;
  typingUsers: Array<{
    userId: string;
    userName: string;
    timestamp: string;
  }>;

  // Loading and error states
  isLoading: boolean;
  errors: Record<string, string>;

  // Actions - Session Management
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  updateSessionSettings: (settings: Partial<LiveSession['settings']>) => Promise<void>;

  // Actions - Participants
  addParticipant: (participant: SessionParticipant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<SessionParticipant>) => void;
  promoteToModerator: (participantId: string) => Promise<void>;
  muteParticipant: (participantId: string) => Promise<void>;
  kickParticipant: (participantId: string, reason?: string) => Promise<void>;

  // Actions - Media Control
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setVolume: (volume: number) => void;
  toggleOutputMute: () => void;
  toggleHandRaise: () => void;
  updateSpeakingState: (speaking: boolean) => void;

  // Actions - Chat
  sendMessage: (content: string, isPrivate?: boolean, recipientId?: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, reactionType: string) => void;
  markAsRead: () => void;
  setTyping: (typing: boolean) => void;

  // Actions - Polls
  createPoll: (poll: Omit<SessionPoll, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  closePoll: (pollId: string) => Promise<void>;
  votePoll: (pollId: string, optionIds: string[], textResponse?: string) => Promise<void>;
  setActivePoll: (pollId: string | null) => void;

  // Actions - Q&A
  askQuestion: (question: string, details?: string, isAnonymous?: boolean) => Promise<string>;
  answerQuestion: (questionId: string, answer: string) => Promise<void>;
  voteQuestion: (questionId: string, voteType: 'up' | 'down') => Promise<void>;
  dismissQuestion: (questionId: string) => Promise<void>;

  // Actions - Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;

  // Actions - UI
  setActiveView: (view: 'grid' | 'speaker' | 'presentation') => void;
  setSidebarTab: (tab: 'chat' | 'participants' | 'polls' | 'qa' | 'settings') => void;
  setSidebarOpen: (open: boolean) => void;
  toggleFullscreen: () => void;
  togglePipMode: () => void;

  // Actions - Connection
  updateConnectionState: (state: Partial<LiveSessionState['connectionState']>) => void;
  updateConnectionQuality: (quality: ConnectionQuality) => void;
  handleReconnect: () => void;

  // Utilities
  getParticipantById: (participantId: string) => SessionParticipant | null;
  getLocalParticipant: () => SessionParticipant | null;
  canPerformAction: (action: string) => boolean;
  getActiveSpeakers: () => SessionParticipant[];
  getSessionDuration: () => number;
  formatSessionTime: () => string;
  exportChatHistory: (format: 'txt' | 'json') => string;

  // Event handlers (for Socket.io integration)
  handleSocketEvent: (event: string, data: any) => void;

  // Cleanup
  cleanup: () => void;
}

export const useLiveSessionStore = create<LiveSessionState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        currentSession: null,
        participants: [],
        chatMessages: [],
        activePolls: [],
        qaQuestions: [],

        localUserId: null,
        isHost: false,
        isModerator: false,
        permissions: {
          canSpeak: true,
          canVideo: true,
          canScreen: false,
          canChat: true,
          canPoll: false,
          canModerate: false,
          canRecord: false,
        },

        mediaState: {
          audioEnabled: false,
          videoEnabled: false,
          screenSharing: false,
          volume: 100,
          outputMuted: false,
          speaking: false,
          handRaised: false,
        },

        connectionState: {
          status: 'disconnected',
          quality: null,
          reconnectAttempts: 0,
          lastHeartbeat: null,
        },

        activeView: 'grid',
        sidebarTab: 'chat',
        sidebarOpen: true,
        fullscreen: false,
        pipMode: false,

        isRecording: false,
        recordingStartTime: null,
        recordingDuration: 0,

        activePollId: null,
        userVotes: {},

        unreadMessageCount: 0,
        typingUsers: [],

        isLoading: false,
        errors: {},

        // Actions - Session Management
        joinSession: async (sessionId) => {
          set((state) => {
            state.isLoading = true;
            delete state.errors.join;
          });

          try {
            const response = await fetch(`/api/workbook/sessions/${sessionId}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to join session');
            }

            const sessionData = await response.json();

            set((state) => {
              state.currentSession = sessionData.session;
              state.participants = sessionData.participants;
              state.localUserId = sessionData.localUserId;
              state.isHost = sessionData.isHost;
              state.isModerator = sessionData.isModerator;
              state.permissions = sessionData.permissions;
              state.connectionState.status = 'connected';
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.errors.join = error instanceof Error ? error.message : 'Failed to join session';
            });
            throw error;
          }
        },

        leaveSession: () => {
          const { currentSession, localUserId } = get();

          if (currentSession && localUserId) {
            fetch(`/api/workbook/sessions/${currentSession.id}/leave`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            }).catch(console.error);
          }

          set((state) => {
            state.currentSession = null;
            state.participants = [];
            state.chatMessages = [];
            state.activePolls = [];
            state.qaQuestions = [];
            state.localUserId = null;
            state.isHost = false;
            state.isModerator = false;
            state.connectionState.status = 'disconnected';
            state.mediaState.handRaised = false;
            state.unreadMessageCount = 0;
            state.typingUsers = [];
          });
        },

        loadSession: async (sessionId) => {
          set((state) => {
            state.isLoading = true;
            delete state.errors.load;
          });

          try {
            const response = await fetch(`/api/workbook/sessions/${sessionId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to load session');
            }

            const session = await response.json();

            set((state) => {
              state.currentSession = session;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.errors.load = error instanceof Error ? error.message : 'Failed to load session';
            });
          }
        },

        updateSessionSettings: async (settings) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            const response = await fetch(`/api/workbook/sessions/${currentSession.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ settings }),
            });

            if (!response.ok) {
              throw new Error('Failed to update session settings');
            }

            const updatedSession = await response.json();

            set((state) => {
              if (state.currentSession) {
                state.currentSession.settings = updatedSession.settings;
              }
            });
          } catch (error) {
            console.error('Failed to update session settings:', error);
          }
        },

        // Actions - Participants
        addParticipant: (participant) => {
          set((state) => {
            const existingIndex = state.participants.findIndex(p => p.id === participant.id);
            if (existingIndex !== -1) {
              state.participants[existingIndex] = participant;
            } else {
              state.participants.push(participant);
            }
          });
        },

        removeParticipant: (participantId) => {
          set((state) => {
            state.participants = state.participants.filter(p => p.id !== participantId);
          });
        },

        updateParticipant: (participantId, updates) => {
          set((state) => {
            const index = state.participants.findIndex(p => p.id === participantId);
            if (index !== -1) {
              Object.assign(state.participants[index], updates);
            }
          });
        },

        promoteToModerator: async (participantId) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/participants/${participantId}/promote`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            get().updateParticipant(participantId, { role: 'moderator' });
          } catch (error) {
            console.error('Failed to promote participant:', error);
          }
        },

        muteParticipant: async (participantId) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/participants/${participantId}/mute`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            get().updateParticipant(participantId, {
              mediaState: { ...get().getParticipantById(participantId)?.mediaState, isMuted: true }
            });
          } catch (error) {
            console.error('Failed to mute participant:', error);
          }
        },

        kickParticipant: async (participantId, reason) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/participants/${participantId}/kick`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ reason }),
            });

            get().removeParticipant(participantId);
          } catch (error) {
            console.error('Failed to kick participant:', error);
          }
        },

        // Actions - Media Control
        toggleAudio: () => {
          set((state) => {
            state.mediaState.audioEnabled = !state.mediaState.audioEnabled;
          });
        },

        toggleVideo: () => {
          set((state) => {
            state.mediaState.videoEnabled = !state.mediaState.videoEnabled;
          });
        },

        toggleScreenShare: () => {
          set((state) => {
            state.mediaState.screenSharing = !state.mediaState.screenSharing;
          });
        },

        setVolume: (volume) => {
          set((state) => {
            state.mediaState.volume = Math.max(0, Math.min(100, volume));
          });
        },

        toggleOutputMute: () => {
          set((state) => {
            state.mediaState.outputMuted = !state.mediaState.outputMuted;
          });
        },

        toggleHandRaise: () => {
          set((state) => {
            state.mediaState.handRaised = !state.mediaState.handRaised;
          });
        },

        updateSpeakingState: (speaking) => {
          set((state) => {
            state.mediaState.speaking = speaking;
          });
        },

        // Actions - Chat
        sendMessage: (content, isPrivate = false, recipientId) => {
          const { currentSession, localUserId } = get();
          if (!currentSession || !localUserId) return;

          const message: ChatMessage = {
            id: `temp-${Date.now()}`,
            senderId: localUserId,
            senderName: get().getLocalParticipant()?.displayName || 'Unknown',
            content,
            type: 'text',
            timestamp: new Date().toISOString(),
            isPrivate,
            recipientId,
            isDeleted: false,
            reactions: [],
          };

          set((state) => {
            state.chatMessages.push(message);
          });

          // Send to server via Socket.io (handled by Socket hook)
        },

        deleteMessage: (messageId) => {
          set((state) => {
            const message = state.chatMessages.find(m => m.id === messageId);
            if (message) {
              message.isDeleted = true;
              message.content = 'This message was deleted';
            }
          });
        },

        addReaction: (messageId, reactionType) => {
          const { localUserId } = get();
          if (!localUserId) return;

          set((state) => {
            const message = state.chatMessages.find(m => m.id === messageId);
            if (message) {
              const existingReaction = message.reactions.find(r => r.userId === localUserId && r.type === reactionType);
              if (existingReaction) {
                message.reactions = message.reactions.filter(r => r !== existingReaction);
              } else {
                message.reactions.push({
                  userId: localUserId,
                  type: reactionType,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          });
        },

        markAsRead: () => {
          set((state) => {
            state.unreadMessageCount = 0;
          });
        },

        setTyping: (typing) => {
          // Handled by Socket.io
        },

        // Actions - Polls
        createPoll: async (pollData) => {
          const { currentSession } = get();
          if (!currentSession) throw new Error('No active session');

          try {
            const response = await fetch(`/api/workbook/sessions/${currentSession.id}/polls`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify(pollData),
            });

            if (!response.ok) {
              throw new Error('Failed to create poll');
            }

            const poll = await response.json();

            set((state) => {
              state.activePolls.push(poll);
              state.activePollId = poll.id;
            });

            return poll.id;
          } catch (error) {
            console.error('Failed to create poll:', error);
            throw error;
          }
        },

        closePoll: async (pollId) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/polls/${pollId}/close`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            set((state) => {
              const poll = state.activePolls.find(p => p.id === pollId);
              if (poll) {
                poll.status = 'closed';
              }
              if (state.activePollId === pollId) {
                state.activePollId = null;
              }
            });
          } catch (error) {
            console.error('Failed to close poll:', error);
          }
        },

        votePoll: async (pollId, optionIds, textResponse) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/polls/${pollId}/vote`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ optionIds, textResponse }),
            });

            set((state) => {
              state.userVotes[pollId] = optionIds;
            });
          } catch (error) {
            console.error('Failed to vote on poll:', error);
          }
        },

        setActivePoll: (pollId) => {
          set((state) => {
            state.activePollId = pollId;
          });
        },

        // Actions - Q&A
        askQuestion: async (question, details, isAnonymous = false) => {
          const { currentSession } = get();
          if (!currentSession) throw new Error('No active session');

          try {
            const response = await fetch(`/api/workbook/sessions/${currentSession.id}/questions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ question, details, isAnonymous }),
            });

            if (!response.ok) {
              throw new Error('Failed to ask question');
            }

            const questionData = await response.json();

            set((state) => {
              state.qaQuestions.push(questionData);
            });

            return questionData.id;
          } catch (error) {
            console.error('Failed to ask question:', error);
            throw error;
          }
        },

        answerQuestion: async (questionId, answer) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/questions/${questionId}/answer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ answer }),
            });

            set((state) => {
              const question = state.qaQuestions.find(q => q.id === questionId);
              if (question) {
                question.status = 'answered';
                question.answer = {
                  content: answer,
                  answeredBy: get().localUserId!,
                  answeredAt: new Date().toISOString(),
                  format: 'text',
                };
              }
            });
          } catch (error) {
            console.error('Failed to answer question:', error);
          }
        },

        voteQuestion: async (questionId, voteType) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/questions/${questionId}/vote`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
              body: JSON.stringify({ voteType }),
            });

            set((state) => {
              const question = state.qaQuestions.find(q => q.id === questionId);
              if (question) {
                if (voteType === 'up') {
                  question.upvotes++;
                } else {
                  question.downvotes++;
                }
              }
            });
          } catch (error) {
            console.error('Failed to vote on question:', error);
          }
        },

        dismissQuestion: async (questionId) => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/questions/${questionId}/dismiss`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            set((state) => {
              const question = state.qaQuestions.find(q => q.id === questionId);
              if (question) {
                question.status = 'dismissed';
              }
            });
          } catch (error) {
            console.error('Failed to dismiss question:', error);
          }
        },

        // Actions - Recording
        startRecording: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/recording/start`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            set((state) => {
              state.isRecording = true;
              state.recordingStartTime = new Date().toISOString();
              state.recordingDuration = 0;
            });
          } catch (error) {
            console.error('Failed to start recording:', error);
          }
        },

        stopRecording: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch(`/api/workbook/sessions/${currentSession.id}/recording/stop`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('workbook-token')}`,
              },
            });

            set((state) => {
              state.isRecording = false;
              state.recordingStartTime = null;
              state.recordingDuration = 0;
            });
          } catch (error) {
            console.error('Failed to stop recording:', error);
          }
        },

        pauseRecording: async () => {
          // Implementation depends on recording service
        },

        resumeRecording: async () => {
          // Implementation depends on recording service
        },

        // Actions - UI
        setActiveView: (view) => {
          set((state) => {
            state.activeView = view;
          });
        },

        setSidebarTab: (tab) => {
          set((state) => {
            state.sidebarTab = tab;
            if (tab === 'chat') {
              state.unreadMessageCount = 0;
            }
          });
        },

        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        toggleFullscreen: () => {
          set((state) => {
            state.fullscreen = !state.fullscreen;
          });
        },

        togglePipMode: () => {
          set((state) => {
            state.pipMode = !state.pipMode;
          });
        },

        // Actions - Connection
        updateConnectionState: (updates) => {
          set((state) => {
            Object.assign(state.connectionState, updates);
          });
        },

        updateConnectionQuality: (quality) => {
          set((state) => {
            state.connectionState.quality = quality;
          });
        },

        handleReconnect: () => {
          set((state) => {
            state.connectionState.status = 'reconnecting';
            state.connectionState.reconnectAttempts++;
          });
        },

        // Utilities
        getParticipantById: (participantId) => {
          return get().participants.find(p => p.id === participantId) || null;
        },

        getLocalParticipant: () => {
          const { participants, localUserId } = get();
          return participants.find(p => p.userId === localUserId) || null;
        },

        canPerformAction: (action) => {
          const { permissions, isHost, isModerator } = get();

          if (isHost) return true;

          const actionPermissions: Record<string, keyof MediaPermissions> = {
            'mute_others': 'canModerate',
            'kick_participants': 'canModerate',
            'create_polls': 'canPoll',
            'manage_recording': 'canRecord',
            'share_screen': 'canScreen',
          };

          const requiredPermission = actionPermissions[action];
          return requiredPermission ? permissions[requiredPermission] : false;
        },

        getActiveSpeakers: () => {
          return get().participants.filter(p => p.mediaState.isSpeaking);
        },

        getSessionDuration: () => {
          const { currentSession } = get();
          if (!currentSession?.actualStart) return 0;

          const start = new Date(currentSession.actualStart).getTime();
          const now = Date.now();
          return Math.floor((now - start) / 1000);
        },

        formatSessionTime: () => {
          const duration = get().getSessionDuration();
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);
          const seconds = duration % 60;

          if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },

        exportChatHistory: (format) => {
          const { chatMessages } = get();

          if (format === 'json') {
            return JSON.stringify(chatMessages, null, 2);
          }

          // Text format
          return chatMessages
            .filter(m => !m.isDeleted)
            .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderName}: ${m.content}`)
            .join('\n');
        },

        // Event handlers (for Socket.io integration)
        handleSocketEvent: (event, data) => {
          switch (event) {
            case 'participant:joined':
              get().addParticipant(data);
              break;
            case 'participant:left':
              get().removeParticipant(data.participantId);
              break;
            case 'chat:message':
              set((state) => {
                state.chatMessages.push(data);
                if (state.sidebarTab !== 'chat') {
                  state.unreadMessageCount++;
                }
              });
              break;
            case 'poll:created':
              set((state) => {
                state.activePolls.push(data);
                state.activePollId = data.id;
              });
              break;
            case 'media:participant-state':
              get().updateParticipant(data.participantId, { mediaState: data });
              break;
            case 'hand:raised':
              get().updateParticipant(data.participantId, {
                mediaState: { ...get().getParticipantById(data.participantId)?.mediaState, handRaised: true }
              });
              break;
            case 'hand:lowered':
              get().updateParticipant(data.participantId, {
                mediaState: { ...get().getParticipantById(data.participantId)?.mediaState, handRaised: false }
              });
              break;
            // Add more event handlers as needed
          }
        },

        // Cleanup
        cleanup: () => {
          set((state) => {
            state.currentSession = null;
            state.participants = [];
            state.chatMessages = [];
            state.activePolls = [];
            state.qaQuestions = [];
            state.localUserId = null;
            state.isHost = false;
            state.isModerator = false;
            state.connectionState.status = 'disconnected';
            state.errors = {};
          });
        },
      }))
    ),
    {
      name: 'live-session-store',
    }
  )
);