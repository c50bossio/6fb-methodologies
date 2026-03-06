/**
 * A/B Testing Framework for 6FB Workshop Optimization
 *
 * Comprehensive A/B testing system with statistical significance tracking
 * and conversion optimization for workshop registration.
 */

import { analytics } from './analytics'

export interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  variants: ABVariant[]
  allocation: Record<string, number> // percentage allocation per variant
  startDate: Date
  endDate?: Date
  targetMetric: string
  targetSample: number
  confidence: number // e.g., 95 for 95% confidence
  currentSample: number
  results?: ABTestResults
}

export interface ABVariant {
  id: string
  name: string
  description: string
  config: Record<string, any>
  isControl: boolean
}

export interface ABTestResults {
  isSignificant: boolean
  winningVariant?: string
  confidenceLevel: number
  conversionRates: Record<string, number>
  sampleSizes: Record<string, number>
  pValue: number
  effect: number // percentage improvement
}

export interface ExperimentConfig {
  testId: string
  userId?: string
  sessionId?: string
  segment?: string
  metadata?: Record<string, any>
}

class ABTestingFramework {
  private static instance: ABTestingFramework
  private tests: Map<string, ABTest> = new Map()
  private userAssignments: Map<string, Record<string, string>> = new Map()

  static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework()
    }
    return ABTestingFramework.instance
  }

  constructor() {
    this.initializeDefaultTests()
  }

  private initializeDefaultTests() {
    // Workshop-specific A/B tests
    const checkoutFlowTest: ABTest = {
      id: 'checkout_flow_optimization',
      name: 'Checkout Flow Optimization',
      description: 'Test simplified 2-step vs detailed 3-step registration',
      status: 'active',
      variants: [
        {
          id: 'control',
          name: 'Current 2-Step Flow',
          description: 'Existing quick details + payment flow',
          config: { steps: 2, showBusinessDetails: false },
          isControl: true
        },
        {
          id: 'detailed',
          name: '3-Step Detailed Flow',
          description: 'Personal info + business details + payment',
          config: { steps: 3, showBusinessDetails: true },
          isControl: false
        }
      ],
      allocation: { control: 50, detailed: 50 },
      startDate: new Date('2024-01-01'),
      targetMetric: 'registration_conversion',
      targetSample: 1000,
      confidence: 95,
      currentSample: 0
    }

    const pricingDisplayTest: ABTest = {
      id: 'pricing_display_optimization',
      name: 'Pricing Display Optimization',
      description: 'Test showing savings amount vs percentage discount',
      status: 'active',
      variants: [
        {
          id: 'control_percentage',
          name: 'Percentage Discount',
          description: 'Show "20% off" for member discount',
          config: { showSavingsAs: 'percentage' },
          isControl: true
        },
        {
          id: 'dollar_amount',
          name: 'Dollar Amount Savings',
          description: 'Show "$100 saved" for member discount',
          config: { showSavingsAs: 'dollar' },
          isControl: false
        }
      ],
      allocation: { control_percentage: 50, dollar_amount: 50 },
      startDate: new Date('2024-01-01'),
      targetMetric: 'member_verification_rate',
      targetSample: 500,
      confidence: 95,
      currentSample: 0
    }

    const urgencyMessagingTest: ABTest = {
      id: 'urgency_messaging_test',
      name: 'Urgency Messaging Effectiveness',
      description: 'Test different urgency messages for conversion',
      status: 'active',
      variants: [
        {
          id: 'spots_remaining',
          name: 'Spots Remaining',
          description: 'Show "Only X spots remaining"',
          config: {
            urgencyType: 'spots',
            message: 'Only {count} spots remaining - Secure yours now!'
          },
          isControl: true
        },
        {
          id: 'time_limited',
          name: 'Time Limited',
          description: 'Show time-based urgency',
          config: {
            urgencyType: 'time',
            message: 'Early bird pricing ends in {time} - Register now!'
          },
          isControl: false
        },
        {
          id: 'social_proof',
          name: 'Social Proof',
          description: 'Show recent registrations',
          config: {
            urgencyType: 'social',
            message: '{count} barbers registered in the last 24 hours!'
          },
          isControl: false
        }
      ],
      allocation: { spots_remaining: 40, time_limited: 30, social_proof: 30 },
      startDate: new Date('2024-01-01'),
      targetMetric: 'landing_page_conversion',
      targetSample: 2000,
      confidence: 95,
      currentSample: 0
    }

    this.tests.set(checkoutFlowTest.id, checkoutFlowTest)
    this.tests.set(pricingDisplayTest.id, pricingDisplayTest)
    this.tests.set(urgencyMessagingTest.id, urgencyMessagingTest)
  }

  // Get user's variant for a specific test
  public getVariant(testId: string, config: ExperimentConfig): string {
    const test = this.tests.get(testId)
    if (!test || test.status !== 'active') {
      return this.getControlVariant(testId)
    }

    const userId = config.userId || config.sessionId || 'anonymous'

    // Check if user already has an assignment
    const userAssignments = this.userAssignments.get(userId) || {}
    if (userAssignments[testId]) {
      return userAssignments[testId]
    }

    // Assign user to variant based on hash
    const variant = this.assignUserToVariant(testId, userId)

    // Store assignment
    userAssignments[testId] = variant
    this.userAssignments.set(userId, userAssignments)

    // Track assignment
    this.trackExperimentAssignment(testId, variant, config)

    return variant
  }

  private assignUserToVariant(testId: string, userId: string): string {
    const test = this.tests.get(testId)
    if (!test) return 'control'

    // Generate consistent hash for user + test
    const hash = this.generateHash(userId + testId)
    const bucket = hash % 100

    // Allocate based on percentage splits
    let cumulative = 0
    for (const [variantId, percentage] of Object.entries(test.allocation)) {
      cumulative += percentage
      if (bucket < cumulative) {
        return variantId
      }
    }

    // Fallback to control
    return test.variants.find(v => v.isControl)?.id || test.variants[0].id
  }

  private generateHash(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getControlVariant(testId: string): string {
    const test = this.tests.get(testId)
    return test?.variants.find(v => v.isControl)?.id || 'control'
  }

  // Track experiment assignment
  private trackExperimentAssignment(testId: string, variant: string, config: ExperimentConfig) {
    console.log({
      event: 'experiment_assignment',
      event_category: 'ab_testing',
      event_action: 'user_assigned',
      event_label: `${testId}_${variant}`,
      custom_parameters: {
        test_id: testId,
        variant_id: variant,
        user_id: config.userId,
        session_id: config.sessionId,
        segment: config.segment,
        metadata: config.metadata
      }
    })
  }

  // Track experiment conversion
  public trackConversion(testId: string, variant: string, metric: string, value?: number) {
    console.log({
      event: 'experiment_conversion',
      event_category: 'ab_testing',
      event_action: 'conversion',
      event_label: `${testId}_${variant}_${metric}`,
      value: value,
      custom_parameters: {
        test_id: testId,
        variant_id: variant,
        metric: metric,
        conversion_value: value
      }
    })

    // Update test sample size
    const test = this.tests.get(testId)
    if (test) {
      test.currentSample++
      this.tests.set(testId, test)
    }
  }

  // Get variant configuration
  public getVariantConfig(testId: string, variant: string): Record<string, any> {
    const test = this.tests.get(testId)
    if (!test) return {}

    const variantData = test.variants.find(v => v.id === variant)
    return variantData?.config || {}
  }

  // Check if test has reached statistical significance
  public async checkStatisticalSignificance(testId: string): Promise<ABTestResults | null> {
    const test = this.tests.get(testId)
    if (!test || test.currentSample < 100) return null

    // In a real implementation, this would:
    // 1. Query your analytics database for conversion data
    // 2. Calculate statistical significance using proper formulas
    // 3. Return results with confidence intervals

    // Mock calculation for demonstration
    const mockResults: ABTestResults = {
      isSignificant: test.currentSample > test.targetSample * 0.5,
      winningVariant: 'control',
      confidenceLevel: 95,
      conversionRates: {
        control: 3.2,
        detailed: 4.1
      },
      sampleSizes: {
        control: Math.floor(test.currentSample * 0.5),
        detailed: Math.floor(test.currentSample * 0.5)
      },
      pValue: 0.032,
      effect: 28.1 // 28.1% improvement
    }

    test.results = mockResults
    this.tests.set(testId, test)

    return mockResults
  }

  // Get all active tests
  public getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'active')
  }

  // Get test by ID
  public getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId)
  }

  // Update test status
  public updateTestStatus(testId: string, status: ABTest['status']) {
    const test = this.tests.get(testId)
    if (test) {
      test.status = status
      if (status === 'completed') {
        test.endDate = new Date()
      }
      this.tests.set(testId, test)
    }
  }
}

// Convenience hooks for React components
export const useABTest = (testId: string, config?: Partial<ExperimentConfig>) => {
  const framework = ABTestingFramework.getInstance()

  const fullConfig: ExperimentConfig = {
    testId,
    userId: config?.userId,
    sessionId: config?.sessionId || generateSessionId(),
    segment: config?.segment,
    metadata: config?.metadata
  }

  const variant = framework.getVariant(testId, fullConfig)
  const variantConfig = framework.getVariantConfig(testId, variant)

  const trackConversion = (metric: string, value?: number) => {
    framework.trackConversion(testId, variant, metric, value)
  }

  return {
    variant,
    config: variantConfig,
    trackConversion,
    isActive: framework.getTest(testId)?.status === 'active'
  }
}

// Utility function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Export singleton
export const abTesting = ABTestingFramework.getInstance()

// Workshop-specific A/B testing hooks
export const useCheckoutFlowTest = (userId?: string) => {
  return useABTest('checkout_flow_optimization', { userId })
}

export const usePricingDisplayTest = (userId?: string) => {
  return useABTest('pricing_display_optimization', { userId })
}

export const useUrgencyMessagingTest = (userId?: string) => {
  return useABTest('urgency_messaging_test', { userId })
}