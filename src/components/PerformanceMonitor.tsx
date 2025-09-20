'use client';

import { useEffect, useState } from 'react';

/**
 * PerformanceMonitor component for real-time performance tracking
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    lcp?: number;
    fid?: number;
    cls?: number;
  }>({});

  useEffect(() => {
    // Only monitor in development
    if (process.env.NODE_ENV !== 'development') return;

    let observer: PerformanceObserver | null = null;

    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'largest-contentful-paint') {
              const lcp = entry.startTime;
              setMetrics(prev => ({ ...prev, lcp }));
              console.log('🎯 LCP:', lcp.toFixed(2), 'ms');
            }

            if (entry.entryType === 'first-input') {
              const fid = (entry as any).processingStart - entry.startTime;
              setMetrics(prev => ({ ...prev, fid }));
              console.log('⚡ FID:', fid.toFixed(2), 'ms');
            }

            if (
              entry.entryType === 'layout-shift' &&
              !(entry as any).hadRecentInput
            ) {
              setMetrics(prev => {
                const cls = (prev.cls || 0) + (entry as any).value;
                console.log('📏 CLS:', cls.toFixed(4));
                return { ...prev, cls };
              });
            }
          });
        });

        observer.observe({
          entryTypes: [
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
          ],
        });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Don't render anything in production or unless explicitly enabled in development
  if (process.env.NODE_ENV !== 'development' || !process.env.NEXT_PUBLIC_SHOW_PERFORMANCE_MONITOR) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    >
      <div>LCP: {metrics.lcp?.toFixed(0) || '---'}ms</div>
      <div>FID: {metrics.fid?.toFixed(0) || '---'}ms</div>
      <div>CLS: {metrics.cls?.toFixed(3) || '0.000'}</div>
    </div>
  );
}
