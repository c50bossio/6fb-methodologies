// Analytics Integration Service using MCP Best Practices
// Combines Google Analytics 4, Facebook Pixel, and other tracking platforms

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

interface ConversionEvent {
  type:
    | 'purchase'
    | 'registration_start'
    | 'registration_complete'
    | 'payment_complete';
  value?: number;
  currency?: string;
  transactionId?: string;
  items?: Array<{
    name: string;
    category: string;
    quantity: number;
    price: number;
  }>;
}

// Google Analytics 4 Integration
class GoogleAnalyticsService {
  private measurementId: string;
  private apiSecret?: string;
  private isDebug: boolean;

  constructor(measurementId: string, apiSecret?: string, debug = false) {
    this.measurementId = measurementId;
    this.apiSecret = apiSecret;
    this.isDebug = debug;
  }

  // Track standard events using GA4 gtag
  trackEvent(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.event, {
        custom_parameter_1: event.properties.custom_parameter_1,
        custom_parameter_2: event.properties.custom_parameter_2,
        value: event.properties.value,
        currency: event.properties.currency,
        transaction_id: event.properties.transactionId,
        user_id: event.userId,
        session_id: event.sessionId,
        timestamp_micros: (event.timestamp || new Date()).getTime() * 1000,
        debug_mode: this.isDebug,
      });
    }
  }

  // Enhanced e-commerce events for workshop bookings
  trackPurchase(data: {
    transactionId: string;
    value: number;
    currency: string;
    items: Array<{
      item_id: string;
      item_name: string;
      item_category: string;
      quantity: number;
      price: number;
    }>;
    userId?: string;
  }) {
    this.trackEvent({
      event: 'purchase',
      properties: {
        transaction_id: data.transactionId,
        value: data.value,
        currency: data.currency,
        items: data.items,
      },
      userId: data.userId,
    });
  }

  // Track registration funnel
  trackRegistrationStart(ticketType: 'GA' | 'VIP') {
    this.trackEvent({
      event: 'begin_checkout',
      properties: {
        currency: 'USD',
        value: ticketType === 'VIP' ? 1500 : 1000,
        item_category: 'workshop_ticket',
        ticket_type: ticketType,
      },
    });
  }

  trackRegistrationComplete(data: {
    ticketType: 'GA' | 'VIP';
    quantity: number;
    totalValue: number;
    userId?: string;
  }) {
    this.trackEvent({
      event: 'sign_up',
      properties: {
        method: 'workshop_registration',
        ticket_type: data.ticketType,
        quantity: data.quantity,
        value: data.totalValue,
        currency: 'USD',
      },
      userId: data.userId,
    });
  }

  // Server-side event tracking via Measurement Protocol
  async trackServerEvent(event: AnalyticsEvent) {
    if (!this.apiSecret) {
      console.warn('GA4 API Secret not configured for server-side tracking');
      return;
    }

    const endpoint = this.isDebug
      ? `https://www.google-analytics.com/debug/mp/collect`
      : `https://www.google-analytics.com/mp/collect`;

    const payload = {
      client_id: event.sessionId || this.generateClientId(),
      user_id: event.userId,
      events: [
        {
          name: event.event,
          params: {
            ...event.properties,
            timestamp_micros: (event.timestamp || new Date()).getTime() * 1000,
          },
        },
      ],
    };

    try {
      const response = await fetch(
        `${endpoint}?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (this.isDebug) {
        const result = await response.json();
        console.log('GA4 Debug Response:', result);
      }

      return response.ok;
    } catch (error) {
      console.error('GA4 server-side tracking failed:', error);
      return false;
    }
  }

  private generateClientId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}

// Facebook Pixel Integration
class FacebookPixelService {
  private pixelId: string;
  private accessToken?: string;
  private isDebug: boolean;

  constructor(pixelId: string, accessToken?: string, debug = false) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
    this.isDebug = debug;
  }

  // Client-side Facebook Pixel tracking
  trackEvent(event: string, properties: Record<string, any> = {}) {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', event, properties);

      if (this.isDebug) {
        console.log('Facebook Pixel Event:', event, properties);
      }
    }
  }

  // Track workshop-specific conversion events
  trackWorkshopPurchase(data: {
    value: number;
    currency: string;
    contentName: string;
    contentCategory: string;
    contentIds: string[];
    numItems: number;
    transactionId: string;
  }) {
    this.trackEvent('Purchase', {
      value: data.value,
      currency: data.currency,
      content_name: data.contentName,
      content_category: data.contentCategory,
      content_ids: data.contentIds,
      num_items: data.numItems,
      content_type: 'product',
    });
  }

  trackInitiateCheckout(data: {
    value: number;
    currency: string;
    contentName: string;
    numItems: number;
  }) {
    this.trackEvent('InitiateCheckout', {
      value: data.value,
      currency: data.currency,
      content_name: data.contentName,
      num_items: data.numItems,
      content_type: 'product',
    });
  }

  trackLead(data: {
    value?: number;
    currency?: string;
    contentName: string;
    contentCategory: string;
  }) {
    this.trackEvent('Lead', {
      value: data.value,
      currency: data.currency,
      content_name: data.contentName,
      content_category: data.contentCategory,
    });
  }

  // Server-side Facebook Conversions API
  async trackServerEvent(
    event: string,
    userData: any,
    customData: any,
    eventId?: string
  ) {
    if (!this.accessToken) {
      console.warn(
        'Facebook Access Token not configured for server-side tracking'
      );
      return;
    }

    const url = `https://graph.facebook.com/v18.0/${this.pixelId}/events`;

    const payload = {
      data: [
        {
          event_name: event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || this.generateEventId(),
          action_source: 'website',
          user_data: userData,
          custom_data: customData,
        },
      ],
      test_event_code: this.isDebug ? 'TEST12345' : undefined,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (this.isDebug) {
        console.log('Facebook Conversions API Response:', result);
      }

      return result;
    } catch (error) {
      console.error('Facebook server-side tracking failed:', error);
      return null;
    }
  }

  private generateEventId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 15);
  }
}

