'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CheckCircle, BarChart, Target, TrendingUp, Save, Award } from 'lucide-react';

interface KPI {
  name: string;
  currentValue: string;
  targetValue: string;
  trackingMethod: string;
  importance: string;
}

interface KPIsWorksheetProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onSave: (data: KPI[]) => void;
  initialData?: KPI[];
  readonly?: boolean;
}

const AVAILABLE_KPIS = {
  barber: [
    {
      id: 'unique_clients',
      name: 'Unique Clients per Month',
      description: 'Total number of different clients served',
      example: 'Current: 45, Target: 60'
    },
    {
      id: 'rebooking_rate',
      name: 'Rebooking Percentage',
      description: 'Percentage of clients who schedule next appointment',
      example: 'Current: 65%, Target: 85%'
    },
    {
      id: 'average_ticket',
      name: 'Average Ticket Value',
      description: 'Average amount spent per client visit',
      example: 'Current: $35, Target: $45'
    },
    {
      id: 'client_retention',
      name: 'Client Retention Rate',
      description: 'Percentage of clients who return within 6 weeks',
      example: 'Current: 70%, Target: 90%'
    },
    {
      id: 'monthly_revenue',
      name: 'Monthly Revenue',
      description: 'Total monthly income from all sources',
      example: 'Current: $8,000, Target: $12,000'
    }
  ],
  shop: [
    {
      id: 'chair_utilization',
      name: 'Chair Utilization Rate',
      description: 'Percentage of available chair time that is booked',
      example: 'Current: 75%, Target: 90%'
    },
    {
      id: 'payroll_percentage',
      name: 'Payroll Percentage',
      description: 'Payroll costs as percentage of total revenue',
      example: 'Current: 55%, Target: 45%'
    },
    {
      id: 'client_retention',
      name: 'Client Retention Rate',
      description: 'Percentage of clients who return monthly',
      example: 'Current: 65%, Target: 80%'
    },
    {
      id: 'revenue_per_chair',
      name: 'Revenue per Chair',
      description: 'Monthly revenue generated per chair',
      example: 'Current: $4,500, Target: $6,000'
    },
    {
      id: 'new_client_acquisition',
      name: 'New Clients per Month',
      description: 'Number of first-time clients each month',
      example: 'Current: 25, Target: 40'
    }
  ],
  enterprise: [
    {
      id: 'profit_margin',
      name: 'Profit Margin per Location',
      description: 'Net profit percentage across all locations',
      example: 'Current: 15%, Target: 25%'
    },
    {
      id: 'location_consistency',
      name: 'Location Performance Consistency',
      description: 'Standard deviation of performance across locations',
      example: 'Current: 20%, Target: 10%'
    },
    {
      id: 'scalability_index',
      name: 'Scalability Index',
      description: 'Revenue growth rate vs operational complexity',
      example: 'Current: 1.2x, Target: 2.0x'
    },
    {
      id: 'brand_recognition',
      name: 'Brand Recognition Score',
      description: 'Market awareness and customer loyalty metrics',
      example: 'Current: 6.5/10, Target: 8.5/10'
    },
    {
      id: 'roi_marketing',
      name: 'Marketing ROI',
      description: 'Return on investment for marketing spend',
      example: 'Current: 3:1, Target: 5:1'
    }
  ]
};

