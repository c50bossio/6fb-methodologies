/**
 * 6FB Workshop Analytics React Hooks
 *
 * Custom hooks for seamless analytics integration throughout the application
 */

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'
import { RegistrationData } from '@/types'

// Main analytics hook
export function useAnalytics() {
  const pathname = usePathname()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      // analytics.initialize()
      initialized.current = true
    }
  }, [])

  // Track page changes
  useEffect(() => {
    // analytics.trackPageView()
  }, [pathname])

  return {
    trackEvent: (eventName: string, properties?: any) => {
      console.log('Analytics Event:', eventName, properties)
    },
    trackPageView: () => {
      console.log('Analytics Page View:', pathname)
    },
    setUserProperties: (properties: any) => {
      console.log('Analytics User Properties:', properties)
    },
  }
}

// Form tracking hook
export function useFormTracking(formName: string = 'workshop_registration') {
  const startTime = useRef<number>(Date.now())
  const currentStep = useRef<number>(1)

  const trackStepProgress = useCallback((
    step: number,
    stepName: string,
    formData?: Partial<RegistrationData>
  ) => {
    console.log('Form Step:', step, stepName, formData)
    currentStep.current = step
  }, [])

  const trackStepValidation = useCallback((
    step: number,
    isValid: boolean,
    errors?: string[]
  ) => {
    console.log({
      event: 'form_validation',
      event_category: 'workshop_registration',
      event_action: isValid ? 'validation_success' : 'validation_error',
      event_label: `step_${step}`,
      custom_parameters: {
        step_number: step,
        is_valid: isValid,
        validation_errors: errors,
      },
    })
  }, [])

  const trackFieldInteraction = useCallback((
    fieldName: string,
    action: 'focus' | 'blur' | 'change',
    value?: string
  ) => {
    console.log({
      event: 'form_field_interaction',
      event_category: 'user_behavior',
      event_action: action,
      event_label: fieldName,
      custom_parameters: {
        field_name: fieldName,
        has_value: !!value,
        value_length: value?.length || 0,
      },
    })
  }, [])

  const trackFormAbandonment = useCallback(() => {
    const timeSpent = Date.now() - startTime.current
    console.log(currentStep.current, timeSpent)
  }, [])

  // Track form abandonment on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentStep.current < 3) { // Assuming 3 is the final step
        trackFormAbandonment()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [trackFormAbandonment])

  return {
    trackStepProgress,
    trackStepValidation,
    trackFieldInteraction,
    trackFormAbandonment,
  }
}

// Conversion tracking hook
export function useConversionTracking() {
  const trackPriceCalculation = useCallback((pricingData: {
    originalPrice: number
    finalPrice: number
    discount: number
    discountReason: string
    ticketType: string
    quantity: number
  }) => {
    console.log('Price calculation:', pricingData)
  }, [])

  const trackMemberVerification = useCallback((
    isMember: boolean,
    memberName?: string,
    discount?: number
  ) => {
    console.log({
      event: 'member_verification',
      event_category: 'conversion',
      event_action: isMember ? 'member_verified' : 'member_not_found',
      value: discount || 0,
      custom_parameters: {
        is_member: isMember,
        has_member_name: !!memberName,
        discount_amount: discount,
      },
    })
  }, [])

  const trackCheckoutInitiation = useCallback((checkoutData: {
    value: number
    items: Array<{
      item_id: string
      item_name: string
      item_category: string
      quantity: number
      price: number
    }>
  }) => {
    console.log('Begin checkout:', {
      currency: 'USD',
      value: checkoutData.value,
      items: checkoutData.items,
    })
  }, [])

  const trackPurchaseCompletion = useCallback((transactionData: {
    transaction_id: string
    value: number
    items: Array<{
      item_id: string
      item_name: string
      item_category: string
      quantity: number
      price: number
    }>
  }) => {
    console.log('Purchase:', {
      currency: 'USD',
      transaction_id: transactionData.transaction_id,
      value: transactionData.value,
      items: transactionData.items,
    })
  }, [])

  return {
    trackPriceCalculation,
    trackMemberVerification,
    trackCheckoutInitiation,
    trackPurchaseCompletion,
  }
}

