'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Star,
  Clock,
  BarChart,
  Save,
  Download,
  Share2,
  RefreshCw,
  Play,
  Flag,
  Award,
  Mic,
  FileText,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/**
 * Goal setting data structure
 */
interface GoalData {
  // Current State Assessment
  currentRevenue: number;
  yearsInBusiness: number;
  currentClients: number;
  averageServicePrice: number;
  workingHoursPerWeek: number;
  currentChallenges: string[];
  strengths: string[];

  // Vision & Goals
  visionStatement: string;
  targetRevenue: number;
  timeframe: string; // "1 year", "3 years", "5 years"
  targetClients: number;
  targetServicePrice: number;
  desiredWorkingHours: number;

  // SMART Goals
  specificGoals: SMARTGoal[];

  // Action Planning
  actionItems: ActionItem[];
  milestones: Milestone[];

  // Barriers & Solutions
  anticipatedBarriers: Barrier[];

  // Progress Tracking
  reviewSchedule: string;
  accountabilityPartner: string;
  progressMetrics: string[];
}

interface SMARTGoal {
  id: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  priority: 'high' | 'medium' | 'low';
  category: 'revenue' | 'clients' | 'operations' | 'personal' | 'marketing';
}

interface ActionItem {
  id: string;
  action: string;
  deadline: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  notes: string;
}

interface Milestone {
  id: string;
  title: string;
  targetDate: string;
  targetValue: number;
  metric: string;
  achieved: boolean;
}

interface Barrier {
  id: string;
  barrier: string;
  impact: 'high' | 'medium' | 'low';
  solution: string;
  resources: string[];
}

/**
 * Props for the Goal Setting Worksheet
 */
interface GoalSettingWorksheetProps {
  initialData?: Partial<GoalData>;
  onSave?: (data: GoalData) => void;
  onComplete?: (data: GoalData) => void;
  onVoiceNote?: (section: string) => void;
  readonly?: boolean;
  showProgress?: boolean;
  className?: string;
}

/**
 * Current State Assessment Section
 */
