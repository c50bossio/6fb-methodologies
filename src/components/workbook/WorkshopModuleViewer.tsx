'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Circle,
  Clock,
  PlayCircle,
  Star,
  Award,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  Download,
  Settings,
  Menu,
  X,
  Home,
  List,
  Grid,
  Filter,
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  FileText,
  Video,
  Headphones,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import ContentRenderer from './ContentRenderer';
import {
  WorkshopModule,
  WorkshopLesson,
  ContentBlock,
  DifficultyLevel,
} from '@/types/workshop-content';

/**
 * Props for the WorkshopModuleViewer component
 */
interface WorkshopModuleViewerProps {
  /** The workshop module to display */
  module: WorkshopModule;
  /** Current user ID for progress tracking */
  userId?: string;
  /** Initial lesson to display (optional) */
  initialLessonId?: string;
  /** Whether to show module overview first */
  showOverview?: boolean;
  /** Whether to enable auto-advance between lessons */
  autoAdvance?: boolean;
  /** Whether to show detailed progress analytics */
  showAnalytics?: boolean;
  /** Enable offline mode for content caching */
  enableOfflineMode?: boolean;
  /** Custom theme settings */
  theme?: 'light' | 'dark' | 'auto';
  /** Accessibility configuration */
  accessibility?: {
    enableScreenReader?: boolean;
    enableKeyboardNavigation?: boolean;
    highContrast?: boolean;
    largeText?: boolean;
  };
  /** Callback when module is completed */
  onModuleComplete?: (moduleId: string, completionData: any) => void;
  /** Callback when lesson is completed */
  onLessonComplete?: (lessonId: string, moduleId: string, completionData: any) => void;
  /** Callback for progress updates */
  onProgressUpdate?: (moduleId: string, progress: number) => void;
  /** Callback for navigation events */
  onNavigationChange?: (lessonId: string, moduleId: string) => void;
  /** Callback for error handling */
  onError?: (error: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Module navigation state
 */
interface ModuleNavigation {
  currentLessonIndex: number;
  currentLessonId: string | null;
  viewMode: 'overview' | 'lesson' | 'resources';
  sidebarCollapsed: boolean;
  fullscreen: boolean;
}

/**
 * Module progress tracking
 */
interface ModuleProgress {
  completedLessons: Set<string>;
  lessonProgress: Record<string, any>;
  overallProgress: number;
  timeSpentMinutes: number;
  lastAccessedAt: string;
}

/**
 * Breadcrumb navigation component
 */
const ModuleBreadcrumbs: React.FC<{
  module: WorkshopModule;
  currentLesson?: WorkshopLesson;
  onNavigate: (target: 'overview' | 'lessons' | string) => void;
}> = ({ module, currentLesson, onNavigate }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-text-secondary mb-4" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate('overview')}
        className="hover:text-text-primary transition-colors"
      >
        Workshop
      </button>
      <span>/</span>
      <button
        onClick={() => onNavigate('overview')}
        className="hover:text-text-primary transition-colors"
      >
        {module.title}
      </button>
      {currentLesson && (
        <>
          <span>/</span>
          <span className="text-text-primary font-medium">
            {currentLesson.title}
          </span>
        </>
      )}
    </nav>
  );
};

/**
 * Lesson sidebar navigation component
 */
const LessonSidebar: React.FC<{
  module: WorkshopModule;
  currentLessonId: string | null;
  progress: ModuleProgress;
  collapsed: boolean;
  onLessonSelect: (lessonId: string) => void;
  onToggleCollapse: () => void;
}> = ({ module, currentLessonId, progress, collapsed, onLessonSelect, onToggleCollapse }) => {
  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLessonIcon = (lesson: WorkshopLesson) => {
    switch (lesson.type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'interactive': return <Target className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getProgressIcon = (lessonId: string) => {
    if (progress.completedLessons.has(lessonId)) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (progress.lessonProgress[lessonId]) {
      return <Circle className="w-4 h-4 text-yellow-500" />;
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className={`bg-background-secondary border-r border-border-primary transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-80'
    }`}>
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h3 className="font-semibold text-text-primary truncate">{module.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getDifficultyColor(module.difficultyLevel)}`}>
                  {module.difficultyLevel}
                </Badge>
                <span className="text-xs text-text-secondary">
                  {Math.round(progress.overallProgress)}% complete
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-3">
            <Progress value={progress.overallProgress} className="h-2" />
          </div>
        )}
      </div>

      <div className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        {module.content.lessons.map((lesson, index) => {
          const isActive = lesson.id === currentLessonId;
          const isCompleted = progress.completedLessons.has(lesson.id);
          const hasProgress = progress.lessonProgress[lesson.id];

          return (
            <button
              key={lesson.id}
              onClick={() => onLessonSelect(lesson.id)}
              className={`w-full p-3 rounded-lg border mb-2 text-left transition-all ${
                isActive
                  ? 'border-tomb45-green bg-tomb45-green/10 text-text-primary'
                  : 'border-border-primary hover:border-tomb45-green/30 hover:bg-background-accent'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                {getProgressIcon(lesson.id)}
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getLessonIcon(lesson)}
                      <span className="text-xs text-text-secondary">
                        Lesson {index + 1}
                      </span>
                    </div>
                    <h4 className={`text-sm font-medium truncate ${
                      isActive ? 'text-text-primary' : 'text-text-primary'
                    }`}>
                      {lesson.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lesson.estimatedMinutes}m
                      </span>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          Complete
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Module overview component
 */
const ModuleOverview: React.FC<{
  module: WorkshopModule;
  progress: ModuleProgress;
  onStartModule: () => void;
  onNavigateToLesson: (lessonId: string) => void;
}> = ({ module, progress, onStartModule, onNavigateToLesson }) => {
  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-tomb45-green/20 rounded-xl">
                  <BookOpen className="w-8 h-8 text-tomb45-green" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text-primary">{module.title}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`${getDifficultyColor(module.difficultyLevel)}`}>
                      {module.difficultyLevel}
                    </Badge>
                    <span className="text-text-secondary flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {module.durationMinutes} minutes
                    </span>
                    <span className="text-text-secondary flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {module.content.lessons.length} lessons
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-text-secondary text-lg leading-relaxed">
                {module.description}
              </p>
            </div>

            <div className="ml-8">
              <Button
                onClick={onStartModule}
                size="lg"
                className="bg-tomb45-green hover:bg-tomb45-green/80 text-white px-8"
              >
                {progress.overallProgress > 0 ? (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Continue Module
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Module
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          {progress.overallProgress > 0 && (
            <div className="bg-white/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">
                  Your Progress
                </span>
                <span className="text-sm text-text-secondary">
                  {progress.completedLessons.size} of {module.content.lessons.length} lessons
                </span>
              </div>
              <Progress value={progress.overallProgress} className="h-3" />
              <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
                <span>{Math.round(progress.overallProgress)}% complete</span>
                <span>{Math.round(progress.timeSpentMinutes / 60)}h {progress.timeSpentMinutes % 60}m spent</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-tomb45-green" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {module.content.overview.objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-tomb45-green mt-0.5 flex-shrink-0" />
                  {objective}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Key Outcomes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-tomb45-green" />
              Key Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {module.content.overview.outcomes.map((outcome, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Award className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  {outcome}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Key Takeaways */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-tomb45-green" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {module.content.overview.keyTakeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Circle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Lessons Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-tomb45-green" />
            Module Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {module.content.lessons.map((lesson, index) => {
              const isCompleted = progress.completedLessons.has(lesson.id);
              const hasProgress = progress.lessonProgress[lesson.id];

              return (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 bg-background-accent rounded-lg border border-border-primary hover:border-tomb45-green/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : hasProgress ? (
                      <Circle className="w-6 h-6 text-yellow-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <h4 className="font-medium text-text-primary">
                        Lesson {index + 1}: {lesson.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.estimatedMinutes} minutes
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {lesson.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => onNavigateToLesson(lesson.id)}
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                  >
                    {isCompleted ? "Review" : hasProgress ? "Continue" : "Start"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      {module.content.resources && module.content.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-tomb45-green" />
              Module Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {module.content.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-background-accent rounded-lg border border-border-primary hover:border-tomb45-green/30 transition-colors"
                >
                  <Download className="w-4 h-4 text-tomb45-green" />
                  <div>
                    <h5 className="font-medium text-text-primary text-sm">{resource.title}</h5>
                    <p className="text-xs text-text-secondary">{resource.type}</p>
                    {resource.description && (
                      <p className="text-xs text-text-secondary mt-1">{resource.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Main WorkshopModuleViewer component
 */
export default function WorkshopModuleViewer({
  module,
  userId,
  initialLessonId,
  showOverview = true,
  autoAdvance = false,
  showAnalytics = false,
  enableOfflineMode = false,
  theme = 'auto',
  accessibility = {},
  onModuleComplete,
  onLessonComplete,
  onProgressUpdate,
  onNavigationChange,
  onError,
  className = '',
}: WorkshopModuleViewerProps) {
  // Navigation state
  const [navigation, setNavigation] = useState<ModuleNavigation>({
    currentLessonIndex: initialLessonId
      ? module.content.lessons.findIndex(l => l.id === initialLessonId)
      : showOverview ? -1 : 0,
    currentLessonId: initialLessonId || null,
    viewMode: showOverview && !initialLessonId ? 'overview' : 'lesson',
    sidebarCollapsed: false,
    fullscreen: false,
  });

  // Progress state
  const [progress, setProgress] = useState<ModuleProgress>({
    completedLessons: new Set(),
    lessonProgress: {},
    overallProgress: 0,
    timeSpentMinutes: 0,
    lastAccessedAt: new Date().toISOString(),
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentLesson = useMemo(() => {
    if (navigation.currentLessonId) {
      return module.content.lessons.find(l => l.id === navigation.currentLessonId);
    }
    return null;
  }, [module.content.lessons, navigation.currentLessonId]);

  // Initialize progress from API
  useEffect(() => {
    if (userId) {
      loadModuleProgress();
    }
  }, [userId, module.id]);

  const loadModuleProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workbook/progress/enhanced?moduleId=${module.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load progress');
      }

      const data = await response.json();
      if (data.success && data.data.moduleProgress) {
        // Update progress state from API response
        // This would be implemented based on your API structure
      }
    } catch (error) {
      console.error('Failed to load module progress:', error);
      onError?.('Failed to load module progress');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonSelect = useCallback((lessonId: string) => {
    const lessonIndex = module.content.lessons.findIndex(l => l.id === lessonId);
    setNavigation(prev => ({
      ...prev,
      currentLessonId: lessonId,
      currentLessonIndex: lessonIndex,
      viewMode: 'lesson',
    }));
    onNavigationChange?.(lessonId, module.id);
  }, [module.content.lessons, module.id, onNavigationChange]);

  const handleStartModule = useCallback(() => {
    const firstLesson = module.content.lessons[0];
    if (firstLesson) {
      handleLessonSelect(firstLesson.id);
    }
  }, [module.content.lessons, handleLessonSelect]);

  const handlePreviousLesson = useCallback(() => {
    if (navigation.currentLessonIndex > 0) {
      const prevLesson = module.content.lessons[navigation.currentLessonIndex - 1];
      handleLessonSelect(prevLesson.id);
    } else if (showOverview) {
      setNavigation(prev => ({
        ...prev,
        viewMode: 'overview',
        currentLessonId: null,
        currentLessonIndex: -1,
      }));
    }
  }, [navigation.currentLessonIndex, module.content.lessons, handleLessonSelect, showOverview]);

  const handleNextLesson = useCallback(() => {
    if (navigation.currentLessonIndex < module.content.lessons.length - 1) {
      const nextLesson = module.content.lessons[navigation.currentLessonIndex + 1];
      handleLessonSelect(nextLesson.id);
    }
  }, [navigation.currentLessonIndex, module.content.lessons, handleLessonSelect]);

  const handleContentBlockComplete = useCallback((blockId: string, data?: any) => {
    // Update progress tracking
    if (navigation.currentLessonId) {
      setProgress(prev => ({
        ...prev,
        lessonProgress: {
          ...prev.lessonProgress,
          [navigation.currentLessonId!]: {
            ...prev.lessonProgress[navigation.currentLessonId!],
            [blockId]: data,
          },
        },
        lastAccessedAt: new Date().toISOString(),
      }));
    }
  }, [navigation.currentLessonId]);

  const handleLessonContentComplete = useCallback((results: Record<string, any>) => {
    if (navigation.currentLessonId) {
      const newCompletedLessons = new Set(progress.completedLessons);
      newCompletedLessons.add(navigation.currentLessonId);

      const newProgress = (newCompletedLessons.size / module.content.lessons.length) * 100;

      setProgress(prev => ({
        ...prev,
        completedLessons: newCompletedLessons,
        overallProgress: newProgress,
        lessonProgress: {
          ...prev.lessonProgress,
          [navigation.currentLessonId!]: {
            ...prev.lessonProgress[navigation.currentLessonId!],
            completed: true,
            completedAt: new Date().toISOString(),
            results,
          },
        },
      }));

      onLessonComplete?.(navigation.currentLessonId, module.id, results);
      onProgressUpdate?.(module.id, newProgress);

      // Check if module is complete
      if (newCompletedLessons.size === module.content.lessons.length) {
        onModuleComplete?.(module.id, {
          completedLessons: Array.from(newCompletedLessons),
          overallProgress: 100,
          completedAt: new Date().toISOString(),
        });
      }

      // Auto-advance to next lesson
      if (autoAdvance && navigation.currentLessonIndex < module.content.lessons.length - 1) {
        setTimeout(() => {
          handleNextLesson();
        }, 2000);
      }
    }
  }, [
    navigation.currentLessonId,
    navigation.currentLessonIndex,
    progress.completedLessons,
    module.content.lessons.length,
    module.id,
    onLessonComplete,
    onProgressUpdate,
    onModuleComplete,
    autoAdvance,
    handleNextLesson,
  ]);

  const toggleSidebar = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      fullscreen: !prev.fullscreen,
    }));
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${className}`}>
        <Card className="bg-background-secondary border-border-primary">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tomb45-green mx-auto mb-6"></div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Loading Module
            </h3>
            <p className="text-text-secondary">
              Preparing your workshop experience...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${className}`}>
        <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-8 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
              Unable to Load Module
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <Button onClick={loadModuleProgress} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background-primary ${className} ${navigation.fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        {navigation.viewMode === 'lesson' && (
          <LessonSidebar
            module={module}
            currentLessonId={navigation.currentLessonId}
            progress={progress}
            collapsed={navigation.sidebarCollapsed}
            onLessonSelect={handleLessonSelect}
            onToggleCollapse={toggleSidebar}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-background-secondary border-b border-border-primary p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {navigation.viewMode === 'lesson' && !navigation.sidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNavigation(prev => ({ ...prev, viewMode: 'overview' }))}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Overview
                  </Button>
                )}
                <ModuleBreadcrumbs
                  module={module}
                  currentLesson={currentLesson}
                  onNavigate={(target) => {
                    if (target === 'overview') {
                      setNavigation(prev => ({ ...prev, viewMode: 'overview', currentLessonId: null }));
                    } else if (target.startsWith('lesson-')) {
                      handleLessonSelect(target.substring(7));
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                {navigation.viewMode === 'lesson' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousLesson}
                      disabled={navigation.currentLessonIndex === 0 && !showOverview}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-text-secondary px-2">
                      {navigation.currentLessonIndex + 1} / {module.content.lessons.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextLesson}
                      disabled={navigation.currentLessonIndex === module.content.lessons.length - 1}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  aria-label={navigation.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {navigation.fullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
            {navigation.viewMode === 'overview' ? (
              <ModuleOverview
                module={module}
                progress={progress}
                onStartModule={handleStartModule}
                onNavigateToLesson={handleLessonSelect}
              />
            ) : navigation.viewMode === 'lesson' && currentLesson ? (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-text-primary mb-2">
                    {currentLesson.title}
                  </h1>
                  {currentLesson.description && (
                    <p className="text-text-secondary">
                      {currentLesson.description}
                    </p>
                  )}
                </div>

                <ContentRenderer
                  contentBlocks={currentLesson.content.blocks}
                  onBlockComplete={handleContentBlockComplete}
                  onAllComplete={handleLessonContentComplete}
                  onProgressUpdate={(progress) => {
                    // Handle content-level progress updates
                  }}
                  progress={progress.lessonProgress[navigation.currentLessonId!] || {}}
                  readonly={false}
                  showProgress={true}
                  autoAdvance={autoAdvance}
                  enableOfflineMode={enableOfflineMode}
                  accessibility={accessibility}
                  theme={theme}
                />

                {/* Lesson Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-primary">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={navigation.currentLessonIndex === 0 && !showOverview}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {navigation.currentLessonIndex === 0 && showOverview ? 'Overview' : 'Previous Lesson'}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-text-secondary">
                      Lesson {navigation.currentLessonIndex + 1} of {module.content.lessons.length}
                    </p>
                    <Progress
                      value={((navigation.currentLessonIndex + 1) / module.content.lessons.length) * 100}
                      className="w-32 h-2 mt-1"
                    />
                  </div>

                  <Button
                    variant={navigation.currentLessonIndex === module.content.lessons.length - 1 ? "default" : "outline"}
                    onClick={handleNextLesson}
                    disabled={navigation.currentLessonIndex === module.content.lessons.length - 1}
                    className={navigation.currentLessonIndex === module.content.lessons.length - 1 ? "bg-tomb45-green hover:bg-tomb45-green/80 text-white" : ""}
                  >
                    {navigation.currentLessonIndex === module.content.lessons.length - 1 ? (
                      <>
                        Complete Module
                        <Award className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Next Lesson
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Card className="bg-background-secondary border-border-primary">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-16 h-16 text-tomb45-green mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      No Content Selected
                    </h3>
                    <p className="text-text-secondary">
                      Please select a lesson to view its content.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export { WorkshopModuleViewer };
export type { WorkshopModuleViewerProps };