export default function KPIsWorksheet({
  userId,
  businessType,
  onSave,
  initialData = [],
  readonly = false
}: KPIsWorksheetProps) {
  const [selectedKPIs, setSelectedKPIs] = useState<KPI[]>(() => {
    if (initialData.length === 0) {
      return Array(3).fill(null).map(() => ({
        name: '',
        currentValue: '',
        targetValue: '',
        trackingMethod: '',
        importance: ''
      }));
    }
    return initialData;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableKPIs = AVAILABLE_KPIS[businessType];

  const updateKPI = (index: number, field: keyof KPI, value: string) => {
    if (readonly) return;

    const updated = [...selectedKPIs];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedKPIs(updated);
    setHasChanges(true);
  };

  const selectKPI = (index: number, kpiId: string) => {
    if (readonly) return;

    const kpi = availableKPIs.find(k => k.id === kpiId);
    if (kpi) {
      const updated = [...selectedKPIs];
      updated[index] = {
        ...updated[index],
        name: kpi.name
      };
      setSelectedKPIs(updated);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(selectedKPIs);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save KPIs worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStatus = () => {
    let completed = 0;
    selectedKPIs.forEach(kpi => {
      if (kpi.name) completed++;
      if (kpi.currentValue) completed++;
      if (kpi.targetValue) completed++;
      if (kpi.trackingMethod) completed++;
    });

    const total = selectedKPIs.length * 4; // 4 fields per KPI

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
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
                Top 3 KPIs That Matter
              </CardTitle>
              <p className="text-text-secondary">
                The numbers that grow your {businessType} business
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

      {/* Available KPIs Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-tomb45-green" />
            Available KPIs for {businessType}s
          </CardTitle>
          <p className="text-text-secondary text-sm">
            Choose 3 KPIs from these proven metrics that best fit your current business goals
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableKPIs.map((kpi) => (
              <Card key={kpi.id} className="border-border-primary">
                <CardContent className="p-4">
                  <h3 className="font-medium text-text-primary mb-2">{kpi.name}</h3>
                  <p className="text-sm text-text-secondary mb-2">{kpi.description}</p>
                  <div className="bg-background-primary p-2 rounded border border-border-primary">
                    <p className="text-xs text-text-muted">
                      <strong>Example:</strong> {kpi.example}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected KPIs */}
      <div className="space-y-6">
        {selectedKPIs.map((kpi, index) => (
          <Card key={index} className={`${kpi.name ? 'border-tomb45-green/30' : 'border-border-primary'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-tomb45-green rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  KPI #{index + 1}
                  {kpi.name && kpi.currentValue && kpi.targetValue && kpi.trackingMethod && (
                    <CheckCircle className="w-4 h-4 text-tomb45-green" />
                  )}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Priority {index === 0 ? 'High' : index === 1 ? 'Medium' : 'Standard'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* KPI Selection */}
              <div>
                <Label>Select KPI</Label>
                <div className="mt-2">
                  {!kpi.name ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableKPIs.map((availableKPI) => (
                        <Button
                          key={availableKPI.id}
                          onClick={() => selectKPI(index, availableKPI.id)}
                          variant="outline"
                          className="justify-start h-auto p-3"
                          disabled={readonly}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">{availableKPI.name}</div>
                            <div className="text-xs text-text-muted">{availableKPI.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-tomb45-green/5 border border-tomb45-green/20 rounded-lg p-3">
                      <span className="font-medium text-tomb45-green">{kpi.name}</span>
                      {!readonly && (
                        <Button
                          onClick={() => updateKPI(index, 'name', '')}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Change
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Details */}
              {kpi.name && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor={`current-${index}`}>Current Value</Label>
                      <Input
                        id={`current-${index}`}
                        placeholder="What's your current performance?"
                        value={kpi.currentValue}
                        onChange={(e) => updateKPI(index, 'currentValue', e.target.value)}
                        className="mt-2"
                        disabled={readonly}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`target-${index}`}>Target Value</Label>
                      <Input
                        id={`target-${index}`}
                        placeholder="What do you want to achieve?"
                        value={kpi.targetValue}
                        onChange={(e) => updateKPI(index, 'targetValue', e.target.value)}
                        className="mt-2"
                        disabled={readonly}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`tracking-${index}`}>How Will You Track This?</Label>
                    <Input
                      id={`tracking-${index}`}
                      placeholder="e.g., Weekly reports, POS system, spreadsheet..."
                      value={kpi.trackingMethod}
                      onChange={(e) => updateKPI(index, 'trackingMethod', e.target.value)}
                      className="mt-2"
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`importance-${index}`}>Why Is This KPI Important to Your Business?</Label>
                    <Textarea
                      id={`importance-${index}`}
                      placeholder="Explain how improving this metric will impact your business..."
                      value={kpi.importance}
                      onChange={(e) => updateKPI(index, 'importance', e.target.value)}
                      className="mt-2"
                      disabled={readonly}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Summary */}
      {selectedKPIs.some(kpi => kpi.name && kpi.currentValue && kpi.targetValue) && (
        <Card className="bg-tomb45-green/5 border-tomb45-green/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-tomb45-green">
              <Award className="w-5 h-5" />
              Your Top 3 KPIs Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedKPIs.map((kpi, index) => {
                if (!kpi.name || !kpi.currentValue || !kpi.targetValue) return null;

                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-background-primary rounded-lg border border-border-primary">
                    <div>
                      <h3 className="font-medium text-text-primary">{kpi.name}</h3>
                      <p className="text-sm text-text-secondary">
                        Current: {kpi.currentValue} → Target: {kpi.targetValue}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Priority {index + 1}
                    </Badge>
                  </div>
                );
              })}
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
            {isSaving ? 'Saving...' : 'Save Top 3 KPIs'}
          </Button>
        </div>
      )}
    </div>
  );
}