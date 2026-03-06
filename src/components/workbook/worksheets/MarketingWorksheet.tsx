'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { CheckCircle, Users, Target, Calendar, Save, Lightbulb } from 'lucide-react';

interface MarketingCampaign {
  strategy: string;
  description: string;
  targetAudience: string;
  timeline: string;
  budget: string;
  successMetrics: string;
  actionSteps: string[];
}

interface MarketingWorksheetProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onSave: (data: MarketingCampaign) => void;
  initialData?: MarketingCampaign;
  readonly?: boolean;
}

const MARKETING_STRATEGIES = {
  barber: [
    {
      id: 'facebook_groups',
      title: 'Facebook Groups',
      description: 'Join local community groups and provide value before promoting services',
      example: 'Join neighborhood Facebook groups, share grooming tips, offer seasonal discounts'
    },
    {
      id: 'free_haircut_campaign',
      title: 'Free Haircut Campaign',
      description: 'Offer free services to build your portfolio and gain referrals',
      example: 'Free haircuts for first-time clients in exchange for social media posts'
    },
    {
      id: 'promo_cards',
      title: 'Promo Cards',
      description: 'Physical cards with special offers distributed in strategic locations',
      example: 'Business cards with "20% off first visit" at coffee shops and gyms'
    }
  ],
  shop: [
    {
      id: 'review_campaigns',
      title: 'Review Campaigns',
      description: 'Systematic approach to collecting and leveraging customer reviews',
      example: 'Follow-up texts asking for Google reviews, incentivize with small discounts'
    },
    {
      id: 'referral_program',
      title: 'Referral Program',
      description: 'Reward existing clients for bringing in new customers',
      example: '$10 credit for both referrer and new client, trackable referral codes'
    },
    {
      id: 'seasonal_promotions',
      title: 'Seasonal Promotions',
      description: 'Time-limited offers that create urgency and drive bookings',
      example: 'Back-to-school specials, holiday grooming packages, summer beard maintenance'
    }
  ],
  enterprise: [
    {
      id: 'brand_duplication',
      title: 'Brand Campaign Duplication',
      description: 'Replicate successful campaigns across all locations with local customization',
      example: 'Template campaigns adapted for each market while maintaining brand consistency'
    },
    {
      id: 'corporate_partnerships',
      title: 'Corporate Partnerships',
      description: 'Partner with local businesses to offer employee grooming services',
      example: 'Monthly corporate packages for offices, event grooming services'
    },
    {
      id: 'multi_location_loyalty',
      title: 'Multi-Location Loyalty Program',
      description: 'Rewards program that works across all your locations',
      example: 'Points earned at any location, VIP tiers, location-specific bonuses'
    }
  ]
};

export default function MarketingWorksheet({
  userId,
  businessType,
  onSave,
  initialData,
  readonly = false
}: MarketingWorksheetProps) {
  const [campaign, setCampaign] = useState<MarketingCampaign>(initialData || {
    strategy: '',
    description: '',
    targetAudience: '',
    timeline: '',
    budget: '',
    successMetrics: '',
    actionSteps: ['', '', '']
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const strategies = MARKETING_STRATEGIES[businessType];

  const updateCampaign = (field: keyof MarketingCampaign, value: string | string[]) => {
    if (readonly) return;

    setCampaign(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateActionStep = (index: number, value: string) => {
    if (readonly) return;

    const updatedSteps = [...campaign.actionSteps];
    updatedSteps[index] = value;
    updateCampaign('actionSteps', updatedSteps);
  };

  const selectStrategy = (strategyId: string) => {
    if (readonly) return;

    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      setCampaign(prev => ({
        ...prev,
        strategy: strategy.title,
        description: strategy.description
      }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(campaign);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save marketing worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStatus = () => {
    const requiredFields = [
      campaign.strategy,
      campaign.description,
      campaign.targetAudience,
      campaign.timeline,
      campaign.successMetrics
    ];
    const actionStepsComplete = campaign.actionSteps.filter(step => step.trim()).length;

    const completed = requiredFields.filter(field => field.trim()).length + actionStepsComplete;
    const total = requiredFields.length + 3; // 3 action steps

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
                30-Day Grassroots Marketing Campaign
              </CardTitle>
              <p className="text-text-secondary">
                Pick one grassroots campaign to test in the next 30 days
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

      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-tomb45-green" />
            Choose Your Strategy
          </CardTitle>
          <p className="text-text-secondary text-sm">
            Select one of these proven {businessType} marketing strategies to focus on
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className={`cursor-pointer transition-all duration-200 ${
                  campaign.strategy === strategy.title
                    ? 'border-tomb45-green bg-tomb45-green/5'
                    : 'border-border-primary hover:border-tomb45-green/50'
                } ${readonly ? 'cursor-default' : ''}`}
                onClick={() => !readonly && selectStrategy(strategy.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-text-primary">{strategy.title}</h3>
                    {campaign.strategy === strategy.title && (
                      <CheckCircle className="w-4 h-4 text-tomb45-green" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-3">{strategy.description}</p>
                  <div className="bg-background-primary p-2 rounded border border-border-primary">
                    <p className="text-xs text-text-muted">
                      <strong>Example:</strong> {strategy.example}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      {campaign.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-tomb45-green" />
              Campaign Details: {campaign.strategy}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <Label htmlFor="description">Campaign Description</Label>
              <Textarea
                id="description"
                placeholder="Describe how you'll implement this strategy in your specific situation..."
                value={campaign.description}
                onChange={(e) => updateCampaign('description', e.target.value)}
                className="mt-2"
                disabled={readonly}
                rows={3}
              />
            </div>

            {/* Target Audience */}
            <div>
              <Label htmlFor="target-audience">Target Audience</Label>
              <Input
                id="target-audience"
                placeholder="Who are you trying to reach? (e.g., young professionals, families, etc.)"
                value={campaign.targetAudience}
                onChange={(e) => updateCampaign('targetAudience', e.target.value)}
                className="mt-2"
                disabled={readonly}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timeline */}
              <div>
                <Label htmlFor="timeline">30-Day Timeline</Label>
                <Input
                  id="timeline"
                  placeholder="Week 1: ..., Week 2: ..."
                  value={campaign.timeline}
                  onChange={(e) => updateCampaign('timeline', e.target.value)}
                  className="mt-2"
                  disabled={readonly}
                />
              </div>

              {/* Budget */}
              <div>
                <Label htmlFor="budget">Budget (if any)</Label>
                <Input
                  id="budget"
                  placeholder="$0 - $500"
                  value={campaign.budget}
                  onChange={(e) => updateCampaign('budget', e.target.value)}
                  className="mt-2"
                  disabled={readonly}
                />
              </div>
            </div>

            {/* Success Metrics */}
            <div>
              <Label htmlFor="success-metrics">Success Metrics</Label>
              <Input
                id="success-metrics"
                placeholder="How will you measure success? (e.g., 10 new clients, 50 social media followers)"
                value={campaign.successMetrics}
                onChange={(e) => updateCampaign('successMetrics', e.target.value)}
                className="mt-2"
                disabled={readonly}
              />
            </div>

            {/* Action Steps */}
            <div>
              <Label>3 Key Action Steps</Label>
              <div className="space-y-3 mt-2">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-tomb45-green rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <Input
                      placeholder={`Action step ${index + 1}...`}
                      value={campaign.actionSteps[index] || ''}
                      onChange={(e) => updateActionStep(index, e.target.value)}
                      className="flex-1"
                      disabled={readonly}
                    />
                  </div>
                ))}
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
            {isSaving ? 'Saving...' : 'Save Campaign Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}