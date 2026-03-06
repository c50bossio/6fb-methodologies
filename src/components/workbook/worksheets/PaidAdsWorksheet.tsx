'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { CheckCircle, Target, DollarSign, Users, BarChart, Save } from 'lucide-react';

interface AdCampaign {
  objective: string;
  targetAudience: string;
  adPlatform: string;
  budget: string;
  adCreative: string;
  callToAction: string;
  landingPage: string;
  trackingSetup: string;
  successMetrics: string;
}

interface PaidAdsWorksheetProps {
  userId: string;
  businessType: 'barber' | 'shop' | 'enterprise';
  onSave: (data: AdCampaign) => void;
  initialData?: AdCampaign;
  readonly?: boolean;
}

const AD_OBJECTIVES = {
  barber: [
    { value: 'bookings', label: 'Get More Bookings', description: 'Drive direct appointment bookings' },
    { value: 'awareness', label: 'Build Local Awareness', description: 'Get known in your neighborhood' },
    { value: 'portfolio', label: 'Showcase Work', description: 'Display before/after photos' }
  ],
  shop: [
    { value: 'fill_chairs', label: 'Fill Empty Chairs', description: 'Maximize chair utilization' },
    { value: 'new_clients', label: 'Acquire New Clients', description: 'Expand customer base' },
    { value: 'premium_services', label: 'Promote Premium Services', description: 'Upsell higher-value services' }
  ],
  enterprise: [
    { value: 'scale_locations', label: 'Scale Across Locations', description: 'Replicate successful campaigns' },
    { value: 'roi_optimization', label: 'ROI Optimization', description: 'Maximize return on ad spend' },
    { value: 'brand_consistency', label: 'Brand Consistency', description: 'Maintain unified messaging' }
  ]
};

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook & Instagram', budget: '$10-50/day' },
  { value: 'google', label: 'Google Ads', budget: '$20-100/day' },
  { value: 'tiktok', label: 'TikTok', budget: '$5-30/day' },
  { value: 'youtube', label: 'YouTube', budget: '$15-75/day' }
];

