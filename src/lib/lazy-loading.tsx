/**
 * Lazy Loading Utilities - Dynamic imports and code splitting
 * Optimizes bundle size and loading performance
 */

import React, { ComponentType, lazy, LazyExoticComponent } from 'react';
import dynamic from 'next/dynamic';

// =============================================================================
// Dynamic Component Loading
// =============================================================================

/**
 * Enhanced dynamic import with loading states and error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    loading?: ComponentType;
    error?: ComponentType<{ error: Error; retry: () => void }>;
    delay?: number;
    timeout?: number;
    ssr?: boolean;
  } = {}
): LazyExoticComponent<T> {
  const {
    loading: LoadingComponent,
    error: ErrorComponent,
    delay = 200,
    timeout = 10000,
    ssr = false,
  } = options;

  return lazy(() => {
    const importPromise = importFunc();

    // Add timeout handling
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Component import timed out after ${timeout}ms`));
      }, timeout);
    });

    return Promise.race([importPromise, timeoutPromise]).catch(error => {
      console.error('Failed to load component:', error);

      // Return error component if available
      if (ErrorComponent) {
        return {
          default: (props: any) =>
            ErrorComponent({
              error,
              retry: () => window.location.reload(),
              ...props,
            }),
        };
      }

      // Fallback error component
      return {
        default: () => {
          return (
            <div className='flex items-center justify-center p-8 text-center'>
              <div className='max-w-md'>
                <div className='text-red-500 mb-2'>⚠️</div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Failed to load component
                </h3>
                <p className='text-gray-600 mb-4'>
                  {error.message ||
                    'An error occurred while loading this component.'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                >
                  Retry
                </button>
              </div>
            </div>
          );
        },
      };
    });
  });
}

/**
 * Next.js dynamic import with optimized settings
 */
export function dynamicLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    loading?: ComponentType;
    ssr?: boolean;
    suspense?: boolean;
  } = {}
) {
  const { loading, ssr = false, suspense = false } = options;

  return dynamic(importFunc, {
    loading: loading ? () => React.createElement(loading) : undefined,
    ssr,
    suspense,
  });
}

// =============================================================================
// Pre-built Lazy Components
// =============================================================================

// Workbook components
export const LazyWorkbookLogin = lazyLoad(
  () => import('@/components/WorkbookLogin'),
  {
    loading: () => (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyLiveSessionRoom = lazyLoad(
  () => import('@/components/workbook/LiveSessionRoom'),
  {
    loading: () => (
      <div className='flex items-center justify-center min-h-screen bg-gray-900'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
          <p className='text-white'>Loading live session...</p>
        </div>
      </div>
    ),
    ssr: false,
    timeout: 15000,
  }
);

export const LazyVoiceRecorder = lazyLoad(
  () => import('@/components/workbook/VoiceRecorder'),
  {
    loading: () => (
      <div className='h-24 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center'>
        <span className='text-gray-500'>Loading recorder...</span>
      </div>
    ),
    ssr: false,
  }
);

export const LazyAudioFileUploader = lazyLoad(
  () => import('@/components/workbook/AudioFileUploader'),
  {
    loading: () => (
      <div className='h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center'>
        <span className='text-gray-500'>Loading uploader...</span>
      </div>
    ),
    ssr: false,
  }
);

export const LazyPerformanceMonitor = lazyLoad(
  () => import('@/components/monitoring/PerformanceMonitor'),
  {
    loading: () => (
      <div className='h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center'>
        <span className='text-gray-500'>Loading performance monitor...</span>
      </div>
    ),
    ssr: false,
  }
);

// Analytics components
export const LazyAnalyticsDashboard = lazyLoad(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: () => (
      <div className='space-y-4'>
        <div className='h-8 bg-gray-200 rounded animate-pulse'></div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='h-24 bg-gray-200 rounded animate-pulse'
            ></div>
          ))}
        </div>
        <div className='h-64 bg-gray-200 rounded animate-pulse'></div>
      </div>
    ),
    ssr: false,
  }
);

// =============================================================================
// Route-based Code Splitting
// =============================================================================

/**
 * Route-level lazy loading for pages
 */
export const LazyPages = {
  WorkbookPage: dynamicLoad(() => import('@/app/workbook/page'), { ssr: true }),
  PricingPage: dynamicLoad(() => import('@/app/pricing/page'), { ssr: true }),
  RegisterPage: dynamicLoad(() => import('@/app/register/page'), { ssr: true }),
  SuccessPage: dynamicLoad(() => import('@/app/success/page'), { ssr: true }),
} as const;

// =============================================================================
// Feature-based Code Splitting
// =============================================================================

/**
 * Feature-specific lazy loading
 */
export const LazyFeatures = {
  // Payment features
  PaymentMethodSelector: lazyLoad(
    () => import('@/components/payment/PaymentMethodSelector')
  ),
  PaymentRecovery: lazyLoad(
    () => import('@/components/payment/PaymentRecovery')
  ),

  // Advanced UI components
  ExitIntentModal: lazyLoad(() => import('@/components/ui/ExitIntentModal')),
  ConversionTimer: lazyLoad(() => import('@/components/ui/ConversionTimer')),

  // Analytics
  AnalyticsProvider: lazyLoad(
    () => import('@/components/analytics/AnalyticsProvider')
  ),
  AnalyticsRegistrationForm: lazyLoad(
    () => import('@/components/forms/AnalyticsRegistrationForm')
  ),
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Preload a component
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFunc();
}

