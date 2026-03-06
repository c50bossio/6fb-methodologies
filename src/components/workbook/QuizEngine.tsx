'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Circle,
  XCircle,
  Award,
  RotateCcw,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Flag,
  BookOpen,
  Brain,
  Star,
  Download,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Assessment,
  QuizQuestion,
} from '@/types/workshop-module';

/**
 * Quiz attempt state
 */
interface QuizAttempt {
  id: string;
  startedAt: string;
  completedAt?: string;
  responses: Record<string, any>;
  score?: number;
  timeSpent: number;
  passed: boolean;
}

/**
 * Quiz state interface
 */
interface QuizState {
  currentQuestionIndex: number;
  responses: Record<string, any>;
  timeSpent: number;
  startedAt?: string;
  completedAt?: string;
  score?: number;
  attempts: QuizAttempt[];
  showResults: boolean;
  showExplanations: boolean;
  isPaused: boolean;
}

/**
 * Props for the Quiz Engine component
 */
interface QuizEngineProps {
  assessment: Assessment;
  onComplete?: (attempt: QuizAttempt) => void;
  onQuestionAnswer?: (questionId: string, answer: any) => void;
  onAttemptStart?: () => void;
  previousAttempts?: QuizAttempt[];
  allowRetake?: boolean;
  showDetailedResults?: boolean;
  className?: string;
}

/**
 * Individual Question Component
 */
