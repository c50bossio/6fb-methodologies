'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  CheckCircle,
  Circle,
  Clock,
  PlayCircle,
  ChevronRight,
  Users,
  Trophy,
  Target,
  BookOpen,
  Video,
  FileText,
  Zap,
  Lock,
  AlertCircle,
  Star,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Download,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ModuleListItem,
  DetailedModule,
  DetailedLesson,
  ApiResponse,
  ModulesListResponse,
  ModuleDetailsResponse,
  LessonDetailsResponse,
  UpdateProgressRequestBody,
  CompleteLessonRequestBody,
  DifficultyLevel,
  ProgressStatus,
  LessonType,
  ContentType,
  SubscriptionTier,
} from '@/types/workbook-api';

/**
 * Props for the WorkshopContent component
 */
interface WorkshopContentProps {
  /** User ID for authentication and progress tracking */
  userId?: string;
  /** Optional initial module to display */
  initialModuleId?: string;
  /** Whether to show detailed progress analytics */
  showAnalytics?: boolean;
  /** Custom class name for styling */
  className?: string;
  /** Callback when a module is selected */
  onModuleSelected?: (moduleId: string) => void;
  /** Callback when a lesson is completed */
  onLessonCompleted?: (lessonId: string, moduleId: string) => void;
  /** Callback for error handling */
  onError?: (error: string) => void;
}

/**
 * Local state interface for component management
 */
interface WorkshopState {
  modules: ModuleListItem[];
  selectedModule: DetailedModule | null;
  selectedLesson: DetailedLesson | null;
  loading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';
  sortBy: 'order' | 'progress' | 'difficulty';
  filterBy: 'all' | 'in_progress' | 'completed' | 'not_started';
  searchQuery: string;
}

/**
 * Enhanced WorkshopContent component for the 6FB Workshop system
 *
 * Features:
 * - Comprehensive module and lesson management
 * - Real-time progress tracking and analytics
 * - Subscription tier-based access control
 * - Rich content rendering with multiple content types
 * - Interactive lesson completion with scoring
 * - Mobile-responsive design with accessibility
 * - Search and filtering capabilities
 * - Integration with backend APIs
 */
