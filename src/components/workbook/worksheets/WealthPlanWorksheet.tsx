'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TrendingUp, DollarSign, Target, PiggyBank, Save, Calculator } from 'lucide-react';

interface WealthPlan {
  currentIncome: string;
  monthlyExpenses: string;
  savingsGoal: string;
  investmentStrategy: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: string;
  specificGoals: string;
  actionSteps: string[];
}

interface WealthPlanWorksheetProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onSave: (data: WealthPlan) => void;
  initialData?: WealthPlan;
  readonly?: boolean;
}

const INVESTMENT_STRATEGIES = {
  barber: [
    { id: 'simple', name: 'Simple & Steady', description: 'ETFs, Index funds, High-yield savings' },
    { id: 'mixed', name: 'Mixed Portfolio', description: 'Stocks, bonds, REITs, emergency fund' },
    { id: 'growth', name: 'Growth Focused', description: 'Individual stocks, growth ETFs, some crypto' }
  ],
  shop: [
    { id: 'reinvest', name: 'Business Reinvestment', description: 'Expand shop, new equipment, marketing' },
    { id: 'diversified', name: 'Diversified Assets', description: 'Real estate, stocks, business expansion' },
    { id: 'cashflow', name: 'Cash-flowing Assets', description: 'Rental property, dividend stocks, bonds' }
  ],
  enterprise: [
    { id: 'advanced', name: 'Advanced Portfolio', description: 'Options trading, private equity, tax optimization' },
    { id: 'wealth_preservation', name: 'Wealth Preservation', description: 'Trust structures, tax strategies, estate planning' },
    { id: 'empire', name: 'Empire Building', description: 'Franchising, acquisitions, market domination' }
  ]
};