// Unified Analytics Service
class AnalyticsIntegrationService {
  private ga4: GoogleAnalyticsService;
  private fbPixel: FacebookPixelService;
  private isEnabled: boolean;
  private debugMode: boolean;

  constructor(config: {
    ga4MeasurementId: string;
    ga4ApiSecret?: string;
    fbPixelId: string;
    fbAccessToken?: string;
    enabled?: boolean;
    debug?: boolean;
  }) {
    this.ga4 = new GoogleAnalyticsService(
      config.ga4MeasurementId,
      config.ga4ApiSecret,
      config.debug
    );
    this.fbPixel = new FacebookPixelService(
      config.fbPixelId,
      config.fbAccessToken,
      config.debug
    );
    this.isEnabled = config.enabled ?? true;
    this.debugMode = config.debug ?? false;
  }

  // Initialize client-side tracking
  initialize() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Initialize Google Analytics 4
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.ga4['measurementId']}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', this.ga4['measurementId'], {
        debug_mode: this.debugMode,
        send_page_view: true,
      });
    }

    // Initialize Facebook Pixel
    if (!window.fbq) {
      window.fbq = function () {
        window.fbq.callMethod
          ? window.fbq.callMethod.apply(window.fbq, arguments)
          : window.fbq.queue.push(arguments);
      };
      window.fbq.push = window.fbq;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);

      window.fbq('init', this.fbPixel['pixelId']);
      window.fbq('track', 'PageView');
    }
  }

  // Track workshop registration conversion
  async trackWorkshopRegistration(data: {
    ticketType: 'GA' | 'VIP';
    quantity: number;
    totalAmount: number;
    currency: string;
    transactionId: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
  }) {
    if (!this.isEnabled) return;

    const value = data.totalAmount / 100; // Convert cents to dollars
    const items = [
      {
        item_id: `workshop_${data.ticketType.toLowerCase()}`,
        item_name: `6FB Methodologies Workshop - ${data.ticketType}`,
        item_category: 'workshop_ticket',
        quantity: data.quantity,
        price: value / data.quantity,
      },
    ];

    // Track in Google Analytics
    this.ga4.trackPurchase({
      transactionId: data.transactionId,
      value,
      currency: data.currency,
      items,
      userId: this.hashEmail(data.customerEmail),
    });

    // Track in Facebook Pixel
    this.fbPixel.trackWorkshopPurchase({
      value,
      currency: data.currency,
      contentName: `6FB Methodologies Workshop - ${data.ticketType}`,
      contentCategory: 'workshop_ticket',
      contentIds: [`workshop_${data.ticketType.toLowerCase()}`],
      numItems: data.quantity,
      transactionId: data.transactionId,
    });

    // Server-side tracking for enhanced accuracy
    await Promise.all([
      this.ga4.trackServerEvent({
        event: 'purchase',
        properties: {
          transaction_id: data.transactionId,
          value,
          currency: data.currency,
          items,
        },
        userId: this.hashEmail(data.customerEmail),
      }),
      this.fbPixel.trackServerEvent(
        'Purchase',
        {
          em: this.hashEmail(data.customerEmail),
          ph: data.customerPhone
            ? this.hashPhone(data.customerPhone)
            : undefined,
          fn: this.hashName(data.customerName.split(' ')[0]),
          ln: this.hashName(data.customerName.split(' ')[1] || ''),
        },
        {
          value,
          currency: data.currency,
          content_name: `6FB Methodologies Workshop - ${data.ticketType}`,
          content_category: 'workshop_ticket',
          content_ids: [`workshop_${data.ticketType.toLowerCase()}`],
          num_items: data.quantity,
        },
        data.transactionId
      ),
    ]);
  }

  // Track checkout initiation
  trackCheckoutStart(data: {
    ticketType: 'GA' | 'VIP';
    quantity: number;
    value: number;
  }) {
    if (!this.isEnabled) return;

    this.ga4.trackRegistrationStart(data.ticketType);
    this.fbPixel.trackInitiateCheckout({
      value: data.value / 100,
      currency: 'USD',
      contentName: `6FB Methodologies Workshop - ${data.ticketType}`,
      numItems: data.quantity,
    });
  }

  // Track page views with enhanced data
  trackPageView(page: string, title?: string) {
    if (!this.isEnabled) return;

    this.ga4.trackEvent({
      event: 'page_view',
      properties: {
        page_title: title || document.title,
        page_location: window.location.href,
        page_path: page,
      },
    });
  }

  // Track custom workshop events
  trackWorkshopEvent(event: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled) return;

    this.ga4.trackEvent({
      event: `workshop_${event}`,
      properties: {
        ...properties,
        workshop_name: '6FB Methodologies',
        event_category: 'workshop_interaction',
      },
    });

    // Track as custom Facebook event
    this.fbPixel.trackEvent(
      `Workshop${event.charAt(0).toUpperCase() + event.slice(1)}`,
      properties
    );
  }

  // Privacy-compliant email hashing (SHA-256)
  private hashEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private hashPhone(phone: string): string {
    return phone.replace(/\D/g, ''); // Remove non-digits
  }

  private hashName(name: string): string {
    return name.toLowerCase().trim();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsIntegrationService({
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '',
  ga4ApiSecret: process.env.GA4_API_SECRET,
  fbPixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
  fbAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false',
  debug: process.env.NODE_ENV === 'development',
});

// Direct access to analytics service methods (not a React hook)
export const useAnalyticsService = () => {
  return {
    trackWorkshopRegistration:
      analyticsService.trackWorkshopRegistration.bind(analyticsService),
    trackCheckoutStart:
      analyticsService.trackCheckoutStart.bind(analyticsService),
    trackPageView: analyticsService.trackPageView.bind(analyticsService),
    trackWorkshopEvent:
      analyticsService.trackWorkshopEvent.bind(analyticsService),
    initialize: analyticsService.initialize.bind(analyticsService),
  };
};

// Type declarations for global objects
declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
    fbq: any;
  }
}

export {
  GoogleAnalyticsService,
  FacebookPixelService,
  AnalyticsIntegrationService,
};
