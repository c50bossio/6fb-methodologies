'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Video,
  FileText,
  CheckCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  ArrowLeft,
  User,
  Zap,
  PauseCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import InteractiveContentRenderer from './InteractiveContentRenderer';
import InteractiveWorkbookWithAudio from './InteractiveWorkbookWithAudio';
import { DetailedLesson, LessonType } from '@/types/workbook-api';

interface LessonContentViewerProps {
  lesson: DetailedLesson;
  moduleId: string;
  userId: string;
  onClose: () => void;
  onComplete: (lessonId: string, score?: number, timeSpent?: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

interface LessonProgress {
  startTime: number;
  timeSpent: number;
  completed: boolean;
  score?: number;
}

export default function LessonContentViewer({
  lesson,
  moduleId,
  userId,
  onClose,
  onComplete,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: LessonContentViewerProps) {
  const [progress, setProgress] = useState<LessonProgress>({
    startTime: Date.now(),
    timeSpent: 0,
    completed: lesson.progress?.completed || false,
    score: lesson.progress?.quizScore,
  });
  const [isActive, setIsActive] = useState(true);

  // Track time spent in lesson
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive) {
        setProgress(prev => ({
          ...prev,
          timeSpent: Math.floor((Date.now() - prev.startTime) / 1000),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Handle lesson completion
  const handleComplete = (score?: number) => {
    setProgress(prev => ({ ...prev, completed: true, score }));
    onComplete(lesson.id, score, progress.timeSpent);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get lesson type icon
  const getLessonTypeIcon = (type: LessonType) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'interactive':
        return <Zap className="w-5 h-5" />;
      case 'exercise':
        return <Target className="w-5 h-5" />;
      case 'quiz':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // Get lesson type color
  const getLessonTypeColor = (type: LessonType) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'text':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'interactive':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'exercise':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'quiz':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Render lesson content based on type
  const renderLessonContent = () => {
    if (!lesson.content) {
      return (
        <div className="text-center py-8">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Content Coming Soon
          </h3>
          <p className="text-text-secondary">
            This lesson content is being prepared. Please check back later.
          </p>
        </div>
      );
    }

    switch (lesson.type) {
      case 'video':
        return (
          <div className="space-y-4">
            {lesson.content.videoUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  onEnded={() => !progress.completed && handleComplete()}
                >
                  <source src={lesson.content.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Video content coming soon</p>
                </div>
              </div>
            )}
            {lesson.content.description && (
              <div className="prose max-w-none">
                <p>{lesson.content.description}</p>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="prose max-w-none">
            {lesson.content.text && (
              <div dangerouslySetInnerHTML={{ __html: lesson.content.text }} />
            )}
            {lesson.content.sections && lesson.content.sections.map((section: any, index: number) => (
              <div key={index} className="mb-6">
                {section.title && <h3>{section.title}</h3>}
                {section.content && <div dangerouslySetInnerHTML={{ __html: section.content }} />}
              </div>
            ))}
          </div>
        );

      case 'interactive':
        return (
          <InteractiveWorkbookWithAudio
            activeComponent={lesson.content.component || 'BusinessAssessmentTemplate'}
            sessionContext={{
              moduleId,
              lessonId: lesson.id,
              userId,
            }}
            componentProps={lesson.content.props || {}}
            onComplete={(sessionData) => {
              // Extract score from session completion data
              const score = sessionData.completionData?.score || sessionData.completionData?.percentage;
              handleComplete(score);
            }}
            onSave={(sessionData) => {
              // Track session save for analytics
              console.log('Interactive session saved:', sessionData);
            }}
            onNoteCreated={(note) => {
              // Track note creation for analytics
              console.log('Note created:', note);
            }}
          />
        );

      case 'exercise':
        return (
          <div className="space-y-6">
            {lesson.content.instructions && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Target className="w-5 h-5" />
                    Exercise Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: lesson.content.instructions }} />
                </CardContent>
              </Card>
            )}
            {lesson.content.exercises && lesson.content.exercises.map((exercise: any, index: number) => (
              <Card key={index} className="border-border-primary">
                <CardHeader>
                  <CardTitle>Exercise {index + 1}: {exercise.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {exercise.description && (
                    <div className="mb-4" dangerouslySetInnerHTML={{ __html: exercise.description }} />
                  )}
                  {exercise.component && (
                    <InteractiveContentRenderer
                      contentType={exercise.component}
                      content={exercise.props || {}}
                      onComplete={(data) => console.log('Exercise completed:', data)}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            {lesson.content.instructions && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    Quiz Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: lesson.content.instructions }} />
                </CardContent>
              </Card>
            )}
            <InteractiveContentRenderer
              contentType="QuizEngine"
              content={{
                questions: lesson.content.questions || [],
                passingScore: lesson.content.passingScore || 70,
                allowRetries: lesson.content.allowRetries !== false,
              }}
              onComplete={(data) => {
                const score = data.score || data.percentage;
                handleComplete(score);
              }}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {lesson.content.overview && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: lesson.content.overview }} />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="bg-background-secondary border-b border-border-primary sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Module
              </Button>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getLessonTypeColor(lesson.type)}`}>
                  {getLessonTypeIcon(lesson.type)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">{lesson.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <Badge variant="outline" className={getLessonTypeColor(lesson.type)}>
                      {lesson.type}
                    </Badge>
                    {lesson.estimatedMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.estimatedMinutes} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Time spent: {formatTime(progress.timeSpent)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {progress.completed && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed
                  {progress.score && ` (${progress.score}%)`}
                </Badge>
              )}
              <div className="flex gap-2">
                {hasPrevious && onPrevious && (
                  <Button onClick={onPrevious} variant="outline" size="sm">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}
                {hasNext && onNext && (
                  <Button onClick={onNext} variant="outline" size="sm">
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {lesson.progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                <span>Lesson Progress</span>
                <span>{lesson.progress.progressPercentage}%</span>
              </div>
              <Progress
                value={lesson.progress.progressPercentage}
                className="h-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {renderLessonContent()}

          {/* Completion Actions */}
          {!progress.completed && lesson.type !== 'interactive' && lesson.type !== 'quiz' && (
            <div className="mt-8 pt-6 border-t border-border-primary">
              <div className="flex justify-center">
                <Button
                  onClick={() => handleComplete()}
                  className="bg-tomb45-green hover:bg-tomb45-green/90 px-8"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-border-primary">
            <div className="flex justify-between">
              <div>
                {hasPrevious && onPrevious && (
                  <Button onClick={onPrevious} variant="outline">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous Lesson
                  </Button>
                )}
              </div>
              <div>
                {hasNext && onNext && (
                  <Button onClick={onNext} className="bg-tomb45-green hover:bg-tomb45-green/90">
                    Next Lesson
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}