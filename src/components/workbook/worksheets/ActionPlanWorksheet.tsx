'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CheckCircle, Calendar, Target, Users, Save, Trophy } from 'lucide-react';

interface ActionItem {
  task: string;
  deadline: string;
  resources: string;
  successMeasure: string;
  completed: boolean;
}

interface ActionPlan {
  overallGoal: string;
  month1Actions: ActionItem[];
  month2Actions: ActionItem[];
  month3Actions: ActionItem[];
  accountabilityPartner: string;
  reviewSchedule: string;
  obstacles: string;
  supportNeeded: string;
}

interface ActionPlanWorksheetProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onSave: (data: ActionPlan) => void;
  initialData?: ActionPlan;
  readonly?: boolean;
}

export default function ActionPlanWorksheet({
  userId,
  businessType,
  onSave,
  initialData,
  readonly = false
}: ActionPlanWorksheetProps) {
  const [actionPlan, setActionPlan] = useState<ActionPlan>(initialData || {
    overallGoal: '',
    month1Actions: Array(3).fill(null).map(() => ({
      task: '',
      deadline: '',
      resources: '',
      successMeasure: '',
      completed: false
    })),
    month2Actions: Array(3).fill(null).map(() => ({
      task: '',
      deadline: '',
      resources: '',
      successMeasure: '',
      completed: false
    })),
    month3Actions: Array(3).fill(null).map(() => ({
      task: '',
      deadline: '',
      resources: '',
      successMeasure: '',
      completed: false
    })),
    accountabilityPartner: '',
    reviewSchedule: '',
    obstacles: '',
    supportNeeded: ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateActionPlan = (field: keyof ActionPlan, value: string | ActionItem[]) => {
    if (readonly) return;

    setActionPlan(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateActionItem = (month: 'month1Actions' | 'month2Actions' | 'month3Actions', index: number, field: keyof ActionItem, value: string | boolean) => {
    if (readonly) return;

    const updatedActions = [...actionPlan[month]];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    updateActionPlan(month, updatedActions);
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(actionPlan);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save action plan worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStatus = () => {
    let completed = 0;
    let total = 7; // overallGoal + accountabilityPartner + reviewSchedule + obstacles + supportNeeded + 2 other fields

    // Count basic fields
    if (actionPlan.overallGoal) completed++;
    if (actionPlan.accountabilityPartner) completed++;
    if (actionPlan.reviewSchedule) completed++;
    if (actionPlan.obstacles) completed++;
    if (actionPlan.supportNeeded) completed++;

    // Count action items
    [actionPlan.month1Actions, actionPlan.month2Actions, actionPlan.month3Actions].forEach(actions => {
      actions.forEach(action => {
        total += 4; // task, deadline, resources, successMeasure
        if (action.task) completed++;
        if (action.deadline) completed++;
        if (action.resources) completed++;
        if (action.successMeasure) completed++;
      });
    });

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  };

  const completion = getCompletionStatus();

  const getMonthName = (monthKey: 'month1Actions' | 'month2Actions' | 'month3Actions') => {
    switch (monthKey) {
      case 'month1Actions': return 'Month 1 (Days 1-30)';
      case 'month2Actions': return 'Month 2 (Days 31-60)';
      case 'month3Actions': return 'Month 3 (Days 61-90)';
    }
  };

  const getMonthFocus = (monthKey: 'month1Actions' | 'month2Actions' | 'month3Actions') => {
    switch (monthKey) {
      case 'month1Actions': return 'Foundation & Quick Wins';
      case 'month2Actions': return 'Building Momentum';
      case 'month3Actions': return 'Scaling & Optimization';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-text-primary mb-2">
                90-Day Action Plan
              </CardTitle>
              <p className="text-text-secondary">
                Transform workshop insights into executable action steps
              </p>
              <Badge variant="outline" className="mt-2 capitalize">
                {businessType} focused
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-tomb45-green mb-1">
                {completion.percentage}%
              </div>
              <p className="text-xs text-text-secondary">
                {completion.completed} of {completion.total} completed
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-background-primary rounded-full h-2 mt-4">
            <div
              className="bg-tomb45-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Overall Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-tomb45-green" />
            Overall 90-Day Goal
          </CardTitle>
          <p className="text-text-secondary text-sm">
            What's the main outcome you want to achieve in the next 90 days?
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Increase monthly revenue by 40% through improved systems and marketing..."
            value={actionPlan.overallGoal}
            onChange={(e) => updateActionPlan('overallGoal', e.target.value)}
            disabled={readonly}
            rows={4}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Monthly Action Plans */}
      {(['month1Actions', 'month2Actions', 'month3Actions'] as const).map((monthKey, monthIndex) => (
        <Card key={monthKey} className="border-border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  monthIndex === 0 ? 'bg-green-500' : monthIndex === 1 ? 'bg-blue-500' : 'bg-purple-500'
                }`}>
                  {monthIndex + 1}
                </div>
                {getMonthName(monthKey)}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {getMonthFocus(monthKey)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {actionPlan[monthKey].map((action, actionIndex) => (
                <Card key={actionIndex} className="bg-background-accent border-border-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-text-primary">
                        Action Item #{actionIndex + 1}
                      </h3>
                      {action.completed && (
                        <CheckCircle className="w-4 h-4 text-tomb45-green" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <Label htmlFor={`task-${monthKey}-${actionIndex}`}>Task Description</Label>
                      <Textarea
                        id={`task-${monthKey}-${actionIndex}`}
                        placeholder="What specific action will you take?"
                        value={action.task}
                        onChange={(e) => updateActionItem(monthKey, actionIndex, 'task', e.target.value)}
                        disabled={readonly}
                        rows={2}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`deadline-${monthKey}-${actionIndex}`}>Deadline</Label>
                        <Input
                          id={`deadline-${monthKey}-${actionIndex}`}
                          placeholder="e.g., Week 2, By Day 15"
                          value={action.deadline}
                          onChange={(e) => updateActionItem(monthKey, actionIndex, 'deadline', e.target.value)}
                          disabled={readonly}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`resources-${monthKey}-${actionIndex}`}>Resources Needed</Label>
                        <Input
                          id={`resources-${monthKey}-${actionIndex}`}
                          placeholder="e.g., $500 budget, 5 hours/week"
                          value={action.resources}
                          onChange={(e) => updateActionItem(monthKey, actionIndex, 'resources', e.target.value)}
                          disabled={readonly}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`success-${monthKey}-${actionIndex}`}>Success Measure</Label>
                      <Input
                        id={`success-${monthKey}-${actionIndex}`}
                        placeholder="How will you know this is complete?"
                        value={action.successMeasure}
                        onChange={(e) => updateActionItem(monthKey, actionIndex, 'successMeasure', e.target.value)}
                        disabled={readonly}
                        className="mt-2"
                      />
                    </div>

                    {!readonly && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`completed-${monthKey}-${actionIndex}`}
                          checked={action.completed}
                          onChange={(e) => updateActionItem(monthKey, actionIndex, 'completed', e.target.checked)}
                          className="w-4 h-4 text-tomb45-green"
                        />
                        <Label htmlFor={`completed-${monthKey}-${actionIndex}`} className="text-sm">
                          Mark as completed
                        </Label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Accountability & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-tomb45-green" />
            Accountability & Support System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="accountability-partner">Accountability Partner</Label>
            <Input
              id="accountability-partner"
              placeholder="Who will help keep you on track? (Name and contact info)"
              value={actionPlan.accountabilityPartner}
              onChange={(e) => updateActionPlan('accountabilityPartner', e.target.value)}
              disabled={readonly}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="review-schedule">Review Schedule</Label>
            <Input
              id="review-schedule"
              placeholder="When will you review progress? (e.g., Weekly on Sundays, Every 2 weeks)"
              value={actionPlan.reviewSchedule}
              onChange={(e) => updateActionPlan('reviewSchedule', e.target.value)}
              disabled={readonly}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="obstacles">Potential Obstacles</Label>
            <Textarea
              id="obstacles"
              placeholder="What might get in your way? How will you handle these challenges?"
              value={actionPlan.obstacles}
              onChange={(e) => updateActionPlan('obstacles', e.target.value)}
              disabled={readonly}
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="support-needed">Support Needed</Label>
            <Textarea
              id="support-needed"
              placeholder="What help, resources, or guidance do you need to succeed?"
              value={actionPlan.supportNeeded}
              onChange={(e) => updateActionPlan('supportNeeded', e.target.value)}
              disabled={readonly}
              rows={3}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan Summary */}
      {actionPlan.overallGoal && (
        <Card className="bg-tomb45-green/5 border-tomb45-green/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-tomb45-green">
              <Trophy className="w-5 h-5" />
              Your 90-Day Action Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-text-primary mb-2">Overall Goal</h3>
                <p className="text-sm text-text-secondary bg-background-primary p-3 rounded border border-border-primary">
                  {actionPlan.overallGoal}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['month1Actions', 'month2Actions', 'month3Actions'] as const).map((monthKey, index) => {
                  const completedActions = actionPlan[monthKey].filter(action => action.task.trim()).length;

                  return (
                    <div key={monthKey} className="bg-background-primary p-3 rounded border border-border-primary">
                      <h4 className="font-medium text-text-primary mb-1">
                        Month {index + 1}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {completedActions} action items planned
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {getMonthFocus(monthKey)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {actionPlan.accountabilityPartner && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-tomb45-green" />
                  <span><strong>Accountability Partner:</strong> {actionPlan.accountabilityPartner}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {!readonly && hasChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-tomb45-green hover:bg-tomb45-green/90 shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save 90-Day Action Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}