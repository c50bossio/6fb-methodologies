'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import {
  Calendar,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  Target
} from 'lucide-react';

// Define workshop session structure matching our agenda
interface WorkshopSession {
  id: string;
  title: string;
  description: string;
  presenter: string | null;
  day: number;
  scheduledStart: string;
  scheduledEnd: string;
  sessionType: 'keynote' | 'workshop' | 'qa' | 'break';
  isActive?: boolean;
}

interface WorkshopSessionSelectorProps {
  selectedSessionId?: string;
  onSessionChange: (sessionId: string, sessionInfo: any) => void;
  className?: string;
  compact?: boolean;
}

// Workshop sessions from our agenda
const WORKSHOP_SESSIONS: WorkshopSession[] = [
  {
    id: 'systems-that-scale',
    title: 'Systems That Scale',
    description: 'Why systems = freedom at every level',
    presenter: 'Nate & Dre',
    day: 1,
    scheduledStart: '09:00',
    scheduledEnd: '10:30',
    sessionType: 'keynote'
  },
  {
    id: 'marketing-that-builds-demand',
    title: 'Marketing That Builds Demand',
    description: 'How to consistently get clients in the door',
    presenter: 'Nate',
    day: 1,
    scheduledStart: '10:45',
    scheduledEnd: '11:45',
    sessionType: 'workshop'
  },
  {
    id: 'paid-ads-that-convert',
    title: 'Paid Ads That Convert',
    description: 'Step-by-step playbook for running profitable ads',
    presenter: 'Bossio',
    day: 1,
    scheduledStart: '11:45',
    scheduledEnd: '12:45',
    sessionType: 'workshop'
  },
  {
    id: 'investing-wealth-machine',
    title: 'The Investing & Wealth Machine',
    description: 'Make your money work while you cut less',
    presenter: 'Bossio',
    day: 1,
    scheduledStart: '14:00',
    scheduledEnd: '15:15',
    sessionType: 'workshop'
  },
  {
    id: 'kpis-that-matter',
    title: 'KPIs That Matter',
    description: 'The numbers that grow your business',
    presenter: 'Dre',
    day: 1,
    scheduledStart: '15:30',
    scheduledEnd: '16:15',
    sessionType: 'workshop'
  },
  {
    id: 'breakout-groups',
    title: 'Breakout Groups by Avatar',
    description: 'Small group discussions by business type',
    presenter: 'All Coaches',
    day: 1,
    scheduledStart: '16:15',
    scheduledEnd: '17:00',
    sessionType: 'workshop'
  },
  {
    id: 'open-qa',
    title: 'Open Q&A',
    description: 'Direct access to Dre, Nate & Bossio',
    presenter: 'Dre, Nate & Bossio',
    day: 1,
    scheduledStart: '17:00',
    scheduledEnd: '17:30',
    sessionType: 'qa'
  },
  {
    id: 'roundtables-1',
    title: 'Roundtables (Rotation 1)',
    description: 'Intimate sessions with each coach',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '09:30',
    scheduledEnd: '10:15',
    sessionType: 'workshop'
  },
  {
    id: 'roundtables-2',
    title: 'Roundtables (Rotation 2)',
    description: 'Continue rotating through expert sessions',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '10:15',
    scheduledEnd: '11:00',
    sessionType: 'workshop'
  },
  {
    id: 'roundtables-3',
    title: 'Roundtables (Rotation 3)',
    description: 'Final rotation with personalized guidance',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '11:00',
    scheduledEnd: '11:45',
    sessionType: 'workshop'
  },
  {
    id: 'recap',
    title: 'Recap',
    description: 'Key takeaways and next steps',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '11:45',
    scheduledEnd: '12:00',
    sessionType: 'keynote'
  },
  {
    id: 'action-plan-shareouts',
    title: 'Action Plan Shareouts',
    description: 'Finalize your personalized action plan',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '13:00',
    scheduledEnd: '15:00',
    sessionType: 'workshop'
  },
  {
    id: 'closing-commitments',
    title: 'Closing Session - Commitments',
    description: 'Everyone writes down their top 3 commitments',
    presenter: 'All Coaches',
    day: 2,
    scheduledStart: '15:00',
    scheduledEnd: '16:00',
    sessionType: 'keynote'
  }
];

