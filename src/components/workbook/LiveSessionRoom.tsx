/**
 * LiveSessionRoom - Real-time collaborative session component
 * Provides live video/audio sessions with chat, polls, Q&A, and screen sharing
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveSessionSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageCircle,
  Hand,
  Users,
  Settings,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  MoreVertical,
  Send,
  PollIcon as Poll,
  HelpCircle,
  Maximize,
  Minimize,
  Copy,
  Share,
} from 'lucide-react';

interface LiveSessionRoomProps {
  sessionId: string;
  onLeave?: () => void;
}

interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  volume: number;
  outputMuted: boolean;
}

interface Participant {
  userId: string;
  userData: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  connectionId: string;
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    isSpeaking: boolean;
    handRaised: boolean;
  };
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

export default function LiveSessionRoom({
  sessionId,
  onLeave,
}: LiveSessionRoomProps) {
  const {
    socket,
    connectionState,
    sessionParticipants,
    sessionMessages,
    currentPoll,
    joinSession,
    leaveSession,
    emit,
    on,
    off,
  } = useLiveSessionSocket();

  // Media state
  const [mediaState, setMediaState] = useState<MediaState>({
    audioEnabled: false,
    videoEnabled: false,
    screenSharing: false,
    volume: 100,
    outputMuted: false,
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'chat' | 'participants' | 'polls' | 'qa'
  >('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    if (sessionId) {
      joinSession(sessionId);
    }

    return () => {
      leaveSession();
    };
  }, [sessionId, joinSession, leaveSession]);

  // Media stream management
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setMediaState(prev => ({
        ...prev,
        audioEnabled: true,
        videoEnabled: true,
      }));
    } catch (error) {
      console.error('Failed to initialize media:', error);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    setMediaState(prev => {
      const newState = { ...prev, audioEnabled: !prev.audioEnabled };

      emit('media:state-change', {
        audioEnabled: newState.audioEnabled,
        videoEnabled: newState.videoEnabled,
        screenSharing: newState.screenSharing,
      });

      return newState;
    });
  }, [emit]);

  const toggleVideo = useCallback(() => {
    setMediaState(prev => {
      const newState = { ...prev, videoEnabled: !prev.videoEnabled };

      emit('media:state-change', {
        audioEnabled: newState.audioEnabled,
        videoEnabled: newState.videoEnabled,
        screenSharing: newState.screenSharing,
      });

      return newState;
    });
  }, [emit]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!mediaState.screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Handle screen share stop
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setMediaState(prev => ({ ...prev, screenSharing: false }));
          emit('screen:stop-sharing');
        });

        setMediaState(prev => ({ ...prev, screenSharing: true }));
        emit('screen:start-sharing');
      } else {
        setMediaState(prev => ({ ...prev, screenSharing: false }));
        emit('screen:stop-sharing');
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  }, [mediaState.screenSharing, emit]);

  const toggleHandRaise = useCallback(() => {
    const newHandState = !handRaised;
    setHandRaised(newHandState);

    if (newHandState) {
      emit('hand:raise');
    } else {
      emit('hand:lower');
    }
  }, [handRaised, emit]);

  const sendChatMessage = useCallback(() => {
    if (chatMessage.trim() && socket) {
      emit('chat:message', {
        content: chatMessage.trim(),
        type: 'text',
        isPrivate: false,
      });
      setChatMessage('');
    }
  }, [chatMessage, emit, socket]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage]
  );

  const leaveSessionAndReturn = useCallback(() => {
    leaveSession();
    onLeave?.();
  }, [leaveSession, onLeave]);

  const copySessionLink = useCallback(() => {
    const sessionUrl = `${window.location.origin}/workbook/sessions/${sessionId}`;
    navigator.clipboard.writeText(sessionUrl);
    // You could add a toast notification here
  }, [sessionId]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [sessionMessages]);

  // Initialize media on mount
  useEffect(() => {
    initializeMedia();
  }, [initializeMedia]);

  return (
    <div className='flex h-screen bg-gray-900 text-white'>
      {/* Main video area */}
      <div className='flex-1 flex flex-col'>
        {/* Header */}
        <div className='bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700'>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <div
                className={`w-3 h-3 rounded-full ${connectionState.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className='font-medium'>Live Session</span>
              {connectionState.latency && (
                <Badge variant='secondary'>{connectionState.latency}ms</Badge>
              )}
            </div>
            <div className='flex items-center space-x-2 text-sm text-gray-400'>
              <Users className='w-4 h-4' />
              <span>{sessionParticipants.length} participants</span>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={copySessionLink}
              className='text-gray-400 hover:text-white'
            >
              <Share className='w-4 h-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={toggleFullscreen}
              className='text-gray-400 hover:text-white'
            >
              {isFullscreen ? (
                <Minimize className='w-4 h-4' />
              ) : (
                <Maximize className='w-4 h-4' />
              )}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='text-gray-400 hover:text-white'
            >
              <Settings className='w-4 h-4' />
            </Button>
          </div>
        </div>

        {/* Video grid */}
        <div className='flex-1 bg-black p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {/* Local video */}
          <div className='relative bg-gray-800 rounded-lg overflow-hidden'>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className='w-full h-full object-cover'
            />
            <div className='absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm'>
              You {handRaised && '🤚'}
            </div>
            <div className='absolute top-2 right-2 flex space-x-2'>
              {!mediaState.audioEnabled && (
                <div className='bg-red-500 p-1 rounded-full'>
                  <MicOff className='w-3 h-3' />
                </div>
              )}
              {!mediaState.videoEnabled && (
                <div className='bg-red-500 p-1 rounded-full'>
                  <VideoOff className='w-3 h-3' />
                </div>
              )}
            </div>
          </div>

          {/* Remote participants */}
          {sessionParticipants.map(participant => (
            <div
              key={participant.connectionId}
              className='relative bg-gray-800 rounded-lg overflow-hidden'
            >
              <div className='w-full h-full flex items-center justify-center'>
                {participant.userData.avatar ? (
                  <img
                    src={participant.userData.avatar}
                    alt={participant.userData.name}
                    className='w-16 h-16 rounded-full'
                  />
                ) : (
                  <div className='w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold'>
                    {participant.userData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className='absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm'>
                {participant.userData.name}{' '}
                {participant.mediaState.handRaised && '🤚'}
              </div>
              <div className='absolute top-2 right-2 flex space-x-2'>
                {!participant.mediaState.audioEnabled && (
                  <div className='bg-red-500 p-1 rounded-full'>
                    <MicOff className='w-3 h-3' />
                  </div>
                )}
                {!participant.mediaState.videoEnabled && (
                  <div className='bg-red-500 p-1 rounded-full'>
                    <VideoOff className='w-3 h-3' />
                  </div>
                )}
                {participant.mediaState.isSpeaking && (
                  <div className='bg-green-500 p-1 rounded-full animate-pulse'>
                    <Mic className='w-3 h-3' />
                  </div>
                )}
              </div>
              <div
                className={`absolute inset-0 border-2 rounded-lg ${
                  participant.connectionStatus === 'connected'
                    ? 'border-transparent'
                    : participant.connectionStatus === 'reconnecting'
                      ? 'border-yellow-500'
                      : 'border-red-500'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className='bg-gray-800 px-6 py-4 flex items-center justify-center space-x-4 border-t border-gray-700'>
          <Button
            variant={mediaState.audioEnabled ? 'default' : 'destructive'}
            size='lg'
            onClick={toggleAudio}
            className='rounded-full p-3'
          >
            {mediaState.audioEnabled ? (
              <Mic className='w-5 h-5' />
            ) : (
              <MicOff className='w-5 h-5' />
            )}
          </Button>

          <Button
            variant={mediaState.videoEnabled ? 'default' : 'destructive'}
            size='lg'
            onClick={toggleVideo}
            className='rounded-full p-3'
          >
            {mediaState.videoEnabled ? (
              <Video className='w-5 h-5' />
            ) : (
              <VideoOff className='w-5 h-5' />
            )}
          </Button>

          <Button
            variant={mediaState.screenSharing ? 'secondary' : 'ghost'}
            size='lg'
            onClick={toggleScreenShare}
            className='rounded-full p-3'
          >
            {mediaState.screenSharing ? (
              <MonitorOff className='w-5 h-5' />
            ) : (
              <Monitor className='w-5 h-5' />
            )}
          </Button>

          <Button
            variant={handRaised ? 'secondary' : 'ghost'}
            size='lg'
            onClick={toggleHandRaise}
            className='rounded-full p-3'
          >
            <Hand className='w-5 h-5' />
          </Button>

          <Button
            variant='ghost'
            size='lg'
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='rounded-full p-3'
          >
            <MessageCircle className='w-5 h-5' />
          </Button>

          <Button
            variant='destructive'
            size='lg'
            onClick={leaveSessionAndReturn}
            className='rounded-full p-3'
          >
            <PhoneOff className='w-5 h-5' />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className='w-80 bg-gray-800 border-l border-gray-700 flex flex-col'>
          {/* Tabs */}
          <div className='flex border-b border-gray-700'>
            {[
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'participants', label: 'People', icon: Users },
              { id: 'polls', label: 'Polls', icon: Poll },
              { id: 'qa', label: 'Q&A', icon: HelpCircle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className='w-4 h-4 mx-auto mb-1' />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className='flex-1 overflow-hidden'>
            {activeTab === 'chat' && (
              <div className='h-full flex flex-col'>
                <div
                  ref={chatContainerRef}
                  className='flex-1 overflow-y-auto p-4 space-y-3'
                >
                  {sessionMessages.map((message, index) => (
                    <div key={index} className='text-sm'>
                      <div className='font-medium text-blue-400 mb-1'>
                        {message.senderName}
                      </div>
                      <div className='text-gray-300'>{message.content}</div>
                      <div className='text-xs text-gray-500 mt-1'>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className='p-4 border-t border-gray-700'>
                  <div className='flex space-x-2'>
                    <Input
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder='Type a message...'
                      className='flex-1'
                    />
                    <Button onClick={sendChatMessage} size='sm'>
                      <Send className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className='p-4 space-y-3'>
                {sessionParticipants.map(participant => (
                  <div
                    key={participant.connectionId}
                    className='flex items-center space-x-3'
                  >
                    <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold'>
                      {participant.userData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className='flex-1'>
                      <div className='text-sm font-medium'>
                        {participant.userData.name}
                      </div>
                      <div className='text-xs text-gray-400'>
                        {participant.userData.role}
                      </div>
                    </div>
                    <div className='flex space-x-1'>
                      {participant.mediaState.handRaised && <span>🤚</span>}
                      {!participant.mediaState.audioEnabled && (
                        <MicOff className='w-3 h-3 text-red-500' />
                      )}
                      {!participant.mediaState.videoEnabled && (
                        <VideoOff className='w-3 h-3 text-red-500' />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'polls' && (
              <div className='p-4'>
                {currentPoll ? (
                  <Card className='p-4'>
                    <h3 className='font-medium mb-3'>{currentPoll.question}</h3>
                    <div className='space-y-2'>
                      {currentPoll.options?.map((option: any) => (
                        <Button
                          key={option.id}
                          variant='outline'
                          className='w-full justify-start'
                          onClick={() =>
                            emit('poll:vote', {
                              pollId: currentPoll.id,
                              selectedOptions: [option.id],
                            })
                          }
                        >
                          {option.text}
                        </Button>
                      ))}
                    </div>
                  </Card>
                ) : (
                  <div className='text-center text-gray-400'>
                    No active polls
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <div className='p-4'>
                <Button
                  onClick={() => {
                    const question = prompt('Ask a question:');
                    if (question) {
                      emit('qa:question', {
                        question,
                        isAnonymous: false,
                      });
                    }
                  }}
                  className='w-full mb-4'
                >
                  Ask Question
                </Button>
                <div className='text-center text-gray-400'>
                  Q&A feature coming soon
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