const QuestionRenderer: React.FC<{
  question: QuizQuestion;
  response?: any;
  onResponse: (answer: any) => void;
  showExplanation?: boolean;
  readonly?: boolean;
  questionNumber: number;
  totalQuestions: number;
}> = ({
  question,
  response,
  onResponse,
  showExplanation = false,
  readonly = false,
  questionNumber,
  totalQuestions,
}) => {
  const isCorrect = useMemo(() => {
    if (!response || !showExplanation) return null;

    switch (question.type) {
      case 'single_choice':
        return question.options?.find(opt => opt.id === response)?.isCorrect || false;
      case 'multiple_choice':
        if (!Array.isArray(response)) return false;
        const correctOptions = question.options?.filter(opt => opt.isCorrect).map(opt => opt.id) || [];
        return (
          response.length === correctOptions.length &&
          response.every((id: string) => correctOptions.includes(id))
        );
      case 'text':
      case 'essay':
        return question.validation?.correctAnswer
          ? response?.toLowerCase().trim() === question.validation.correctAnswer.toLowerCase().trim()
          : null;
      case 'number':
        return question.validation?.correctAnswer === parseFloat(response);
      default:
        return null;
    }
  }, [question, response, showExplanation]);

  const getQuestionIcon = () => {
    if (!showExplanation) return <Circle className="w-5 h-5 text-text-secondary" />;
    if (isCorrect === true) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isCorrect === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <Circle className="w-5 h-5 text-blue-500" />;
  };

  return (
    <Card className="border-border-primary bg-background-secondary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getQuestionIcon()}
            <div className="flex-1">
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                Question {questionNumber} of {totalQuestions}
                {question.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                <Badge variant="outline" className="text-xs">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </Badge>
              </CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {question.type.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-text-primary">
          <p className="text-base leading-relaxed">{question.question}</p>
        </div>

        {/* Single Choice Questions */}
        {question.type === 'single_choice' && (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  readonly ? 'cursor-not-allowed' : 'hover:bg-background-accent'
                } ${
                  response === option.id
                    ? 'border-tomb45-green bg-tomb45-green/5'
                    : 'border-border-primary'
                } ${
                  showExplanation && option.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : showExplanation && response === option.id && !option.isCorrect
                    ? 'border-red-500 bg-red-50'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={response === option.id}
                  onChange={() => !readonly && onResponse(option.id)}
                  disabled={readonly}
                  className="mt-1 text-tomb45-green"
                />
                <div className="flex-1">
                  <span className="text-text-primary">{option.text}</span>
                  {showExplanation && option.explanation && (
                    <p className="text-sm text-text-secondary mt-1">{option.explanation}</p>
                  )}
                </div>
                {showExplanation && option.isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                )}
              </label>
            ))}
          </div>
        )}

        {/* Multiple Choice Questions */}
        {question.type === 'multiple_choice' && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Select all that apply:</p>
            {question.options?.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  readonly ? 'cursor-not-allowed' : 'hover:bg-background-accent'
                } ${
                  response?.includes(option.id)
                    ? 'border-tomb45-green bg-tomb45-green/5'
                    : 'border-border-primary'
                } ${
                  showExplanation && option.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : showExplanation && response?.includes(option.id) && !option.isCorrect
                    ? 'border-red-500 bg-red-50'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={response?.includes(option.id) || false}
                  onChange={(e) => {
                    if (readonly) return;
                    const currentResponses = response || [];
                    const newResponses = e.target.checked
                      ? [...currentResponses, option.id]
                      : currentResponses.filter((id: string) => id !== option.id);
                    onResponse(newResponses);
                  }}
                  disabled={readonly}
                  className="mt-1 text-tomb45-green"
                />
                <div className="flex-1">
                  <span className="text-text-primary">{option.text}</span>
                  {showExplanation && option.explanation && (
                    <p className="text-sm text-text-secondary mt-1">{option.explanation}</p>
                  )}
                </div>
                {showExplanation && option.isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                )}
              </label>
            ))}
          </div>
        )}

        {/* Text Questions */}
        {(question.type === 'text' || question.type === 'essay') && (
          <div className="space-y-2">
            <textarea
              value={response || ''}
              onChange={(e) => !readonly && onResponse(e.target.value)}
              placeholder="Enter your answer..."
              disabled={readonly}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
              rows={question.type === 'essay' ? 6 : 3}
              minLength={question.validation?.minLength}
              maxLength={question.validation?.maxLength}
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>
                {question.validation?.minLength && `Min: ${question.validation.minLength} characters`}
              </span>
              <span>
                {response?.length || 0}
                {question.validation?.maxLength && ` / ${question.validation.maxLength}`} characters
              </span>
            </div>
          </div>
        )}

        {/* Number Questions */}
        {question.type === 'number' && (
          <div className="space-y-2">
            <input
              type="number"
              value={response || ''}
              onChange={(e) => !readonly && onResponse(parseFloat(e.target.value) || 0)}
              placeholder="Enter a number..."
              disabled={readonly}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
            />
          </div>
        )}

        {/* Code Questions */}
        {question.type === 'code' && (
          <div className="space-y-2">
            <textarea
              value={response || ''}
              onChange={(e) => !readonly && onResponse(e.target.value)}
              placeholder="Enter your code..."
              disabled={readonly}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary font-mono text-sm resize-none"
              rows={8}
            />
          </div>
        )}

        {/* Question Explanation */}
        {showExplanation && question.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Explanation</h4>
                <p className="text-blue-700 text-sm">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {showExplanation && isCorrect !== null && (
          <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
              <Badge variant="outline" className="ml-auto">
                {isCorrect ? question.points : 0} / {question.points} points
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Quiz Results Component
 */
const QuizResults: React.FC<{
  assessment: Assessment;
  attempt: QuizAttempt;
  showDetailedResults: boolean;
  onRetake?: () => void;
  allowRetake: boolean;
}> = ({ assessment, attempt, showDetailedResults, onRetake, allowRetake }) => {
  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = attempt.score || 0;
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = percentage >= assessment.passingScore;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Results */}
      <Card className={`border-2 ${passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {passed ? (
              <Award className="w-16 h-16 text-green-500" />
            ) : (
              <Target className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className={`text-2xl ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {passed ? 'Congratulations!' : 'Not Quite There'}
          </CardTitle>
          <p className={`text-lg ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {passed
              ? 'You have successfully passed this assessment!'
              : 'You need to score at least ' + assessment.passingScore + '% to pass.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-4">
              <div className="text-3xl font-bold text-tomb45-green">{Math.round(percentage)}%</div>
              <div className="text-sm text-text-secondary">Score</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-3xl font-bold text-tomb45-green">{earnedPoints}</div>
              <div className="text-sm text-text-secondary">Points Earned</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-3xl font-bold text-tomb45-green">{formatTime(attempt.timeSpent)}</div>
              <div className="text-sm text-text-secondary">Time Taken</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-3xl font-bold text-tomb45-green">
                {Object.keys(attempt.responses).length}
              </div>
              <div className="text-sm text-text-secondary">Questions Answered</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Progress</span>
              <span className="text-text-primary">{Math.round(percentage)}% ({earnedPoints}/{totalPoints} points)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  passed ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>0%</span>
              <span className="text-tomb45-green">Pass: {assessment.passingScore}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center pt-4">
            {allowRetake && (
              <Button onClick={onRetake} variant="outline" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Retake Assessment
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Results
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Achievement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Question Results */}
      {showDetailedResults && (
        <Card className="border-border-primary bg-background-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Brain className="w-5 h-5" />
              Detailed Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assessment.questions.map((question, index) => {
              const response = attempt.responses[question.id];
              const answered = response !== undefined && response !== null && response !== '';

              return (
                <QuestionRenderer
                  key={question.id}
                  question={question}
                  response={response}
                  onResponse={() => {}} // Read-only
                  showExplanation={true}
                  readonly={true}
                  questionNumber={index + 1}
                  totalQuestions={assessment.questions.length}
                />
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Main Quiz Engine Component
 */
export default function QuizEngine({
  assessment,
  onComplete,
  onQuestionAnswer,
  onAttemptStart,
  previousAttempts = [],
  allowRetake = true,
  showDetailedResults = true,
  className = '',
}: QuizEngineProps) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    responses: {},
    timeSpent: 0,
    attempts: previousAttempts,
    showResults: false,
    showExplanations: false,
    isPaused: false,
  });

  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-save timer for tracking time spent
  useEffect(() => {
    if (quizState.startedAt && !quizState.completedAt && !quizState.isPaused) {
      const interval = setInterval(() => {
        setQuizState(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1,
        }));
      }, 1000);
      setTimer(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  }, [quizState.startedAt, quizState.completedAt, quizState.isPaused, timer]);

  const startQuiz = useCallback(() => {
    const startTime = new Date().toISOString();
    setQuizState(prev => ({
      ...prev,
      startedAt: startTime,
      timeSpent: 0,
      responses: {},
      currentQuestionIndex: 0,
      showResults: false,
      showExplanations: false,
      isPaused: false,
    }));
    onAttemptStart?.();
  }, [onAttemptStart]);

  const submitQuiz = useCallback(() => {
    const completedAt = new Date().toISOString();

    // Calculate score
    let earnedPoints = 0;
    assessment.questions.forEach(question => {
      const response = quizState.responses[question.id];
      if (!response) return;

      let isCorrect = false;
      switch (question.type) {
        case 'single_choice':
          isCorrect = question.options?.find(opt => opt.id === response)?.isCorrect || false;
          break;
        case 'multiple_choice':
          if (Array.isArray(response)) {
            const correctOptions = question.options?.filter(opt => opt.isCorrect).map(opt => opt.id) || [];
            isCorrect = response.length === correctOptions.length &&
              response.every((id: string) => correctOptions.includes(id));
          }
          break;
        case 'text':
        case 'essay':
          isCorrect = question.validation?.correctAnswer
            ? response.toLowerCase().trim() === question.validation.correctAnswer.toLowerCase().trim()
            : false;
          break;
        case 'number':
          isCorrect = question.validation?.correctAnswer === parseFloat(response);
          break;
      }

      if (isCorrect) {
        earnedPoints += question.points;
      }
    });

    const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = percentage >= assessment.passingScore;

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}`,
      startedAt: quizState.startedAt!,
      completedAt,
      responses: quizState.responses,
      score: earnedPoints,
      timeSpent: quizState.timeSpent,
      passed,
    };

    setQuizState(prev => ({
      ...prev,
      completedAt,
      score: earnedPoints,
      attempts: [...prev.attempts, attempt],
      showResults: true,
      showExplanations: assessment.showCorrectAnswers,
    }));

    onComplete?.(attempt);
  }, [assessment, quizState, onComplete]);

  const handleQuestionResponse = useCallback((questionId: string, response: any) => {
    setQuizState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: response,
      },
    }));
    onQuestionAnswer?.(questionId, response);
  }, [onQuestionAnswer]);

  const goToQuestion = useCallback((index: number) => {
    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(0, Math.min(index, assessment.questions.length - 1)),
    }));
  }, [assessment.questions.length]);

  const nextQuestion = useCallback(() => {
    goToQuestion(quizState.currentQuestionIndex + 1);
  }, [quizState.currentQuestionIndex, goToQuestion]);

  const previousQuestion = useCallback(() => {
    goToQuestion(quizState.currentQuestionIndex - 1);
  }, [quizState.currentQuestionIndex, goToQuestion]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const hasStarted = !!quizState.startedAt;
  const isCompleted = !!quizState.completedAt;
  const currentQuestion = assessment.questions[quizState.currentQuestionIndex];
  const isLastQuestion = quizState.currentQuestionIndex === assessment.questions.length - 1;
  const canSubmit = Object.keys(quizState.responses).length > 0;
  const hasTimeLimit = !!assessment.timeLimit;
  const timeRemaining = hasTimeLimit && hasStarted && !isCompleted
    ? Math.max(0, (assessment.timeLimit! * 60) - quizState.timeSpent)
    : null;

  // Auto-submit if time runs out
  useEffect(() => {
    if (timeRemaining === 0 && hasStarted && !isCompleted) {
      submitQuiz();
    }
  }, [timeRemaining, hasStarted, isCompleted, submitQuiz]);

  const lastAttempt = quizState.attempts[quizState.attempts.length - 1];
  const canRetake = allowRetake && (
    !assessment.maxAttempts ||
    quizState.attempts.length < assessment.maxAttempts
  );

  if (quizState.showResults && lastAttempt) {
    return (
      <div className={className}>
        <QuizResults
          assessment={assessment}
          attempt={lastAttempt}
          showDetailedResults={showDetailedResults}
          onRetake={canRetake ? startQuiz : undefined}
          allowRetake={canRetake}
        />
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <Card className={`border-border-primary bg-background-secondary ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Target className="w-6 h-6" />
            {assessment.title}
          </CardTitle>
          {assessment.description && (
            <p className="text-text-secondary">{assessment.description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-background-accent p-4 rounded-lg">
            <h4 className="font-medium text-text-primary mb-3">Assessment Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Questions:</span>
                <div className="font-medium text-text-primary">{assessment.questions.length}</div>
              </div>
              <div>
                <span className="text-text-secondary">Passing Score:</span>
                <div className="font-medium text-text-primary">{assessment.passingScore}%</div>
              </div>
              {assessment.timeLimit && (
                <div>
                  <span className="text-text-secondary">Time Limit:</span>
                  <div className="font-medium text-text-primary">{assessment.timeLimit} minutes</div>
                </div>
              )}
              {assessment.maxAttempts && (
                <div>
                  <span className="text-text-secondary">Max Attempts:</span>
                  <div className="font-medium text-text-primary">{assessment.maxAttempts}</div>
                </div>
              )}
            </div>
          </div>

          {assessment.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Instructions</h4>
              <p className="text-blue-700 text-sm whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          )}

          {previousAttempts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-text-primary">Previous Attempts</h4>
              <div className="space-y-2">
                {previousAttempts.map((attempt, index) => (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-background-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                        Attempt {index + 1}
                      </Badge>
                      <span className="text-text-primary">
                        {Math.round(((attempt.score || 0) / assessment.questions.reduce((sum, q) => sum + q.points, 0)) * 100)}%
                      </span>
                    </div>
                    <span className="text-text-secondary text-sm">
                      {new Date(attempt.completedAt!).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button
              onClick={startQuiz}
              disabled={!canRetake}
              size="lg"
              className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              {previousAttempts.length === 0 ? 'Start Assessment' : 'Retake Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quiz Header */}
      <Card className="border-border-primary bg-background-secondary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-medium text-text-primary">{assessment.title}</h3>
              <Badge variant="outline">
                Question {quizState.currentQuestionIndex + 1} of {assessment.questions.length}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {hasTimeLimit && timeRemaining !== null && (
                <div className={`flex items-center gap-1 ${timeRemaining < 300 ? 'text-red-500' : 'text-text-secondary'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-text-secondary">
                <Clock className="w-4 h-4" />
                <span>{formatTime(quizState.timeSpent)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-background-accent rounded-full h-2">
              <div
                className="bg-tomb45-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${((quizState.currentQuestionIndex + 1) / assessment.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {currentQuestion && (
        <QuestionRenderer
          question={currentQuestion}
          response={quizState.responses[currentQuestion.id]}
          onResponse={(response) => handleQuestionResponse(currentQuestion.id, response)}
          showExplanation={quizState.showExplanations}
          readonly={isCompleted}
          questionNumber={quizState.currentQuestionIndex + 1}
          totalQuestions={assessment.questions.length}
        />
      )}

      {/* Navigation */}
      <Card className="border-border-primary bg-background-secondary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={previousQuestion}
              disabled={quizState.currentQuestionIndex === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {Object.keys(quizState.responses).length} of {assessment.questions.length} answered
              </span>
            </div>

            {isLastQuestion ? (
              <Button
                onClick={submitQuiz}
                disabled={!canSubmit}
                className="bg-tomb45-green hover:bg-tomb45-green/80 text-white flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Submit Assessment
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                variant="outline"
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { QuizEngine };
export type { QuizEngineProps, QuizAttempt, QuizState };