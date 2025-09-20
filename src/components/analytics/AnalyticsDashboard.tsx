/**
 * Real-time Analytics Dashboard for 6FB Workshop
 *
 * Comprehensive analytics dashboard for monitoring conversion metrics,
 * user behavior, and performance optimization in real-time.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  MousePointer,
  Smartphone,
  Monitor,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';

interface AnalyticsMetric {
  label: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  format: 'number' | 'percentage' | 'currency' | 'time';
  icon: any;
}

interface ConversionFunnelData {
  step: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropOffRate: number;
}

interface UserSegmentData {
  segment: string;
  users: number;
  conversionRate: number;
  averageValue: number;
}

interface TrafficSourceData {
  source: string;
  sessions: number;
  conversionRate: number;
  revenue: number;
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data - in production, this would come from your analytics API
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([
    {
      label: 'Total Visitors',
      value: 2847,
      change: 12.5,
      changeType: 'increase',
      format: 'number',
      icon: Users,
    },
    {
      label: 'Conversion Rate',
      value: 3.2,
      change: -0.3,
      changeType: 'decrease',
      format: 'percentage',
      icon: Target,
    },
    {
      label: 'Revenue',
      value: 45680,
      change: 18.7,
      changeType: 'increase',
      format: 'currency',
      icon: DollarSign,
    },
    {
      label: 'Avg. Session Duration',
      value: '4m 32s',
      change: 8.9,
      changeType: 'increase',
      format: 'time',
      icon: Clock,
    },
    {
      label: 'Mobile Conversion',
      value: 2.8,
      change: 5.2,
      changeType: 'increase',
      format: 'percentage',
      icon: Smartphone,
    },
    {
      label: 'Desktop Conversion',
      value: 4.1,
      change: -2.1,
      changeType: 'decrease',
      format: 'percentage',
      icon: Monitor,
    },
  ]);

  const [funnelData] = useState<ConversionFunnelData[]>([
    {
      step: 'Landing Page View',
      visitors: 2847,
      conversions: 2847,
      conversionRate: 100,
      dropOffRate: 0,
    },
    {
      step: 'Registration Started',
      visitors: 2847,
      conversions: 1423,
      conversionRate: 50.0,
      dropOffRate: 50.0,
    },
    {
      step: 'Step 1 Completed',
      visitors: 1423,
      conversions: 1138,
      conversionRate: 80.0,
      dropOffRate: 20.0,
    },
    {
      step: 'Payment Initiated',
      visitors: 1138,
      conversions: 796,
      conversionRate: 69.9,
      dropOffRate: 30.1,
    },
    {
      step: 'Purchase Completed',
      visitors: 796,
      conversions: 91,
      conversionRate: 11.4,
      dropOffRate: 88.6,
    },
  ]);

  const [userSegments] = useState<UserSegmentData[]>([
    {
      segment: 'Individual Barbers',
      users: 1521,
      conversionRate: 2.8,
      averageValue: 497,
    },
    {
      segment: 'Shop Owners',
      users: 892,
      conversionRate: 4.1,
      averageValue: 497,
    },
    {
      segment: 'Enterprise/Multiple Shops',
      users: 434,
      conversionRate: 6.2,
      averageValue: 497,
    },
    {
      segment: '6FB Members',
      users: 156,
      conversionRate: 15.4,
      averageValue: 397,
    },
  ]);

  const [trafficSources] = useState<TrafficSourceData[]>([
    { source: 'Direct', sessions: 1423, conversionRate: 4.2, revenue: 21340 },
    {
      source: 'Google Ads',
      sessions: 567,
      conversionRate: 5.8,
      revenue: 11420,
    },
    { source: 'Facebook', sessions: 423, conversionRate: 2.1, revenue: 4180 },
    { source: 'Instagram', sessions: 234, conversionRate: 3.4, revenue: 3960 },
    { source: 'YouTube', sessions: 156, conversionRate: 6.1, revenue: 3780 },
    { source: 'Email', sessions: 44, conversionRate: 18.2, revenue: 1000 },
  ]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, fetch real data from your analytics API
    // const data = await fetch(`/api/analytics?timeRange=${timeRange}`)

    setLastUpdated(new Date());
    setIsLoading(false);
  }, [timeRange]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return value.toString();
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUpRight className='w-4 h-4 text-green-500' />;
      case 'decrease':
        return <ArrowDownRight className='w-4 h-4 text-red-500' />;
      default:
        return <div className='w-4 h-4' />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-500';
      case 'decrease':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className='min-h-screen bg-background-primary p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-text-primary'>
              6FB Workshop Analytics
            </h1>
            <p className='text-text-secondary'>
              Real-time insights and conversion optimization metrics
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className='px-3 py-2 bg-background-accent border border-border-primary rounded-lg text-text-primary'
            >
              <option value='1h'>Last Hour</option>
              <option value='24h'>Last 24 Hours</option>
              <option value='7d'>Last 7 Days</option>
              <option value='30d'>Last 30 Days</option>
            </select>

            <Button
              onClick={refreshData}
              disabled={isLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className='text-sm text-text-muted'>
          Last updated: {lastUpdated.toLocaleString()}
        </div>

        {/* Key Metrics Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {metrics.map((metric, index) => (
            <Card key={index} className='border-border-primary'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <metric.icon className='w-5 h-5 text-tomb45-green' />
                    <span className='text-sm text-text-muted'>
                      {metric.label}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    {getChangeIcon(metric.changeType)}
                    <span
                      className={`text-sm ${getChangeColor(metric.changeType)}`}
                    >
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </div>
                <div className='mt-2'>
                  <div className='text-2xl font-bold text-text-primary'>
                    {formatValue(metric.value, metric.format)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Conversion Funnel */}
        <Card className='border-border-primary'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BarChart3 className='w-5 h-5 text-tomb45-green' />
              Conversion Funnel Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {funnelData.map((step, index) => (
                <div key={index} className='flex items-center gap-4'>
                  <div className='w-32 text-sm text-text-secondary'>
                    {step.step}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm text-text-primary'>
                        {step.conversions.toLocaleString()} visitors
                      </span>
                      <span className='text-sm text-text-muted'>
                        {step.conversionRate.toFixed(1)}% conversion
                      </span>
                    </div>
                    <div className='w-full bg-background-secondary rounded-full h-2'>
                      <div
                        className='bg-tomb45-green h-2 rounded-full transition-all duration-300'
                        style={{ width: `${step.conversionRate}%` }}
                      />
                    </div>
                    {step.dropOffRate > 0 && (
                      <div className='text-xs text-red-400 mt-1'>
                        {step.dropOffRate.toFixed(1)}% drop-off
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* User Segments */}
          <Card className='border-border-primary'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <PieChart className='w-5 h-5 text-tomb45-green' />
                User Segments Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {userSegments.map((segment, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 bg-background-secondary rounded-lg'
                  >
                    <div>
                      <div className='font-medium text-text-primary'>
                        {segment.segment}
                      </div>
                      <div className='text-sm text-text-muted'>
                        {segment.users.toLocaleString()} users
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium text-tomb45-green'>
                        {segment.conversionRate.toFixed(1)}%
                      </div>
                      <div className='text-sm text-text-muted'>
                        ${segment.averageValue} avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className='border-border-primary'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='w-5 h-5 text-tomb45-green' />
                Traffic Sources & ROI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {trafficSources.map((source, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 bg-background-secondary rounded-lg'
                  >
                    <div>
                      <div className='font-medium text-text-primary'>
                        {source.source}
                      </div>
                      <div className='text-sm text-text-muted'>
                        {source.sessions.toLocaleString()} sessions
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium text-tomb45-green'>
                        {formatValue(source.revenue, 'currency')}
                      </div>
                      <div className='text-sm text-text-muted'>
                        {source.conversionRate.toFixed(1)}% conv
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Alerts */}
        <Card className='border-yellow-500/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-yellow-500'>
              <TrendingDown className='w-5 h-5' />
              Performance Alerts & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg'>
                <div className='w-2 h-2 bg-yellow-500 rounded-full mt-2' />
                <div>
                  <div className='font-medium text-text-primary'>
                    High Drop-off at Payment Step
                  </div>
                  <div className='text-sm text-text-muted'>
                    88.6% of users abandon the payment step. Consider A/B
                    testing checkout flow simplification.
                  </div>
                </div>
              </div>

              <div className='flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg'>
                <div className='w-2 h-2 bg-blue-500 rounded-full mt-2' />
                <div>
                  <div className='font-medium text-text-primary'>
                    Email Traffic High Performance
                  </div>
                  <div className='text-sm text-text-muted'>
                    Email traffic shows 18.2% conversion rate. Consider
                    increasing email marketing budget.
                  </div>
                </div>
              </div>

              <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg'>
                <div className='w-2 h-2 bg-green-500 rounded-full mt-2' />
                <div>
                  <div className='font-medium text-text-primary'>
                    6FB Members Converting Well
                  </div>
                  <div className='text-sm text-text-muted'>
                    6FB members have 15.4% conversion rate. Focus on member
                    acquisition and verification flow.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
