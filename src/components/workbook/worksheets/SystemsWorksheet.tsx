'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowRight, CheckCircle, AlertCircle, Save } from 'lucide-react';

interface SystemGap {
  area: string;
  currentState: string;
  idealState: string;
  priority: 'high' | 'medium' | 'low';
}

interface SystemsWorksheetProps {
  userId: string;
  onSave: (data: SystemGap[]) => void;
  initialData?: SystemGap[];
  readonly?: boolean;
}

const SYSTEM_AREAS = [
  {
    id: 'rebooking',
    title: 'Client Rebooking',
    description: 'How do you get clients to schedule their next appointment?'
  },
  {
    id: 'client_flow',
    title: 'Client Flow',
    description: 'How do clients move through your service experience?'
  },
  {
    id: 'staff_accountability',
    title: 'Staff Accountability',
    description: 'How do you ensure consistent performance from your team?'
  },
  {
    id: 'payroll_systems',
    title: 'Payroll & Compensation',
    description: 'How do you structure pay and track profitability?'
  },
  {
    id: 'leadership',
    title: 'Leadership & Delegation',
    description: 'How do you manage and empower your team?'
  },
  {
    id: 'consistency',
    title: 'Multi-Location Consistency',
    description: 'How do you maintain standards across multiple locations?'
  }
];

export default function SystemsWorksheet({
  userId,
  onSave,
  initialData = [],
  readonly = false
}: SystemsWorksheetProps) {
  const [systemGaps, setSystemGaps] = useState<SystemGap[]>(() => {
    // Initialize with default structure if no initial data
    if (initialData.length === 0) {
      return SYSTEM_AREAS.map(area => ({
        area: area.id,
        currentState: '',
        idealState: '',
        priority: 'medium' as const
      }));
    }
    return initialData;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateSystemGap = (index: number, field: keyof SystemGap, value: string) => {
    if (readonly) return;

    const updated = [...systemGaps];
    updated[index] = { ...updated[index], [field]: value };
    setSystemGaps(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(systemGaps);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save systems worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStatus = () => {
    const totalFields = systemGaps.length * 2; // current + ideal state for each area
    const completedFields = systemGaps.reduce((count, gap) => {
      return count + (gap.currentState.trim() ? 1 : 0) + (gap.idealState.trim() ? 1 : 0);
    }, 0);

    return {
      completed: completedFields,
      total: totalFields,
      percentage: Math.round((completedFields / totalFields) * 100)
    };
  };

  const completion = getCompletionStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-text-primary mb-2">
                Systems That Scale - Gap Analysis
              </CardTitle>
              <p className="text-text-secondary">
                Map your current system gaps vs. ideal flow to identify priority improvements
              </p>
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

      {/* System Areas */}
      <div className="space-y-6">
        {SYSTEM_AREAS.map((area, index) => {
          const gap = systemGaps[index];
          const hasCurrentState = gap?.currentState.trim().length > 0;
          const hasIdealState = gap?.idealState.trim().length > 0;
          const isComplete = hasCurrentState && hasIdealState;

          return (
            <Card key={area.id} className={`${isComplete ? 'border-tomb45-green/30' : 'border-border-primary'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      {area.title}
                      {isComplete && <CheckCircle className="w-4 h-4 text-tomb45-green" />}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {area.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      gap?.priority === 'high' ? 'border-red-300 text-red-600' :
                      gap?.priority === 'medium' ? 'border-yellow-300 text-yellow-600' :
                      'border-green-300 text-green-600'
                    }`}
                  >
                    {gap?.priority} priority
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current State */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <h4 className="font-medium text-text-primary">Current State</h4>
                    </div>
                    <Textarea
                      placeholder={`Describe how ${area.title.toLowerCase()} currently works in your business...`}
                      value={gap?.currentState || ''}
                      onChange={(e) => updateSystemGap(index, 'currentState', e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={readonly}
                    />
                    {hasCurrentState && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Current state documented
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="hidden lg:flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-tomb45-green" />
                  </div>

                  {/* Ideal State */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-tomb45-green" />
                      <h4 className="font-medium text-text-primary">Ideal State</h4>
                    </div>
                    <Textarea
                      placeholder={`Describe your ideal ${area.title.toLowerCase()} system...`}
                      value={gap?.idealState || ''}
                      onChange={(e) => updateSystemGap(index, 'idealState', e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={readonly}
                    />
                    {hasIdealState && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Ideal state defined
                      </p>
                    )}
                  </div>
                </div>

                {/* Priority Selection */}
                {!readonly && (
                  <div className="mt-4 pt-4 border-t border-border-primary">
                    <p className="text-sm font-medium text-text-primary mb-2">Implementation Priority:</p>
                    <div className="flex gap-2">
                      {(['high', 'medium', 'low'] as const).map((priority) => (
                        <Button
                          key={priority}
                          onClick={() => updateSystemGap(index, 'priority', priority)}
                          variant={gap?.priority === priority ? 'primary' : 'outline'}
                          size="sm"
                          className={`text-xs ${
                            gap?.priority === priority ? '' :
                            priority === 'high' ? 'hover:border-red-300 hover:text-red-600' :
                            priority === 'medium' ? 'hover:border-yellow-300 hover:text-yellow-600' :
                            'hover:border-green-300 hover:text-green-600'
                          }`}
                        >
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      {!readonly && hasChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-tomb45-green hover:bg-tomb45-green/90 shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Progress'}
          </Button>
        </div>
      )}
    </div>
  );
}