// User behavior tracking hook
export function useUserBehavior() {
  const sessionStart = useRef<number>(Date.now())
  const scrollDepth = useRef<number>(0)
  const maxScrollDepth = useRef<number>(0)

  // Track scroll depth
  useEffect(() => {
    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      if (scrollPercent > maxScrollDepth.current) {
        maxScrollDepth.current = scrollPercent

        // Track milestone scroll depths
        if (scrollPercent >= 25 && scrollDepth.current < 25) {
          console.log('Scroll depth: 25%')
        } else if (scrollPercent >= 50 && scrollDepth.current < 50) {
          console.log('scroll_depth', '50_percent')
        } else if (scrollPercent >= 75 && scrollDepth.current < 75) {
          console.log('scroll_depth', '75_percent')
        } else if (scrollPercent >= 90 && scrollDepth.current < 90) {
          console.log('scroll_depth', '90_percent')
        }

        scrollDepth.current = scrollPercent
      }
    }

    const throttledScrollTracker = throttle(trackScrollDepth, 1000)
    window.addEventListener('scroll', throttledScrollTracker)

    return () => window.removeEventListener('scroll', throttledScrollTracker)
  }, [])

  const trackButtonClick = useCallback((buttonText: string, section: string) => {
    console.log({
      event: 'button_click',
      event_category: 'user_behavior',
      event_action: 'click',
      event_label: buttonText,
      custom_parameters: {
        button_text: buttonText,
        section: section,
      },
    })
  }, [])

  const trackSectionView = useCallback((sectionName: string, timeSpent?: number) => {
    console.log({
      event: 'section_view',
      event_category: 'user_behavior',
      event_action: 'section_viewed',
      event_label: sectionName,
      value: timeSpent,
      custom_parameters: {
        section_name: sectionName,
        time_spent: timeSpent,
      },
    })
  }, [])

  const trackSessionDuration = useCallback(() => {
    const sessionDuration = Date.now() - sessionStart.current
    console.log({
      event: 'session_duration',
      event_category: 'user_behavior',
      event_action: 'session_end',
      value: Math.round(sessionDuration / 1000),
      custom_parameters: {
        duration_seconds: Math.round(sessionDuration / 1000),
        max_scroll_depth: maxScrollDepth.current,
      },
    })
  }, [])

  // Track session duration on page unload
  useEffect(() => {
    const handleBeforeUnload = () => trackSessionDuration()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [trackSessionDuration])

  return {
    trackButtonClick,
    trackSectionView,
    trackSessionDuration,
  }
}

// Performance tracking hook
export function usePerformanceTracking() {
  const trackCustomTiming = useCallback((name: string, startTime: number) => {
    const duration = performance.now() - startTime
    console.log({
      event: 'custom_timing',
      event_category: 'performance',
      event_action: name,
      value: Math.round(duration),
      custom_parameters: {
        timing_name: name,
        duration_ms: Math.round(duration),
      },
    })
  }, [])

  const trackResourceLoad = useCallback((resourceType: string, loadTime: number) => {
    console.log({
      event: 'resource_load',
      event_category: 'performance',
      event_action: resourceType,
      value: Math.round(loadTime),
      custom_parameters: {
        resource_type: resourceType,
        load_time_ms: Math.round(loadTime),
      },
    })
  }, [])

  const trackError = useCallback((errorType: string, errorMessage: string, stack?: string) => {
    console.log({
      event: 'javascript_error',
      event_category: 'performance',
      event_action: errorType,
      event_label: errorMessage,
      custom_parameters: {
        error_type: errorType,
        error_message: errorMessage,
        error_stack: stack,
      },
    })
  }, [])

  return {
    trackCustomTiming,
    trackResourceLoad,
    trackError,
  }
}

// A/B testing hook
export function useABTesting(testName: string, variants: string[]) {
  const getVariant = useCallback(() => {
    // Simple hash-based assignment for consistent user experience
    const userId = 'anonymous'
    const hash = simpleHash(userId + testName)
    const variantIndex = hash % variants.length
    return variants[variantIndex]
  }, [testName, variants])

  const trackExperiment = useCallback((variant: string, interaction?: string) => {
    console.log({
      event: 'ab_test_interaction',
      event_category: 'user_behavior',
      event_action: interaction || 'view',
      event_label: `${testName}_${variant}`,
      custom_parameters: {
        experiment_name: testName,
        variant: variant,
        interaction_type: interaction,
      },
    })
  }, [testName])

  return {
    getVariant,
    trackExperiment,
  }
}

// Utility functions
function throttle(func: Function, limit: number) {
  let inThrottle: boolean
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}