export default function WorkshopSessionSelector({
  selectedSessionId,
  onSessionChange,
  className = '',
  compact = false
}: WorkshopSessionSelectorProps) {
  const [selectedSession, setSelectedSession] = useState<WorkshopSession | null>(
    WORKSHOP_SESSIONS.find(s => s.id === selectedSessionId) || null
  );

  // Auto-detect current session based on time (for demo purposes)
  useEffect(() => {
    if (!selectedSessionId) {
      // For demo, you could implement time-based detection here
      // For now, default to the first session if none selected
      const currentSession = WORKSHOP_SESSIONS[0];
      setSelectedSession(currentSession);
      onSessionChange(currentSession.id, {
        sessionId: currentSession.id,
        sessionName: currentSession.title,
        day: currentSession.day,
        speaker: currentSession.presenter,
        sessionType: currentSession.sessionType
      });
    }
  }, [selectedSessionId, onSessionChange]);

  const handleSessionSelect = (sessionId: string) => {
    const session = WORKSHOP_SESSIONS.find(s => s.id === sessionId);
    if (session) {
      setSelectedSession(session);
      onSessionChange(session.id, {
        sessionId: session.id,
        sessionName: session.title,
        day: session.day,
        speaker: session.presenter,
        sessionType: session.sessionType
      });
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'keynote':
        return <Target className="w-4 h-4 text-tomb45-green" />;
      case 'workshop':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'qa':
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'keynote':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'workshop':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'qa':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (compact) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-text-secondary whitespace-nowrap">
            Workshop Session:
          </Label>
          <select
            value={selectedSession?.id || ''}
            onChange={(e) => handleSessionSelect(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-background-secondary border border-border-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tomb45-green/20"
          >
            <option value="">Select session...</option>
            {[1, 2].map(day => (
              <optgroup key={day} label={`Day ${day}`}>
                {WORKSHOP_SESSIONS
                  .filter(s => s.day === day)
                  .map(session => (
                    <option key={session.id} value={session.id}>
                      {session.scheduledStart} - {session.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {selectedSession && (
          <div className="mt-2 p-2 bg-tomb45-green/5 border border-tomb45-green/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {getSessionTypeIcon(selectedSession.sessionType)}
              <span className="text-sm font-medium text-tomb45-green">
                {selectedSession.title}
              </span>
              <Badge variant="outline" className={`text-xs ${getSessionTypeColor(selectedSession.sessionType)}`}>
                {selectedSession.sessionType}
              </Badge>
            </div>
            <div className="text-xs text-text-secondary">
              {selectedSession.presenter && (
                <>
                  <Users className="w-3 h-3 inline mr-1" />
                  {selectedSession.presenter}
                </>
              )}
              {selectedSession.presenter && ' • '}
              <Clock className="w-3 h-3 inline mr-1" />
              {selectedSession.scheduledStart} - {selectedSession.scheduledEnd}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-tomb45-green" />
          Select Workshop Session
        </CardTitle>
        <p className="text-text-secondary text-sm">
          Choose the current session you're attending for better organization
        </p>
      </CardHeader>
      <CardContent>
        {/* Day tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(day => (
            <div key={day} className="space-y-3">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  day === 1 ? 'bg-tomb45-green' : 'bg-blue-500'
                }`}>
                  {day}
                </div>
                Day {day} Sessions
              </h3>

              <div className="space-y-2">
                {WORKSHOP_SESSIONS
                  .filter(session => session.day === day)
                  .map(session => (
                    <Button
                      key={session.id}
                      onClick={() => handleSessionSelect(session.id)}
                      variant={selectedSession?.id === session.id ? 'primary' : 'outline'}
                      className="w-full justify-start h-auto p-3 text-left"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex flex-col items-center gap-1 min-w-[60px]">
                          <div className="text-xs font-medium">
                            {session.scheduledStart}
                          </div>
                          <div className="text-xs text-text-muted">
                            {session.scheduledEnd}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getSessionTypeIcon(session.sessionType)}
                            <span className="font-medium text-sm">{session.title}</span>
                            <Badge variant="outline" className={`text-xs ${getSessionTypeColor(session.sessionType)}`}>
                              {session.sessionType}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-muted mb-1">{session.description}</p>
                          {session.presenter && (
                            <div className="flex items-center gap-1 text-xs text-text-secondary">
                              <Users className="w-3 h-3" />
                              {session.presenter}
                            </div>
                          )}
                        </div>

                        {selectedSession?.id === session.id && (
                          <CheckCircle className="w-4 h-4 text-tomb45-green flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}