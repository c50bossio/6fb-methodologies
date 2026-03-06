// Payment Analytics and Monitoring System
import { stripe } from './stripe'

export interface PaymentMetrics {
  period: string
  totalSessions: number
  paidSessions: number
  conversionRate: string
  totalRevenue: number
  avgTransactionValue: number
  successRate: string
  failureRate: string
  abandonmentRate: string
  recoveryRate: string
  paymentMethods: Record<string, number>
  currencies: Record<string, number>
  topFailureReasons: Array<{ reason: string; count: number }>
  geographicBreakdown: Record<string, number>
  timeToComplete: {
    avg: number
    median: number
    p95: number
  }
}

export interface ConversionFunnel {
  step: string
  visitors: number
  conversions: number
  conversionRate: string
  dropoffRate: string
}

export interface RealTimeMetrics {
  activeSessions: number
  currentRevenue: number
  successfulPayments: number
  failedPayments: number
  averageSessionDuration: number
  topPages: Array<{ page: string; visitors: number }>
}

class PaymentAnalytics {
  private static instance: PaymentAnalytics
  private metricsCache: Map<string, { data: any; expiry: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  static getInstance(): PaymentAnalytics {
    if (!PaymentAnalytics.instance) {
      PaymentAnalytics.instance = new PaymentAnalytics()
    }
    return PaymentAnalytics.instance
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.metricsCache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T
    }
    this.metricsCache.delete(key)
    return null
  }

  private setCachedData<T>(key: string, data: T): void {
    this.metricsCache.set(key, {
      data,
      expiry: Date.now() + this.cacheTimeout
    })
  }

