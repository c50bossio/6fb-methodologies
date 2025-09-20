/**
 * Custom React hook for Socket.io client management
 * Provides real-time connectivity for live sessions and collaborative features
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWorkbookAuth } from './useWorkbookAuth';

export interface SocketConfig {
  namespace?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  latency?: number;
  reconnectAttempts: number;
}

export interface UseSocketReturn {
  socket: Socket | null;
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const defaultConfig: SocketConfig = {
  namespace: '/',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

export function useSocket(config: SocketConfig = {}): UseSocketReturn {
  const mergedConfig = { ...defaultConfig, ...config };
  const { user, token } = useWorkbookAuth();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  });

  const createSocket = useCallback(() => {
    if (!token || !user) {
      console.warn('Cannot connect to socket without authentication');
      return null;
    }

    const serverUrl = process.env.NODE_ENV === 'production'
      ? 'https://6fbmethodologies.com'
      : 'http://localhost:3000';

    const socketUrl = `${serverUrl}${mergedConfig.namespace}`;

    const socket = io(socketUrl, {
      auth: {
        token,
      },
      autoConnect: mergedConfig.autoConnect,
      reconnection: mergedConfig.reconnection,
      reconnectionAttempts: mergedConfig.reconnectionAttempts,
      reconnectionDelay: mergedConfig.reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    return socket;
  }, [token, user, mergedConfig]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    if (!socketRef.current) {
      socketRef.current = createSocket();
    }

    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, [createSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setConnectionState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit event ${event}: socket not connected`);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }

    listenersRef.current.get(event)!.add(callback);

    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (callback) {
      listenersRef.current.get(event)?.delete(callback);
      socketRef.current?.off(event, callback);
    } else {
      listenersRef.current.delete(event);
      socketRef.current?.off(event);
    }
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    emit('join-room', { roomId });
  }, [emit]);

  const leaveRoom = useCallback((roomId: string) => {
    emit('leave-room', { roomId });
  }, [emit]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = createSocket();
    }

    const socket = socketRef.current;
    if (!socket) return;

    // Connection events
    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
      setConnectionState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: undefined,
        reconnectAttempts: 0,
      }));

      // Send heartbeat to measure latency
      const heartbeatStart = Date.now();
      socket.emit('heartbeat', { timestamp: new Date().toISOString() });

      socket.once('heartbeat-ack', (data) => {
        const latency = Date.now() - heartbeatStart;
        setConnectionState(prev => ({ ...prev, latency }));
      });
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: reason === 'io server disconnect' ? 'Server disconnected' : undefined,
      }));
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
      }));
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setConnectionState(prev => ({ ...prev, reconnectAttempts: attemptNumber }));
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
      setConnectionState(prev => ({
        ...prev,
        isConnecting: true,
        reconnectAttempts: attemptNumber,
      }));
    };

    const handleReconnectError = (error: Error) => {
      console.error('Socket reconnection error:', error);
      setConnectionState(prev => ({ ...prev, error: error.message }));
    };

    const handleReconnectFailed = () => {
      console.error('Socket reconnection failed');
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to reconnect to server',
      }));
    };

    // Attach event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);

    // Re-attach all registered listeners
    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        socket.on(event, callback);
      });
    });

    // Auto-connect if configured
    if (mergedConfig.autoConnect && !socket.connected) {
      socket.connect();
    }

    return () => {
      // Clean up event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('reconnect_failed', handleReconnectFailed);

      // Remove all custom listeners
      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socket.off(event, callback);
        });
      });
    };
  }, [createSocket, mergedConfig.autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Reconnect when auth state changes
  useEffect(() => {
    if (token && user && socketRef.current && !socketRef.current.connected) {
      connect();
    } else if (!token && socketRef.current?.connected) {
      disconnect();
    }
  }, [token, user, connect, disconnect]);

  return {
    socket: socketRef.current,
    connectionState,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };
}

// Specialized hooks for different use cases

export function useLiveSessionSocket(sessionId?: string) {
  const baseSocket = useSocket({
    namespace: '/live-sessions',
    autoConnect: false,
  });

  const [sessionParticipants, setSessionParticipants] = useState<any[]>([]);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [currentPoll, setCurrentPoll] = useState<any>(null);

  const joinSession = useCallback((id: string) => {
    if (baseSocket.socket) {
      baseSocket.socket.io.opts.query = { sessionId: id };
      baseSocket.connect();
    }
  }, [baseSocket]);

  const leaveSession = useCallback(() => {
    baseSocket.disconnect();
    setSessionParticipants([]);
    setSessionMessages([]);
    setCurrentPoll(null);
  }, [baseSocket]);

  // Session-specific event handlers
  useEffect(() => {
    if (!baseSocket.socket) return;

    const handleParticipantJoined = (data: any) => {
      setSessionParticipants(prev => [...prev, data]);
    };

    const handleParticipantLeft = (data: any) => {
      setSessionParticipants(prev => prev.filter(p => p.userId !== data.participantId));
    };

    const handleChatMessage = (data: any) => {
      setSessionMessages(prev => [...prev, data]);
    };

    const handlePollCreated = (data: any) => {
      setCurrentPoll(data);
    };

    baseSocket.on('participant:joined', handleParticipantJoined);
    baseSocket.on('participant:left', handleParticipantLeft);
    baseSocket.on('chat:message', handleChatMessage);
    baseSocket.on('poll:created', handlePollCreated);

    return () => {
      baseSocket.off('participant:joined', handleParticipantJoined);
      baseSocket.off('participant:left', handleParticipantLeft);
      baseSocket.off('chat:message', handleChatMessage);
      baseSocket.off('poll:created', handlePollCreated);
    };
  }, [baseSocket]);

  return {
    ...baseSocket,
    sessionParticipants,
    sessionMessages,
    currentPoll,
    joinSession,
    leaveSession,
  };
}

export function useWorkbookCollaborationSocket() {
  const baseSocket = useSocket({
    namespace: '/workbook',
    autoConnect: true,
  });

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [noteChanges, setNoteChanges] = useState<any[]>([]);

  const joinNote = useCallback((noteId: string) => {
    baseSocket.emit('note:join', { noteId });
  }, [baseSocket]);

  const leaveNote = useCallback(() => {
    baseSocket.emit('note:leave');
    setCollaborators([]);
    setNoteChanges([]);
  }, [baseSocket]);

  const sendNoteChange = useCallback((changes: any) => {
    baseSocket.emit('note:content-change', { changes });
  }, [baseSocket]);

  const sendCursorPosition = useCallback((position: any, selection: any) => {
    baseSocket.emit('note:cursor-position', { position, selection });
  }, [baseSocket]);

  // Collaboration-specific event handlers
  useEffect(() => {
    if (!baseSocket.socket) return;

    const handleUserJoined = (data: any) => {
      setCollaborators(prev => [...prev, data]);
    };

    const handleUserLeft = (data: any) => {
      setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
    };

    const handleContentChanged = (data: any) => {
      setNoteChanges(prev => [...prev, data]);
    };

    baseSocket.on('note:user-joined', handleUserJoined);
    baseSocket.on('note:user-left', handleUserLeft);
    baseSocket.on('note:content-changed', handleContentChanged);

    return () => {
      baseSocket.off('note:user-joined', handleUserJoined);
      baseSocket.off('note:user-left', handleUserLeft);
      baseSocket.off('note:content-changed', handleContentChanged);
    };
  }, [baseSocket]);

  return {
    ...baseSocket,
    collaborators,
    noteChanges,
    joinNote,
    leaveNote,
    sendNoteChange,
    sendCursorPosition,
  };
}