const CurrentStateAssessment: React.FC<{
  data: Partial<GoalData>;
  onChange: (updates: Partial<GoalData>) => void;
  readonly?: boolean;
}> = ({ data, onChange, readonly = false }) => {
  const monthlyRevenue = data.currentRevenue || 0;
  const weeklyClients = data.currentClients || 0;
  const avgPrice = data.averageServicePrice || 0;
  const calculatedRevenue = weeklyClients * avgPrice * 4;
  const revenueVariance = monthlyRevenue - calculatedRevenue;

  return (
    <Card className="border-border-primary bg-background-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <BarChart className="w-5 h-5" />
          Current Business Assessment
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Let's start by understanding where your business stands today.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Financial Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">Financial Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Current Monthly Revenue ($)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.currentRevenue || ''}
                onChange={(e) => onChange({ currentRevenue: parseFloat(e.target.value) || 0 })}
                placeholder="3,500"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Weekly Clients
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.currentClients || ''}
                onChange={(e) => onChange({ currentClients: parseFloat(e.target.value) || 0 })}
                placeholder="20"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Average Service Price ($)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.averageServicePrice || ''}
                onChange={(e) => onChange({ averageServicePrice: parseFloat(e.target.value) || 0 })}
                placeholder="45"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>
          </div>

          {/* Revenue Calculation Check */}
          {weeklyClients > 0 && avgPrice > 0 && (
            <div className={`p-4 rounded-lg border ${
              Math.abs(revenueVariance) < 200
                ? 'border-green-200 bg-green-50'
                : 'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Revenue Calculation Check</span>
              </div>
              <p className="text-sm">
                Based on {weeklyClients} clients/week × ${avgPrice}/service × 4 weeks =
                <span className="font-bold"> ${calculatedRevenue.toLocaleString()}/month</span>
              </p>
              {Math.abs(revenueVariance) > 200 && (
                <p className="text-sm mt-1 text-yellow-700">
                  This differs from your stated revenue by ${Math.abs(revenueVariance).toLocaleString()}.
                  Consider reviewing your pricing or client frequency.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Experience & Operations */}
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">Experience & Operations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Years in Business
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.yearsInBusiness || ''}
                onChange={(e) => onChange({ yearsInBusiness: parseFloat(e.target.value) || 0 })}
                placeholder="3"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Working Hours per Week
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.workingHoursPerWeek || ''}
                onChange={(e) => onChange({ workingHoursPerWeek: parseFloat(e.target.value) || 0 })}
                placeholder="50"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>
          </div>
        </div>

        {/* Strengths & Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Current Strengths
            </label>
            <textarea
              disabled={readonly}
              value={data.strengths?.join('\n') || ''}
              onChange={(e) => onChange({
                strengths: e.target.value.split('\n').filter(s => s.trim())
              })}
              placeholder="• Excellent technical skills&#10;• Strong client relationships&#10;• Prime location"
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
              rows={4}
            />
            <p className="text-xs text-text-secondary mt-1">List one strength per line</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Current Challenges
            </label>
            <textarea
              disabled={readonly}
              value={data.currentChallenges?.join('\n') || ''}
              onChange={(e) => onChange({
                currentChallenges: e.target.value.split('\n').filter(s => s.trim())
              })}
              placeholder="• Inconsistent booking schedule&#10;• Low pricing compared to competitors&#10;• No marketing strategy"
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
              rows={4}
            />
            <p className="text-xs text-text-secondary mt-1">List one challenge per line</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Vision & Goals Section
 */
const VisionGoalsSection: React.FC<{
  data: Partial<GoalData>;
  onChange: (updates: Partial<GoalData>) => void;
  readonly?: boolean;
}> = ({ data, onChange, readonly = false }) => {
  const currentRevenue = data.currentRevenue || 0;
  const targetRevenue = data.targetRevenue || 0;
  const growthNeeded = targetRevenue - currentRevenue;
  const growthPercentage = currentRevenue > 0 ? (growthNeeded / currentRevenue) * 100 : 0;

  return (
    <Card className="border-border-primary bg-background-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Target className="w-5 h-5" />
          Vision & Target Goals
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Define your vision and set specific targets for the future.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vision Statement */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Vision Statement
          </label>
          <textarea
            disabled={readonly}
            value={data.visionStatement || ''}
            onChange={(e) => onChange({ visionStatement: e.target.value })}
            placeholder="Describe your ideal barbershop business. What does success look like to you? How do you want clients to feel? What impact do you want to have?"
            className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
            rows={4}
          />
          <p className="text-xs text-text-secondary mt-1">
            Write 2-3 sentences describing your ideal business
          </p>
        </div>

        {/* Target Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">Target Business Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Timeframe
              </label>
              <select
                disabled={readonly}
                value={data.timeframe || ''}
                onChange={(e) => onChange({ timeframe: e.target.value })}
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              >
                <option value="">Select timeframe</option>
                <option value="1 year">1 Year</option>
                <option value="3 years">3 Years</option>
                <option value="5 years">5 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Target Monthly Revenue ($)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.targetRevenue || ''}
                onChange={(e) => onChange({ targetRevenue: parseFloat(e.target.value) || 0 })}
                placeholder="10,000"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Target Weekly Clients
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.targetClients || ''}
                onChange={(e) => onChange({ targetClients: parseFloat(e.target.value) || 0 })}
                placeholder="40"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Target Service Price ($)
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.targetServicePrice || ''}
                onChange={(e) => onChange({ targetServicePrice: parseFloat(e.target.value) || 0 })}
                placeholder="65"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Desired Working Hours per Week
              </label>
              <input
                type="number"
                disabled={readonly}
                value={data.desiredWorkingHours || ''}
                onChange={(e) => onChange({ desiredWorkingHours: parseFloat(e.target.value) || 0 })}
                placeholder="40"
                className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
              />
            </div>
          </div>
        </div>

        {/* Growth Analysis */}
        {currentRevenue > 0 && targetRevenue > 0 && (
          <div className="bg-tomb45-green/10 border border-tomb45-green/20 rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Growth Analysis
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  ${growthNeeded.toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Revenue Increase Needed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  {growthPercentage.toFixed(0)}%
                </div>
                <div className="text-sm text-text-secondary">Growth Required</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-tomb45-green">
                  ${(targetRevenue * 12).toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Annual Target</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * SMART Goals Section
 */
const SMARTGoalsSection: React.FC<{
  data: Partial<GoalData>;
  onChange: (updates: Partial<GoalData>) => void;
  readonly?: boolean;
}> = ({ data, onChange, readonly = false }) => {
  const [goals, setGoals] = useState<SMARTGoal[]>(data.specificGoals || []);

  const addGoal = useCallback(() => {
    const newGoal: SMARTGoal = {
      id: `goal_${Date.now()}`,
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      timeBound: '',
      priority: 'medium',
      category: 'revenue',
    };
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    onChange({ specificGoals: updatedGoals });
  }, [goals, onChange]);

  const updateGoal = useCallback((id: string, updates: Partial<SMARTGoal>) => {
    const updatedGoals = goals.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    );
    setGoals(updatedGoals);
    onChange({ specificGoals: updatedGoals });
  }, [goals, onChange]);

  const removeGoal = useCallback((id: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== id);
    setGoals(updatedGoals);
    onChange({ specificGoals: updatedGoals });
  }, [goals, onChange]);

  return (
    <Card className="border-border-primary bg-background-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Star className="w-5 h-5" />
          SMART Goals
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Create Specific, Measurable, Achievable, Relevant, and Time-bound goals.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SMART Framework Explanation */}
        <div className="bg-background-accent p-4 rounded-lg">
          <h4 className="font-medium text-text-primary mb-3">SMART Framework</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">Specific</div>
              <div className="text-text-secondary">Clear & focused</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">Measurable</div>
              <div className="text-text-secondary">Trackable metrics</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-600">Achievable</div>
              <div className="text-text-secondary">Realistic & attainable</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">Relevant</div>
              <div className="text-text-secondary">Aligned with vision</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-red-600">Time-bound</div>
              <div className="text-text-secondary">Clear deadline</div>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <Card key={goal.id} className="border-border-secondary bg-background-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Goal {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      disabled={readonly}
                      value={goal.category}
                      onChange={(e) => updateGoal(goal.id, { category: e.target.value as any })}
                      className="px-2 py-1 text-xs border border-border-primary rounded bg-background-secondary"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="clients">Clients</option>
                      <option value="operations">Operations</option>
                      <option value="marketing">Marketing</option>
                      <option value="personal">Personal</option>
                    </select>
                    <select
                      disabled={readonly}
                      value={goal.priority}
                      onChange={(e) => updateGoal(goal.id, { priority: e.target.value as any })}
                      className="px-2 py-1 text-xs border border-border-primary rounded bg-background-secondary"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    {!readonly && (
                      <Button
                        onClick={() => removeGoal(goal.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-1">
                      Specific: What exactly will you accomplish?
                    </label>
                    <input
                      disabled={readonly}
                      value={goal.specific}
                      onChange={(e) => updateGoal(goal.id, { specific: e.target.value })}
                      placeholder="Increase my average service price to $65 per cut"
                      className="w-full p-2 border border-border-primary rounded bg-background-secondary text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-600 mb-1">
                      Measurable: How will you track progress?
                    </label>
                    <input
                      disabled={readonly}
                      value={goal.measurable}
                      onChange={(e) => updateGoal(goal.id, { measurable: e.target.value })}
                      placeholder="Track average price per service weekly; target $65 from current $45"
                      className="w-full p-2 border border-border-primary rounded bg-background-secondary text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">
                      Achievable: Why is this goal realistic?
                    </label>
                    <input
                      disabled={readonly}
                      value={goal.achievable}
                      onChange={(e) => updateGoal(goal.id, { achievable: e.target.value })}
                      placeholder="Other barbers in my area charge $60-70; my skills justify premium pricing"
                      className="w-full p-2 border border-border-primary rounded bg-background-secondary text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-600 mb-1">
                      Relevant: How does this align with your vision?
                    </label>
                    <input
                      disabled={readonly}
                      value={goal.relevant}
                      onChange={(e) => updateGoal(goal.id, { relevant: e.target.value })}
                      placeholder="Higher prices mean better income without working more hours"
                      className="w-full p-2 border border-border-primary rounded bg-background-secondary text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Time-bound: When will you achieve this?
                    </label>
                    <input
                      disabled={readonly}
                      value={goal.timeBound}
                      onChange={(e) => updateGoal(goal.id, { timeBound: e.target.value })}
                      placeholder="Implement new pricing within 30 days; reach full $65 average within 90 days"
                      className="w-full p-2 border border-border-primary rounded bg-background-secondary text-text-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!readonly && (
            <Button
              onClick={addGoal}
              variant="outline"
              className="w-full border-dashed border-2 h-12"
            >
              <Target className="w-4 h-4 mr-2" />
              Add SMART Goal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Progress Tracking Section
 */
const ProgressTrackingSection: React.FC<{
  data: Partial<GoalData>;
  onChange: (updates: Partial<GoalData>) => void;
  readonly?: boolean;
}> = ({ data, onChange, readonly = false }) => {
  return (
    <Card className="border-border-primary bg-background-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Clock className="w-5 h-5" />
          Progress Tracking & Accountability
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Set up systems to track your progress and stay accountable.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Review Schedule
            </label>
            <select
              disabled={readonly}
              value={data.reviewSchedule || ''}
              onChange={(e) => onChange({ reviewSchedule: e.target.value })}
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
            >
              <option value="">Select frequency</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Accountability Partner
            </label>
            <input
              disabled={readonly}
              value={data.accountabilityPartner || ''}
              onChange={(e) => onChange({ accountabilityPartner: e.target.value })}
              placeholder="Business mentor, fellow barber, family member"
              className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Key Metrics to Track
          </label>
          <textarea
            disabled={readonly}
            value={data.progressMetrics?.join('\n') || ''}
            onChange={(e) => onChange({
              progressMetrics: e.target.value.split('\n').filter(s => s.trim())
            })}
            placeholder="• Weekly revenue&#10;• Number of new clients&#10;• Average service price&#10;• Client retention rate&#10;• Hours worked per week"
            className="w-full p-3 border border-border-primary rounded-lg bg-background-accent text-text-primary resize-none"
            rows={5}
          />
          <p className="text-xs text-text-secondary mt-1">List one metric per line</p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main Goal Setting Worksheet Component
 */
export default function GoalSettingWorksheet({
  initialData = {},
  onSave,
  onComplete,
  onVoiceNote,
  readonly = false,
  showProgress = true,
  className = '',
}: GoalSettingWorksheetProps) {
  const [goalData, setGoalData] = useState<Partial<GoalData>>(initialData);
  const [currentSection, setCurrentSection] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const sections = [
    { id: 'assessment', title: 'Current State Assessment', icon: BarChart },
    { id: 'vision', title: 'Vision & Goals', icon: Target },
    { id: 'smart', title: 'SMART Goals', icon: Star },
    { id: 'tracking', title: 'Progress Tracking', icon: Clock },
  ];

  const updateGoalData = useCallback((updates: Partial<GoalData>) => {
    setGoalData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    const completeData = goalData as GoalData;
    onSave?.(completeData);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  }, [goalData, onSave]);

  const handleComplete = useCallback(() => {
    const completeData = goalData as GoalData;
    onComplete?.(completeData);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  }, [goalData, onComplete]);

  const isCurrentSectionComplete = useMemo(() => {
    switch (currentSection) {
      case 0: // Assessment
        return !!(goalData.currentRevenue && goalData.currentClients && goalData.averageServicePrice);
      case 1: // Vision
        return !!(goalData.visionStatement && goalData.targetRevenue && goalData.timeframe);
      case 2: // SMART Goals
        return !!(goalData.specificGoals && goalData.specificGoals.length > 0);
      case 3: // Tracking
        return !!(goalData.reviewSchedule && goalData.progressMetrics && goalData.progressMetrics.length > 0);
      default:
        return false;
    }
  }, [currentSection, goalData]);

  const completionPercentage = useMemo(() => {
    let completed = 0;
    if (goalData.currentRevenue && goalData.currentClients && goalData.averageServicePrice) completed++;
    if (goalData.visionStatement && goalData.targetRevenue && goalData.timeframe) completed++;
    if (goalData.specificGoals && goalData.specificGoals.length > 0) completed++;
    if (goalData.reviewSchedule && goalData.progressMetrics && goalData.progressMetrics.length > 0) completed++;
    return (completed / sections.length) * 100;
  }, [goalData, sections.length]);

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return <CurrentStateAssessment data={goalData} onChange={updateGoalData} readonly={readonly} />;
      case 1:
        return <VisionGoalsSection data={goalData} onChange={updateGoalData} readonly={readonly} />;
      case 2:
        return <SMARTGoalsSection data={goalData} onChange={updateGoalData} readonly={readonly} />;
      case 3:
        return <ProgressTrackingSection data={goalData} onChange={updateGoalData} readonly={readonly} />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-border-primary bg-background-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Target className="w-6 h-6" />
            Goal Setting Worksheet
          </CardTitle>
          <p className="text-text-secondary">
            Create a comprehensive plan to achieve your business goals using the proven 6FB methodology.
          </p>
        </CardHeader>

        {showProgress && (
          <CardContent className="space-y-4">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-primary">Overall Progress</span>
              <span className="text-text-secondary">{Math.round(completionPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-background-accent rounded-full h-2">
              <div
                className="bg-tomb45-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Section Navigation */}
            <div className="flex flex-wrap gap-2">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isCompleted = index < currentSection || (index === currentSection && isCurrentSectionComplete);
                const isCurrent = index === currentSection;

                return (
                  <Button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    variant={isCurrent ? 'default' : 'outline'}
                    size="sm"
                    className={`flex items-center gap-2 ${
                      isCompleted ? 'bg-green-100 border-green-300 text-green-800' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.title}
                    {isCompleted && <CheckCircle className="w-4 h-4" />}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Current Section Content */}
      {renderCurrentSection()}

      {/* Navigation & Actions */}
      <Card className="border-border-primary bg-background-secondary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSection > 0 && (
                <Button
                  onClick={() => setCurrentSection(currentSection - 1)}
                  variant="outline"
                >
                  Previous
                </Button>
              )}

              {onVoiceNote && (
                <Button
                  onClick={() => onVoiceNote(sections[currentSection].id)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Voice Note
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasUnsavedChanges && onSave && (
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Progress
                </Button>
              )}

              {lastSaved && (
                <span className="text-xs text-text-secondary">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}

              {currentSection < sections.length - 1 ? (
                <Button
                  onClick={() => setCurrentSection(currentSection + 1)}
                  disabled={!isCurrentSectionComplete}
                  className="bg-tomb45-green hover:bg-tomb45-green/80 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={completionPercentage < 100}
                  className="bg-tomb45-green hover:bg-tomb45-green/80 text-white flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Complete Worksheet
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Achievement */}
      {completionPercentage === 100 && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-6 text-center">
            <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Goal Setting Complete!
            </h3>
            <p className="text-green-700 mb-4">
              You've created a comprehensive business plan. Now it's time to take action and achieve your goals!
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Plan
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Goals
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { GoalSettingWorksheet };
export type { GoalSettingWorksheetProps, GoalData, SMARTGoal, ActionItem, Milestone, Barrier };