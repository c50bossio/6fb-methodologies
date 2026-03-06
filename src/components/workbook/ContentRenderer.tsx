'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Circle,
  Calculator,
  FileText,
  Target,
  Users,
  PlayCircle,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Star,
  Save,
  Download,
  Share2,
  AlertTriangle,
  Info,
  Clock,
  Award,
  Image as ImageIcon,
  Video,
  Music,
  HelpCircle,
  Zap,
  CheckSquare,
  Exercise,
  PenTool,
  Download as DownloadIcon,
  Minus,
  Lightbulb,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  SkipForward,
  SkipBack,
  Settings,
  Bookmark,
  Share,
  Copy,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import {
  ContentBlock,
  TextContentBlock,
  VideoContentBlock,
  AudioContentBlock,
  ImageContentBlock,
  QuizContentBlock,
  InteractiveContentBlock,
  ChecklistContentBlock,
  ExerciseContentBlock,
  ReflectionContentBlock,
  DownloadContentBlock,
  SeparatorContentBlock,
  CalloutContentBlock,
  InteractiveComponentType,
} from '@/types/workshop-content';

/**
 * Props for individual content block renderers
 */
interface ContentBlockRendererProps {
  block: ContentBlock;
  onComplete?: (blockId: string, data?: any) => void;
  onInteraction?: (blockId: string, interactionType: string, data: any) => void;
  onTimeUpdate?: (blockId: string, timeSpent: number) => void;
  readonly?: boolean;
  progress?: any;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  enableKeyboardNavigation?: boolean;
}

/**
 * Props for the main Content Renderer
 */
interface ContentRendererProps {
  contentBlocks: ContentBlock[];
  onBlockComplete?: (blockId: string, data?: any) => void;
  onAllComplete?: (results: Record<string, any>) => void;
  onInteraction?: (blockId: string, interactionType: string, data: any) => void;
  onTimeUpdate?: (blockId: string, timeSpent: number) => void;
  onProgressUpdate?: (progress: number) => void;
  progress?: Record<string, any>;
  readonly?: boolean;
  showProgress?: boolean;
  autoAdvance?: boolean;
  enableOfflineMode?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  accessibility?: {
    enableScreenReader?: boolean;
    enableKeyboardNavigation?: boolean;
    highContrast?: boolean;
    largeText?: boolean;
  };
}

/**
 * Accessibility utilities
 */
const useAccessibility = (enabled: boolean = true) => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const announce = useCallback((message: string) => {
    if (enabled) {
      setAnnouncements(prev => [...prev, message]);
      // Clear announcement after 3 seconds
      setTimeout(() => {
        setAnnouncements(prev => prev.slice(1));
      }, 3000);
    }
  }, [enabled]);

  return { announce, announcements };
};

/**
 * Time tracking hook for progress measurement
 */
const useTimeTracking = (blockId: string, onTimeUpdate?: (blockId: string, timeSpent: number) => void) => {
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const spent = Math.floor((currentTime - startTime) / 1000);
      setTimeSpent(spent);
      onTimeUpdate?.(blockId, spent);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [blockId, startTime, onTimeUpdate]);

  return timeSpent;
};

/**
 * Offline content caching hook
 */
const useOfflineCache = (enabled: boolean = false) => {
  const [cachedContent, setCachedContent] = useState<Map<string, any>>(new Map());

  const cacheContent = useCallback(async (key: string, data: any) => {
    if (enabled && 'caches' in window) {
      try {
        const cache = await caches.open('workshop-content-v1');
        await cache.put(key, new Response(JSON.stringify(data)));
        setCachedContent(prev => new Map(prev.set(key, data)));
      } catch (error) {
        console.warn('Failed to cache content:', error);
      }
    }
  }, [enabled]);

  const getCachedContent = useCallback(async (key: string) => {
    if (enabled && 'caches' in window) {
      try {
        const cache = await caches.open('workshop-content-v1');
        const response = await cache.match(key);
        if (response) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Failed to retrieve cached content:', error);
      }
    }
    return cachedContent.get(key);
  }, [enabled, cachedContent]);

  return { cacheContent, getCachedContent };
};

/**
 * Text Content Block Renderer with enhanced formatting and accessibility
 */
const TextContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  className = '',
  accessibility = {},
}) => {
  const textBlock = block as TextContentBlock;
  const timeSpent = useTimeTracking(block.id, undefined);
  const { announce } = useAccessibility(accessibility.enableScreenReader);
  const [isRead, setIsRead] = useState(progress?.completed || false);

  const estimatedReadTime = useMemo(() => {
    const wordsPerMinute = 200;
    const wordCount = textBlock.content.text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }, [textBlock.content.text]);

  useEffect(() => {
    if (!isRead && timeSpent >= estimatedReadTime * 60) {
      setIsRead(true);
      onComplete?.(block.id, {
        readTime: timeSpent,
        wordCount: textBlock.content.text.split(/\s+/).length,
        completedAt: new Date().toISOString(),
      });
      announce('Text content completed');
    }
  }, [timeSpent, estimatedReadTime, isRead, block.id, onComplete, textBlock.content.text, announce]);

  const formatText = (text: string, format: string) => {
    switch (format) {
      case 'markdown':
        // Simple markdown parsing (in production, use a proper markdown parser)
        return text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
          .replace(/\n/g, '<br>');
      case 'html':
        return text;
      default:
        return text.replace(/\n/g, '<br>');
    }
  };

  const textStyles = {
    fontSize: textBlock.content.fontSize === 'small' ? 'text-sm' :
              textBlock.content.fontSize === 'large' ? 'text-lg' : 'text-base',
    textAlign: textBlock.content.alignment === 'center' ? 'text-center' :
               textBlock.content.alignment === 'right' ? 'text-right' : 'text-left',
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <FileText className="w-5 h-5" />
              {block.title}
              {isRead && <CheckCircle className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {estimatedReadTime} min read
            </Badge>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div
          className={`prose prose-sm max-w-none text-text-primary ${textStyles.fontSize} ${textStyles.textAlign}`}
          dangerouslySetInnerHTML={{
            __html: formatText(textBlock.content.text, textBlock.content.format),
          }}
          role="main"
          aria-label={block.title || 'Text content'}
        />

        {/* Reading progress */}
        <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border-primary pt-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Reading time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress
              value={Math.min((timeSpent / (estimatedReadTime * 60)) * 100, 100)}
              className="w-20 h-2"
            />
            <span>{Math.min(Math.round((timeSpent / (estimatedReadTime * 60)) * 100), 100)}%</span>
          </div>
        </div>

        {!isRead && (
          <Button
            onClick={() => {
              setIsRead(true);
              onComplete?.(block.id, {
                readTime: timeSpent,
                manuallyCompleted: true,
                completedAt: new Date().toISOString(),
              });
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Read
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Video Content Block Renderer with advanced player controls
 */
const VideoContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  autoPlay = false,
  showControls = true,
  className = '',
}) => {
  const videoBlock = block as VideoContentBlock;
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(progress?.currentTime || 0);
  const [duration, setDuration] = useState(videoBlock.content.duration || 0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [watchTime, setWatchTime] = useState(progress?.watchTime || 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timeSpent = useTimeTracking(block.id, undefined);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    onComplete?.(block.id, {
      watchedDuration: duration,
      totalWatchTime: watchTime,
      completedAt: new Date().toISOString(),
      playbackSpeed,
      interactions: progress?.interactions || [],
    });
  }, [block.id, duration, watchTime, onComplete, playbackSpeed, progress?.interactions]);

  const handlePlayPause = useCallback(() => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);

    if (videoRef.current) {
      if (newPlayState) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }

    onInteraction?.(block.id, newPlayState ? 'play' : 'pause', {
      currentTime,
      timestamp: new Date().toISOString(),
      watchTime,
    });
  }, [isPlaying, currentTime, block.id, onInteraction, watchTime]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    onInteraction?.(block.id, 'seek', { seekTo: time, timestamp: new Date().toISOString() });
  }, [block.id, onInteraction]);

  const handleChapterClick = useCallback((startTime: number) => {
    handleSeek(startTime);
    onInteraction?.(block.id, 'chapter_navigation', { chapterTime: startTime });
  }, [handleSeek, block.id, onInteraction]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 10));
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          setMuted(!muted);
          break;
      }
    };

    if (showControls) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [handlePlayPause, currentTime, duration, handleSeek, toggleFullscreen, muted, showControls]);

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Video className="w-5 h-5" />
              {block.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatTime(duration)}
              </Badge>
              {progress?.completed && (
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  Completed
                </Badge>
              )}
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Video Player Container */}
        <div
          ref={containerRef}
          className={`relative bg-black rounded-lg overflow-hidden aspect-video ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
          }`}
        >
          {/* Actual Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            poster={videoBlock.content.posterUrl}
            muted={muted}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              setCurrentTime(video.currentTime);
              setWatchTime(prev => prev + 1);
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              setDuration(video.duration);
            }}
            onEnded={handleVideoEnd}
          >
            {videoBlock.content.quality?.map((quality) => (
              <source key={quality.resolution} src={quality.url} />
            ))}
            <source src={videoBlock.content.videoUrl} />
            <track kind="captions" src={videoBlock.content.transcriptUrl} srcLang="en" />
            Your browser does not support the video tag.
          </video>

          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white rounded-full p-4"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </Button>
          </div>

          {/* Video Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
              <div className="space-y-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 text-white">
                  <button
                    onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    className="p-1 hover:bg-white/20 rounded"
                    aria-label="Rewind 10 seconds"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <div
                    className="flex-1 bg-white/20 rounded-full h-2 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      handleSeek(percent * duration);
                    }}
                  >
                    <div
                      className="bg-tomb45-green h-full rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  <button
                    onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                    className="p-1 hover:bg-white/20 rounded"
                    aria-label="Fast forward 10 seconds"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMuted(!muted)}
                      className="text-white hover:bg-white/20 p-1"
                      aria-label={muted ? 'Unmute' : 'Mute'}
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setVolume(newVolume);
                        if (videoRef.current) {
                          videoRef.current.volume = newVolume;
                        }
                      }}
                      className="w-16"
                    />

                    <select
                      value={playbackSpeed}
                      onChange={(e) => {
                        const speed = parseFloat(e.target.value);
                        setPlaybackSpeed(speed);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = speed;
                        }
                      }}
                      className="bg-transparent text-white text-sm"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 p-1"
                      aria-label="Toggle fullscreen"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Chapters */}
        {videoBlock.content.chapters && videoBlock.content.chapters.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-text-primary">Chapters</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {videoBlock.content.chapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => handleChapterClick(chapter.startTime)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    currentTime >= chapter.startTime &&
                    (!videoBlock.content.chapters![index + 1] || currentTime < videoBlock.content.chapters![index + 1].startTime)
                      ? 'bg-tomb45-green/20 border border-tomb45-green/30'
                      : 'bg-background-accent hover:bg-background-primary'
                  }`}
                  aria-label={`Jump to chapter: ${chapter.title}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary font-medium">{chapter.title}</span>
                    <span className="text-xs text-text-secondary">
                      {formatTime(chapter.startTime)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Watch Progress */}
        <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border-primary pt-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Watch time: {Math.floor(watchTime / 60)}m {watchTime % 60}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Progress: {Math.round((currentTime / duration) * 100)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Audio Content Block Renderer with waveform visualization
 */
const AudioContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  autoPlay = false,
  className = '',
}) => {
  const audioBlock = block as AudioContentBlock;
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(progress?.currentTime || 0);
  const [duration, setDuration] = useState(audioBlock.content.duration || 0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [listenTime, setListenTime] = useState(progress?.listenTime || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false);
    onComplete?.(block.id, {
      listenedDuration: duration,
      totalListenTime: listenTime,
      completedAt: new Date().toISOString(),
      playbackSpeed,
    });
  }, [block.id, duration, listenTime, onComplete, playbackSpeed]);

  const handlePlayPause = useCallback(() => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);

    if (audioRef.current) {
      if (newPlayState) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }

    onInteraction?.(block.id, newPlayState ? 'play' : 'pause', {
      currentTime,
      timestamp: new Date().toISOString(),
      listenTime,
    });
  }, [isPlaying, currentTime, block.id, onInteraction, listenTime]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    onInteraction?.(block.id, 'seek', { seekTo: time, timestamp: new Date().toISOString() });
  }, [block.id, onInteraction]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Waveform visualization (simplified)
  const WaveformVisualization = () => {
    const bars = audioBlock.content.waveformData || Array.from({ length: 100 }, () => Math.random());

    return (
      <div className="flex items-center justify-center h-16 gap-1 bg-background-accent rounded p-2">
        {bars.map((height, index) => (
          <div
            key={index}
            className={`w-1 bg-tomb45-green rounded-full transition-all cursor-pointer ${
              (index / bars.length) <= (currentTime / duration) ? 'opacity-100' : 'opacity-30'
            }`}
            style={{ height: `${height * 60}%` }}
            onClick={() => handleSeek((index / bars.length) * duration)}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Music className="w-5 h-5" />
              {block.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatTime(duration)}
              </Badge>
              {progress?.completed && (
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  Completed
                </Badge>
              )}
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => {
            const audio = e.target as HTMLAudioElement;
            setCurrentTime(audio.currentTime);
            setListenTime(prev => prev + 1);
          }}
          onLoadedMetadata={(e) => {
            const audio = e.target as HTMLAudioElement;
            setDuration(audio.duration);
          }}
          onEnded={handleAudioEnd}
        >
          <source src={audioBlock.content.audioUrl} />
          Your browser does not support the audio tag.
        </audio>

        {/* Waveform Visualization */}
        <WaveformVisualization />

        {/* Audio Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              variant="outline"
              size="sm"
              aria-label="Rewind 10 seconds"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white rounded-full p-3"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>

            <Button
              onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
              variant="outline"
              size="sm"
              aria-label="Fast forward 10 seconds"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {formatTime(currentTime)}
            </span>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-text-secondary" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (audioRef.current) {
                    audioRef.current.volume = newVolume;
                  }
                }}
                className="w-20"
              />
              <select
                value={playbackSpeed}
                onChange={(e) => {
                  const speed = parseFloat(e.target.value);
                  setPlaybackSpeed(speed);
                  if (audioRef.current) {
                    audioRef.current.playbackRate = speed;
                  }
                }}
                className="text-sm bg-background-accent border border-border-primary rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            <span className="text-sm text-text-secondary">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Audio Chapters */}
        {audioBlock.content.chapters && audioBlock.content.chapters.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-text-primary">Chapters</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {audioBlock.content.chapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => handleSeek(chapter.startTime)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    currentTime >= chapter.startTime &&
                    (!audioBlock.content.chapters![index + 1] || currentTime < audioBlock.content.chapters![index + 1].startTime)
                      ? 'bg-tomb45-green/20 border border-tomb45-green/30'
                      : 'bg-background-accent hover:bg-background-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary font-medium">{chapter.title}</span>
                    <span className="text-xs text-text-secondary">
                      {formatTime(chapter.startTime)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Listen Progress */}
        <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border-primary pt-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Listen time: {Math.floor(listenTime / 60)}m {listenTime % 60}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Progress: {Math.round((currentTime / duration) * 100)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Image Content Block Renderer with zoom and accessibility
 */
const ImageContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  className = '',
}) => {
  const imageBlock = block as ImageContentBlock;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [viewTime] = useState(0);

  useEffect(() => {
    if (imageLoaded && !progress?.completed) {
      // Auto-complete after 3 seconds of viewing
      const timer = setTimeout(() => {
        onComplete?.(block.id, {
          viewTime,
          completedAt: new Date().toISOString(),
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded, progress?.completed, block.id, onComplete, viewTime]);

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
    onInteraction?.(block.id, isZoomed ? 'zoom_out' : 'zoom_in', {
      timestamp: new Date().toISOString(),
    });
  };

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    full: 'justify-center',
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <ImageIcon className="w-5 h-5" />
            {block.title}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <div className={`flex ${alignmentClasses[imageBlock.content.alignment || 'center']}`}>
          <div className="relative">
            <img
              src={imageBlock.content.imageUrl}
              alt={imageBlock.content.altText}
              className={`rounded-lg cursor-pointer transition-all duration-300 ${
                imageBlock.content.alignment === 'full' ? 'w-full' : ''
              } ${isZoomed ? 'fixed inset-0 z-50 object-contain bg-black bg-opacity-90' : 'max-w-full h-auto'}`}
              style={{
                width: imageBlock.content.width && !isZoomed ? `${imageBlock.content.width}px` : undefined,
                height: imageBlock.content.height && !isZoomed ? `${imageBlock.content.height}px` : undefined,
              }}
              onClick={handleImageClick}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {isZoomed && (
              <Button
                onClick={handleImageClick}
                className="fixed top-4 right-4 z-50 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {imageBlock.content.caption && (
          <p className="text-sm text-text-secondary mt-3 text-center italic">
            {imageBlock.content.caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Quiz Content Block Renderer with advanced scoring and feedback
 */
const QuizContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  readonly = false,
  className = '',
}) => {
  const quizBlock = block as QuizContentBlock;
  const [responses, setResponses] = useState<Record<string, any>>(progress?.responses || {});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(progress?.completed || false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(progress?.score || 0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());

  const handleResponseChange = useCallback((questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);

    onInteraction?.(block.id, 'question_answered', {
      questionId,
      value,
      questionIndex: currentQuestion,
      timestamp: new Date().toISOString(),
    });
  }, [responses, block.id, onInteraction, currentQuestion]);

  const calculateScore = useCallback(() => {
    let correctAnswers = 0;
    let totalQuestions = quizBlock.content.questions.length;

    quizBlock.content.questions.forEach((question) => {
      const userAnswer = responses[question.id];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    return Math.round((correctAnswers / totalQuestions) * 100);
  }, [quizBlock.content.questions, responses]);

  const handleSubmitQuiz = useCallback(() => {
    const finalScore = calculateScore();
    const timeSpentMinutes = Math.floor((Date.now() - startTime) / 60000);

    setScore(finalScore);
    setTimeSpent(timeSpentMinutes);
    setShowResults(quizBlock.content.showResults);

    const passed = finalScore >= quizBlock.content.passingScore;

    if (passed) {
      setIsCompleted(true);
      onComplete?.(block.id, {
        score: finalScore,
        responses,
        timeSpentMinutes,
        passed,
        completedAt: new Date().toISOString(),
      });
    }

    onInteraction?.(block.id, 'quiz_submitted', {
      score: finalScore,
      passed,
      timeSpentMinutes,
      responses,
    });
  }, [calculateScore, startTime, quizBlock.content.showResults, quizBlock.content.passingScore, block.id, onComplete, responses, onInteraction]);

  const nextQuestion = () => {
    if (currentQuestion < quizBlock.content.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentQuestionData = quizBlock.content.questions[currentQuestion];
  const allQuestionsAnswered = quizBlock.content.questions.every(q => responses[q.id] !== undefined);

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <HelpCircle className="w-5 h-5" />
              {block.title}
              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {quizBlock.content.questions.length} questions
              </Badge>
              <Badge variant="outline" className="text-xs">
                {quizBlock.content.passingScore}% to pass
              </Badge>
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {!showResults && !isCompleted ? (
          <>
            {/* Question Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Question {currentQuestion + 1} of {quizBlock.content.questions.length}
                </span>
                <span className="text-text-secondary">
                  {Math.round(((currentQuestion + 1) / quizBlock.content.questions.length) * 100)}% complete
                </span>
              </div>
              <Progress value={((currentQuestion + 1) / quizBlock.content.questions.length) * 100} className="h-2" />
            </div>

            {/* Current Question */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">
                {currentQuestionData.question}
              </h3>

              {/* Multiple Choice */}
              {currentQuestionData.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentQuestionData.options?.map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border-primary hover:bg-background-accent cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={currentQuestionData.id}
                        value={option}
                        checked={responses[currentQuestionData.id] === option}
                        onChange={() => handleResponseChange(currentQuestionData.id, option)}
                        disabled={readonly}
                        className="text-tomb45-green"
                      />
                      <span className="text-text-primary">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* True/False */}
              {currentQuestionData.type === 'true-false' && (
                <div className="space-y-3">
                  {['True', 'False'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border-primary hover:bg-background-accent cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={currentQuestionData.id}
                        value={option === 'True'}
                        checked={responses[currentQuestionData.id] === (option === 'True')}
                        onChange={() => handleResponseChange(currentQuestionData.id, option === 'True')}
                        disabled={readonly}
                        className="text-tomb45-green"
                      />
                      <span className="text-text-primary">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Text Input */}
              {currentQuestionData.type === 'text' && (
                <textarea
                  value={responses[currentQuestionData.id] || ''}
                  onChange={(e) => handleResponseChange(currentQuestionData.id, e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
                  rows={4}
                  disabled={readonly}
                />
              )}

              {/* Number Input */}
              {currentQuestionData.type === 'number' && (
                <input
                  type="number"
                  value={responses[currentQuestionData.id] || ''}
                  onChange={(e) => handleResponseChange(currentQuestionData.id, parseFloat(e.target.value) || 0)}
                  placeholder="Enter a number..."
                  className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
                  disabled={readonly}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-border-primary pt-4">
              <Button
                onClick={prevQuestion}
                variant="outline"
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-2">
                {currentQuestion < quizBlock.content.questions.length - 1 ? (
                  <Button
                    onClick={nextQuestion}
                    variant="outline"
                    disabled={!responses[currentQuestionData.id]}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitQuiz}
                    className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
                    disabled={!allQuestionsAnswered}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Quiz Results */
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                score >= quizBlock.content.passingScore ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {score >= quizBlock.content.passingScore ? (
                  <Award className="w-8 h-8" />
                ) : (
                  <X className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className={`text-2xl font-bold ${
                  score >= quizBlock.content.passingScore ? 'text-green-600' : 'text-red-600'
                }`}>
                  {score}%
                </h3>
                <p className="text-text-secondary">
                  {score >= quizBlock.content.passingScore ? 'Congratulations! You passed!' : 'Try again to improve your score.'}
                </p>
              </div>
            </div>

            {/* Detailed Results */}
            {showResults && (
              <div className="space-y-4">
                <h4 className="font-medium text-text-primary">Question Review</h4>
                {quizBlock.content.questions.map((question, index) => {
                  const userAnswer = responses[question.id];
                  const isCorrect = userAnswer === question.correctAnswer;

                  return (
                    <div key={question.id} className={`p-4 rounded-lg border ${
                      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-text-primary mb-2">
                            {index + 1}. {question.question}
                          </p>
                          <p className="text-sm text-text-secondary mb-1">
                            Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {String(userAnswer)}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm text-text-secondary mb-1">
                              Correct answer: <span className="text-green-600">{String(question.correctAnswer)}</span>
                            </p>
                          )}
                          {question.explanation && (
                            <p className="text-sm text-text-secondary">{question.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Retry Option */}
            {quizBlock.content.allowRetries && score < quizBlock.content.passingScore && (
              <div className="text-center">
                <Button
                  onClick={() => {
                    setResponses({});
                    setCurrentQuestion(0);
                    setShowResults(false);
                    setScore(0);
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Quiz
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Interactive Content Block Renderer for embedded components
 */
const InteractiveContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  readonly = false,
  className = '',
}) => {
  const interactiveBlock = block as InteractiveContentBlock;
  const [isCompleted, setIsCompleted] = useState(progress?.completed || false);
  const [componentData, setComponentData] = useState(progress?.data || {});

  const handleComponentComplete = useCallback((data: any) => {
    setIsCompleted(true);
    setComponentData(data);

    onComplete?.(block.id, {
      componentType: interactiveBlock.content.component,
      data,
      completedAt: new Date().toISOString(),
    });
  }, [block.id, interactiveBlock.content.component, onComplete]);

  const handleComponentInteraction = useCallback((interaction: any) => {
    onInteraction?.(block.id, 'component_interaction', {
      componentType: interactiveBlock.content.component,
      interaction,
      timestamp: new Date().toISOString(),
    });
  }, [block.id, interactiveBlock.content.component, onInteraction]);

  const renderComponent = () => {
    const componentProps = {
      ...interactiveBlock.content.props,
      onComplete: handleComponentComplete,
      onInteraction: handleComponentInteraction,
      readonly: readonly || (isCompleted && !interactiveBlock.content.saveProgress),
      initialData: componentData,
    };

    // Dynamically render the appropriate interactive component
    switch (interactiveBlock.content.component) {
      case 'QuizEngine':
        return <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800 text-center">Quiz Engine Component</p>
          <p className="text-sm text-purple-600 text-center mt-2">
            Interactive quiz component would be rendered here
          </p>
        </div>;
      case 'GoalSettingWorksheet':
        return <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-center">Goal Setting Worksheet</p>
          <p className="text-sm text-blue-600 text-center mt-2">
            SMART goals worksheet component would be rendered here
          </p>
        </div>;
      case 'RevenuePricingCalculator':
        return <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-center">Revenue & Pricing Calculator</p>
          <p className="text-sm text-green-600 text-center mt-2">
            Pricing calculator component would be rendered here
          </p>
        </div>;
      case 'ServicePackageDesigner':
        return <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-center">Service Package Designer</p>
          <p className="text-sm text-orange-600 text-center mt-2">
            Package design tool would be rendered here
          </p>
        </div>;
      case 'BusinessAssessmentTemplate':
        return <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-indigo-800 text-center">Business Assessment</p>
          <p className="text-sm text-indigo-600 text-center mt-2">
            Assessment template would be rendered here
          </p>
        </div>;
      default:
        return <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-800 text-center">Unknown Component: {interactiveBlock.content.component}</p>
        </div>;
    }
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Zap className="w-5 h-5" />
            {block.title}
            {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        {renderComponent()}

        {interactiveBlock.content.requireCompletion && !isCompleted && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">This interactive component must be completed to continue.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Checklist Content Block Renderer
 */
const ChecklistContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  readonly = false,
  className = '',
}) => {
  const checklistBlock = block as ChecklistContentBlock;
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(progress?.checkedItems || [])
  );

  const handleItemCheck = useCallback((itemId: string, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems);
    if (checked) {
      newCheckedItems.add(itemId);
    } else {
      newCheckedItems.delete(itemId);
    }
    setCheckedItems(newCheckedItems);

    onInteraction?.(block.id, 'item_checked', {
      itemId,
      checked,
      totalChecked: newCheckedItems.size,
      timestamp: new Date().toISOString(),
    });

    // Check completion
    const requiredItems = checklistBlock.content.items.filter(item => item.isRequired);
    const completedRequired = requiredItems.filter(item => newCheckedItems.has(item.id));

    if (checklistBlock.content.requireAll) {
      if (newCheckedItems.size === checklistBlock.content.items.length) {
        onComplete?.(block.id, {
          checkedItems: Array.from(newCheckedItems),
          completedAt: new Date().toISOString(),
        });
      }
    } else if (completedRequired.length === requiredItems.length) {
      onComplete?.(block.id, {
        checkedItems: Array.from(newCheckedItems),
        completedAt: new Date().toISOString(),
      });
    }
  }, [checkedItems, block.id, onInteraction, checklistBlock.content, onComplete]);

  const completionRate = (checkedItems.size / checklistBlock.content.items.length) * 100;

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <CheckSquare className="w-5 h-5" />
              {block.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {checkedItems.size}/{checklistBlock.content.items.length}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {Math.round(completionRate)}%
              </Badge>
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <Progress value={completionRate} className="h-2" />

        <div className="space-y-3">
          {checklistBlock.content.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border-primary hover:bg-background-accent transition-colors"
            >
              <input
                type="checkbox"
                id={item.id}
                checked={checkedItems.has(item.id)}
                onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                disabled={readonly}
                className="mt-1 text-tomb45-green rounded"
              />
              <div className="flex-1">
                <label
                  htmlFor={item.id}
                  className={`cursor-pointer text-text-primary ${
                    checkedItems.has(item.id) ? 'line-through text-text-secondary' : ''
                  }`}
                >
                  {item.text}
                  {item.isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {item.helpText && (
                  <p className="text-sm text-text-secondary mt-1">{item.helpText}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {checklistBlock.content.requireAll && checkedItems.size < checklistBlock.content.items.length && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Info className="w-4 h-4" />
              <span className="text-sm">All items must be checked to complete this checklist.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Exercise Content Block Renderer
 */
const ExerciseContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  readonly = false,
  className = '',
}) => {
  const exerciseBlock = block as ExerciseContentBlock;
  const [submission, setSubmission] = useState(progress?.submission || '');
  const [isSubmitted, setIsSubmitted] = useState(progress?.submitted || false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleSubmission = useCallback(() => {
    setIsSubmitted(true);
    onComplete?.(block.id, {
      submission,
      submissionType: exerciseBlock.content.submissionType,
      timeSpentMinutes: Math.floor(timeSpent / 60),
      completedAt: new Date().toISOString(),
    });
  }, [block.id, submission, exerciseBlock.content.submissionType, timeSpent, onComplete]);

  const renderSubmissionInput = () => {
    switch (exerciseBlock.content.submissionType) {
      case 'text':
        return (
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder="Enter your response..."
            className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
            rows={6}
            disabled={readonly || isSubmitted}
          />
        );
      case 'audio':
        return (
          <div className="p-4 bg-background-accent rounded-lg text-center">
            <Music className="w-8 h-8 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">Audio recording interface would be here</p>
          </div>
        );
      case 'file':
        return (
          <div className="p-4 bg-background-accent rounded-lg text-center border-2 border-dashed border-border-primary">
            <DownloadIcon className="w-8 h-8 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">File upload interface would be here</p>
          </div>
        );
      case 'photo':
        return (
          <div className="p-4 bg-background-accent rounded-lg text-center border-2 border-dashed border-border-primary">
            <ImageIcon className="w-8 h-8 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">Photo capture interface would be here</p>
          </div>
        );
      default:
        return (
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder="Enter your response..."
            className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
            rows={6}
            disabled={readonly || isSubmitted}
          />
        );
    }
  };

  const timeRemaining = exerciseBlock.content.timeLimit ?
    Math.max(0, (exerciseBlock.content.timeLimit * 60) - timeSpent) : null;

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <PenTool className="w-5 h-5" />
              {block.title}
              {isSubmitted && <CheckCircle className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              {exerciseBlock.content.timeLimit && (
                <Badge variant={timeRemaining && timeRemaining < 300 ? "destructive" : "outline"} className="text-xs">
                  {timeRemaining ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` : 'Time up'}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {exerciseBlock.content.submissionType}
              </Badge>
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none text-text-primary">
          <div dangerouslySetInnerHTML={{ __html: exerciseBlock.content.instructions.replace(/\n/g, '<br>') }} />
        </div>

        {exerciseBlock.content.materials && exerciseBlock.content.materials.length > 0 && (
          <div className="p-3 bg-background-accent rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Materials Needed:</h4>
            <ul className="list-disc list-inside space-y-1">
              {exerciseBlock.content.materials.map((material, index) => (
                <li key={index} className="text-text-secondary text-sm">{material}</li>
              ))}
            </ul>
          </div>
        )}

        {!isSubmitted ? (
          <>
            <div className="space-y-4">
              <h4 className="font-medium text-text-primary">Your Submission:</h4>
              {renderSubmissionInput()}
            </div>

            <div className="flex items-center justify-between border-t border-border-primary pt-4">
              <div className="text-sm text-text-secondary">
                Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </div>
              <Button
                onClick={handleSubmission}
                disabled={exerciseBlock.content.submissionRequired && !submission}
                className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Exercise
              </Button>
            </div>
          </>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Exercise Submitted Successfully</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Submitted on {new Date(progress?.completedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Reflection Content Block Renderer
 */
const ReflectionContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  readonly = false,
  className = '',
}) => {
  const reflectionBlock = block as ReflectionContentBlock;
  const [response, setResponse] = useState(progress?.response || '');
  const [isCompleted, setIsCompleted] = useState(progress?.completed || false);

  const handleResponseChange = useCallback((value: string) => {
    setResponse(value);
    onInteraction?.(block.id, 'reflection_updated', {
      responseLength: value.length,
      timestamp: new Date().toISOString(),
    });
  }, [block.id, onInteraction]);

  const handleComplete = useCallback(() => {
    setIsCompleted(true);
    onComplete?.(block.id, {
      response,
      responseLength: response.length,
      private: reflectionBlock.content.private,
      completedAt: new Date().toISOString(),
    });
  }, [block.id, response, reflectionBlock.content.private, onComplete]);

  const meetsMinLength = !reflectionBlock.content.minLength ||
    response.length >= reflectionBlock.content.minLength;

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Lightbulb className="w-5 h-5" />
              {block.title}
              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              {reflectionBlock.content.private && (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              )}
              {reflectionBlock.content.minLength && (
                <Badge variant="outline" className="text-xs">
                  {reflectionBlock.content.minLength} min chars
                </Badge>
              )}
            </div>
          </div>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none text-text-primary">
          <p>{reflectionBlock.content.prompt}</p>
        </div>

        {reflectionBlock.content.guidingQuestions && reflectionBlock.content.guidingQuestions.length > 0 && (
          <div className="p-3 bg-background-accent rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Consider these questions:</h4>
            <ul className="space-y-1">
              {reflectionBlock.content.guidingQuestions.map((question, index) => (
                <li key={index} className="text-text-secondary text-sm">• {question}</li>
              ))}
            </ul>
          </div>
        )}

        {!isCompleted ? (
          <div className="space-y-4">
            <textarea
              value={response}
              onChange={(e) => handleResponseChange(e.target.value)}
              placeholder="Share your thoughts and reflections..."
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
              rows={8}
              disabled={readonly}
            />

            <div className="flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                {response.length} characters
                {reflectionBlock.content.minLength && (
                  <span className={meetsMinLength ? 'text-green-600' : 'text-red-600'}>
                    {' '}(min: {reflectionBlock.content.minLength})
                  </span>
                )}
              </div>
              <Button
                onClick={handleComplete}
                disabled={!meetsMinLength || !response.trim()}
                className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Reflection
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Reflection Saved</span>
            </div>
            <div className="text-green-700 text-sm p-3 bg-white rounded border">
              {response}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Download Content Block Renderer
 */
const DownloadContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  className = '',
}) => {
  const downloadBlock = block as DownloadContentBlock;
  const [isDownloaded, setIsDownloaded] = useState(progress?.downloaded || false);

  const handleDownload = useCallback(() => {
    // In a real app, this would handle the actual download
    setIsDownloaded(true);

    onInteraction?.(block.id, 'download_initiated', {
      fileName: downloadBlock.content.fileName,
      fileSize: downloadBlock.content.fileSize,
      timestamp: new Date().toISOString(),
    });

    if (downloadBlock.content.requireCompletion) {
      onComplete?.(block.id, {
        fileName: downloadBlock.content.fileName,
        downloadedAt: new Date().toISOString(),
      });
    }
  }, [block.id, downloadBlock.content, onComplete, onInteraction]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <DownloadIcon className="w-5 h-5" />
            {block.title}
            {isDownloaded && <CheckCircle className="w-4 h-4 text-green-500" />}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-background-accent rounded-lg border border-border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tomb45-green/20 rounded-lg">
              <DownloadIcon className="w-6 h-6 text-tomb45-green" />
            </div>
            <div>
              <h4 className="font-medium text-text-primary">{downloadBlock.content.fileName}</h4>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>{downloadBlock.content.fileType.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(downloadBlock.content.fileSize)}</span>
              </div>
              {downloadBlock.content.description && (
                <p className="text-sm text-text-secondary mt-1">{downloadBlock.content.description}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
            disabled={isDownloaded}
          >
            {isDownloaded ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Downloaded
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>

        {isDownloaded && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">File downloaded successfully</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Separator Content Block Renderer
 */
const SeparatorContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  className = '',
}) => {
  const separatorBlock = block as SeparatorContentBlock;

  const renderSeparator = () => {
    switch (separatorBlock.content.style) {
      case 'line':
        return <hr className="border-border-primary" />;
      case 'space':
        return <div style={{ height: separatorBlock.content.height || 20 }} />;
      case 'decorative':
        return (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-border-primary"></div>
              <Star className="w-4 h-4 text-tomb45-green" />
              <div className="w-8 h-px bg-border-primary"></div>
            </div>
          </div>
        );
      default:
        return <hr className="border-border-primary" />;
    }
  };

  return (
    <div className={`py-4 ${className}`}>
      {renderSeparator()}
    </div>
  );
};

/**
 * Callout Content Block Renderer
 */
const CalloutContentRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  onInteraction,
  className = '',
}) => {
  const calloutBlock = block as CalloutContentBlock;
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onInteraction?.(block.id, 'callout_dismissed', {
      timestamp: new Date().toISOString(),
    });
  }, [block.id, onInteraction]);

  if (isDismissed && calloutBlock.content.dismissible) {
    return null;
  }

  const styleConfig = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: AlertTriangle },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertCircle },
    tip: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: Lightbulb },
  };

  const config = styleConfig[calloutBlock.content.style];
  const IconComponent = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <IconComponent className={`w-5 h-5 ${config.text} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <div className={`${config.text} text-sm`}>
            {calloutBlock.content.text}
          </div>
        </div>
        {calloutBlock.content.dismissible && (
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className={`${config.text} hover:bg-white/50 p-1`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Main Content Renderer Component
 */
export default function ContentRenderer({
  contentBlocks,
  onBlockComplete,
  onAllComplete,
  onInteraction,
  onTimeUpdate,
  onProgressUpdate,
  progress = {},
  readonly = false,
  showProgress = true,
  autoAdvance = false,
  enableOfflineMode = false,
  className = '',
  theme = 'auto',
  accessibility = {},
}: ContentRendererProps) {
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(
    new Set(Object.keys(progress).filter(id => progress[id]?.completed))
  );
  const [blockResults, setBlockResults] = useState<Record<string, any>>(progress);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const { cacheContent, getCachedContent } = useOfflineCache(enableOfflineMode);
  const { announce } = useAccessibility(accessibility.enableScreenReader);

  const handleBlockComplete = useCallback((blockId: string, data?: any) => {
    const newCompletedBlocks = new Set(completedBlocks);
    newCompletedBlocks.add(blockId);
    setCompletedBlocks(newCompletedBlocks);

    const newResults = {
      ...blockResults,
      [blockId]: {
        completed: true,
        completedAt: new Date().toISOString(),
        ...data,
      },
    };
    setBlockResults(newResults);

    // Cache completion data if offline mode is enabled
    if (enableOfflineMode) {
      cacheContent(`block-${blockId}`, newResults[blockId]);
    }

    onBlockComplete?.(blockId, data);
    announce(`Content block completed: ${contentBlocks.find(b => b.id === blockId)?.title || 'Untitled'}`);

    // Update overall progress
    const progressPercentage = (newCompletedBlocks.size / contentBlocks.length) * 100;
    onProgressUpdate?.(progressPercentage);

    // Auto-advance to next block if enabled
    if (autoAdvance && currentBlockIndex < contentBlocks.length - 1) {
      const currentBlock = contentBlocks[currentBlockIndex];
      if (currentBlock.id === blockId) {
        setCurrentBlockIndex(currentBlockIndex + 1);
      }
    }

    // Check if all blocks are completed
    if (newCompletedBlocks.size === contentBlocks.length) {
      onAllComplete?.(newResults);
      announce('All content blocks completed!');
    }
  }, [
    completedBlocks,
    blockResults,
    contentBlocks,
    enableOfflineMode,
    cacheContent,
    onBlockComplete,
    announce,
    onProgressUpdate,
    autoAdvance,
    currentBlockIndex,
    onAllComplete,
  ]);

  const renderContentBlock = (block: ContentBlock, index: number) => {
    const commonProps = {
      block,
      onComplete: handleBlockComplete,
      onInteraction,
      onTimeUpdate,
      progress: blockResults[block.id],
      readonly: readonly || (autoAdvance && index > currentBlockIndex),
      className: "mb-6",
      autoPlay: autoAdvance && index === currentBlockIndex,
      showControls: true,
      enableKeyboardNavigation: accessibility.enableKeyboardNavigation,
      accessibility,
    };

    switch (block.type) {
      case 'text':
        return <TextContentRenderer {...commonProps} />;
      case 'video':
        return <VideoContentRenderer {...commonProps} />;
      case 'audio':
        return <AudioContentRenderer {...commonProps} />;
      case 'image':
        return <ImageContentRenderer {...commonProps} />;
      case 'quiz':
        return <QuizContentRenderer {...commonProps} />;
      case 'interactive':
        return <InteractiveContentRenderer {...commonProps} />;
      case 'checklist':
        return <ChecklistContentRenderer {...commonProps} />;
      case 'exercise':
        return <ExerciseContentRenderer {...commonProps} />;
      case 'reflection':
        return <ReflectionContentRenderer {...commonProps} />;
      case 'download':
        return <DownloadContentRenderer {...commonProps} />;
      case 'separator':
        return <SeparatorContentRenderer {...commonProps} />;
      case 'callout':
        return <CalloutContentRenderer {...commonProps} />;
      default:
        return (
          <Card className="border-border-primary bg-background-secondary mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-text-secondary">
                <Info className="w-5 h-5" />
                <p>Content type "{block.type}" is not yet supported.</p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const completionPercentage = (completedBlocks.size / contentBlocks.length) * 100;
  const sortedBlocks = contentBlocks.sort((a, b) => a.order - b.order);

  // Screen reader announcements
  const announcements = accessibility.enableScreenReader ? (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {/* Announcements will be inserted here */}
    </div>
  ) : null;

  return (
    <div className={`space-y-6 ${className}`} role="main">
      {announcements}

      {showProgress && (
        <Card className="border-border-primary bg-background-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">
                Progress: {completedBlocks.size} of {contentBlocks.length} completed
              </span>
              <span className="text-sm text-text-secondary">
                {Math.round(completionPercentage)}%
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            {autoAdvance && (
              <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
                <span>Current: {currentBlockIndex + 1}</span>
                <span>Auto-advancing content</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sortedBlocks.map((block, index) => (
        <div key={block.id} id={`content-block-${block.id}`}>
          {autoAdvance && index > currentBlockIndex ? (
            <Card className="border-border-primary bg-background-secondary/50 mb-6">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-text-secondary">
                  <Circle className="w-5 h-5" />
                  <p>Complete previous content to unlock this section</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            renderContentBlock(block, index)
          )}
        </div>
      ))}

      {completedBlocks.size === contentBlocks.length && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 dark:text-green-300 mb-2">
              Congratulations!
            </h3>
            <p className="text-green-700 dark:text-green-400">
              You've completed all the content blocks in this section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { ContentRenderer };
export type { ContentRendererProps, ContentBlockRendererProps };