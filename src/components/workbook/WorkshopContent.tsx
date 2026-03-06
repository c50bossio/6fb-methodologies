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
  Calculator,
  ClipboardList,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import InteractiveContentRenderer from './InteractiveContentRenderer';
import InteractiveWorkbookWithAudio from './InteractiveWorkbookWithAudio';
import LessonContentViewer from './LessonContentViewer';
import { ContentBlockFactories, AssessmentFactories } from '@/lib/content-blocks';
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
  /** Callback when interactive content is completed */
  onInteractiveCompleted?: (contentId: string, data: any) => void;
  /** Callback when interactive content is interacted with */
  onInteraction?: (contentId: string, interaction: any) => void;
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
  interactiveProgress: Record<string, any>;
  contentView: 'lesson' | 'interactive';
  activeInteractiveContent: string | null;
  showLessonContent: boolean;
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
function WorkshopContent({
  userId,
  initialModuleId,
  showAnalytics = false,
  className = '',
  onModuleSelected,
  onLessonCompleted,
  onError,
  onInteractiveCompleted,
  onInteraction,
}: WorkshopContentProps) {
  // Client-side hydration guard
  const [isMounted, setIsMounted] = useState(false);

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
    interactiveProgress: {},
    contentView: 'lesson',
    activeInteractiveContent: null,
    showLessonContent: false,
  });

  // Loading states for individual actions
  const [moduleLoading, setModuleLoading] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState<string | null>(null);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Expanded modules state for accordion-style navigation
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  // Client-side mounting guard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize component with better error handling
  useEffect(() => {
    console.log('🔍 WorkshopContent: useEffect triggered with:', {
      userId,
      isMounted,
      initialModuleId,
      userIdType: typeof userId,
      userIdLength: userId?.length
    });

    if (userId && userId !== 'unknown' && isMounted) {
      console.log('🚀 WorkshopContent: Initializing with userId:', userId);
      try {
        fetchModules();
        if (initialModuleId) {
          console.log('🎯 WorkshopContent: Loading initial module:', initialModuleId);
          fetchModuleDetails(initialModuleId);
        }
      } catch (error) {
        console.error('❌ WorkshopContent: Error during initialization:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize workshop content',
          loading: false
        }));
      }
    } else {
      console.log('⏳ WorkshopContent: Waiting for valid userId or mount:', {
        userId,
        isMounted,
        reason: !userId ? 'no userId' : userId === 'unknown' ? 'unknown userId' : 'not mounted'
      });
    }
  }, [userId, initialModuleId, isMounted]);

  /**
   * Fetch all available workshop modules with progress
   */
  const fetchModules = useCallback(async () => {
    // Only fetch if component is mounted on client-side
    if (!isMounted) {
      console.log('🚫 WorkshopContent: fetchModules skipped - not mounted');
      return;
    }

    try {
      console.log('📚 WorkshopContent: Starting fetchModules()');
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

      console.log('📡 WorkshopContent: fetchModules response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch modules');
      }

      const data: ModulesListResponse = await response.json();
      console.log('📦 WorkshopContent: fetchModules response data:', data);

      if (data.success && data.data) {
        console.log('✅ WorkshopContent: Successfully loaded', data.data.length, 'modules');
        setState(prev => ({
          ...prev,
          modules: data.data || [],
          loading: false,
        }));
      } else {
        console.error('❌ WorkshopContent: Invalid response format:', data);
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load modules';
      console.error('💥 WorkshopContent: fetchModules error:', errorMessage);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      onError?.(errorMessage);
    }
  }, [isMounted, onError]);

  /**
   * Fetch detailed module information including lessons
   */
  const fetchModuleDetails = useCallback(
    async (moduleId: string) => {
      // Only fetch if component is mounted on client-side
      if (!isMounted) {
        console.log('🚫 WorkshopContent: fetchModuleDetails skipped - not mounted');
        return;
      }

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
        console.log('📦 fetchModuleDetails received data:', {
          success: data.success,
          hasData: !!data.data,
          moduleId: data.data?.id,
          title: data.data?.title,
          lessonsCount: data.data?.lessons?.length || 0,
          lessons: data.data?.lessons?.map(l => ({ id: l.id, title: l.title, type: l.type })),
          error: data.error
        });

        if (data.success && data.data) {
          console.log('🔄 Setting selectedModule in state:', data.data.id);
          setState(prev => {
            console.log('📊 State update - before:', {
              selectedModuleId: prev.selectedModule?.id,
              loading: prev.loading
            });
            const newState = {
              ...prev,
              selectedModule: data.data!,
              loading: false,
            };
            console.log('📊 State update - after:', {
              selectedModuleId: newState.selectedModule?.id,
              loading: newState.loading
            });
            return newState;
          });
          onModuleSelected?.(moduleId);
          console.log('✅ fetchModuleDetails completed - selectedModule set');
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
    [isMounted, onModuleSelected, onError]
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
   * Get lesson type color for badges
   */
  const getLessonTypeColor = (type: LessonType) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'text':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'quiz':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'interactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get interactive content icon based on component type
   */
  const getInteractiveContentIcon = (component: string, size: number = 4) => {
    const className = `w-${size} h-${size}`;
    switch (component) {
      case 'QuizEngine':
        return <Target className={`${className} text-purple-500`} />;
      case 'GoalSettingWorksheet':
        return <Trophy className={`${className} text-blue-500`} />;
      case 'RevenuePricingCalculator':
        return <Calculator className={`${className} text-green-500`} />;
      case 'ServicePackageDesigner':
        return <Package className={`${className} text-orange-500`} />;
      case 'BusinessAssessmentTemplate':
        return <ClipboardList className={`${className} text-indigo-500`} />;
      default:
        return <Zap className={`${className} text-yellow-500`} />;
    }
  };

  /**
   * Handle interactive content completion
   */
  const handleInteractiveCompleted = useCallback(
    (contentId: string, data: any) => {
      setState(prev => ({
        ...prev,
        interactiveProgress: {
          ...prev.interactiveProgress,
          [contentId]: { ...data, completed: true, completedAt: new Date().toISOString() }
        }
      }));

      onInteractiveCompleted?.(contentId, data);

      // If this was part of a lesson, mark the lesson as complete
      if (state.selectedLesson) {
        const timeSpent = data.timeSpentMinutes ? data.timeSpentMinutes * 60 : 0;
        const score = data.score || data.overallPercentage || undefined;
        completeLesson(state.selectedLesson.id, score, timeSpent);
      }
    },
    [state.selectedLesson, onInteractiveCompleted, completeLesson]
  );

  /**
   * Handle interactive content interaction
   */
  const handleInteraction = useCallback(
    (contentId: string, interaction: any) => {
      setState(prev => ({
        ...prev,
        interactiveProgress: {
          ...prev.interactiveProgress,
          [contentId]: {
            ...prev.interactiveProgress[contentId],
            ...interaction,
            lastInteraction: new Date().toISOString()
          }
        }
      }));

      onInteraction?.(contentId, interaction);
    },
    [onInteraction]
  );

  /**
   * Launch interactive content
   */
  const launchInteractiveContent = useCallback((contentType: string) => {
    setState(prev => ({
      ...prev,
      activeInteractiveContent: contentType,
      contentView: 'interactive'
    }));
  }, []);

  /**
   * Close interactive content
   */
  const closeInteractiveContent = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeInteractiveContent: null,
      contentView: 'lesson'
    }));
  }, []);

  /**
   * Handle data export
   */
  const handleExport = useCallback(
    async (format: 'pdf' | 'json' | 'markdown' | 'csv') => {
      try {
        setExportLoading(true);

        const exportOptions = {
          format,
          includeNotes: true,
          includeProgress: true,
          includeTranscriptions: false,
          includeSessions: false,
          includeAudioMetadata: false,
        };

        const response = await fetch('/api/workbook/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(exportOptions),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }

        // For PDF, trigger download
        if (format === 'pdf') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `6fb-workshop-export-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // For other formats, get the data and trigger download
          const data = await response.json();
          const content = format === 'json'
            ? JSON.stringify(data.data, null, 2)
            : data.data;

          const blob = new Blob([content], {
            type: format === 'json' ? 'application/json' : 'text/plain'
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `6fb-workshop-export-${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        setShowExportModal(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Export failed';
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      } finally {
        setExportLoading(false);
      }
    },
    [onError]
  );

  /**
   * Handle module selection and navigation
   */
  const handleModuleSelect = useCallback(
    async (moduleId: string) => {
      try {
        console.log('🎯 WorkshopContent: handleModuleSelect called with moduleId:', moduleId);
        console.log('📊 Current state before selection:', {
          selectedModule: state.selectedModule?.id,
          moduleLoading,
          error: state.error,
          modulesLength: state.modules.length
        });

        setModuleLoading(moduleId);

        // Clear any previous errors
        setState(prev => ({ ...prev, error: null }));

        console.log('📖 WorkshopContent: Fetching module details for:', moduleId);
        await fetchModuleDetails(moduleId);

        // Expand the module in the accordion view
        setExpandedModules(prev => new Set([...prev, moduleId]));

        // If module hasn't been started, mark it as started
        const module = state.modules.find(m => m.id === moduleId);
        console.log('📋 Found module for progress check:', {
          moduleId,
          foundModule: !!module,
          progressStatus: module?.progressStatus
        });

        if (module?.progressStatus === 'not_started') {
          console.log('🚀 Marking module as started with 5% progress');
          await updateModuleProgress(moduleId, 5); // Mark as started with minimal progress
        }

        console.log('✅ handleModuleSelect completed successfully for:', moduleId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load module';
        console.error('❌ handleModuleSelect error:', errorMessage, error);
        setState(prev => ({ ...prev, error: `Failed to load module: ${errorMessage}` }));
        onError?.(errorMessage);
      } finally {
        setModuleLoading(null);
        console.log('🏁 handleModuleSelect finally block - moduleLoading cleared');
      }
    },
    [state.modules, fetchModuleDetails, updateModuleProgress, onError]
  );

  /**
   * Handle lesson selection
   */
  const handleLessonSelect = useCallback(
    async (lessonId: string) => {
      await fetchLessonDetails(lessonId);
      setState(prev => ({ ...prev, showLessonContent: true }));
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

  // Hydration guard - prevent rendering until client-side
  if (!isMounted) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className='bg-background-secondary border-border-primary'>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-tomb45-green mx-auto mb-6'></div>
            <h3 className='text-lg font-semibold text-text-primary mb-2'>
              Initializing Workshop
            </h3>
            <p className='text-text-secondary'>
              Preparing your workshop experience...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Lesson Content Viewer - Show when a lesson is selected
  if (state.showLessonContent && state.selectedLesson) {
    const currentModule = state.selectedModule;
    const currentLessonIndex = currentModule?.lessons?.findIndex(l => l.id === state.selectedLesson?.id) ?? -1;
    const hasPrevious = currentLessonIndex > 0;
    const hasNext = currentLessonIndex < (currentModule?.lessons?.length ?? 0) - 1;

    const handlePreviousLesson = async () => {
      if (hasPrevious && currentModule?.lessons) {
        const previousLesson = currentModule.lessons[currentLessonIndex - 1];
        await handleLessonSelect(previousLesson.id);
      }
    };

    const handleNextLesson = async () => {
      if (hasNext && currentModule?.lessons) {
        const nextLesson = currentModule.lessons[currentLessonIndex + 1];
        await handleLessonSelect(nextLesson.id);
      }
    };

    const handleCloseLessonViewer = () => {
      setState(prev => ({ ...prev, showLessonContent: false, selectedLesson: null }));
    };

    return (
      <LessonContentViewer
        lesson={state.selectedLesson}
        moduleId={currentModule?.id || ''}
        userId={userId || ''}
        onClose={handleCloseLessonViewer}
        onComplete={completeLesson}
        onPrevious={hasPrevious ? handlePreviousLesson : undefined}
        onNext={hasNext ? handleNextLesson : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    );
  }

  // Debug logging for render decisions
  console.log('🎨 WorkshopContent render state:', {
    showLessonContent: state.showLessonContent,
    hasSelectedLesson: !!state.selectedLesson,
    hasSelectedModule: !!state.selectedModule,
    selectedModuleId: state.selectedModule?.id,
    selectedLessonId: state.selectedLesson?.id,
    loading: state.loading,
    error: state.error,
    modulesLength: state.modules.length
  });

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
                <Button
                  onClick={() => setShowExportModal(true)}
                  variant='ghost'
                  size='sm'
                  disabled={exportLoading}
                >
                  <Download className='w-4 h-4 mr-2' />
                  {exportLoading ? 'Exporting...' : 'Export Progress'}
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
                  className={`ml-4 transition-all duration-200 ${
                    state.selectedModule?.id === module.id
                      ? 'bg-tomb45-green text-white ring-2 ring-tomb45-green/50'
                      : ''
                  }`}
                  disabled={moduleLoading === module.id}
                  onClick={e => {
                    e.stopPropagation();
                    console.log('🔘 Continue button clicked for module:', module.id);
                    handleModuleSelect(module.id);

                    // Scroll to selected module after a brief delay
                    setTimeout(() => {
                      const element = document.querySelector('[data-selected-module]');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 300);
                  }}
                >
                  {moduleLoading === module.id ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                      Loading...
                    </>
                  ) : state.selectedModule?.id === module.id ? (
                    <>
                      <CheckCircle className='w-4 h-4 mr-2' />
                      Selected
                    </>
                  ) : module.progressStatus === 'completed' ? (
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
        <Card
          className='bg-background-secondary border-border-primary border-2 border-tomb45-green shadow-lg'
          data-selected-module
        >
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-tomb45-green/20 rounded-full'>
                  <GraduationCap className='w-6 h-6 text-tomb45-green' />
                </div>
                <div>
                  <CardTitle className='text-xl font-bold text-text-primary'>
                    {state.selectedModule.title}
                  </CardTitle>
                  <Badge className='bg-green-100 text-green-800 border-green-200 mt-1'>
                    Module Selected
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => {
                  console.log('🔙 Closing selected module');
                  setState(prev => ({ ...prev, selectedModule: null }));
                }}
                variant='ghost'
                size='sm'
              >
                <ChevronUp className='w-4 h-4' />
                Close
              </Button>
            </div>
            {state.selectedModule.description && (
              <p className='text-text-secondary mt-2'>
                {state.selectedModule.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {console.log('🔍 Rendering selected module lessons:', {
                hasLessons: !!state.selectedModule.lessons,
                lessonsCount: state.selectedModule.lessons?.length || 0,
                lessons: state.selectedModule.lessons?.map(l => ({ id: l.id, title: l.title }))
              })}

              {state.selectedModule.lessons &&
              state.selectedModule.lessons.length > 0 ? (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h4 className='font-semibold text-text-primary text-lg'>
                      Module Lessons ({state.selectedModule.lessons.length})
                    </h4>
                    <Badge variant='outline' className='text-xs'>
                      Click any lesson to start
                    </Badge>
                  </div>
                  {state.selectedModule.lessons.map((lesson, index) => (
                    <Card
                      key={lesson.id}
                      className='bg-background-accent border-border-primary hover:border-tomb45-green/50 hover:shadow-md cursor-pointer transition-all duration-200'
                      onClick={() => {
                        console.log('🎯 Lesson selected:', lesson.id, lesson.title);
                        handleLessonSelect(lesson.id);
                      }}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            {getLessonTypeIcon(lesson.type || lesson.lessonType)}
                            <div>
                              <h5 className='font-medium text-text-primary'>
                                Lesson {index + 1}: {lesson.title}
                              </h5>
                              <div className='flex items-center gap-2 mt-1'>
                                <span className='text-sm text-text-secondary'>
                                  {lesson.estimatedMinutes || lesson.durationMinutes || 0} min
                                </span>
                                <Badge variant='outline' className={`text-xs ${getLessonTypeColor(lesson.type || lesson.lessonType)}`}>
                                  {lesson.type || lesson.lessonType || 'content'}
                                </Badge>
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
                              <Button size='sm' variant='outline' className='hover:bg-tomb45-green hover:text-white'>
                                <PlayCircle className='w-4 h-4 mr-1' />
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
                    This module's content is being prepared. You can still mark progress or return to the module list.
                  </p>
                  <div className='flex justify-center gap-3'>
                    <Button
                      onClick={() => {
                        console.log('📈 Marking 25% progress');
                        updateModuleProgress(state.selectedModule!.id, 25);
                      }}
                      variant='outline'
                      size='sm'
                    >
                      Mark 25% Complete
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('📈 Marking 50% progress');
                        updateModuleProgress(state.selectedModule!.id, 50);
                      }}
                      variant='outline'
                      size='sm'
                    >
                      Mark 50% Complete
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('📈 Marking 100% progress');
                        updateModuleProgress(state.selectedModule!.id, 100);
                      }}
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
            <Tabs value={state.contentView} onValueChange={(value: any) => setState(prev => ({ ...prev, contentView: value }))}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="lesson">Lesson Content</TabsTrigger>
                <TabsTrigger value="interactive">Interactive Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="lesson" className="space-y-6">
                {/* Standard lesson content */}
                <div className='text-center py-8'>
                  <div className='p-4 bg-tomb45-green/10 rounded-xl inline-block mb-4'>
                    {getLessonTypeIcon(state.selectedLesson.lessonType, 8)}
                  </div>
                  <h3 className='text-lg font-medium text-text-primary mb-2'>
                    Lesson Content
                  </h3>
                  <p className='text-text-secondary mb-6'>
                    This lesson's content will be displayed here. Type: {state.selectedLesson.lessonType}
                  </p>
                  <Button
                    onClick={() => completeLesson(state.selectedLesson!.id)}
                    className='bg-tomb45-green hover:bg-tomb45-green/90'
                  >
                    <CheckCircle className='w-4 h-4 mr-2' />
                    Complete Lesson
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="interactive" className="space-y-6">
                {state.activeInteractiveContent ? (
                  <InteractiveWorkbookWithAudio
                    activeComponent={state.activeInteractiveContent as any}
                    sessionContext={{
                      moduleId: state.selectedModule?.id,
                      lessonId: state.selectedLesson?.id,
                      userId: userId,
                    }}
                    componentProps={{
                      // Component-specific props based on type
                      ...(state.activeInteractiveContent === 'QuizEngine' && {
                        assessment: AssessmentFactories.createBusinessFundamentalsQuiz(),
                        allowRetake: true,
                        showDetailedResults: true,
                      }),
                      ...(state.activeInteractiveContent === 'GoalSettingWorksheet' && {
                        showProgress: true,
                      }),
                      ...(state.activeInteractiveContent === 'RevenuePricingCalculator' && {
                        showExport: true,
                      }),
                      ...(state.activeInteractiveContent === 'ServicePackageDesigner' && {
                        showAnalytics: true,
                      }),
                      ...(state.activeInteractiveContent === 'BusinessAssessmentTemplate' && {
                        showDetailedResults: true,
                      }),
                    }}
                    onComplete={(sessionData) => {
                      handleInteractiveCompleted(
                        state.activeInteractiveContent || 'unknown',
                        sessionData
                      );
                    }}
                    onSave={(sessionData) => {
                      handleInteraction(
                        state.activeInteractiveContent || 'unknown',
                        { sessionData }
                      );
                    }}
                    onNoteCreated={(note) => {
                      // Handle note creation - could integrate with note-taking API
                      console.log('Note created:', note);
                    }}
                    onClose={closeInteractiveContent}
                    enableAudioNotes={true}
                    enableTextNotes={true}
                    autoSave={true}
                    readonly={false}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card
                      className="bg-background-accent border-border-primary hover:border-purple-500/30 cursor-pointer transition-all"
                      onClick={() => launchInteractiveContent('QuizEngine')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl inline-block mb-4">
                          {getInteractiveContentIcon('QuizEngine', 8)}
                        </div>
                        <h4 className="font-semibold text-text-primary mb-2">Knowledge Quiz</h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Test your understanding with interactive quizzes
                        </p>
                        <Button size="sm" variant="outline">
                          Start Quiz
                        </Button>
                      </CardContent>
                    </Card>

                    <Card
                      className="bg-background-accent border-border-primary hover:border-blue-500/30 cursor-pointer transition-all"
                      onClick={() => launchInteractiveContent('GoalSettingWorksheet')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl inline-block mb-4">
                          {getInteractiveContentIcon('GoalSettingWorksheet', 8)}
                        </div>
                        <h4 className="font-semibold text-text-primary mb-2">Goal Setting</h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Create SMART goals for your business growth
                        </p>
                        <Button size="sm" variant="outline">
                          Set Goals
                        </Button>
                      </CardContent>
                    </Card>

                    <Card
                      className="bg-background-accent border-border-primary hover:border-green-500/30 cursor-pointer transition-all"
                      onClick={() => launchInteractiveContent('RevenuePricingCalculator')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl inline-block mb-4">
                          {getInteractiveContentIcon('RevenuePricingCalculator', 8)}
                        </div>
                        <h4 className="font-semibold text-text-primary mb-2">Pricing Calculator</h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Optimize your pricing and revenue strategy
                        </p>
                        <Button size="sm" variant="outline">
                          Calculate
                        </Button>
                      </CardContent>
                    </Card>

                    <Card
                      className="bg-background-accent border-border-primary hover:border-orange-500/30 cursor-pointer transition-all"
                      onClick={() => launchInteractiveContent('ServicePackageDesigner')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl inline-block mb-4">
                          {getInteractiveContentIcon('ServicePackageDesigner', 8)}
                        </div>
                        <h4 className="font-semibold text-text-primary mb-2">Package Designer</h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Create compelling service packages
                        </p>
                        <Button size="sm" variant="outline">
                          Design
                        </Button>
                      </CardContent>
                    </Card>

                    <Card
                      className="bg-background-accent border-border-primary hover:border-indigo-500/30 cursor-pointer transition-all md:col-span-2"
                      onClick={() => launchInteractiveContent('BusinessAssessmentTemplate')}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl inline-block mb-4">
                          {getInteractiveContentIcon('BusinessAssessmentTemplate', 8)}
                        </div>
                        <h4 className="font-semibold text-text-primary mb-2">Business Assessment</h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Comprehensive evaluation of your business health
                        </p>
                        <Button size="sm" variant="outline">
                          Start Assessment
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="bg-white dark:bg-gray-800 p-6 max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">
                Export Workshop Progress
              </CardTitle>
              <p className="text-text-secondary text-sm">
                Choose the format for your workshop data export
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => handleExport('pdf')}
                  disabled={exportLoading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Report (Recommended)
                </Button>
                <Button
                  onClick={() => handleExport('json')}
                  disabled={exportLoading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  JSON Data
                </Button>
                <Button
                  onClick={() => handleExport('markdown')}
                  disabled={exportLoading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Markdown Format
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={exportLoading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Target className="w-4 h-4 mr-2" />
                  CSV Spreadsheet
                </Button>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  onClick={() => setShowExportModal(false)}
                  variant="ghost"
                  disabled={exportLoading}
                >
                  Cancel
                </Button>
              </div>
              {exportLoading && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tomb45-green mx-auto"></div>
                  <p className="text-sm text-text-secondary mt-2">Generating export...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Error boundary for WorkshopContent to catch React Context errors
 */
class WorkshopContentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WorkshopContent Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                Workshop Content Error
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-6">
                There was an issue loading the workshop content. This might be due to a hydration error.
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                variant="outline"
              >
                <Clock className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapped WorkshopContent with error boundary protection
 */
function WorkshopContentWithErrorBoundary(props: WorkshopContentProps) {
  return (
    <WorkshopContentErrorBoundary>
      <WorkshopContent {...props} />
    </WorkshopContentErrorBoundary>
  );
}

/**
 * Export component and related types for external use
 */
export type { WorkshopContentProps };
export { WorkshopContent };
export default WorkshopContentWithErrorBoundary;
