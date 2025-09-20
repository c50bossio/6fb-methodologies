/**
 * Analytics Provider Component
 *
 * Provides analytics context and initialization for the entire application
 */

'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { analytics } from '@/lib/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  initialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  initialized: false,
});

export function useAnalyticsContext() {
  return useContext(AnalyticsContext);
}

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track application load
    trackEvent('app_load', {
      category: 'performance',
      action: 'application_initialized',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    });

    // Track device type
    const deviceType =
      window.innerWidth <= 768
        ? 'mobile'
        : window.innerWidth <= 1024
          ? 'tablet'
          : 'desktop';

    // Track device properties
    trackEvent('device_info', {
      device_type: deviceType,
      user_type: 'individual',
      experience_level: '1-2',
      is_6fb_member: false,
      registration_source: 'direct',
    });

    // Extract and track UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {
      source: urlParams.get('utm_source'),
      medium: urlParams.get('utm_medium'),
      campaign: urlParams.get('utm_campaign'),
      term: urlParams.get('utm_term'),
      content: urlParams.get('utm_content'),
    };

    if (Object.values(utmParams).some(value => value !== null)) {
      trackEvent('marketing_attribution', {
        category: 'conversion',
        action: 'utm_tracking',
        utm_source: utmParams.source,
        utm_medium: utmParams.medium,
        utm_campaign: utmParams.campaign,
        utm_term: utmParams.term,
        utm_content: utmParams.content,
      });

      // Track attribution data
      trackEvent('utm_attribution', {
        registration_source: utmParams.source || 'direct',
      });
    }

    // Track referrer information
    if (document.referrer) {
      trackEvent('referrer_tracking', {
        category: 'conversion',
        action: 'referrer_identified',
        label: document.referrer,
        referrer_domain: new URL(document.referrer).hostname,
        referrer_url: document.referrer,
      });
    }
  }, [trackEvent]);

  return (
    <AnalyticsContext.Provider value={{ initialized: true }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