export default function WealthPlanWorksheet({
  userId,
  businessType,
  onSave,
  initialData,
  readonly = false
}: WealthPlanWorksheetProps) {
  const [wealthPlan, setWealthPlan] = useState<WealthPlan>(initialData || {
    currentIncome: '',
    monthlyExpenses: '',
    savingsGoal: '',
    investmentStrategy: '',
    riskTolerance: 'moderate',
    timeHorizon: '',
    specificGoals: '',
    actionSteps: ['', '', '']
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const strategies = INVESTMENT_STRATEGIES[businessType];

  const updateWealthPlan = (field: keyof WealthPlan, value: string | string[]) => {
    if (readonly) return;

    setWealthPlan(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateActionStep = (index: number, value: string) => {
    if (readonly) return;

    const updatedSteps = [...wealthPlan.actionSteps];
    updatedSteps[index] = value;
    updateWealthPlan('actionSteps', updatedSteps);
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(wealthPlan);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save wealth plan worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateMonthlySavings = () => {
    const income = parseFloat(wealthPlan.currentIncome.replace(/[^\d.]/g, ''));
    const expenses = parseFloat(wealthPlan.monthlyExpenses.replace(/[^\d.]/g, ''));

    if (income && expenses && income > expenses) {
      return income - expenses;
    }
    return null;
  };

  const getCompletionStatus = () => {
    const requiredFields = [
      wealthPlan.currentIncome,
      wealthPlan.monthlyExpenses,
      wealthPlan.savingsGoal,
      wealthPlan.investmentStrategy,
      wealthPlan.timeHorizon,
      wealthPlan.specificGoals
    ];
    const actionStepsComplete = wealthPlan.actionSteps.filter(step => step.trim()).length;

    const completed = requiredFields.filter(field => field.trim()).length + actionStepsComplete;
    const total = requiredFields.length + 3; // 3 action steps

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  };

  const completion = getCompletionStatus();
  const monthlySavings = calculateMonthlySavings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-tomb45-green/10 to-blue-600/10 border-tomb45-green/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-text-primary mb-2">
                Wealth Plan 1.0
              </CardTitle>
              <p className="text-text-secondary">
                Make your money work while you cut less - {businessType} edition
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

      {/* Financial Foundation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-tomb45-green" />
            1. Financial Foundation
          </CardTitle>
          <p className="text-text-secondary text-sm">
            Let's understand your current financial situation
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="current-income">Monthly Income (after taxes)</Label>
              <Input
                id="current-income"
                placeholder="e.g., $8,000"
                value={wealthPlan.currentIncome}
                onChange={(e) => updateWealthPlan('currentIncome', e.target.value)}
                className="mt-2"
                disabled={readonly}
              />
            </div>

            <div>
              <Label htmlFor="monthly-expenses">Monthly Expenses</Label>
              <Input
                id="monthly-expenses"
                placeholder="e.g., $5,000"
                value={wealthPlan.monthlyExpenses}
                onChange={(e) => updateWealthPlan('monthlyExpenses', e.target.value)}
                className="mt-2"
                disabled={readonly}
              />
            </div>
          </div>

          {monthlySavings && (
            <div className="bg-tomb45-green/5 border border-tomb45-green/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-tomb45-green" />
                <span className="font-medium text-tomb45-green">Available for Investing</span>
              </div>
              <p className="text-2xl font-bold text-tomb45-green">
                ${monthlySavings.toLocaleString()}/month
              </p>
              <p className="text-sm text-text-secondary">
                This is what you have available for savings and investments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-tomb45-green" />
            2. Investment Strategy
          </CardTitle>
          <p className="text-text-secondary text-sm">
            Choose the investment approach that fits your {businessType} lifestyle
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className={`cursor-pointer transition-all duration-200 ${
                  wealthPlan.investmentStrategy === strategy.id
                    ? 'border-tomb45-green bg-tomb45-green/5'
                    : 'border-border-primary hover:border-tomb45-green/50'
                } ${readonly ? 'cursor-default' : ''}`}
                onClick={() => !readonly && updateWealthPlan('investmentStrategy', strategy.id)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium text-text-primary mb-2">{strategy.name}</h3>
                  <p className="text-sm text-text-secondary">{strategy.description}</p>
                  {wealthPlan.investmentStrategy === strategy.id && (
                    <div className="mt-2">
                      <Badge className="bg-tomb45-green text-white text-xs">Selected</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk & Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-tomb45-green" />
            3. Risk Tolerance & Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Risk Tolerance</Label>
            <div className="flex gap-3 mt-2">
              {(['conservative', 'moderate', 'aggressive'] as const).map((risk) => (
                <Button
                  key={risk}
                  onClick={() => !readonly && updateWealthPlan('riskTolerance', risk)}
                  variant={wealthPlan.riskTolerance === risk ? 'primary' : 'outline'}
                  size="sm"
                  className="capitalize"
                  disabled={readonly}
                >
                  {risk}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="time-horizon">Investment Time Horizon</Label>
            <Input
              id="time-horizon"
              placeholder="e.g., 5-10 years, until retirement, etc."
              value={wealthPlan.timeHorizon}
              onChange={(e) => updateWealthPlan('timeHorizon', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>

          <div>
            <Label htmlFor="savings-goal">Monthly Savings Goal</Label>
            <Input
              id="savings-goal"
              placeholder="e.g., $2,000/month"
              value={wealthPlan.savingsGoal}
              onChange={(e) => updateWealthPlan('savingsGoal', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Specific Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-tomb45-green" />
            4. Specific Wealth Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="specific-goals">What do you want to achieve?</Label>
          <Textarea
            id="specific-goals"
            placeholder="e.g., Buy a house in 3 years, retire at 50, build passive income of $10k/month..."
            value={wealthPlan.specificGoals}
            onChange={(e) => updateWealthPlan('specificGoals', e.target.value)}
            className="mt-2"
            disabled={readonly}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Steps */}
      <Card>
        <CardHeader>
          <CardTitle>5. Next 90 Days Action Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-tomb45-green rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <Input
                  placeholder={`Action step ${index + 1}...`}
                  value={wealthPlan.actionSteps[index] || ''}
                  onChange={(e) => updateActionStep(index, e.target.value)}
                  className="flex-1"
                  disabled={readonly}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Summary */}
      {wealthPlan.investmentStrategy && monthlySavings && (
        <Card className="bg-tomb45-green/5 border-tomb45-green/20">
          <CardHeader>
            <CardTitle className="text-tomb45-green">Your Wealth Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Available Monthly:</strong> ${monthlySavings.toLocaleString()}</p>
                <p><strong>Savings Goal:</strong> {wealthPlan.savingsGoal}</p>
                <p><strong>Strategy:</strong> {strategies.find(s => s.id === wealthPlan.investmentStrategy)?.name}</p>
              </div>
              <div>
                <p><strong>Risk Tolerance:</strong> {wealthPlan.riskTolerance}</p>
                <p><strong>Time Horizon:</strong> {wealthPlan.timeHorizon}</p>
                <p><strong>Main Goal:</strong> {wealthPlan.specificGoals.split('.')[0]}...</p>
              </div>
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
            {isSaving ? 'Saving...' : 'Save Wealth Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}