'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  PlayCircle,
  Mic,
  FileText,
  CheckCircle,
  Coffee,
  MessageCircle,
  Calendar,
  MapPin,
  Target,
  Users,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import SystemsWorksheet from './worksheets/SystemsWorksheet';
import MarketingWorksheet from './worksheets/MarketingWorksheet';
import PaidAdsWorksheet from './worksheets/PaidAdsWorksheet';
import WealthPlanWorksheet from './worksheets/WealthPlanWorksheet';
import KPIsWorksheet from './worksheets/KPIsWorksheet';
import ActionPlanWorksheet from './worksheets/ActionPlanWorksheet';

// Types for workshop sessions
interface WorkshopSession {
  id: string;
  title: string;
  description: string;
  presenter: string | null;
  sessionOrder: number;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  sessionType: 'keynote' | 'workshop' | 'qa' | 'break';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isLive: boolean;
  objectives: string[];
  keyPoints: string[];
  tags: string[];
}

interface WorkshopAgendaProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onStartRecording: (session: WorkshopSession) => void;
  onTakeNotes: (session: WorkshopSession) => void;
  className?: string;
}

export default function WorkshopAgenda({
  userId,
  businessType,
  onStartRecording,
  onTakeNotes,
  className = '',
}: WorkshopAgendaProps) {
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [activeWorksheet, setActiveWorksheet] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Static workshop data based on homepage agenda
  useEffect(() => {
    // Set static workshop sessions from homepage agenda
    const workshopSessions: WorkshopSession[] = [
      // Day 1 Sessions
      {
        id: 'registration',
        title: 'Registration & Networking',
        description: 'Check in, grab workbook + swag bag. Coffee and light snacks.',
        presenter: null,
        sessionOrder: 1,
        scheduledStart: '2024-01-01T08:30:00',
        scheduledEnd: '2024-01-01T09:00:00',
        durationMinutes: 30,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: [],
        tags: ['day1', 'networking']
      },
      {
        id: 'systems-that-scale',
        title: 'Systems That Scale',
        description: 'Why systems = freedom at every level (Nate & Dre)',
        presenter: 'Nate & Dre',
        sessionOrder: 2,
        scheduledStart: '2024-01-01T09:00:00',
        scheduledEnd: '2024-01-01T10:30:00',
        durationMinutes: 90,
        sessionType: 'keynote',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Understand barber systems (rebooking, client flow, grassroots consistency)',
          'Learn barbershop staff accountability systems',
          'Master payroll systems (making the numbers work)',
          'Implement enterprise systems (leadership, delegation, consistency across multiple shops)'
        ],
        keyPoints: [
          'Nate → Barber systems (rebooking, client flow, grassroots consistency)',
          'Nate → Barbershop staff accountability systems',
          'Dre → Payroll systems (making the numbers work)',
          'Dre → Enterprise systems (leadership, delegation, consistency across multiple shops)'
        ],
        tags: ['day1', 'systems', 'nate', 'dre']
      },
      {
        id: 'break-1',
        title: 'Break',
        description: '15-minute break',
        presenter: null,
        sessionOrder: 3,
        scheduledStart: '2024-01-01T10:30:00',
        scheduledEnd: '2024-01-01T10:45:00',
        durationMinutes: 15,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: [],
        tags: ['day1', 'break']
      },
      {
        id: 'marketing-that-builds-demand',
        title: 'Marketing That Builds Demand',
        description: 'How to consistently get clients in the door (Nate)',
        presenter: 'Nate',
        sessionOrder: 4,
        scheduledStart: '2024-01-01T10:45:00',
        scheduledEnd: '2024-01-01T11:45:00',
        durationMinutes: 60,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Master barber strategies: Facebook groups, Free Haircut campaigns, promo cards',
          'Implement shop strategies: Reviews, referrals, seasonal promotions',
          'Scale enterprise strategies: Brand + campaign duplication across shops'
        ],
        keyPoints: [
          'Barber Strategies: Facebook groups, Free Haircut campaigns, promo cards',
          'Shop Strategies: Reviews, referrals, seasonal promotions',
          'Enterprise Strategies: Brand + campaign duplication across shops'
        ],
        tags: ['day1', 'marketing', 'nate']
      },
      {
        id: 'paid-ads-that-convert',
        title: 'Paid Ads That Convert',
        description: 'Step-by-step playbook for running profitable ads (Bossio)',
        presenter: 'Bossio',
        sessionOrder: 5,
        scheduledStart: '2024-01-01T11:45:00',
        scheduledEnd: '2024-01-01T12:45:00',
        durationMinutes: 60,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Master barber → small-budget local ads',
          'Build shop → funnels that fill chairs',
          'Scale enterprise → ROI tracking & scaling spend'
        ],
        keyPoints: [
          'Barber → small-budget local ads',
          'Shop → funnels that fill chairs',
          'Enterprise → ROI tracking & scaling spend'
        ],
        tags: ['day1', 'advertising', 'bossio']
      },
      {
        id: 'lunch',
        title: 'Lunch + Sponsor Showcase',
        description: 'Networking lunch with sponsor presentations',
        presenter: null,
        sessionOrder: 6,
        scheduledStart: '2024-01-01T12:45:00',
        scheduledEnd: '2024-01-01T14:00:00',
        durationMinutes: 75,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: [],
        tags: ['day1', 'lunch', 'networking']
      },
      {
        id: 'investing-wealth-machine',
        title: 'The Investing & Wealth Machine',
        description: 'Goal: make your money work while you cut less (Bossio)',
        presenter: 'Bossio',
        sessionOrder: 7,
        scheduledStart: '2024-01-01T14:00:00',
        scheduledEnd: '2024-01-01T15:15:00',
        durationMinutes: 75,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Learn barber → stocks, ETFs, IRAs',
          'Master shop → reinvesting profits into cash-flowing assets',
          'Implement enterprise → options, tax strategy, wealth preservation'
        ],
        keyPoints: [
          'Barber → stocks, ETFs, IRAs',
          'Shop → reinvesting profits into cash-flowing assets',
          'Enterprise → options, tax strategy, wealth preservation'
        ],
        tags: ['day1', 'investing', 'wealth', 'bossio']
      },
      {
        id: 'break-2',
        title: 'Break',
        description: '15-minute break',
        presenter: null,
        sessionOrder: 8,
        scheduledStart: '2024-01-01T15:15:00',
        scheduledEnd: '2024-01-01T15:30:00',
        durationMinutes: 15,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: [],
        tags: ['day1', 'break']
      },
      {
        id: 'kpis-that-matter',
        title: 'KPIs That Matter',
        description: 'The numbers that grow your business (Dre)',
        presenter: 'Dre',
        sessionOrder: 9,
        scheduledStart: '2024-01-01T15:30:00',
        scheduledEnd: '2024-01-01T16:15:00',
        durationMinutes: 45,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Track barber → unique clients, rebooking %, average ticket',
          'Monitor shop → chair utilization, payroll %, client retention',
          'Measure enterprise → profit across all shops ("what\'s left after all bills")'
        ],
        keyPoints: [
          'Barber → unique clients, rebooking %, average ticket',
          'Shop → chair utilization, payroll %, client retention',
          'Enterprise → profit across all shops ("what\'s left after all bills")'
        ],
        tags: ['day1', 'kpis', 'metrics', 'dre']
      },
      {
        id: 'breakout-groups',
        title: 'Breakout Groups by Avatar',
        description: 'Small group discussions by business type',
        presenter: 'All Coaches',
        sessionOrder: 10,
        scheduledStart: '2024-01-01T16:15:00',
        scheduledEnd: '2024-01-01T17:00:00',
        durationMinutes: 45,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Connect with peers at similar business stages',
          'Share challenges and solutions',
          'Build accountability partnerships'
        ],
        keyPoints: [
          'Barber group discussions',
          'Shop owner collaborations',
          'Enterprise strategy sessions'
        ],
        tags: ['day1', 'breakout', 'networking']
      },
      {
        id: 'open-qa',
        title: 'Open Q&A',
        description: 'Direct access to Dre, Nate & Bossio',
        presenter: 'Dre, Nate & Bossio',
        sessionOrder: 11,
        scheduledStart: '2024-01-01T17:00:00',
        scheduledEnd: '2024-01-01T17:30:00',
        durationMinutes: 30,
        sessionType: 'qa',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Get direct answers from coaches',
          'Address specific challenges',
          'Clarify implementation strategies'
        ],
        keyPoints: [
          'Submit questions throughout the day',
          'Get personalized advice',
          'Connect learning to your specific situation'
        ],
        tags: ['day1', 'qa', 'all-coaches']
      },
      {
        id: 'vip-dinner',
        title: 'VIP Private Dinner',
        description: 'Private dinner with Dre, Nate & Bossio (VIP Only)',
        presenter: 'Dre, Nate & Bossio',
        sessionOrder: 12,
        scheduledStart: '2024-01-01T19:00:00',
        scheduledEnd: '2024-01-01T21:00:00',
        durationMinutes: 120,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: ['Intimate mentorship + high-level networking'],
        tags: ['day1', 'vip', 'dinner']
      },

      // Day 2 Sessions
      {
        id: 'roundtables-1',
        title: 'Roundtables (Rotation 1)',
        description: 'Intimate sessions with each coach',
        presenter: 'All Coaches',
        sessionOrder: 13,
        scheduledStart: '2024-01-02T09:30:00',
        scheduledEnd: '2024-01-02T10:15:00',
        durationMinutes: 45,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Deep dive with individual coaches',
          'Personalized guidance',
          'Intimate learning environment'
        ],
        keyPoints: [],
        tags: ['day2', 'roundtable', 'rotation1']
      },
      {
        id: 'roundtables-2',
        title: 'Roundtables (Rotation 2)',
        description: 'Continue rotating through expert sessions',
        presenter: 'All Coaches',
        sessionOrder: 14,
        scheduledStart: '2024-01-02T10:15:00',
        scheduledEnd: '2024-01-02T11:00:00',
        durationMinutes: 45,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Second coach rotation',
          'Build on previous insights',
          'Develop comprehensive understanding'
        ],
        keyPoints: [],
        tags: ['day2', 'roundtable', 'rotation2']
      },
      {
        id: 'roundtables-3',
        title: 'Roundtables (Rotation 3)',
        description: 'Final rotation with personalized guidance',
        presenter: 'All Coaches',
        sessionOrder: 15,
        scheduledStart: '2024-01-02T11:00:00',
        scheduledEnd: '2024-01-02T11:45:00',
        durationMinutes: 45,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Complete all coach interactions',
          'Synthesize learning',
          'Prepare for action planning'
        ],
        keyPoints: [],
        tags: ['day2', 'roundtable', 'rotation3']
      },
      {
        id: 'recap',
        title: 'Recap',
        description: 'Key takeaways and next steps',
        presenter: 'All Coaches',
        sessionOrder: 16,
        scheduledStart: '2024-01-02T11:45:00',
        scheduledEnd: '2024-01-02T12:00:00',
        durationMinutes: 15,
        sessionType: 'keynote',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Synthesize key learnings',
          'Identify priority actions',
          'Set expectations for implementation'
        ],
        keyPoints: [],
        tags: ['day2', 'recap', 'synthesis']
      },
      {
        id: 'lunch-day2',
        title: 'Lunch',
        description: 'Networking lunch break',
        presenter: null,
        sessionOrder: 17,
        scheduledStart: '2024-01-02T12:00:00',
        scheduledEnd: '2024-01-02T13:00:00',
        durationMinutes: 60,
        sessionType: 'break',
        status: 'scheduled',
        isLive: false,
        objectives: [],
        keyPoints: [],
        tags: ['day2', 'lunch']
      },
      {
        id: 'action-plan-shareouts',
        title: 'Roundtable Continuation + Action Plan Shareouts',
        description: 'Finalize your personalized action plan',
        presenter: 'All Coaches',
        sessionOrder: 18,
        scheduledStart: '2024-01-02T13:00:00',
        scheduledEnd: '2024-01-02T15:00:00',
        durationMinutes: 120,
        sessionType: 'workshop',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Create personalized 90-day action plan',
          'Share plans with peer accountability',
          'Get final coach feedback'
        ],
        keyPoints: [
          'Personalized action planning',
          'Peer accountability setup',
          'Implementation roadmap'
        ],
        tags: ['day2', 'action-planning', 'accountability']
      },
      {
        id: 'closing-commitments',
        title: 'Closing Session - Commitments + Next Steps',
        description: 'Everyone writes down their top 3 commitments',
        presenter: 'All Coaches',
        sessionOrder: 19,
        scheduledStart: '2024-01-02T15:00:00',
        scheduledEnd: '2024-01-02T16:00:00',
        durationMinutes: 60,
        sessionType: 'keynote',
        status: 'scheduled',
        isLive: false,
        objectives: [
          'Make specific commitments',
          'Set accountability measures',
          'Plan follow-up actions'
        ],
        keyPoints: [
          'Top 3 commitments',
          'Certificate of Completion ceremony',
          'Next steps planning'
        ],
        tags: ['day2', 'closing', 'commitments', 'ceremony']
      }
    ];

    setSessions(workshopSessions);
    setLoading(false);
  }, []);

  // Get session type icon
  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'keynote':
        return <Target className="w-5 h-5 text-tomb45-green" />;
      case 'workshop':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'qa':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case 'break':
        return <Coffee className="w-5 h-5 text-orange-500" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get session type color
  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'keynote':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'workshop':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'qa':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'break':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get session status
  const getSessionStatus = (session: WorkshopSession) => {
    const now = currentTime;
    const start = new Date(session.scheduledStart);
    const end = new Date(session.scheduledEnd);

    if (session.status === 'completed') return 'completed';
    if (session.status === 'cancelled') return 'cancelled';
    if (session.isLive || session.status === 'in_progress') return 'live';
    if (now >= start && now <= end) return 'happening';
    if (now < start) return 'upcoming';
    if (now > end) return 'past';

    return 'scheduled';
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tomb45-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading workshop agenda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-800 mb-4">{error}</p>
              <Button onClick={fetchSessions} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workshop Header */}
      <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-tomb45-green/20 rounded-full">
                <Calendar className="w-6 h-6 text-tomb45-green" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-text-primary">
                  Six Figure Barber Workshop
                </CardTitle>
                <p className="text-text-secondary mt-1">
                  Interactive learning companion for today's sessions
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Today's Date</p>
              <p className="font-semibold text-text-primary">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Session Timeline */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Workshop Agenda</h2>
          <Badge variant="outline" className="text-xs">
            {sessions.length} sessions scheduled
          </Badge>
        </div>

        {/* Day 1 Sessions */}
        <div>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-tomb45-green rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">Day 1 - Collect the Data</h3>
            </div>
            <p className="text-text-secondary text-sm ml-11">
              Learn the core methodologies and systems
            </p>
          </div>

          <div className="space-y-4">
            {sessions
              .filter(session => session.tags.includes('day1'))
              .map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  index={index}
                  selectedSession={selectedSession}
                  setSelectedSession={setSelectedSession}
                  setActiveWorksheet={setActiveWorksheet}
                  onStartRecording={onStartRecording}
                  onTakeNotes={onTakeNotes}
                  getSessionTypeIcon={getSessionTypeIcon}
                  getSessionTypeColor={getSessionTypeColor}
                  getSessionStatus={getSessionStatus}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                />
              ))}
          </div>
        </div>

        {/* Day 2 Sessions */}
        <div>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">Day 2 - Leverage the Data</h3>
            </div>
            <p className="text-text-secondary text-sm ml-11">
              Apply insights and create your action plan
            </p>
          </div>

          <div className="space-y-4">
            {sessions
              .filter(session => session.tags.includes('day2'))
              .map((session, index) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  index={index + sessions.filter(s => s.tags.includes('day1')).length}
                  selectedSession={selectedSession}
                  setSelectedSession={setSelectedSession}
                  setActiveWorksheet={setActiveWorksheet}
                  onStartRecording={onStartRecording}
                  onTakeNotes={onTakeNotes}
                  getSessionTypeIcon={getSessionTypeIcon}
                  getSessionTypeColor={getSessionTypeColor}
                  getSessionStatus={getSessionStatus}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Interactive Worksheets Modal */}
      {activeWorksheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-secondary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <h2 className="text-xl font-bold text-text-primary">
                Workshop Exercise
              </h2>
              <Button
                onClick={() => setActiveWorksheet(null)}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {renderWorksheet(activeWorksheet)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render appropriate worksheet
  function renderWorksheet(sessionId: string) {
    const handleSaveWorksheet = async (data: any) => {
      // Handle worksheet data saving
      console.log('Saving worksheet data:', data);
      // TODO: Implement API call to save worksheet data
    };

    switch (sessionId) {
      case 'systems-that-scale':
        return (
          <SystemsWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      case 'marketing-that-builds-demand':
        return (
          <MarketingWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      case 'paid-ads-that-convert':
        return (
          <PaidAdsWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      case 'investing-wealth-machine':
        return (
          <WealthPlanWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      case 'kpis-that-matter':
        return (
          <KPIsWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      case 'action-plan-shareouts':
      case 'closing-commitments':
        return (
          <ActionPlanWorksheet
            userId={userId}
            businessType={businessType}
            onSave={handleSaveWorksheet}
            readonly={false}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-text-secondary">
              No worksheet available for this session yet.
            </p>
          </div>
        );
    }
  }
}

// Extract SessionCard component for cleaner code
interface SessionCardProps {
  session: WorkshopSession;
  index: number;
  selectedSession: string | null;
  setSelectedSession: (id: string | null) => void;
  setActiveWorksheet: (id: string | null) => void;
  onStartRecording: (session: WorkshopSession) => void;
  onTakeNotes: (session: WorkshopSession) => void;
  getSessionTypeIcon: (type: string) => JSX.Element;
  getSessionTypeColor: (type: string) => string;
  getSessionStatus: (session: WorkshopSession) => string;
  formatTime: (dateString: string) => string;
  formatDuration: (minutes: number) => string;
}

function SessionCard({
  session,
  index,
  selectedSession,
  setSelectedSession,
  setActiveWorksheet,
  onStartRecording,
  onTakeNotes,
  getSessionTypeIcon,
  getSessionTypeColor,
  getSessionStatus,
  formatTime,
  formatDuration,
}: SessionCardProps) {
  const sessionStatus = getSessionStatus(session);
  const isSelected = selectedSession === session.id;
  const isActive = sessionStatus === 'live' || sessionStatus === 'happening';

  // Add workbook exercise prompts based on session ID
  const getWorkbookExercise = (sessionId: string) => {
    switch (sessionId) {
      case 'systems-that-scale':
        return '📝 Workbook: Map your "Current System Gaps vs. Ideal Flow"';
      case 'marketing-that-builds-demand':
        return '📝 Workbook: Pick one grassroots campaign to test in 30 days';
      case 'paid-ads-that-convert':
        return '📝 Workbook: Fill out your "One Campaign Framework"';
      case 'investing-wealth-machine':
        return '📝 Workbook: Build your "Wealth Plan 1.0"';
      case 'kpis-that-matter':
        return '📝 Workbook: Identify your "Top 3 KPIs"';
      case 'action-plan-shareouts':
        return '📝 Workbook: Create your personalized 90-day action plan';
      case 'closing-commitments':
        return '📝 Workbook: Write down your top 3 commitments';
      default:
        return null;
    }
  };

  const workbookExercise = getWorkbookExercise(session.id);

  return (
    <Card
      className={`transition-all duration-200 ${
        isActive
          ? 'border-tomb45-green shadow-lg ring-2 ring-tomb45-green/20'
          : 'border-border-primary hover:border-tomb45-green/30'
      } ${
        isSelected ? 'bg-background-accent' : 'bg-background-secondary'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Session Time */}
            <div className="text-center min-w-[80px]">
              <div className="text-sm text-text-secondary">
                {formatTime(session.scheduledStart)}
              </div>
              <div className="text-xs text-text-muted">
                {formatDuration(session.durationMinutes)}
              </div>
            </div>

            {/* Session Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getSessionTypeIcon(session.sessionType)}
                <h3 className="font-semibold text-text-primary text-lg">
                  {session.title}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs ${getSessionTypeColor(session.sessionType)}`}
                >
                  {session.sessionType}
                </Badge>
              </div>

              {session.presenter && (
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">
                    {session.presenter}
                  </span>
                </div>
              )}

              <p className="text-text-secondary text-sm mb-3">
                {session.description}
              </p>

              {/* Workbook Exercise */}
              {workbookExercise && (
                <div className="bg-tomb45-green/5 border border-tomb45-green/20 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-tomb45-green font-medium">
                      {workbookExercise}
                    </p>
                    <Button
                      onClick={() => setActiveWorksheet(session.id)}
                      className="bg-tomb45-green hover:bg-tomb45-green/90 text-white"
                      size="sm"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Open Worksheet
                    </Button>
                  </div>
                </div>
              )}

              {/* Objectives */}
              {session.objectives.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-tomb45-green" />
                    <span className="text-sm font-medium text-text-primary">
                      Learning Objectives
                    </span>
                  </div>
                  <ul className="text-sm text-text-secondary ml-6 space-y-1">
                    {session.objectives.map((objective, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-tomb45-green">•</span>
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons for Workshop Sessions */}
              {session.sessionType !== 'break' && (
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => onStartRecording(session)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    size="sm"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                  <Button
                    onClick={() => onTakeNotes(session)}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Take Notes
                  </Button>
                </div>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <Button
              onClick={() =>
                setSelectedSession(isSelected ? null : session.id)
              }
              variant="ghost"
              size="sm"
            >
              {isSelected ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Session Details */}
        {isSelected && (
          <div className="mt-6 pt-6 border-t border-border-primary">
            {session.keyPoints.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-text-primary">
                    Key Points to Remember
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {session.keyPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="bg-background-primary p-3 rounded-lg border border-border-primary"
                    >
                      <span className="text-sm text-text-secondary">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}