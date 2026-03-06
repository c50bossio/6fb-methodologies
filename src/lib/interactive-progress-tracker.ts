/**
 * Interactive Progress Tracker - Comprehensive progress tracking for workbook components
 *
 * This module provides functionality to track user progress through interactive
 * workbook components, including completion status, time spent, scores, and engagement metrics.
 */

interface ProgressMetrics {
  timeSpent: number; // seconds
  interactions: number;
  completionPercentage: number;
  score?: number;
  attempts: number;
  lastActivity: string;
}

interface ComponentProgress {
  componentId: string;
  componentType: 'quiz' | 'worksheet' | 'calculator' | 'designer' | 'assessment';
  userId: string;
  sessionId: string;
  moduleId?: string;
  lessonId?: string;
  startTime: string;
  completedTime?: string;
  isCompleted: boolean;
  metrics: ProgressMetrics;
  stepProgress: Record<string, any>;
  achievements: string[];
  feedback?: string;
  notes: Array<{
    id: string;
    type: 'audio' | 'text';
    timestamp: string;
    content: string;
  }>;
}

interface ProgressUpdate {
  stepId?: string;
  stepData?: any;
  timeSpent?: number;
  interaction?: string;
  score?: number;
  isCompleted?: boolean;
  achievement?: string;
}

interface ProgressSummary {
  totalComponents: number;
  completedComponents: number;
  totalTimeSpent: number;
  averageScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  streakCount: number;
  lastActivity: string;
  achievements: string[];
}

class InteractiveProgressTracker {
  private progress: Map<string, ComponentProgress> = new Map();
  private changeListeners: Set<(progress: ComponentProgress) => void> = new Set();

  /**
   * Initialize a new component session
   */
  startComponent(
    componentId: string,
    componentType: ComponentProgress['componentType'],
    userId: string,
    context?: {
      moduleId?: string;
      lessonId?: string;
      sessionId?: string;
    }
  ): ComponentProgress {
    const progress: ComponentProgress = {
      componentId,
      componentType,
      userId,
      sessionId: context?.sessionId || Date.now().toString(),
      moduleId: context?.moduleId,
      lessonId: context?.lessonId,
      startTime: new Date().toISOString(),
      isCompleted: false,
      metrics: {
        timeSpent: 0,
        interactions: 0,
        completionPercentage: 0,
        attempts: 1,
        lastActivity: new Date().toISOString(),
      },
      stepProgress: {},
      achievements: [],
      notes: [],
    };

    this.progress.set(componentId, progress);
    this.notifyListeners(progress);
    return progress;
  }

  /**
   * Update component progress
   */
  updateProgress(componentId: string, update: ProgressUpdate): ComponentProgress | null {
    const current = this.progress.get(componentId);
    if (!current) return null;

    const updated: ComponentProgress = {
      ...current,
      metrics: {
        ...current.metrics,
        timeSpent: update.timeSpent !== undefined
          ? current.metrics.timeSpent + update.timeSpent
          : current.metrics.timeSpent,
        interactions: update.interaction
          ? current.metrics.interactions + 1
          : current.metrics.interactions,
        score: update.score !== undefined ? update.score : current.metrics.score,
        lastActivity: new Date().toISOString(),
      },
      stepProgress: update.stepId
        ? { ...current.stepProgress, [update.stepId]: update.stepData }
        : current.stepProgress,
      isCompleted: update.isCompleted !== undefined ? update.isCompleted : current.isCompleted,
      completedTime: update.isCompleted ? new Date().toISOString() : current.completedTime,
      achievements: update.achievement
        ? [...current.achievements, update.achievement]
        : current.achievements,
    };

    // Calculate completion percentage based on component type
    updated.metrics.completionPercentage = this.calculateCompletionPercentage(updated);

    this.progress.set(componentId, updated);
    this.notifyListeners(updated);

    // Check for new achievements
    this.checkAchievements(updated);

    return updated;
  }

  /**
   * Add a note to the component progress
   */
  addNote(
    componentId: string,
    note: {
      type: 'audio' | 'text';
      content: string;
    }
  ): ComponentProgress | null {
    const current = this.progress.get(componentId);
    if (!current) return null;

    const noteEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...note,
    };

    const updated: ComponentProgress = {
      ...current,
      notes: [...current.notes, noteEntry],
      metrics: {
        ...current.metrics,
        interactions: current.metrics.interactions + 1,
        lastActivity: new Date().toISOString(),
      },
    };

