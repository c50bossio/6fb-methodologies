'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ContentBlock,
  TextContentBlock,
  VideoContentBlock,
  AudioContentBlock,
  ImageContentBlock,
  InteractiveContentBlock,
  EmbedContentBlock,
  QuizQuestion,
  Assessment,
} from '@/types/workshop-module';

/**
 * Props for individual content block renderers
 */
interface ContentBlockRendererProps {
  block: ContentBlock;
  onComplete?: (blockId: string, data?: any) => void;
  onInteraction?: (blockId: string, interactionType: string, data: any) => void;
  readonly?: boolean;
  progress?: any;
  className?: string;
}

/**
 * Props for the main Interactive Content Renderer
 */
interface InteractiveContentRendererProps {
  contentBlocks: ContentBlock[];
  onBlockComplete?: (blockId: string, data?: any) => void;
  onAllComplete?: (results: Record<string, any>) => void;
  onInteraction?: (blockId: string, interactionType: string, data: any) => void;
  progress?: Record<string, any>;
  readonly?: boolean;
  showProgress?: boolean;
  className?: string;
}

/**
 * Text Content Block Renderer
 */
const TextContentRenderer: React.FC<{ block: TextContentBlock } & ContentBlockRendererProps> = ({
  block,
  onComplete,
  className = '',
}) => {
  useEffect(() => {
    // Auto-complete text blocks when viewed
    const timer = setTimeout(() => {
      onComplete?.(block.id);
    }, 1000);

    return () => clearTimeout(timer);
  }, [block.id, onComplete]);

  const renderContent = () => {
    switch (block.content.format) {
      case 'markdown':
        // In a real app, you'd use a markdown parser like react-markdown
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: block.content.text.replace(/\n/g, '<br>') }}
          />
        );
      case 'html':
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: block.content.text }}
          />
        );
      default:
        return (
          <div className="whitespace-pre-wrap text-text-primary">
            {block.content.text}
          </div>
        );
    }
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <FileText className="w-5 h-5" />
            {block.title}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {renderContent()}

        <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border-primary pt-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>{block.content.readingTimeMinutes} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{block.content.wordCount} words</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Video Content Block Renderer
 */
