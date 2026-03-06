'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  CheckCircle,
  Circle,
  Clock,
  Award,
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  Target,
  Bookmark,
  Share2,
  Download,
  MessageSquare,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import ContentRenderer from './ContentRenderer';
import {
  WorkshopLesson,
  ContentBlock,
} from '@/types/workshop-content';

/**
 * Props for the LessonPlayer component
 */
interface LessonPlayerProps {
  /** The lesson to display */
  lesson: WorkshopLesson;
  /** Module ID for context */
  moduleId: string;
  /** Current user ID for progress tracking */
  userId?: string;
  /** Whether to auto-advance through content blocks */
  autoAdvance?: boolean;
  /** Auto-advance delay in seconds */
  autoAdvanceDelay?: number;
  /** Whether to show detailed analytics */
  showAnalytics?: boolean;
  /** Whether to enable immersive mode (minimal UI) */
  immersiveMode?: boolean;
  /** Custom playback speed (1.0 = normal) */
  playbackSpeed?: number;
  /** Whether to show captions/transcripts */
  showCaptions?: boolean;
  /** Accessibility configuration */
  accessibility?: {
    enableScreenReader?: boolean;
    enableKeyboardNavigation?: boolean;
    highContrast?: boolean;
    largeText?: boolean;
    reducedMotion?: boolean;
  };
  /** Initial progress state */
  initialProgress?: Record<string, any>;
  /** Callback when lesson is completed */
  onLessonComplete?: (lessonId: string, completionData: any) => void;
  /** Callback for progress updates */
  onProgressUpdate?: (lessonId: string, progress: number, blockProgress: Record<string, any>) => void;
  /** Callback when content block is completed */
  onBlockComplete?: (blockId: string, data: any) => void;
  /** Callback for interaction tracking */
  onInteraction?: (interaction: any) => void;
  /** Callback for navigation events */
  onNavigationRequest?: (direction: 'previous' | 'next' | 'restart') => void;
  /** Callback for player settings changes */
  onSettingsChange?: (settings: any) => void;
  /** Callback for error handling */
  onError?: (error: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Lesson player state
 */
interface LessonPlayerState {
  isPlaying: boolean;
  currentBlockIndex: number;
  completedBlocks: Set<string>;
  blockProgress: Record<string, any>;
  overallProgress: number;
  timeSpent: number;
  startTime: number;
  pausedTime: number;
  settings: {
    autoAdvance: boolean;
    autoAdvanceDelay: number;
    playbackSpeed: number;
    showCaptions: boolean;
    immersiveMode: boolean;
    enableNotifications: boolean;
  };
  analytics: {
    totalInteractions: number;
    blockCompletionTimes: Record<string, number>;
    retryCount: number;
    averageEngagement: number;
    difficultyRating?: number;
  };
}

/**
 * Player controls component
 */
const PlayerControls: React.FC<{
  state: LessonPlayerState;
  lesson: WorkshopLesson;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeedChange: (speed: number) => void;
  onSettingsToggle: () => void;
  showAnalytics: boolean;
}> = ({
  state,
  lesson,
  onPlay,
  onPause,
  onRestart,
  onPrevious,
  onNext,
  onSpeedChange,
  onSettingsToggle,
  showAnalytics,
}) => {
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedTimeRemaining = useMemo(() => {
    const completedBlocks = state.completedBlocks.size;
    const totalBlocks = lesson.content.blocks.length;
    const remainingBlocks = totalBlocks - completedBlocks;
    const avgTimePerBlock = lesson.estimatedMinutes / totalBlocks;
    return Math.ceil(remainingBlocks * avgTimePerBlock * 60); // in seconds
  }, [state.completedBlocks.size, lesson.content.blocks.length, lesson.estimatedMinutes]);

  return (
    <Card className="bg-background-secondary border-border-primary">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Progress Overview */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">
                {state.completedBlocks.size} of {lesson.content.blocks.length} blocks completed
              </span>
              <span className="text-text-secondary">
                {Math.round(state.overallProgress)}%
              </span>
            </div>
            <Progress value={state.overallProgress} className="h-2" />
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onRestart}
              aria-label="Restart lesson"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={state.currentBlockIndex === 0}
              aria-label="Previous block"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              onClick={state.isPlaying ? onPause : onPlay}
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white rounded-full p-3"
              aria-label={state.isPlaying ? 'Pause lesson' : 'Play lesson'}
            >
              {state.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={state.currentBlockIndex >= lesson.content.blocks.length - 1}
              aria-label="Next block"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSpeedOptions(!showSpeedOptions)}
                aria-label="Playback speed"
              >
                {state.settings.playbackSpeed}x
              </Button>
              {showSpeedOptions && (
                <div className="absolute bottom-full mb-2 left-0 bg-background-secondary border border-border-primary rounded-lg shadow-lg p-2 min-w-16">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        onSpeedChange(speed);
                        setShowSpeedOptions(false);
                      }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-background-accent ${
                        state.settings.playbackSpeed === speed ? 'bg-tomb45-green/20 text-tomb45-green' : 'text-text-primary'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onSettingsToggle}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Time Information */}
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Time spent: {formatTime(state.timeSpent)}</span>
            <span>Estimated remaining: {formatTime(estimatedTimeRemaining)}</span>
          </div>

          {/* Auto-advance indicator */}
          {state.settings.autoAdvance && (
            <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
              <Zap className="w-3 h-3" />
              <span>Auto-advancing ({state.settings.autoAdvanceDelay}s delay)</span>
            </div>
          )}

          {/* Quick Analytics (if enabled) */}
          {showAnalytics && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-background-accent rounded">
                <div className="text-sm font-medium text-text-primary">{state.analytics.totalInteractions}</div>
                <div className="text-xs text-text-secondary">Interactions</div>
              </div>
              <div className="p-2 bg-background-accent rounded">
                <div className="text-sm font-medium text-text-primary">{state.analytics.retryCount}</div>
                <div className="text-xs text-text-secondary">Retries</div>
              </div>
              <div className="p-2 bg-background-accent rounded">
                <div className="text-sm font-medium text-text-primary">{Math.round(state.analytics.averageEngagement)}%</div>
                <div className="text-xs text-text-secondary">Engagement</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Lesson analytics component
 */
const LessonAnalytics: React.FC<{
  state: LessonPlayerState;
  lesson: WorkshopLesson;
}> = ({ state, lesson }) => {
  const completionRate = (state.completedBlocks.size / lesson.content.blocks.length) * 100;
  const averageTimePerBlock = state.timeSpent / Math.max(state.completedBlocks.size, 1);

  return (
    <Card className="bg-background-secondary border-border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-tomb45-green" />
          Learning Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-background-accent rounded-lg">
            <div className="text-2xl font-bold text-tomb45-green">{Math.round(completionRate)}%</div>
            <div className="text-xs text-text-secondary">Completion Rate</div>
          </div>
          <div className="text-center p-3 bg-background-accent rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{Math.floor(state.timeSpent / 60)}m</div>
            <div className="text-xs text-text-secondary">Time Spent</div>
          </div>
          <div className="text-center p-3 bg-background-accent rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{state.analytics.totalInteractions}</div>
            <div className="text-xs text-text-secondary">Interactions</div>
          </div>
          <div className="text-center p-3 bg-background-accent rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{Math.round(averageTimePerBlock)}s</div>
            <div className="text-xs text-text-secondary">Avg/Block</div>
          </div>
        </div>

        {/* Block Completion Timeline */}
        <div>
          <h4 className="font-medium text-text-primary mb-3">Content Block Progress</h4>
          <div className="space-y-2">
            {lesson.content.blocks.map((block, index) => {
              const isCompleted = state.completedBlocks.has(block.id);
              const completionTime = state.analytics.blockCompletionTimes[block.id];

              return (
                <div key={block.id} className="flex items-center gap-3 p-2 rounded-lg bg-background-accent">
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm text-text-primary">
                      {block.title || `Block ${index + 1}`} ({block.type})
                    </span>
                    {completionTime && (
                      <span className="text-xs text-text-secondary ml-2">
                        ({Math.round(completionTime / 1000)}s)
                      </span>
                    )}
                  </div>
                  {isCompleted && (
                    <Badge variant="outline" className="text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Engagement Insights */}
        <div>
          <h4 className="font-medium text-text-primary mb-3">Engagement Insights</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-background-accent rounded">
              <span className="text-sm text-text-secondary">Average Engagement</span>
              <span className="text-sm font-medium text-text-primary">
                {Math.round(state.analytics.averageEngagement)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-background-accent rounded">
              <span className="text-sm text-text-secondary">Retry Rate</span>
              <span className="text-sm font-medium text-text-primary">
                {Math.round((state.analytics.retryCount / Math.max(state.completedBlocks.size, 1)) * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-background-accent rounded">
              <span className="text-sm text-text-secondary">Focus Time</span>
              <span className="text-sm font-medium text-text-primary">
                {Math.round((state.timeSpent / (lesson.estimatedMinutes * 60)) * 100)}% of estimated
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main LessonPlayer component
 */
export default function LessonPlayer({
  lesson,
  moduleId,
  userId,
  autoAdvance = false,
  autoAdvanceDelay = 3,
  showAnalytics = false,
  immersiveMode = false,
  playbackSpeed = 1.0,
  showCaptions = false,
  accessibility = {},
  initialProgress = {},
  onLessonComplete,
  onProgressUpdate,
  onBlockComplete,
  onInteraction,
  onNavigationRequest,
  onSettingsChange,
  onError,
  className = '',
}: LessonPlayerProps) {
  // Main player state
  const [state, setState] = useState<LessonPlayerState>({
    isPlaying: false,
    currentBlockIndex: 0,
    completedBlocks: new Set(Object.keys(initialProgress).filter(id => initialProgress[id]?.completed)),
    blockProgress: initialProgress,
    overallProgress: 0,
    timeSpent: 0,
    startTime: Date.now(),
    pausedTime: 0,
    settings: {
      autoAdvance,
      autoAdvanceDelay,
      playbackSpeed,
      showCaptions,
      immersiveMode,
      enableNotifications: true,
    },
    analytics: {
      totalInteractions: 0,
      blockCompletionTimes: {},
      retryCount: 0,
      averageEngagement: 0,
    },
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout>();
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout>();

  // Calculate overall progress
  useEffect(() => {
    const progress = (state.completedBlocks.size / lesson.content.blocks.length) * 100;
    setState(prev => ({ ...prev, overallProgress: progress }));
    onProgressUpdate?.(lesson.id, progress, state.blockProgress);
  }, [state.completedBlocks.size, lesson.content.blocks.length, lesson.id, onProgressUpdate, state.blockProgress]);

  // Timer for tracking time spent
  useEffect(() => {
    if (state.isPlaying) {
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1,
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isPlaying]);

  // Auto-advance logic
  useEffect(() => {
    if (state.settings.autoAdvance && state.isPlaying) {
      // This would be triggered by content completion in the ContentRenderer
      // For now, we'll handle it in the block completion callback
    }
  }, [state.settings.autoAdvance, state.isPlaying]);

  // Check lesson completion
  useEffect(() => {
    if (state.completedBlocks.size === lesson.content.blocks.length && state.completedBlocks.size > 0) {
      onLessonComplete?.(lesson.id, {
        completedBlocks: Array.from(state.completedBlocks),
        timeSpent: state.timeSpent,
        analytics: state.analytics,
        completedAt: new Date().toISOString(),
      });
    }
  }, [state.completedBlocks.size, lesson.content.blocks.length, lesson.id, state.timeSpent, state.analytics, onLessonComplete]);

  const handlePlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
      startTime: prev.startTime || Date.now(),
    }));
    onInteraction?.({ type: 'play', timestamp: Date.now(), lessonId: lesson.id });
  }, [lesson.id, onInteraction]);

  const handlePause = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      pausedTime: Date.now(),
    }));
    onInteraction?.({ type: 'pause', timestamp: Date.now(), lessonId: lesson.id });
  }, [lesson.id, onInteraction]);

  const handleRestart = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentBlockIndex: 0,
      completedBlocks: new Set(),
      blockProgress: {},
      overallProgress: 0,
      timeSpent: 0,
      startTime: Date.now(),
      analytics: {
        ...prev.analytics,
        retryCount: prev.analytics.retryCount + 1,
      },
    }));
    onInteraction?.({ type: 'restart', timestamp: Date.now(), lessonId: lesson.id });
  }, [lesson.id, onInteraction]);

  const handlePrevious = useCallback(() => {
    if (state.currentBlockIndex > 0) {
      setState(prev => ({
        ...prev,
        currentBlockIndex: prev.currentBlockIndex - 1,
      }));
    } else {
      onNavigationRequest?.('previous');
    }
  }, [state.currentBlockIndex, onNavigationRequest]);

  const handleNext = useCallback(() => {
    if (state.currentBlockIndex < lesson.content.blocks.length - 1) {
      setState(prev => ({
        ...prev,
        currentBlockIndex: prev.currentBlockIndex + 1,
      }));
    } else {
      onNavigationRequest?.('next');
    }
  }, [state.currentBlockIndex, lesson.content.blocks.length, onNavigationRequest]);

  const handleSpeedChange = useCallback((speed: number) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, playbackSpeed: speed },
    }));
    onSettingsChange?.({ playbackSpeed: speed });
  }, [onSettingsChange]);

  const handleBlockComplete = useCallback((blockId: string, data: any) => {
    const blockStartTime = state.analytics.blockCompletionTimes[blockId] || Date.now();
    const completionTime = Date.now() - blockStartTime;

    setState(prev => {
      const newCompletedBlocks = new Set(prev.completedBlocks);
      newCompletedBlocks.add(blockId);

      const newBlockProgress = {
        ...prev.blockProgress,
        [blockId]: { ...data, completed: true, completedAt: new Date().toISOString() },
      };

      const newAnalytics = {
        ...prev.analytics,
        totalInteractions: prev.analytics.totalInteractions + 1,
        blockCompletionTimes: {
          ...prev.analytics.blockCompletionTimes,
          [blockId]: completionTime,
        },
        averageEngagement: Math.min(100, prev.analytics.averageEngagement + 5), // Simple engagement boost
      };

      return {
        ...prev,
        completedBlocks: newCompletedBlocks,
        blockProgress: newBlockProgress,
        analytics: newAnalytics,
      };
    });

    onBlockComplete?.(blockId, data);
    onInteraction?.({ type: 'block_complete', blockId, data, timestamp: Date.now() });

    // Auto-advance to next block if enabled
    if (state.settings.autoAdvance && state.currentBlockIndex < lesson.content.blocks.length - 1) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentBlockIndex: prev.currentBlockIndex + 1,
        }));
      }, state.settings.autoAdvanceDelay * 1000);
    }
  }, [state.analytics.blockCompletionTimes, state.blockProgress, state.analytics, state.settings.autoAdvance, state.currentBlockIndex, lesson.content.blocks.length, state.settings.autoAdvanceDelay, onBlockComplete, onInteraction]);

  const handleAllContentComplete = useCallback((results: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      completedBlocks: new Set(lesson.content.blocks.map(b => b.id)),
      overallProgress: 100,
    }));
    onInteraction?.({ type: 'lesson_complete', results, timestamp: Date.now() });
  }, [lesson.content.blocks, onInteraction]);

  const handleInteractionEvent = useCallback((blockId: string, interactionType: string, data: any) => {
    setState(prev => ({
      ...prev,
      analytics: {
        ...prev.analytics,
        totalInteractions: prev.analytics.totalInteractions + 1,
      },
    }));
    onInteraction?.({ type: interactionType, blockId, data, timestamp: Date.now() });
  }, [onInteraction]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  const currentBlock = lesson.content.blocks[state.currentBlockIndex];

  return (
    <div className={`space-y-6 ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background-primary p-6' : ''}`}>
      {/* Lesson Header */}
      {!state.settings.immersiveMode && (
        <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">{lesson.title}</h1>
                {lesson.description && (
                  <p className="text-text-secondary">{lesson.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {lesson.type}
                  </Badge>
                  <span className="text-text-secondary flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lesson.estimatedMinutes} minutes
                  </span>
                  <span className="text-text-secondary flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {lesson.content.blocks.length} blocks
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showAnalytics && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className={`${!state.settings.immersiveMode ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
          {/* Player Controls */}
          {!state.settings.immersiveMode && (
            <PlayerControls
              state={state}
              lesson={lesson}
              onPlay={handlePlay}
              onPause={handlePause}
              onRestart={handleRestart}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSpeedChange={handleSpeedChange}
              onSettingsToggle={() => setShowSettings(!showSettings)}
              showAnalytics={showAnalytics}
            />
          )}

          {/* Content Renderer */}
          <ContentRenderer
            contentBlocks={[currentBlock]}
            onBlockComplete={handleBlockComplete}
            onAllComplete={handleAllContentComplete}
            onInteraction={handleInteractionEvent}
            progress={state.blockProgress}
            readonly={false}
            showProgress={!state.settings.immersiveMode}
            autoAdvance={state.settings.autoAdvance}
            accessibility={accessibility}
            enableOfflineMode={true}
          />

          {/* Block Navigation */}
          {!state.settings.immersiveMode && lesson.content.blocks.length > 1 && (
            <Card className="bg-background-secondary border-border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={state.currentBlockIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous Block
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-text-secondary">
                      Block {state.currentBlockIndex + 1} of {lesson.content.blocks.length}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {lesson.content.blocks.map((block, index) => (
                        <button
                          key={block.id}
                          onClick={() => setState(prev => ({ ...prev, currentBlockIndex: index }))}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === state.currentBlockIndex
                              ? 'bg-tomb45-green'
                              : state.completedBlocks.has(block.id)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                          aria-label={`Go to block ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={state.currentBlockIndex >= lesson.content.blocks.length - 1}
                  >
                    Next Block
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        {!state.settings.immersiveMode && (
          <div className="space-y-6">
            {/* Quick Progress */}
            <Card className="bg-background-secondary border-border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-tomb45-green" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-tomb45-green mb-1">
                    {Math.round(state.overallProgress)}%
                  </div>
                  <p className="text-xs text-text-secondary">Complete</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Blocks</span>
                    <span className="text-text-primary">{state.completedBlocks.size}/{lesson.content.blocks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Time</span>
                    <span className="text-text-primary">{Math.floor(state.timeSpent / 60)}m {state.timeSpent % 60}s</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Interactions</span>
                    <span className="text-text-primary">{state.analytics.totalInteractions}</span>
                  </div>
                </div>

                {state.overallProgress === 100 && (
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-green-800 text-sm font-medium">Lesson Complete!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Panel */}
            {showAnalytics && showAnalyticsPanel && (
              <LessonAnalytics state={state} lesson={lesson} />
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="bg-background-secondary border-border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-tomb45-green" />
                Player Settings
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.settings.autoAdvance}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      settings: { ...prev.settings, autoAdvance: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Auto-advance blocks</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.settings.immersiveMode}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      settings: { ...prev.settings, immersiveMode: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Immersive mode</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.settings.showCaptions}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      settings: { ...prev.settings, showCaptions: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Show captions</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.settings.enableNotifications}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      settings: { ...prev.settings, enableNotifications: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-text-primary">Enable notifications</span>
                </label>
              </div>
            </div>

            {state.settings.autoAdvance && (
              <div>
                <label className="block text-sm text-text-primary mb-2">
                  Auto-advance delay: {state.settings.autoAdvanceDelay}s
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={state.settings.autoAdvanceDelay}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    settings: { ...prev.settings, autoAdvanceDelay: parseInt(e.target.value, 10) }
                  }))}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { LessonPlayer };
export type { LessonPlayerProps };