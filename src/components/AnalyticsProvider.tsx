'use client'

import { useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { analyticsService, useAnalytics } from '@/lib/analytics-service'

interface AnalyticsContextType {
  trackWorkshopRegistration: typeof analyticsService.trackWorkshopRegistration
  trackCheckoutStart: typeof analyticsService.trackCheckoutStart
  trackPageView: typeof analyticsService.trackPageView
  trackWorkshopEvent: typeof analyticsService.trackWorkshopEvent
  isEnabled: boolean
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const router = useRouter()
  const analytics = useAnalytics()
  const isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false'

  useEffect(() => {
    // Initialize analytics on mount
    if (isEnabled) {
      analytics.initialize()

      // Track initial page view
      analytics.trackPageView(window.location.pathname, document.title)
    }
  }, [analytics, isEnabled])

  useEffect(() => {
    // Track page views on navigation
    const handleRouteChange = (url: string) => {
      if (isEnabled) {
        // Small delay to ensure document.title is updated
        setTimeout(() => {
          analytics.trackPageView(url, document.title)
        }, 100)
      }
    }

    // Listen for route changes
    const handleRouteChangeStart = handleRouteChange

    // Note: Next.js App Router doesn't have built-in route change events
    // We'll track page views manually where needed

    return () => {
      // Cleanup if needed
    }
  }, [analytics, isEnabled])

  const contextValue: AnalyticsContextType = {
    trackWorkshopRegistration: analytics.trackWorkshopRegistration,
    trackCheckoutStart: analytics.trackCheckoutStart,
    trackPageView: analytics.trackPageView,
    trackWorkshopEvent: analytics.trackWorkshopEvent,
    isEnabled
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider')
  }
  return context
}

// HOC for page-level analytics tracking
export function withAnalytics<T extends object>(
  Component: React.ComponentType<T>,
  pageConfig?: {
    title?: string
    category?: string
    customEvents?: Record<string, any>
  }
) {
  return function AnalyticsWrappedComponent(props: T) {
    const { trackPageView, trackWorkshopEvent } = useAnalyticsContext()

    useEffect(() => {
      // Track page view with custom config
      if (pageConfig?.title) {
        trackPageView(window.location.pathname, pageConfig.title)
      }

      // Track custom page events
      if (pageConfig?.customEvents) {
        Object.entries(pageConfig.customEvents).forEach(([event, properties]) => {
          trackWorkshopEvent(event, {
            ...properties,
            page_category: pageConfig.category,
            page_title: pageConfig.title
          })
        })
      }
    }, [trackPageView, trackWorkshopEvent])

    return <Component {...props} />
  }
}

// Utility hook for tracking workshop-specific events
export function useWorkshopTracking() {
  const { trackWorkshopEvent, trackCheckoutStart, isEnabled } = useAnalyticsContext()

  return {
    trackTicketSelection: (ticketType: 'GA' | 'VIP', quantity: number) => {
      if (!isEnabled) return

      trackWorkshopEvent('ticket_selected', {
        ticket_type: ticketType,
        quantity,
        value: ticketType === 'VIP' ? 1500 * quantity : 1000 * quantity
      })
    },

    trackFormStep: (step: string, formData: Record<string, any>) => {
      if (!isEnabled) return

      trackWorkshopEvent('form_step_completed', {
        form_step: step,
        form_data: formData
      })
    },

    trackPaymentMethod: (method: string) => {
      if (!isEnabled) return

      trackWorkshopEvent('payment_method_selected', {
        payment_method: method
      })
    },

    trackCheckoutStep: (step: number, stepName: string, data?: Record<string, any>) => {
      if (!isEnabled) return

      trackWorkshopEvent('checkout_progress', {
        checkout_step: step,
        step_name: stepName,
        ...data
      })
    },

    trackVideoPlay: (videoTitle: string, position: number = 0) => {
      if (!isEnabled) return

      trackWorkshopEvent('video_play', {
        video_title: videoTitle,
        position
      })
    },

    trackCTAClick: (ctaText: string, location: string) => {
      if (!isEnabled) return

      trackWorkshopEvent('cta_click', {
        cta_text: ctaText,
        cta_location: location
      })
    },

    trackSocialShare: (platform: string, content: string) => {
      if (!isEnabled) return

      trackWorkshopEvent('social_share', {
        platform,
        content
      })
    },

    trackNewsletterSignup: (email: string, source: string) => {
      if (!isEnabled) return

      trackWorkshopEvent('newsletter_signup', {
        source,
        // Don't send actual email for privacy
        has_email: !!email
      })
    },

    trackCheckoutStart: (ticketType: 'GA' | 'VIP', quantity: number) => {
      if (!isEnabled) return

      const value = (ticketType === 'VIP' ? 1500 : 1000) * quantity
      trackCheckoutStart({ ticketType, quantity, value })
    }
  }
}

// Component for tracking scroll depth
export function ScrollDepthTracker() {
  const { trackWorkshopEvent, isEnabled } = useAnalyticsContext()

  useEffect(() => {
    if (!isEnabled) return

    let maxScroll = 0
    const milestones = [25, 50, 75, 100]
    const trackedMilestones = new Set<number>()

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100)

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent

        milestones.forEach(milestone => {
          if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
            trackedMilestones.add(milestone)
            trackWorkshopEvent('scroll_depth', {
              scroll_percentage: milestone,
              page_path: window.location.pathname
            })
          }
        })
      }
    }

    const throttledScroll = throttle(handleScroll, 500)
    window.addEventListener('scroll', throttledScroll)

    return () => {
      window.removeEventListener('scroll', throttledScroll)
    }
  }, [trackWorkshopEvent, isEnabled])

  return null
}

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return (...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}