    this.progress.set(componentId, updated);
    this.notifyListeners(updated);
    return updated;
  }

  /**
   * Complete a component
   */
  completeComponent(
    componentId: string,
    finalData?: any
  ): ComponentProgress | null {
    const current = this.progress.get(componentId);
    if (!current) return null;

    const updated: ComponentProgress = {
      ...current,
      isCompleted: true,
      completedTime: new Date().toISOString(),
      metrics: {
        ...current.metrics,
        completionPercentage: 100,
        lastActivity: new Date().toISOString(),
      },
      stepProgress: finalData
        ? { ...current.stepProgress, final: finalData }
        : current.stepProgress,
    };

    this.progress.set(componentId, updated);
    this.notifyListeners(updated);

    // Award completion achievement
    this.awardAchievement(updated, `${current.componentType}_completed`);

    return updated;
  }

  /**
   * Get progress for a specific component
   */
  getProgress(componentId: string): ComponentProgress | null {
    return this.progress.get(componentId) || null;
  }

  /**
   * Get all progress for a user
   */
  getUserProgress(userId: string): ComponentProgress[] {
    return Array.from(this.progress.values()).filter(p => p.userId === userId);
  }

  /**
   * Get progress summary for a user
   */
  getProgressSummary(userId: string): ProgressSummary {
    const userProgress = this.getUserProgress(userId);

    const totalComponents = userProgress.length;
    const completedComponents = userProgress.filter(p => p.isCompleted).length;
    const totalTimeSpent = userProgress.reduce((sum, p) => sum + p.metrics.timeSpent, 0);
    const scoresArray = userProgress
      .filter(p => p.metrics.score !== undefined)
      .map(p => p.metrics.score!);
    const averageScore = scoresArray.length > 0
      ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
      : 0;

    // Calculate engagement level
    const avgInteractions = userProgress.length > 0
      ? userProgress.reduce((sum, p) => sum + p.metrics.interactions, 0) / userProgress.length
      : 0;

    let engagementLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgInteractions > 20) engagementLevel = 'high';
    else if (avgInteractions > 10) engagementLevel = 'medium';

    // Calculate streak (consecutive completed components)
    const recentProgress = userProgress
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .reverse();

    let streakCount = 0;
    for (const progress of recentProgress) {
      if (progress.isCompleted) {
        streakCount++;
      } else {
        break;
      }
    }

    const lastActivity = userProgress.length > 0
      ? Math.max(...userProgress.map(p => new Date(p.metrics.lastActivity).getTime()))
      : Date.now();

    const allAchievements = Array.from(
      new Set(userProgress.flatMap(p => p.achievements))
    );

    return {
      totalComponents,
      completedComponents,
      totalTimeSpent,
      averageScore,
      engagementLevel,
      streakCount,
      lastActivity: new Date(lastActivity).toISOString(),
      achievements: allAchievements,
    };
  }

  /**
   * Add a progress change listener
   */
  addChangeListener(listener: (progress: ComponentProgress) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Calculate completion percentage based on component type and current progress
   */
  private calculateCompletionPercentage(progress: ComponentProgress): number {
    const steps = Object.keys(progress.stepProgress);
    const stepCount = steps.length;

    switch (progress.componentType) {
      case 'quiz':
        // For quizzes, completion is based on answered questions
        const totalQuestions = progress.stepProgress.totalQuestions || 10;
        const answeredQuestions = progress.stepProgress.answeredQuestions || stepCount;
        return Math.min((answeredQuestions / totalQuestions) * 100, 100);

      case 'worksheet':
        // For worksheets, completion is based on completed sections
        const requiredSections = ['current-state', 'vision-goals', 'smart-goals'];
        const completedSections = requiredSections.filter(section =>
          progress.stepProgress[section]
        ).length;
        return (completedSections / requiredSections.length) * 100;

      case 'calculator':
        // For calculators, completion is based on filled sections
        const calculatorSections = ['business-info', 'costs', 'services', 'goals'];
        const filledSections = calculatorSections.filter(section =>
          progress.stepProgress[section]
        ).length;
        return (filledSections / calculatorSections.length) * 100;

      case 'designer':
        // For designers, completion is based on created packages
        const packageCount = progress.stepProgress.packages?.length || 0;
        return Math.min((packageCount / 1) * 100, 100); // Minimum 1 package

      case 'assessment':
        // For assessments, completion is based on answered categories
        const totalCategories = 6; // As defined in BusinessAssessmentTemplate
        const answeredCategories = Object.keys(progress.stepProgress).length;
        return (answeredCategories / totalCategories) * 100;

      default:
        return stepCount > 0 ? Math.min(stepCount * 25, 100) : 0;
    }
  }

  /**
   * Check and award achievements based on progress
   */
  private checkAchievements(progress: ComponentProgress): void {
    // Time-based achievements
    if (progress.metrics.timeSpent > 1800 && !progress.achievements.includes('focused_learner')) {
      this.awardAchievement(progress, 'focused_learner');
    }

    // Interaction-based achievements
    if (progress.metrics.interactions > 50 && !progress.achievements.includes('super_engaged')) {
      this.awardAchievement(progress, 'super_engaged');
    }

    // Score-based achievements
    if (progress.metrics.score && progress.metrics.score >= 90 && !progress.achievements.includes('top_performer')) {
      this.awardAchievement(progress, 'top_performer');
    }

    // Note-taking achievements
    if (progress.notes.length > 10 && !progress.achievements.includes('note_master')) {
      this.awardAchievement(progress, 'note_master');
    }

    // Component-specific achievements
    this.checkComponentSpecificAchievements(progress);
  }

  /**
   * Check component-specific achievements
   */
  private checkComponentSpecificAchievements(progress: ComponentProgress): void {
    switch (progress.componentType) {
      case 'quiz':
        if (progress.metrics.score && progress.metrics.score === 100) {
          this.awardAchievement(progress, 'perfect_score');
        }
        break;

      case 'worksheet':
        if (progress.stepProgress['smart-goals']?.length >= 5) {
          this.awardAchievement(progress, 'goal_setter');
        }
        break;

      case 'calculator':
        if (progress.stepProgress.results?.profitMargin > 30) {
          this.awardAchievement(progress, 'profit_optimizer');
        }
        break;

      case 'designer':
        if (progress.stepProgress.packages?.length >= 3) {
          this.awardAchievement(progress, 'package_expert');
        }
        break;

      case 'assessment':
        if (progress.stepProgress.overallScore >= 80) {
          this.awardAchievement(progress, 'business_analyst');
        }
        break;
    }
  }

  /**
   * Award an achievement to a component progress
   */
  private awardAchievement(progress: ComponentProgress, achievement: string): void {
    if (!progress.achievements.includes(achievement)) {
      progress.achievements.push(achievement);
      this.progress.set(progress.componentId, progress);
      this.notifyListeners(progress);
    }
  }

  /**
   * Notify all change listeners
   */
  private notifyListeners(progress: ComponentProgress): void {
    this.changeListeners.forEach(listener => listener(progress));
  }

  /**
   * Export progress data for analytics or backup
   */
  exportProgressData(userId: string): string {
    const userProgress = this.getUserProgress(userId);
    const summary = this.getProgressSummary(userId);

    return JSON.stringify({
      summary,
      detailedProgress: userProgress,
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import progress data from export
   */
  importProgressData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.detailedProgress && Array.isArray(parsed.detailedProgress)) {
        parsed.detailedProgress.forEach((progress: ComponentProgress) => {
          this.progress.set(progress.componentId, progress);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import progress data:', error);
      return false;
    }
  }

  /**
   * Get leaderboard data for multiple users (mock implementation)
   */
  getLeaderboard(userIds: string[]): Array<{
    userId: string;
    score: number;
    completedComponents: number;
    achievements: number;
    rank: number;
  }> {
    const leaderboardData = userIds.map(userId => {
      const summary = this.getProgressSummary(userId);
      return {
        userId,
        score: Math.round(summary.averageScore * summary.completedComponents),
        completedComponents: summary.completedComponents,
        achievements: summary.achievements.length,
        rank: 0, // Will be calculated
      };
    });

    // Sort by score and assign ranks
    leaderboardData.sort((a, b) => b.score - a.score);
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboardData;
  }
}

// Achievement definitions
export const ACHIEVEMENTS = {
  focused_learner: {
    name: 'Focused Learner',
    description: 'Spend more than 30 minutes on a single component',
    icon: '🎯',
  },
  super_engaged: {
    name: 'Super Engaged',
    description: 'Make more than 50 interactions in a single session',
    icon: '⚡',
  },
  top_performer: {
    name: 'Top Performer',
    description: 'Score 90% or higher on an assessment',
    icon: '🏆',
  },
  note_master: {
    name: 'Note Master',
    description: 'Take more than 10 notes in a single session',
    icon: '📝',
  },
  perfect_score: {
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '💯',
  },
  goal_setter: {
    name: 'Goal Setter',
    description: 'Create 5 or more SMART goals',
    icon: '🎯',
  },
  profit_optimizer: {
    name: 'Profit Optimizer',
    description: 'Achieve a profit margin above 30%',
    icon: '💰',
  },
  package_expert: {
    name: 'Package Expert',
    description: 'Design 3 or more service packages',
    icon: '📦',
  },
  business_analyst: {
    name: 'Business Analyst',
    description: 'Score 80% or higher on business assessment',
    icon: '📊',
  },
  quiz_completed: {
    name: 'Quiz Master',
    description: 'Complete a knowledge quiz',
    icon: '🧠',
  },
  worksheet_completed: {
    name: 'Worksheet Warrior',
    description: 'Complete a goal-setting worksheet',
    icon: '📋',
  },
  calculator_completed: {
    name: 'Number Cruncher',
    description: 'Complete a pricing calculator',
    icon: '🧮',
  },
  designer_completed: {
    name: 'Service Designer',
    description: 'Complete a package designer',
    icon: '🎨',
  },
  assessment_completed: {
    name: 'Self Assessor',
    description: 'Complete a business assessment',
    icon: '📈',
  },
} as const;

// Create singleton instance
export const progressTracker = new InteractiveProgressTracker();

// Export types
export type {
  ComponentProgress,
  ProgressUpdate,
  ProgressSummary,
  ProgressMetrics,
};

export default InteractiveProgressTracker;