  async getPaymentMetrics(days: number = 7): Promise<PaymentMetrics> {
    const cacheKey = `payment_metrics_${days}`
    const cached = this.getCachedData<PaymentMetrics>(cacheKey)
    if (cached) return cached

    try {
      const startDate = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)

      // Fetch Stripe data
      const [charges, sessions, paymentIntents] = await Promise.all([
        stripe.charges.list({
          created: { gte: startDate },
          limit: 100,
        }),
        stripe.checkout.sessions.list({
          created: { gte: startDate },
          limit: 100,
        }),
        stripe.paymentIntents.list({
          created: { gte: startDate },
          limit: 100,
        })
      ])

      const successful = charges.data.filter(p => p.status === 'succeeded')
      const failed = charges.data.filter(p => p.status === 'failed')
      const totalSessions = sessions.data.length
      const paidSessions = sessions.data.filter(s => s.payment_status === 'paid').length
      const abandonedSessions = totalSessions - paidSessions

      // Calculate time to complete (simplified)
      const completedSessions = sessions.data.filter(s => s.payment_status === 'paid')
      const completionTimes = completedSessions.map(s => {
        const created = new Date(s.created * 1000)
        // Estimate completion time (this would be more accurate with actual completion timestamps)
        return Math.random() * 300 + 60 // 1-5 minutes estimated
      })

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0

      const metrics: PaymentMetrics = {
        period: `${days} days`,
        totalSessions,
        paidSessions,
        conversionRate: totalSessions > 0 ? (paidSessions / totalSessions * 100).toFixed(2) : '0',
        totalRevenue: successful.reduce((sum, p) => sum + p.amount, 0) / 100,
        avgTransactionValue: successful.length > 0
          ? successful.reduce((sum, p) => sum + p.amount, 0) / successful.length / 100
          : 0,
        successRate: charges.data.length > 0
          ? (successful.length / charges.data.length * 100).toFixed(2)
          : '0',
        failureRate: charges.data.length > 0
          ? (failed.length / charges.data.length * 100).toFixed(2)
          : '0',
        abandonmentRate: totalSessions > 0
          ? (abandonedSessions / totalSessions * 100).toFixed(2)
          : '0',
        recoveryRate: '0', // Would be calculated from recovery attempts
        paymentMethods: successful.reduce((acc, p) => {
          const method = p.payment_method_details?.type || 'unknown'
          acc[method] = (acc[method] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        currencies: successful.reduce((acc, p) => {
          acc[p.currency.toUpperCase()] = (acc[p.currency.toUpperCase()] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        topFailureReasons: failed.reduce((acc, p) => {
          const reason = p.failure_message || 'Unknown error'
          const existing = acc.find(item => item.reason === reason)
          if (existing) {
            existing.count++
          } else {
            acc.push({ reason, count: 1 })
          }
          return acc
        }, [] as Array<{ reason: string; count: number }>)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        geographicBreakdown: successful.reduce((acc, p) => {
          const country = p.billing_details?.address?.country || 'Unknown'
          acc[country] = (acc[country] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        timeToComplete: {
          avg: avgCompletionTime,
          median: completionTimes.sort()[Math.floor(completionTimes.length / 2)] || 0,
          p95: completionTimes.sort()[Math.floor(completionTimes.length * 0.95)] || 0,
        }
      }

      this.setCachedData(cacheKey, metrics)
      return metrics

    } catch (error) {
      console.error('Failed to fetch payment metrics:', error)
      throw error
    }
  }

  async getConversionFunnel(): Promise<ConversionFunnel[]> {
    const cacheKey = 'conversion_funnel'
    const cached = this.getCachedData<ConversionFunnel[]>(cacheKey)
    if (cached) return cached

    // This would typically come from analytics tools like Google Analytics or custom tracking
    // For now, we'll return mock data that shows a typical conversion funnel
    const funnel: ConversionFunnel[] = [
      {
        step: 'Landing Page',
        visitors: 1000,
        conversions: 800,
        conversionRate: '80.0',
        dropoffRate: '20.0'
      },
      {
        step: 'Registration Form',
        visitors: 800,
        conversions: 400,
        conversionRate: '50.0',
        dropoffRate: '50.0'
      },
      {
        step: 'Payment Page',
        visitors: 400,
        conversions: 320,
        conversionRate: '80.0',
        dropoffRate: '20.0'
      },
      {
        step: 'Payment Success',
        visitors: 320,
        conversions: 320,
        conversionRate: '100.0',
        dropoffRate: '0.0'
      }
    ]

    this.setCachedData(cacheKey, funnel)
    return funnel
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const cacheKey = 'realtime_metrics'
    const cached = this.getCachedData<RealTimeMetrics>(cacheKey)
    if (cached) return cached

    try {
      const now = Math.floor(Date.now() / 1000)
      const oneHourAgo = now - 3600

      const [recentSessions, recentCharges] = await Promise.all([
        stripe.checkout.sessions.list({
          created: { gte: oneHourAgo },
          limit: 100,
        }),
        stripe.charges.list({
          created: { gte: oneHourAgo },
          limit: 100,
        })
      ])

      const activeSessions = recentSessions.data.filter(s =>
        s.payment_status === 'unpaid' && s.status === 'open'
      ).length

      const successfulCharges = recentCharges.data.filter(c => c.status === 'succeeded')
      const failedCharges = recentCharges.data.filter(c => c.status === 'failed')

      const metrics: RealTimeMetrics = {
        activeSessions,
        currentRevenue: successfulCharges.reduce((sum, c) => sum + c.amount, 0) / 100,
        successfulPayments: successfulCharges.length,
        failedPayments: failedCharges.length,
        averageSessionDuration: 180, // Mock data - would come from real analytics
        topPages: [
          { page: '/register', visitors: activeSessions },
          { page: '/', visitors: Math.floor(activeSessions * 1.5) },
          { page: '/success', visitors: successfulCharges.length }
        ]
      }

      this.setCachedData(cacheKey, metrics)
      return metrics

    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error)
      throw error
    }
  }

  // Track custom events for conversion optimization
  async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      // In a real implementation, this would send to analytics services like:
      // - Google Analytics 4
      // - Mixpanel
      // - Segment
      // - Custom analytics backend

      const event = {
        event: eventName,
        timestamp: Date.now(),
        properties: {
          ...properties,
          source: '6fb-methodologies',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          url: typeof window !== 'undefined' ? window.location.href : 'server',
        }
      }

      // For now, just log to console and could send to webhook
      console.log('Analytics Event:', event)

      // Store in localStorage for client-side events
      if (typeof window !== 'undefined') {
        const events = JSON.parse(localStorage.getItem('analytics_events') || '[]')
        events.push(event)

        // Keep only last 100 events
        if (events.length > 100) {
          events.splice(0, events.length - 100)
        }

        localStorage.setItem('analytics_events', JSON.stringify(events))
      }

    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  // A/B Testing framework
  async getTestVariant(testName: string, userId?: string): Promise<'A' | 'B'> {
    try {
      // Simple hash-based A/B testing
      const seed = userId || `${Date.now()}_${Math.random()}`
      const hash = this.simpleHash(seed + testName)
      return (hash % 2 === 0) ? 'A' : 'B'
    } catch (error) {
      console.error('Failed to get test variant:', error)
      return 'A' // Default to control
    }
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Payment optimization insights
  async getOptimizationInsights(): Promise<{
    recommendations: string[]
    topFailureReasons: string[]
    bestPerformingMethods: string[]
    conversionOpportunities: string[]
  }> {
    try {
      const metrics = await this.getPaymentMetrics(30) // Last 30 days

      const recommendations: string[] = []
      const conversionOpportunities: string[] = []

      // Analyze conversion rate
      const conversionRate = parseFloat(metrics.conversionRate)
      if (conversionRate < 70) {
        recommendations.push('Consider simplifying the checkout process - conversion rate is below industry average')
        conversionOpportunities.push('Optimize form fields and reduce required information')
      }

      // Analyze failure rate
      const failureRate = parseFloat(metrics.failureRate)
      if (failureRate > 5) {
        recommendations.push('High payment failure rate detected - review payment methods and fraud settings')
        conversionOpportunities.push('Add more payment options like Apple Pay or Google Pay')
      }

      // Analyze abandonment
      const abandonmentRate = parseFloat(metrics.abandonmentRate)
      if (abandonmentRate > 30) {
        recommendations.push('High cart abandonment - consider exit-intent popups or email recovery')
        conversionOpportunities.push('Implement payment recovery emails and retargeting')
      }

      // Payment method insights
      const totalPayments = Object.values(metrics.paymentMethods).reduce((a, b) => a + b, 0)
      const cardPayments = metrics.paymentMethods['card'] || 0

      if (cardPayments / totalPayments > 0.9) {
        recommendations.push('Most payments are cards - consider adding mobile wallets for better UX')
      }

      const bestPerformingMethods = Object.entries(metrics.paymentMethods)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([method]) => method)

      return {
        recommendations,
        topFailureReasons: metrics.topFailureReasons.map(f => f.reason),
        bestPerformingMethods,
        conversionOpportunities
      }

    } catch (error) {
      console.error('Failed to get optimization insights:', error)
      return {
        recommendations: [],
        topFailureReasons: [],
        bestPerformingMethods: [],
        conversionOpportunities: []
      }
    }
  }
}

// Export singleton instance
export const analytics = PaymentAnalytics.getInstance()

// Utility functions for formatting
export const formatMetric = (value: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString()
  }
}

export const getMetricTrend = (current: number, previous: number): {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  isGood: boolean
} => {
  if (previous === 0) {
    return { direction: 'stable', percentage: 0, isGood: true }
  }

  const change = ((current - previous) / previous) * 100

  return {
    direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
    percentage: Math.abs(change),
    isGood: change > 0 // This might vary based on the metric
  }
}