const VideoContentRenderer: React.FC<{ block: VideoContentBlock } & ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(block.content.duration);
  const [muted, setMuted] = useState(false);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    onComplete?.(block.id, {
      watchedDuration: duration,
      completedAt: new Date().toISOString()
    });
  }, [block.id, duration, onComplete]);

  const handlePlayPause = useCallback(() => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);

    onInteraction?.(block.id, newPlayState ? 'play' : 'pause', {
      currentTime,
      timestamp: new Date().toISOString()
    });
  }, [isPlaying, currentTime, block.id, onInteraction]);

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <PlayCircle className="w-5 h-5" />
            {block.title}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Video Player Placeholder */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {block.content.thumbnail && (
            <img
              src={block.content.thumbnail}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          )}

          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white rounded-full p-4"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </Button>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center gap-3 text-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMuted(!muted)}
                className="text-white hover:bg-white/20"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="bg-tomb45-green h-full rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              <span className="text-sm">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Video Chapters */}
        {block.content.chapters && block.content.chapters.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-text-primary">Chapters</h4>
            <div className="space-y-1">
              {block.content.chapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTime(chapter.startTime)}
                  className="w-full text-left p-2 rounded bg-background-accent hover:bg-background-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{chapter.title}</span>
                    <span className="text-xs text-text-secondary">
                      {Math.floor(chapter.startTime / 60)}:{String(Math.floor(chapter.startTime % 60)).padStart(2, '0')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Interactive Content Block Renderer (Quizzes, Worksheets, etc.)
 */
const InteractiveBlockRenderer: React.FC<{ block: InteractiveContentBlock } & ContentBlockRendererProps> = ({
  block,
  onComplete,
  onInteraction,
  progress,
  className = '',
}) => {
  const [responses, setResponses] = useState<Record<string, any>>(progress?.responses || {});
  const [isCompleted, setIsCompleted] = useState(progress?.completed || false);

  const handleResponseChange = useCallback((questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);

    onInteraction?.(block.id, 'response_change', {
      questionId,
      value,
      allResponses: newResponses
    });
  }, [responses, block.id, onInteraction]);

  const handleSubmit = useCallback(() => {
    const completionData = {
      responses,
      completedAt: new Date().toISOString(),
      interactionType: block.content.interactionType
    };

    setIsCompleted(true);
    onComplete?.(block.id, completionData);
  }, [responses, block.id, onComplete, block.content.interactionType]);

  const renderInteractiveContent = () => {
    switch (block.content.interactionType) {
      case 'quiz':
        return <QuizRenderer
          configuration={block.content.configuration}
          responses={responses}
          onResponseChange={handleResponseChange}
          readonly={isCompleted}
        />;

      case 'exercise':
        return <ExerciseRenderer
          configuration={block.content.configuration}
          responses={responses}
          onResponseChange={handleResponseChange}
          readonly={isCompleted}
        />;

      case 'calculator':
        return <CalculatorRenderer
          configuration={block.content.configuration}
          responses={responses}
          onResponseChange={handleResponseChange}
          readonly={isCompleted}
        />;

      case 'form':
        return <FormRenderer
          configuration={block.content.configuration}
          responses={responses}
          onResponseChange={handleResponseChange}
          readonly={isCompleted}
        />;

      default:
        return (
          <div className="p-4 bg-background-accent rounded-lg">
            <p className="text-text-secondary">
              Interactive content type "{block.content.interactionType}" not yet supported.
            </p>
          </div>
        );
    }
  };

  return (
    <Card className={`border-border-primary bg-background-secondary ${className}`}>
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            {block.content.interactionType === 'quiz' && <CheckCircle className="w-5 h-5" />}
            {block.content.interactionType === 'calculator' && <Calculator className="w-5 h-5" />}
            {block.content.interactionType === 'exercise' && <Target className="w-5 h-5" />}
            {block.content.interactionType === 'form' && <FileText className="w-5 h-5" />}
            {block.title}
            {isCompleted && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Completed
              </Badge>
            )}
          </CardTitle>
          {block.description && (
            <p className="text-sm text-text-secondary mt-1">{block.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {renderInteractiveContent()}

        {!isCompleted && Object.keys(responses).length > 0 && (
          <div className="flex justify-end border-t border-border-primary pt-4">
            <Button
              onClick={handleSubmit}
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Quiz Renderer Component
 */
const QuizRenderer: React.FC<{
  configuration: any;
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  readonly?: boolean;
}> = ({ configuration, responses, onResponseChange, readonly = false }) => {
  const questions = configuration.questions || [];

  return (
    <div className="space-y-6">
      {questions.map((question: any, index: number) => (
        <div key={question.id || index} className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">Q{index + 1}</Badge>
            <div className="flex-1">
              <h4 className="font-medium text-text-primary mb-2">{question.question}</h4>

              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options?.map((option: any) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readonly}
                        checked={responses[question.id]?.includes(option.id) || false}
                        onChange={(e) => {
                          const currentResponses = responses[question.id] || [];
                          const newResponses = e.target.checked
                            ? [...currentResponses, option.id]
                            : currentResponses.filter((id: string) => id !== option.id);
                          onResponseChange(question.id, newResponses);
                        }}
                        className="rounded border-border-primary"
                      />
                      <span className="text-text-primary">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'single_choice' && (
                <div className="space-y-2">
                  {question.options?.map((option: any) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        disabled={readonly}
                        checked={responses[question.id] === option.id}
                        onChange={() => onResponseChange(question.id, option.id)}
                        className="border-border-primary"
                      />
                      <span className="text-text-primary">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'text' && (
                <textarea
                  disabled={readonly}
                  value={responses[question.id] || ''}
                  onChange={(e) => onResponseChange(question.id, e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
                  rows={3}
                />
              )}

              {question.type === 'number' && (
                <input
                  type="number"
                  disabled={readonly}
                  value={responses[question.id] || ''}
                  onChange={(e) => onResponseChange(question.id, parseFloat(e.target.value) || 0)}
                  placeholder="Enter a number..."
                  className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Exercise Renderer Component (for goal setting, self-assessment, etc.)
 */
const ExerciseRenderer: React.FC<{
  configuration: any;
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  readonly?: boolean;
}> = ({ configuration, responses, onResponseChange, readonly = false }) => {
  const exerciseType = configuration.exerciseType || 'general';

  if (exerciseType === 'goal_setting') {
    return (
      <div className="space-y-6">
        <div className="bg-background-accent p-4 rounded-lg">
          <h4 className="font-medium text-text-primary mb-2">Goal Setting Exercise</h4>
          <p className="text-sm text-text-secondary mb-4">
            Define your business goals for the next 3 years using the SMART framework.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Current Monthly Revenue
              </label>
              <input
                type="number"
                disabled={readonly}
                value={responses.currentRevenue || ''}
                onChange={(e) => onResponseChange('currentRevenue', parseFloat(e.target.value) || 0)}
                placeholder="$3,500"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Target Monthly Revenue (3 years)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={responses.targetRevenue || ''}
                onChange={(e) => onResponseChange('targetRevenue', parseFloat(e.target.value) || 0)}
                placeholder="$10,000"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Your Vision Statement
              </label>
              <textarea
                disabled={readonly}
                value={responses.visionStatement || ''}
                onChange={(e) => onResponseChange('visionStatement', e.target.value)}
                placeholder="Describe your ideal barbershop business in 3 years..."
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary resize-none"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Key Challenges to Overcome
              </label>
              <textarea
                disabled={readonly}
                value={responses.challenges || ''}
                onChange={(e) => onResponseChange('challenges', e.target.value)}
                placeholder="List the main obstacles you need to overcome..."
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-background-accent rounded-lg">
      <p className="text-text-secondary">Exercise type "{exerciseType}" coming soon.</p>
    </div>
  );
};

/**
 * Calculator Renderer Component
 */
const CalculatorRenderer: React.FC<{
  configuration: any;
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  readonly?: boolean;
}> = ({ configuration, responses, onResponseChange, readonly = false }) => {
  const calculatorType = configuration.calculatorType || 'pricing';

  if (calculatorType === 'pricing') {
    const currentPrice = responses.currentPrice || 0;
    const targetMargin = responses.targetMargin || 40;
    const weeklyClients = responses.weeklyClients || 20;

    const monthlyRevenue = currentPrice * weeklyClients * 4;
    const yearlyRevenue = monthlyRevenue * 12;

    return (
      <div className="space-y-6">
        <div className="bg-background-accent p-4 rounded-lg">
          <h4 className="font-medium text-text-primary mb-4">Pricing Calculator</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Current Service Price ($)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={currentPrice}
                onChange={(e) => onResponseChange('currentPrice', parseFloat(e.target.value) || 0)}
                placeholder="45"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Target Profit Margin (%)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={targetMargin}
                onChange={(e) => onResponseChange('targetMargin', parseFloat(e.target.value) || 0)}
                placeholder="40"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Weekly Clients
              </label>
              <input
                type="number"
                disabled={readonly}
                value={weeklyClients}
                onChange={(e) => onResponseChange('weeklyClients', parseFloat(e.target.value) || 0)}
                placeholder="20"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-secondary text-text-primary"
              />
            </div>
          </div>

          <div className="bg-tomb45-green/10 p-4 rounded-lg">
            <h5 className="font-medium text-text-primary mb-3">Revenue Projection</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  ${monthlyRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Monthly</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  ${yearlyRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Yearly</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  {targetMargin}%
                </div>
                <div className="text-sm text-text-secondary">Margin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-background-accent rounded-lg">
      <p className="text-text-secondary">Calculator type "{calculatorType}" coming soon.</p>
    </div>
  );
};

/**
 * Form Renderer Component
 */
const FormRenderer: React.FC<{
  configuration: any;
  responses: Record<string, any>;
  onResponseChange: (questionId: string, value: any) => void;
  readonly?: boolean;
}> = ({ configuration, responses, onResponseChange, readonly = false }) => {
  const fields = configuration.fields || [];

  return (
    <div className="space-y-4">
      {fields.map((field: any, index: number) => (
        <div key={field.id || index}>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === 'text' && (
            <input
              type="text"
              disabled={readonly}
              value={responses[field.id] || ''}
              onChange={(e) => onResponseChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              disabled={readonly}
              value={responses[field.id] || ''}
              onChange={(e) => onResponseChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
              rows={field.rows || 3}
            />
          )}

          {field.type === 'select' && (
            <select
              disabled={readonly}
              value={responses[field.id] || ''}
              onChange={(e) => onResponseChange(field.id, e.target.value)}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
            >
              <option value="">Select...</option>
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Main Interactive Content Renderer Component
 */
export default function InteractiveContentRenderer({
  contentBlocks,
  onBlockComplete,
  onAllComplete,
  onInteraction,
  progress = {},
  readonly = false,
  showProgress = true,
  className = '',
}: InteractiveContentRendererProps) {
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(
    new Set(Object.keys(progress).filter(id => progress[id]?.completed))
  );
  const [blockResults, setBlockResults] = useState<Record<string, any>>(progress);

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

    onBlockComplete?.(blockId, data);

    // Check if all blocks are completed
    if (newCompletedBlocks.size === contentBlocks.length) {
      onAllComplete?.(newResults);
    }
  }, [completedBlocks, blockResults, contentBlocks.length, onBlockComplete, onAllComplete]);

  const renderContentBlock = (block: ContentBlock) => {
    const commonProps = {
      block,
      onComplete: handleBlockComplete,
      onInteraction,
      progress: blockResults[block.id],
      readonly,
      className: "mb-6",
    };

    switch (block.type) {
      case 'text':
        return <TextContentRenderer {...commonProps} block={block as TextContentBlock} />;
      case 'video':
        return <VideoContentRenderer {...commonProps} block={block as VideoContentBlock} />;
      case 'interactive':
        return <InteractiveBlockRenderer {...commonProps} block={block as InteractiveContentBlock} />;
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

  return (
    <div className={`space-y-6 ${className}`}>
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
            <div className="w-full bg-background-accent rounded-full h-2">
              <div
                className="bg-tomb45-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {contentBlocks
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <div key={block.id}>
            {renderContentBlock(block)}
          </div>
        ))}

      {completedBlocks.size === contentBlocks.length && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Congratulations!
            </h3>
            <p className="text-green-700">
              You've completed all the content blocks in this section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { InteractiveContentRenderer };
export type { InteractiveContentRendererProps, ContentBlockRendererProps };