/**
 * Preload multiple components
 */
export function preloadComponents(
  importFuncs: Array<() => Promise<{ default: ComponentType<any> }>>
): Promise<Array<{ default: ComponentType<any> }>> {
  return Promise.all(importFuncs.map(func => func()));
}

/**
 * Conditional preloading based on user behavior
 */
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  private preloadQueue: Array<{ key: string; loader: () => Promise<any> }> = [];
  private isPreloading = false;

  /**
   * Register a component for potential preloading
   */
  register(key: string, loader: () => Promise<any>) {
    if (!this.preloadedComponents.has(key)) {
      this.preloadQueue.push({ key, loader });
    }
  }

  /**
   * Preload component immediately
   */
  async preload(key: string): Promise<void> {
    if (this.preloadedComponents.has(key)) return;

    const item = this.preloadQueue.find(item => item.key === key);
    if (item) {
      try {
        await item.loader();
        this.preloadedComponents.add(key);
      } catch (error) {
        console.warn(`Failed to preload component ${key}:`, error);
      }
    }
  }

  /**
   * Preload components based on priority
   */
  async preloadByPriority(priorities: string[]): Promise<void> {
    if (this.isPreloading) return;
    this.isPreloading = true;

    for (const key of priorities) {
      if (!this.preloadedComponents.has(key)) {
        await this.preload(key);
        // Small delay to avoid blocking the main thread
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    this.isPreloading = false;
  }

  /**
   * Preload on user interaction (hover, focus, etc.)
   */
  onInteraction(key: string, element: HTMLElement) {
    const preloadOnEvent = (event: string) => {
      const handler = () => {
        this.preload(key);
        element.removeEventListener(event, handler);
      };
      element.addEventListener(event, handler, { once: true, passive: true });
    };

    preloadOnEvent('mouseenter');
    preloadOnEvent('touchstart');
    preloadOnEvent('focus');
  }

  /**
   * Preload based on viewport intersection
   */
  onVisible(key: string, element: HTMLElement, threshold = 0.1) {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.preload(key);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.preload(key);
            observer.unobserve(element);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);
  }

  /**
   * Get preloading statistics
   */
  getStats() {
    return {
      preloadedCount: this.preloadedComponents.size,
      queuedCount: this.preloadQueue.length,
      preloadedComponents: Array.from(this.preloadedComponents),
      isPreloading: this.isPreloading,
    };
  }
}

// Global preloader instance
export const componentPreloader = new ComponentPreloader();

// =============================================================================
// React Hooks for Lazy Loading
// =============================================================================

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options: {
    threshold?: number;
    rootMargin?: string;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current || typeof window === 'undefined')
      return;

    const element = elementRef.current;

    if (!('IntersectionObserver' in window)) {
      // Fallback - load immediately
      setLoading(true);
      loader()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !data && !loading) {
            setLoading(true);
            loader()
              .then(setData)
              .catch(setError)
              .finally(() => setLoading(false));
            observer.unobserve(element);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [loader, threshold, rootMargin, enabled, data, loading]);

  return {
    ref: elementRef,
    data,
    loading,
    error,
    retry: () => {
      setError(null);
      setLoading(true);
      loader()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    },
  };
}

/**
 * Hook for preloading components on user interaction
 */
export function usePreload() {
  const preload = (key: string, loader: () => Promise<any>) => {
    componentPreloader.register(key, loader);
  };

  const preloadOnHover = (key: string, loader: () => Promise<any>) => {
    return {
      onMouseEnter: () => componentPreloader.preload(key),
      onFocus: () => componentPreloader.preload(key),
    };
  };

  const preloadOnVisible = (key: string, loader: () => Promise<any>) => {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
      if (ref.current) {
        componentPreloader.onVisible(key, ref.current);
      }
    }, [key]);

    return ref;
  };

  return {
    preload,
    preloadOnHover,
    preloadOnVisible,
    stats: componentPreloader.getStats(),
  };
}

// =============================================================================
// Bundle Analysis Utilities
// =============================================================================

/**
 * Log bundle loading performance
 */
export function logBundlePerformance(componentName: string, startTime: number) {
  if (process.env.NODE_ENV === 'development') {
    const loadTime = performance.now() - startTime;
    console.log(`📦 ${componentName} loaded in ${loadTime.toFixed(2)}ms`);

    // Log to performance timeline
    if (performance.mark && performance.measure) {
      performance.mark(`${componentName}-loaded`);
      performance.measure(
        `${componentName}-load-time`,
        `${componentName}-start`,
        `${componentName}-loaded`
      );
    }
  }
}

/**
 * Create a higher-order component that logs loading performance
 */
export function withLoadingPerformance<P extends object>(
  Component: ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now();
      if (performance.mark) {
        performance.mark(`${componentName}-start`);
      }

      return () => {
        logBundlePerformance(componentName, startTime);
      };
    }, []);

    return <Component {...props} />;
  };
}