export default function PaidAdsWorksheet({
  userId,
  businessType,
  onSave,
  initialData,
  readonly = false
}: PaidAdsWorksheetProps) {
  const [campaign, setCampaign] = useState<AdCampaign>(initialData || {
    objective: '',
    targetAudience: '',
    adPlatform: '',
    budget: '',
    adCreative: '',
    callToAction: '',
    landingPage: '',
    trackingSetup: '',
    successMetrics: ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const objectives = AD_OBJECTIVES[businessType];

  const updateCampaign = (field: keyof AdCampaign, value: string) => {
    if (readonly) return;

    setCampaign(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (readonly) return;

    setIsSaving(true);
    try {
      await onSave(campaign);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save paid ads worksheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStatus = () => {
    const requiredFields = [
      campaign.objective,
      campaign.targetAudience,
      campaign.adPlatform,
      campaign.budget,
      campaign.adCreative,
      campaign.callToAction,
      campaign.successMetrics
    ];

    const completed = requiredFields.filter(field => field.trim()).length;
    const total = requiredFields.length;

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
                One Campaign Framework
              </CardTitle>
              <p className="text-text-secondary">
                Step-by-step playbook for running profitable {businessType} ads
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

      {/* Campaign Objective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-tomb45-green" />
            1. Campaign Objective
          </CardTitle>
          <p className="text-text-secondary text-sm">
            What's the primary goal of your ad campaign?
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {objectives.map((objective) => (
              <Card
                key={objective.value}
                className={`cursor-pointer transition-all duration-200 ${
                  campaign.objective === objective.value
                    ? 'border-tomb45-green bg-tomb45-green/5'
                    : 'border-border-primary hover:border-tomb45-green/50'
                } ${readonly ? 'cursor-default' : ''}`}
                onClick={() => !readonly && updateCampaign('objective', objective.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-text-primary">{objective.label}</h3>
                    {campaign.objective === objective.value && (
                      <CheckCircle className="w-4 h-4 text-tomb45-green" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{objective.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-tomb45-green" />
            2. Target Audience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="target-audience">Describe your ideal customer</Label>
          <Textarea
            id="target-audience"
            placeholder="Age range, location, interests, behaviors, pain points..."
            value={campaign.targetAudience}
            onChange={(e) => updateCampaign('targetAudience', e.target.value)}
            className="mt-2"
            disabled={readonly}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Platform & Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-tomb45-green" />
            3. Platform & Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Choose Your Platform</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {PLATFORMS.map((platform) => (
                <Card
                  key={platform.value}
                  className={`cursor-pointer transition-all duration-200 ${
                    campaign.adPlatform === platform.value
                      ? 'border-tomb45-green bg-tomb45-green/5'
                      : 'border-border-primary hover:border-tomb45-green/50'
                  } ${readonly ? 'cursor-default' : ''}`}
                  onClick={() => !readonly && updateCampaign('adPlatform', platform.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-text-primary">{platform.label}</h3>
                        <p className="text-sm text-text-secondary">{platform.budget}</p>
                      </div>
                      {campaign.adPlatform === platform.value && (
                        <CheckCircle className="w-4 h-4 text-tomb45-green" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="budget">Your Daily Budget</Label>
            <Input
              id="budget"
              placeholder="e.g., $25/day"
              value={campaign.budget}
              onChange={(e) => updateCampaign('budget', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ad Creative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-tomb45-green" />
            4. Ad Creative & Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="ad-creative">Ad Creative Description</Label>
            <Textarea
              id="ad-creative"
              placeholder="Describe your ad visuals, copy, and overall message. What will grab attention?"
              value={campaign.adCreative}
              onChange={(e) => updateCampaign('adCreative', e.target.value)}
              className="mt-2"
              disabled={readonly}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="cta">Call to Action</Label>
            <Input
              id="cta"
              placeholder="e.g., 'Book Now', 'Learn More', 'Get 20% Off'"
              value={campaign.callToAction}
              onChange={(e) => updateCampaign('callToAction', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>

          <div>
            <Label htmlFor="landing-page">Landing Page / Destination</Label>
            <Input
              id="landing-page"
              placeholder="Where will people go when they click? (booking page, website, etc.)"
              value={campaign.landingPage}
              onChange={(e) => updateCampaign('landingPage', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking & Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-tomb45-green" />
            5. Tracking & Success Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="tracking">Tracking Setup</Label>
            <Textarea
              id="tracking"
              placeholder="How will you track results? (Facebook Pixel, Google Analytics, booking system, etc.)"
              value={campaign.trackingSetup}
              onChange={(e) => updateCampaign('trackingSetup', e.target.value)}
              className="mt-2"
              disabled={readonly}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="success-metrics">Success Metrics</Label>
            <Input
              id="success-metrics"
              placeholder="e.g., 'Cost per booking under $15', '20 new clients in 30 days'"
              value={campaign.successMetrics}
              onChange={(e) => updateCampaign('successMetrics', e.target.value)}
              className="mt-2"
              disabled={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaign Summary */}
      {campaign.objective && campaign.adPlatform && (
        <Card className="bg-tomb45-green/5 border-tomb45-green/20">
          <CardHeader>
            <CardTitle className="text-tomb45-green">Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Objective:</strong> {objectives.find(obj => obj.value === campaign.objective)?.label}</p>
              <p><strong>Platform:</strong> {PLATFORMS.find(platform => platform.value === campaign.adPlatform)?.label}</p>
              <p><strong>Budget:</strong> {campaign.budget}</p>
              <p><strong>Target:</strong> {campaign.targetAudience}</p>
              <p><strong>CTA:</strong> {campaign.callToAction}</p>
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
            {isSaving ? 'Saving...' : 'Save Campaign Framework'}
          </Button>
        </div>
      )}
    </div>
  );
}