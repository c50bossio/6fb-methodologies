/**
 * Custom Next.js server with Socket.io integration
 * Provides real-time functionality for live sessions and collaborative features
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://6fbmethodologies.com', 'https://www.6fbmethodologies.com']
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token (this would use your existing auth logic)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userData = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Live Session namespace
  const liveSessionNamespace = io.of('/live-sessions');

  liveSessionNamespace.use(async (socket, next) => {
    // Additional authorization for live sessions
    const sessionId = socket.handshake.query.sessionId;

    if (!sessionId) {
      return next(new Error('Session ID required'));
    }

    // Verify user can join this session (implement your logic here)
    socket.sessionId = sessionId;
    next();
  });

  liveSessionNamespace.on('connection', (socket) => {
    console.log(`User ${socket.userData.name} connected to session ${socket.sessionId}`);

    // Join session room
    socket.join(socket.sessionId);

    // Notify others about new participant
    socket.to(socket.sessionId).emit('participant:joined', {
      userId: socket.userId,
      userData: socket.userData,
      connectionId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Handle session events
    socket.on('session:heartbeat', (data) => {
      socket.emit('session:heartbeat-ack', {
        timestamp: new Date().toISOString(),
        latency: Date.now() - new Date(data.timestamp).getTime(),
      });
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
      const message = {
        id: require('uuid').v4(),
        senderId: socket.userId,
        senderName: socket.userData.name,
        content: data.content,
        type: data.type || 'text',
        timestamp: new Date().toISOString(),
        isPrivate: data.isPrivate || false,
        recipientId: data.recipientId,
      };

      if (message.isPrivate && message.recipientId) {
        // Send private message
        socket.to(message.recipientId).emit('chat:message', message);
        socket.emit('chat:message-sent', message);
      } else {
        // Broadcast to all participants in session
        liveSessionNamespace.to(socket.sessionId).emit('chat:message', message);
      }
    });

    // Handle media state changes
    socket.on('media:state-change', (data) => {
      const mediaState = {
        participantId: socket.userId,
        audioEnabled: data.audioEnabled,
        videoEnabled: data.videoEnabled,
        screenSharing: data.screenSharing,
        timestamp: new Date().toISOString(),
      };

      socket.to(socket.sessionId).emit('media:participant-state', mediaState);
    });

    // Handle hand raise/lower
    socket.on('hand:raise', () => {
      const handRaiseEvent = {
        participantId: socket.userId,
        participantName: socket.userData.name,
        timestamp: new Date().toISOString(),
      };

      liveSessionNamespace.to(socket.sessionId).emit('hand:raised', handRaiseEvent);
    });

    socket.on('hand:lower', () => {
      const handLowerEvent = {
        participantId: socket.userId,
        timestamp: new Date().toISOString(),
      };

      liveSessionNamespace.to(socket.sessionId).emit('hand:lowered', handLowerEvent);
    });

    // Handle polls
    socket.on('poll:create', (data) => {
      if (socket.userRole !== 'host' && socket.userRole !== 'co_host' && socket.userRole !== 'presenter') {
        socket.emit('error', { message: 'Insufficient permissions to create polls' });
        return;
      }

      const poll = {
        id: require('uuid').v4(),
        ...data,
        createdBy: socket.userId,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      liveSessionNamespace.to(socket.sessionId).emit('poll:created', poll);
    });

    socket.on('poll:vote', (data) => {
      const vote = {
        pollId: data.pollId,
        participantId: socket.userId,
        selectedOptions: data.selectedOptions,
        textResponse: data.textResponse,
        submittedAt: new Date().toISOString(),
      };

      // Send vote to host/moderators
      liveSessionNamespace.to(socket.sessionId).emit('poll:vote-received', vote);
      socket.emit('poll:vote-confirmed', { pollId: data.pollId });
    });

    // Handle Q&A
    socket.on('qa:question', (data) => {
      const question = {
        id: require('uuid').v4(),
        sessionId: socket.sessionId,
        askedBy: socket.userId,
        askerName: socket.userData.name,
        question: data.question,
        details: data.details,
        isAnonymous: data.isAnonymous || false,
        timestamp: new Date().toISOString(),
        upvotes: 0,
        status: 'pending',
      };

      liveSessionNamespace.to(socket.sessionId).emit('qa:question-received', question);
    });

    socket.on('qa:vote', (data) => {
      const vote = {
        questionId: data.questionId,
        participantId: socket.userId,
        type: data.type, // 'up' or 'down'
        timestamp: new Date().toISOString(),
      };

      liveSessionNamespace.to(socket.sessionId).emit('qa:vote-received', vote);
    });

    // Handle reactions
    socket.on('reaction:send', (data) => {
      const reaction = {
        id: require('uuid').v4(),
        participantId: socket.userId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        timestamp: new Date().toISOString(),
      };

      liveSessionNamespace.to(socket.sessionId).emit('reaction:received', reaction);
    });

    // Handle breakout rooms
    socket.on('breakout:join', (data) => {
      const breakoutRoomId = `${socket.sessionId}:breakout:${data.roomId}`;

      socket.leave(socket.sessionId);
      socket.join(breakoutRoomId);

      socket.currentRoom = breakoutRoomId;

      liveSessionNamespace.to(breakoutRoomId).emit('breakout:participant-joined', {
        participantId: socket.userId,
        participantName: socket.userData.name,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('breakout:leave', () => {
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);

        liveSessionNamespace.to(socket.currentRoom).emit('breakout:participant-left', {
          participantId: socket.userId,
          timestamp: new Date().toISOString(),
        });

        socket.currentRoom = null;
      }

      socket.join(socket.sessionId);
    });

    // Handle screen sharing
    socket.on('screen:start-sharing', () => {
      if (socket.userRole === 'observer') {
        socket.emit('error', { message: 'Insufficient permissions to share screen' });
        return;
      }

      socket.to(socket.sessionId).emit('screen:sharing-started', {
        participantId: socket.userId,
        participantName: socket.userData.name,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('screen:stop-sharing', () => {
      socket.to(socket.sessionId).emit('screen:sharing-stopped', {
        participantId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle moderation actions (only for hosts/moderators)
    socket.on('moderation:mute-participant', (data) => {
      if (socket.userRole !== 'host' && socket.userRole !== 'co_host' && socket.userRole !== 'moderator') {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      liveSessionNamespace.to(socket.sessionId).emit('moderation:participant-muted', {
        participantId: data.participantId,
        mutedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('moderation:kick-participant', (data) => {
      if (socket.userRole !== 'host' && socket.userRole !== 'co_host') {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      const targetSockets = Array.from(liveSessionNamespace.sockets.values())
        .filter(s => s.userId === data.participantId && s.sessionId === socket.sessionId);

      targetSockets.forEach(targetSocket => {
        targetSocket.emit('session:kicked', {
          reason: data.reason,
          kickedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
        targetSocket.disconnect();
      });

      socket.to(socket.sessionId).emit('moderation:participant-kicked', {
        participantId: data.participantId,
        kickedBy: socket.userId,
        reason: data.reason,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userData.name} disconnected from session ${socket.sessionId}: ${reason}`);

      socket.to(socket.sessionId).emit('participant:left', {
        participantId: socket.userId,
        timestamp: new Date().toISOString(),
        reason,
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
      socket.emit('error', { message: 'An error occurred', details: error.message });
    });
  });

  // Workbook collaboration namespace
  const workbookNamespace = io.of('/workbook');

  workbookNamespace.on('connection', (socket) => {
    console.log(`User ${socket.userData.name} connected to workbook collaboration`);

    // Handle note collaboration
    socket.on('note:join', (data) => {
      const noteRoom = `note:${data.noteId}`;
      socket.join(noteRoom);
      socket.currentNoteId = data.noteId;

      socket.to(noteRoom).emit('note:user-joined', {
        userId: socket.userId,
        userName: socket.userData.name,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('note:content-change', (data) => {
      if (!socket.currentNoteId) return;

      const noteRoom = `note:${socket.currentNoteId}`;
      socket.to(noteRoom).emit('note:content-changed', {
        noteId: socket.currentNoteId,
        changes: data.changes,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('note:cursor-position', (data) => {
      if (!socket.currentNoteId) return;

      const noteRoom = `note:${socket.currentNoteId}`;
      socket.to(noteRoom).emit('note:cursor-moved', {
        userId: socket.userId,
        position: data.position,
        selection: data.selection,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('note:leave', () => {
      if (socket.currentNoteId) {
        const noteRoom = `note:${socket.currentNoteId}`;
        socket.to(noteRoom).emit('note:user-left', {
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
        socket.leave(noteRoom);
        socket.currentNoteId = null;
      }
    });

    // Handle audio transcription status updates
    socket.on('transcription:status', (data) => {
      socket.emit('transcription:status-update', {
        transcriptionId: data.transcriptionId,
        status: data.status,
        progress: data.progress,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userData.name} disconnected from workbook`);

      if (socket.currentNoteId) {
        const noteRoom = `note:${socket.currentNoteId}`;
        socket.to(noteRoom).emit('note:user-left', {
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  // Admin namespace for system monitoring
  const adminNamespace = io.of('/admin');

  adminNamespace.use(async (socket, next) => {
    if (socket.userRole !== 'admin' && socket.userRole !== 'super_admin') {
      return next(new Error('Admin access required'));
    }
    next();
  });

  adminNamespace.on('connection', (socket) => {
    console.log(`Admin ${socket.userData.name} connected to admin panel`);

    // Send real-time system metrics
    const metricsInterval = setInterval(() => {
      const metrics = {
        activeConnections: io.engine.clientsCount,
        activeSessionsCount: liveSessionNamespace.adapter.rooms.size,
        activeWorkbookUsers: workbookNamespace.adapter.rooms.size,
        timestamp: new Date().toISOString(),
      };

      socket.emit('system:metrics', metrics);
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(metricsInterval);
      console.log(`Admin ${socket.userData.name} disconnected from admin panel`);
    });
  });

  // Store io instance for use in API routes
  global.io = io;
  global.liveSessionNamespace = liveSessionNamespace;
  global.workbookNamespace = workbookNamespace;
  global.adminNamespace = adminNamespace;

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running with namespaces:`);
    console.log(`  - /live-sessions (real-time sessions)`);
    console.log(`  - /workbook (collaborative editing)`);
    console.log(`  - /admin (system monitoring)`);
  });
});