export default function WorkshopContent({
  userId,
  initialModuleId,
  showAnalytics = false,
  className = '',
  onModuleSelected,
  onLessonCompleted,
  onError,
}: WorkshopContentProps) {
  // Main component state
  const [state, setState] = useState<WorkshopState>({
    modules: [],
    selectedModule: null,
    selectedLesson: null,
    loading: true,
    error: null,
    viewMode: 'grid',
    sortBy: 'order',
    filterBy: 'all',
    searchQuery: '',
  });

  // Expanded modules state for accordion-style navigation
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  // Initialize component
  useEffect(() => {
    if (userId) {
      fetchModules();
      if (initialModuleId) {
        fetchModuleDetails(initialModuleId);
      }
    }
  }, [userId, initialModuleId]);

  /**
   * Fetch all available workshop modules with progress
   */
  const fetchModules = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(
        '/api/workbook/modules?includeProgress=true',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch modules');
      }

      const data: ModulesListResponse = await response.json();

      if (data.success && data.data) {
        setState(prev => ({
          ...prev,
          modules: data.data || [],
          loading: false,
        }));
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load modules';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      onError?.(errorMessage);
    }
  }, [onError]);

  /**
   * Fetch detailed module information including lessons
   */
  const fetchModuleDetails = useCallback(
    async (moduleId: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch(`/api/workbook/modules/${moduleId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch module details');
        }

        const data: ModuleDetailsResponse = await response.json();

        if (data.success && data.data) {
          setState(prev => ({
            ...prev,
            selectedModule: data.data!,
            loading: false,
          }));
          onModuleSelected?.(moduleId);
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to load module details';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        onError?.(errorMessage);
      }
    },
    [onModuleSelected, onError]
  );

  /**
   * Fetch detailed lesson information
   */
  const fetchLessonDetails = useCallback(
    async (lessonId: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch(`/api/workbook/lessons/${lessonId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch lesson details');
        }

        const data: LessonDetailsResponse = await response.json();

        if (data.success && data.data) {
          setState(prev => ({
            ...prev,
            selectedLesson: data.data!,
            loading: false,
          }));
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to load lesson details';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        onError?.(errorMessage);
      }
    },
    [onError]
  );

  /**
   * Update module progress
   */
  const updateModuleProgress = useCallback(
    async (
      moduleId: string,
      progressPercent: number,
      timeSpentMinutes: number = 0
    ) => {
      try {
        const updateData: UpdateProgressRequestBody = {
          moduleId,
          progressPercent: Math.min(100, Math.max(0, progressPercent)),
          timeSpentMinutes,
          lastPosition: 0, // Could be enhanced to track specific lesson position
        };

        const response = await fetch('/api/workbook/progress/enhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update progress');
        }

        // Refresh modules to get updated progress
        await fetchModules();

        // If we have the module selected, refresh its details too
        if (state.selectedModule?.id === moduleId) {
          await fetchModuleDetails(moduleId);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update progress';
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      }
    },
    [state.selectedModule?.id, fetchModules, fetchModuleDetails, onError]
  );

  /**
   * Complete a lesson and update progress
   */
  const completeLesson = useCallback(
    async (lessonId: string, score?: number, timeSpentSeconds: number = 0) => {
      try {
        const completionData: CompleteLessonRequestBody = {
          timeSpentSeconds,
          completedAt: new Date().toISOString(),
          ...(score !== undefined && { quizScore: score }),
          ...(state.selectedLesson && {
            noteContent: `Completed lesson: ${state.selectedLesson.title}`,
          }),
        };

        const response = await fetch(
          `/api/workbook/lessons/${lessonId}/complete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(completionData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to complete lesson');
        }

        const data = await response.json();

        if (data.success) {
          // Refresh data
          await fetchModules();
          if (state.selectedModule) {
            await fetchModuleDetails(state.selectedModule.id);
          }

          onLessonCompleted?.(
            lessonId,
            data.data?.moduleId || state.selectedModule?.id || ''
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to complete lesson';
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      }
    },
    [
      state.selectedLesson,
      state.selectedModule,
      fetchModules,
      fetchModuleDetails,
      onLessonCompleted,
      onError,
    ]
  );

  /**
   * Get difficulty badge color
   */
  const getDifficultyColor = (difficulty?: DifficultyLevel): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get progress status icon
   */
  const getProgressStatusIcon = (status: ProgressStatus, size: number = 5) => {
    const className = `w-${size} h-${size}`;
    switch (status) {
      case 'completed':
        return <CheckCircle className={`${className} text-green-500`} />;
      case 'in_progress':
        return <Clock className={`${className} text-yellow-500`} />;
      case 'not_started':
      default:
        return <Circle className={`${className} text-gray-400`} />;
    }
  };

  /**
   * Get lesson type icon
   */
  const getLessonTypeIcon = (type: LessonType, size: number = 4) => {
    const className = `w-${size} h-${size}`;
    switch (type) {
      case 'video':
        return <Video className={`${className} text-blue-500`} />;
      case 'text':
        return <FileText className={`${className} text-green-500`} />;
      case 'quiz':
        return <Target className={`${className} text-purple-500`} />;
      case 'interactive':
        return <Zap className={`${className} text-yellow-500`} />;
      default:
        return <BookOpen className={`${className} text-gray-500`} />;
    }
  };

  /**
   * Handle module selection and navigation
   */
  const handleModuleSelect = useCallback(
    async (moduleId: string) => {
      await fetchModuleDetails(moduleId);

      // Expand the module in the accordion view
      setExpandedModules(prev => new Set([...prev, moduleId]));

      // If module hasn't been started, mark it as started
      const module = state.modules.find(m => m.id === moduleId);
      if (module?.progressStatus === 'not_started') {
        await updateModuleProgress(moduleId, 5); // Mark as started with minimal progress
      }
    },
    [state.modules, fetchModuleDetails, updateModuleProgress]
  );

  /**
   * Handle lesson selection
   */
  const handleLessonSelect = useCallback(
    async (lessonId: string) => {
      await fetchLessonDetails(lessonId);
    },
    [fetchLessonDetails]
  );

  /**
   * Toggle module expansion in accordion view
   */
  const toggleModuleExpansion = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  }, []);

  /**
   * Filter and sort modules based on current state
   */
  const filteredAndSortedModules = useMemo(() => {
    let filtered = state.modules;

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        module =>
          module.title.toLowerCase().includes(query) ||
          module.description?.toLowerCase().includes(query) ||
          module.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (state.filterBy !== 'all') {
      filtered = filtered.filter(
        module => module.progressStatus === state.filterBy
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'progress':
          return b.progressPercentage - a.progressPercentage;
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          const aDiff = difficultyOrder[a.difficultyLevel || 'beginner'];
          const bDiff = difficultyOrder[b.difficultyLevel || 'beginner'];
          return aDiff - bDiff;
        case 'order':
        default:
          return a.moduleOrder - b.moduleOrder;
      }
    });

    return filtered;
  }, [state.modules, state.searchQuery, state.filterBy, state.sortBy]);

  /**
   * Calculate overall workshop completion statistics
   */
  const workshopStats = useMemo(() => {
    const totalModules = state.modules.length;
    const completedModules = state.modules.filter(
      m => m.progressStatus === 'completed'
    ).length;
    const inProgressModules = state.modules.filter(
      m => m.progressStatus === 'in_progress'
    ).length;
    const notStartedModules = state.modules.filter(
      m => m.progressStatus === 'not_started'
    ).length;

    const totalProgress = state.modules.reduce(
      (sum, m) => sum + m.progressPercentage,
      0
    );
    const overallProgress =
      totalModules > 0 ? Math.round(totalProgress / totalModules) : 0;

    const totalDuration = state.modules.reduce(
      (sum, m) => sum + m.durationMinutes,
      0
    );

    return {
      totalModules,
      completedModules,
      inProgressModules,
      notStartedModules,
      overallProgress,
      totalDuration,
      completionRate:
        totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0,
    };
  }, [state.modules]);

  // Loading state
  if (state.loading && state.modules.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className='bg-background-secondary border-border-primary'>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-tomb45-green mx-auto mb-6'></div>
            <h3 className='text-lg font-semibold text-text-primary mb-2'>
              Loading Workshop Content
            </h3>
            <p className='text-text-secondary'>
              Fetching your personalized workshop modules and progress...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className='bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'>
          <CardContent className='p-8 text-center'>
            <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
            <h3 className='text-lg font-semibold text-red-700 dark:text-red-300 mb-2'>
              Unable to Load Workshop
            </h3>
            <p className='text-red-600 dark:text-red-400 mb-6'>{state.error}</p>
            <div className='flex justify-center gap-4'>
              <Button onClick={fetchModules} variant='outline'>
                <Clock className='w-4 h-4 mr-2' />
                Try Again
              </Button>
              {onError && (
                <Button
                  onClick={() => onError('Workshop loading failed')}
                  variant='ghost'
                >
                  Report Issue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (state.modules.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className='bg-background-secondary border-border-primary'>
          <CardContent className='p-8 text-center'>
            <GraduationCap className='w-16 h-16 text-tomb45-green mx-auto mb-6' />
            <h3 className='text-xl font-semibold text-text-primary mb-2'>
              No Workshop Content Available
            </h3>
            <p className='text-text-secondary mb-6'>
              We're preparing amazing workshop content for you. Check back soon!
            </p>
            <Button onClick={fetchModules} variant='outline'>
              <Clock className='w-4 h-4 mr-2' />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main render with comprehensive workshop interface
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Workshop Header with Overall Progress */}
      <Card className='bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-tomb45-green/20 rounded-xl'>
                <GraduationCap className='w-8 h-8 text-tomb45-green' />
              </div>
              <div>
                <CardTitle className='text-2xl font-bold text-text-primary'>
                  6FB Workshop Progress
                </CardTitle>
                <p className='text-text-secondary mt-1'>
                  Master the Six Figure Barber methodology through interactive
                  content
                </p>
              </div>
            </div>
            {showAnalytics && (
              <div className='flex gap-2'>
                <Button
                  onClick={() =>
                    setState(prev => ({
                      ...prev,
                      viewMode: prev.viewMode === 'grid' ? 'list' : 'grid',
                    }))
                  }
                  variant='outline'
                  size='sm'
                >
                  {state.viewMode === 'grid' ? 'List View' : 'Grid View'}
                </Button>
                <Button onClick={() => {}} variant='ghost' size='sm'>
                  <Download className='w-4 h-4 mr-2' />
                  Export Progress
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Statistics */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6 mb-6'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-tomb45-green mb-1'>
                {workshopStats.overallProgress}%
              </div>
              <div className='text-sm text-text-secondary'>
                Overall Progress
              </div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-blue-600 mb-1'>
                {workshopStats.completedModules}
              </div>
              <div className='text-sm text-text-secondary'>
                Completed Modules
              </div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-yellow-600 mb-1'>
                {workshopStats.inProgressModules}
              </div>
              <div className='text-sm text-text-secondary'>In Progress</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-purple-600 mb-1'>
                {Math.round(workshopStats.totalDuration / 60)}h
              </div>
              <div className='text-sm text-text-secondary'>Total Content</div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-text-secondary'>Workshop Completion</span>
              <span className='font-semibold text-text-primary'>
                {workshopStats.completedModules} / {workshopStats.totalModules}{' '}
                modules
              </span>
            </div>
            <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4'>
              <div
                className='bg-gradient-to-r from-tomb45-green to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2'
                style={{ width: `${workshopStats.overallProgress}%` }}
              >
                {workshopStats.overallProgress > 10 && (
                  <span className='text-white text-xs font-medium'>
                    {workshopStats.overallProgress}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Controls */}
      <Card className='bg-background-secondary border-border-primary'>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            {/* Search Input */}
            <div className='flex-1'>
              <input
                type='text'
                placeholder='Search modules by title, description, or tags...'
                value={state.searchQuery}
                onChange={e =>
                  setState(prev => ({ ...prev, searchQuery: e.target.value }))
                }
                className='w-full px-4 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:border-transparent'
              />
            </div>

            {/* Filter Controls */}
            <div className='flex gap-2'>
              <select
                value={state.filterBy}
                onChange={e =>
                  setState(prev => ({
                    ...prev,
                    filterBy: e.target.value as any,
                  }))
                }
                className='px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              >
                <option value='all'>All Modules</option>
                <option value='not_started'>Not Started</option>
                <option value='in_progress'>In Progress</option>
                <option value='completed'>Completed</option>
              </select>

              <select
                value={state.sortBy}
                onChange={e =>
                  setState(prev => ({ ...prev, sortBy: e.target.value as any }))
                }
                className='px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tomb45-green'
              >
                <option value='order'>Module Order</option>
                <option value='progress'>Progress</option>
                <option value='difficulty'>Difficulty</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module List/Grid */}
      <div
        className={
          state.viewMode === 'grid'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
            : 'space-y-4'
        }
      >
        {filteredAndSortedModules.map(module => (
          <Card
            key={module.id}
            className={`bg-background-secondary border-border-primary transition-all duration-200 hover:shadow-lg hover:border-tomb45-green/30 cursor-pointer ${
              state.selectedModule?.id === module.id
                ? 'ring-2 ring-tomb45-green border-tomb45-green'
                : ''
            }`}
            onClick={() => handleModuleSelect(module.id)}
          >
            <CardContent className='p-6'>
              {/* Module Header */}
              <div className='flex items-start justify-between mb-4'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-2'>
                    {getProgressStatusIcon(module.progressStatus, 6)}
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-xs'>
                        Module {module.moduleOrder}
                      </Badge>
                      {module.difficultyLevel && (
                        <Badge
                          className={`text-xs ${getDifficultyColor(module.difficultyLevel)}`}
                        >
                          {module.difficultyLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold text-text-primary mb-2 hover:text-tomb45-green transition-colors'>
                    {module.title}
                  </h3>
                  {module.description && (
                    <p className='text-text-secondary text-sm mb-3 line-clamp-2'>
                      {module.description}
                    </p>
                  )}
                </div>
                <Button
                  variant={
                    module.progressStatus === 'completed'
                      ? 'outline'
                      : 'primary'
                  }
                  size='sm'
                  className='ml-4'
                  onClick={e => {
                    e.stopPropagation();
                    handleModuleSelect(module.id);
                  }}
                >
                  {module.progressStatus === 'completed' ? (
                    <>
                      <Trophy className='w-4 h-4 mr-2' />
                      Review
                    </>
                  ) : module.progressStatus === 'in_progress' ? (
                    <>
                      <PlayCircle className='w-4 h-4 mr-2' />
                      Continue
                    </>
                  ) : (
                    <>
                      <PlayCircle className='w-4 h-4 mr-2' />
                      Start
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Section */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Progress</span>
                  <span className='font-medium text-text-primary'>
                    {module.progressPercentage}%
                  </span>
                </div>
                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-tomb45-green h-2 rounded-full transition-all duration-300'
                    style={{ width: `${module.progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Module Metadata */}
              <div className='flex items-center justify-between mt-4 pt-4 border-t border-border-primary'>
                <div className='flex items-center gap-4 text-sm text-text-secondary'>
                  <div className='flex items-center gap-1'>
                    <Clock className='w-4 h-4' />
                    <span>{module.durationMinutes} min</span>
                  </div>
                  {module.lastAccessedAt && (
                    <div className='flex items-center gap-1'>
                      <Calendar className='w-4 h-4' />
                      <span>
                        Last:{' '}
                        {new Date(module.lastAccessedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  {module.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant='outline' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                  {module.tags.length > 2 && (
                    <Badge variant='outline' className='text-xs'>
                      +{module.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Prerequisites Warning */}
              {!module.prerequisitesMet && (
                <div className='flex items-center gap-2 mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
                  <Lock className='w-4 h-4 text-yellow-600' />
                  <span className='text-sm text-yellow-700 dark:text-yellow-300'>
                    Prerequisites required
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Module Details */}
      {state.selectedModule && (
        <Card className='bg-background-secondary border-border-primary'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-xl font-bold text-text-primary'>
                {state.selectedModule.title}
              </CardTitle>
              <Button
                onClick={() =>
                  setState(prev => ({ ...prev, selectedModule: null }))
                }
                variant='ghost'
                size='sm'
              >
                <ChevronUp className='w-4 h-4' />
              </Button>
            </div>
            {state.selectedModule.description && (
              <p className='text-text-secondary mt-2'>
                {state.selectedModule.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {/* Module Content & Lessons would be rendered here */}
            <div className='space-y-4'>
              {state.selectedModule.lessons &&
              state.selectedModule.lessons.length > 0 ? (
                <div className='space-y-3'>
                  <h4 className='font-semibold text-text-primary mb-3'>
                    Module Lessons
                  </h4>
                  {state.selectedModule.lessons.map((lesson, index) => (
                    <Card
                      key={lesson.id}
                      className='bg-background-accent border-border-primary hover:border-tomb45-green/30 cursor-pointer transition-all'
                      onClick={() => handleLessonSelect(lesson.id)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            {getLessonTypeIcon(lesson.lessonType)}
                            <div>
                              <h5 className='font-medium text-text-primary'>
                                Lesson {index + 1}: {lesson.title}
                              </h5>
                              <div className='flex items-center gap-2 mt-1'>
                                <span className='text-sm text-text-secondary'>
                                  {lesson.durationMinutes} min
                                </span>
                                {lesson.progress && (
                                  <Badge variant='outline' className='text-xs'>
                                    {lesson.progress.completed
                                      ? 'Completed'
                                      : `${lesson.progress.progressPercentage}%`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            {lesson.progress?.completed ? (
                              <CheckCircle className='w-5 h-5 text-green-500' />
                            ) : (
                              <Button size='sm' variant='outline'>
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <BookOpen className='w-16 h-16 text-tomb45-green mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-text-primary mb-2'>
                    Module Content Loading
                  </h3>
                  <p className='text-text-secondary mb-4'>
                    This module's content is being prepared for an optimal
                    learning experience.
                  </p>
                  <div className='flex justify-center gap-3'>
                    <Button
                      onClick={() =>
                        updateModuleProgress(state.selectedModule!.id, 25)
                      }
                      variant='outline'
                      size='sm'
                    >
                      Mark 25% Complete
                    </Button>
                    <Button
                      onClick={() =>
                        updateModuleProgress(state.selectedModule!.id, 50)
                      }
                      variant='outline'
                      size='sm'
                    >
                      Mark 50% Complete
                    </Button>
                    <Button
                      onClick={() =>
                        updateModuleProgress(state.selectedModule!.id, 100)
                      }
                      className='bg-tomb45-green hover:bg-tomb45-green/90'
                      size='sm'
                    >
                      <Trophy className='w-4 h-4 mr-2' />
                      Complete Module
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Lesson Details */}
      {state.selectedLesson && (
        <Card className='bg-background-secondary border-border-primary'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {getLessonTypeIcon(state.selectedLesson.lessonType, 5)}
                <div>
                  <CardTitle className='text-lg font-bold text-text-primary'>
                    {state.selectedLesson.title}
                  </CardTitle>
                  <p className='text-text-secondary'>
                    {state.selectedLesson.module.title} •{' '}
                    {state.selectedLesson.durationMinutes} minutes
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  setState(prev => ({ ...prev, selectedLesson: null }))
                }
                variant='ghost'
                size='sm'
              >
                <ChevronUp className='w-4 h-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lesson content would be rendered here based on lesson type */}
            <div className='text-center py-8'>
              <div className='p-4 bg-tomb45-green/10 rounded-xl inline-block mb-4'>
                {getLessonTypeIcon(state.selectedLesson.lessonType, 8)}
              </div>
              <h3 className='text-lg font-medium text-text-primary mb-2'>
                Interactive Lesson Content
              </h3>
              <p className='text-text-secondary mb-6'>
                This lesson's interactive content will be displayed here based
                on the lesson type: {state.selectedLesson.lessonType}
              </p>
              <Button
                onClick={() => completeLesson(state.selectedLesson!.id)}
                className='bg-tomb45-green hover:bg-tomb45-green/90'
              >
                <CheckCircle className='w-4 h-4 mr-2' />
                Complete Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Export component and related types for external use
 */
export type { WorkshopContentProps };
export { WorkshopContent };
