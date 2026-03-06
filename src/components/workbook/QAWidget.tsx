'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Users,
  Eye,
  EyeOff,
  Clock,
  CheckCircle
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  askerName: string;
  isAnonymous: boolean;
  timestamp: string;
  session?: string;
  status: 'pending' | 'answered' | 'in_queue';
  upvotes: number;
  hasUpvoted: boolean;
}

interface QAWidgetProps {
  userId: string;
  userName: string;
  userEmail: string;
  className?: string;
}

export default function QAWidget({
  userId,
  userName,
  userEmail,
  className = '',
}: QAWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeTab, setActiveTab] = useState<'ask' | 'queue'>('ask');

  // Form state
  const [question, setQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSession, setCurrentSession] = useState('');

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load questions and poll for updates
  useEffect(() => {
    loadQuestions();
    const interval = setInterval(loadQuestions, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`/api/workbook/qa?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        // Count unread questions (new ones since last view)
        const newQuestions = data.questions.filter((q: Question) =>
          q.status === 'answered' && !localStorage.getItem(`qa-read-${q.id}`)
        );
        setUnreadCount(newQuestions.length);
      }
    } catch (error) {
      console.error('Failed to load Q&A:', error);
    }
  };

  const submitQuestion = async () => {
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/workbook/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          question: question.trim(),
          askerName: isAnonymous ? 'Anonymous' : userName,
          isAnonymous,
          session: currentSession || 'General',
          userEmail,
        }),
      });

      if (response.ok) {
        setQuestion('');
        setCurrentSession('');
        loadQuestions();

        // Show success feedback
        const submitButton = document.querySelector('[data-qa-submit]');
        if (submitButton) {
          submitButton.textContent = 'Question Submitted!';
          setTimeout(() => {
            submitButton.textContent = 'Submit Question';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to submit question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    try {
      const response = await fetch('/api/workbook/qa/upvote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          questionId,
        }),
      });

      if (response.ok) {
        loadQuestions();
      }
    } catch (error) {
      console.error('Failed to upvote question:', error);
    }
  };

  const markQuestionAsRead = (questionId: string) => {
    localStorage.setItem(`qa-read-${questionId}`, 'true');
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getStatusIcon = (status: Question['status']) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="w-4 h-4 text-tomb45-green" />;
      case 'in_queue':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-text-muted" />;
    }
  };

  const getStatusText = (status: Question['status']) => {
    switch (status) {
      case 'answered':
        return 'Answered';
      case 'in_queue':
        return 'In Queue';
      default:
        return 'Pending';
    }
  };

  // Minimized state
  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-tomb45-green hover:bg-tomb45-green/90 text-white shadow-lg rounded-full p-3"
          size="lg"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <Card className={`bg-background-secondary shadow-xl border-border-primary transition-all duration-300 ${
        isExpanded ? 'w-96 h-[600px]' : 'w-80 h-96'
      }`}>
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-tomb45-green" />
              <CardTitle className="text-sm font-medium">
                Q&A with Coaches
              </CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
              >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </Button>
              <Button
                onClick={() => setIsMinimized(true)}
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-background-primary rounded-lg p-1 mt-3">
            <Button
              onClick={() => setActiveTab('ask')}
              variant={activeTab === 'ask' ? 'primary' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
            >
              Ask Question
            </Button>
            <Button
              onClick={() => setActiveTab('queue')}
              variant={activeTab === 'queue' ? 'primary' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
            >
              Q&A Queue ({questions.length})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 h-full overflow-hidden">
          {/* Ask Question Tab */}
          {activeTab === 'ask' && (
            <div className="space-y-4 h-full">
              <div className="text-xs text-text-secondary">
                Submit questions anytime during the workshop. Coaches will address them during Q&A sessions.
              </div>

              {/* Anonymous toggle */}
              <div className="flex items-center justify-between p-3 bg-background-primary rounded-lg">
                <div className="flex items-center gap-2">
                  {isAnonymous ? (
                    <EyeOff className="w-4 h-4 text-text-muted" />
                  ) : (
                    <Eye className="w-4 h-4 text-tomb45-green" />
                  )}
                  <Label className="text-sm">
                    {isAnonymous ? 'Submit anonymously' : 'Show my name'}
                  </Label>
                </div>
                <Switch
                  checked={!isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(!checked)}
                />
              </div>

              {/* Session context */}
              <div>
                <Label className="text-xs text-text-secondary">
                  Current Session (optional)
                </Label>
                <Input
                  placeholder="e.g., Systems That Scale"
                  value={currentSession}
                  onChange={(e) => setCurrentSession(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>

              {/* Question input */}
              <div className="flex-1">
                <Label className="text-xs text-text-secondary">
                  Your Question
                </Label>
                <Textarea
                  placeholder="What would you like to ask the coaches?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="text-sm mt-1 min-h-[100px] resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit button */}
              <Button
                onClick={submitQuestion}
                disabled={!question.trim() || isSubmitting}
                className="w-full bg-tomb45-green hover:bg-tomb45-green/90"
                data-qa-submit
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Question'}
              </Button>

              {/* Info */}
              <div className="text-xs text-text-muted text-center">
                Questions are reviewed by coaches and answered during Q&A sessions
              </div>
            </div>
          )}

          {/* Q&A Queue Tab */}
          {activeTab === 'queue' && (
            <div className="h-full">
              <div className="text-xs text-text-secondary mb-3">
                Track your questions and see what others are asking
              </div>

              <div className="space-y-3 h-full overflow-y-auto pb-16">
                {questions.length === 0 ? (
                  <div className="text-center text-text-muted text-sm py-8">
                    No questions yet. Be the first to ask!
                  </div>
                ) : (
                  questions
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((q) => (
                      <Card
                        key={q.id}
                        className={`p-3 ${
                          q.status === 'answered' ? 'bg-tomb45-green/5 border-tomb45-green/20' : 'bg-background-primary'
                        }`}
                        onClick={() => q.status === 'answered' && markQuestionAsRead(q.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(q.status)}
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {getStatusText(q.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-text-muted">
                            {new Date(q.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        <p className="text-sm text-text-primary mb-2">
                          {q.question}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-text-muted" />
                            <span className="text-xs text-text-secondary">
                              {q.askerName}
                            </span>
                            {q.session && (
                              <>
                                <span className="text-xs text-text-muted">•</span>
                                <span className="text-xs text-text-muted">
                                  {q.session}
                                </span>
                              </>
                            )}
                          </div>

                          {q.status === 'pending' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                upvoteQuestion(q.id);
                              }}
                              variant={q.hasUpvoted ? 'primary' : 'ghost'}
                              size="sm"
                              className="text-xs p-1 h-6"
                            >
                              👍 {q.upvotes}
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}