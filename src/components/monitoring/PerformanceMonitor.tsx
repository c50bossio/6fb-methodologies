/**
 * Performance Monitor - Real-time performance tracking and optimization
 * Monitors Core Web Vitals, cache performance, and user experience metrics
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Monitor,
  Activity,
  Zap,
  Database,
  Wifi,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte

  // Custom metrics
  totalBlockingTime: number | null;
  timeToInteractive: number | null;
  speedIndex: number | null;

  // Resource metrics
  domContentLoaded: number | null;
  loadComplete: number | null;
  resourceCount: number;
  resourceSize: number;

  // Network metrics
  connectionType: string;
  effectiveType: string;
  rtt: number | null;
  downlink: number | null;

  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheRatio: number;

  // Memory metrics
  jsHeapSizeLimit: number | null;
  totalJSHeapSize: number | null;
  usedJSHeapSize: number | null;
}

interface PerformanceMonitorProps {
  autoStart?: boolean;
  interval?: number;
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export default function PerformanceMonitor({
  autoStart = true,
  interval = 5000,
  showDetails = false,
  onMetricsUpdate,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    totalBlockingTime: null,
    timeToInteractive: null,
    speedIndex: null,
    domContentLoaded: null,
    loadComplete: null,
    resourceCount: 0,
    resourceSize: 0,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    rtt: null,
    downlink: null,
    cacheHits: 0,
    cacheMisses: 0,
    cacheRatio: 0,
    jsHeapSizeLimit: null,
    totalJSHeapSize: null,
    usedJSHeapSize: null,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<
    Array<{ type: 'warning' | 'error'; message: string; timestamp: number }>
  >([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<PerformanceObserver | null>(null);

  // Core Web Vitals thresholds
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  };

  // Get performance rating
  const getPerformanceRating = useCallback(
    (metric: keyof typeof thresholds, value: number | null) => {
      if (value === null) return 'unknown';
      const threshold = thresholds[metric];
      if (value <= threshold.good) return 'good';
      if (value <= threshold.poor) return 'needs-improvement';
      return 'poor';
    },
    []
  );

  // Collect Core Web Vitals
  const collectCoreWebVitals = useCallback(() => {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const newMetrics: Partial<PerformanceMetrics> = {};

    // Navigation timing
    if (navigation) {
      newMetrics.domContentLoaded =
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart;
      newMetrics.loadComplete =
        navigation.loadEventEnd - navigation.loadEventStart;
      newMetrics.ttfb = navigation.responseStart - navigation.requestStart;
    }

    // Paint timing
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      newMetrics.fcp = fcp.startTime;
    }

    // Resource metrics
    const resources = performance.getEntriesByType('resource');
    newMetrics.resourceCount = resources.length;
    newMetrics.resourceSize = resources.reduce((total, resource) => {
      return total + (resource as PerformanceResourceTiming).transferSize || 0;
    }, 0);

    // Memory metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      newMetrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      newMetrics.totalJSHeapSize = memory.totalJSHeapSize;
      newMetrics.usedJSHeapSize = memory.usedJSHeapSize;
    }

    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      newMetrics.connectionType = connection.type || 'unknown';
      newMetrics.effectiveType = connection.effectiveType || 'unknown';
      newMetrics.rtt = connection.rtt;
      newMetrics.downlink = connection.downlink;
    }

    return newMetrics;
  }, []);

  // Collect Service Worker metrics
  const collectServiceWorkerMetrics = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise<Partial<PerformanceMetrics>>(resolve => {
        const channel = new MessageChannel();

        channel.port1.onmessage = event => {
          if (event.data.type === 'SW_METRICS') {
            const swMetrics = event.data.metrics;
            const total = swMetrics.cacheHits + swMetrics.cacheMisses;
            const cacheRatio =
              total > 0 ? (swMetrics.cacheHits / total) * 100 : 0;

            resolve({
              cacheHits: swMetrics.cacheHits,
              cacheMisses: swMetrics.cacheMisses,
              cacheRatio,
            });
          }
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_METRICS' },
          [channel.port2]
        );

        // Timeout after 1 second
        setTimeout(() => resolve({}), 1000);
      });
    }

    return {};
  }, []);

  // Setup Performance Observer for real-time metrics
  const setupPerformanceObserver = useCallback(() => {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
          }

          if (entry.entryType === 'first-input') {
            setMetrics(prev => ({
              ...prev,
              fid: (entry as any).processingStart - entry.startTime,
            }));
          }

          if (
            entry.entryType === 'layout-shift' &&
            !(entry as any).hadRecentInput
          ) {
            setMetrics(prev => ({
              ...prev,
              cls: (prev.cls || 0) + (entry as any).value,
            }));
          }
        });
      });

      // Observe all performance entry types
      [
        'largest-contentful-paint',
        'first-input',
        'layout-shift',
        'paint',
      ].forEach(type => {
        try {
          observer.observe({ type, buffered: true });
        } catch (error) {
          console.warn(
            `Performance observer type "${type}" not supported:`,
            error
          );
        }
      });

      observerRef.current = observer;
    } catch (error) {
      console.error('Failed to setup performance observer:', error);
    }
  }, []);

  // Update metrics
  const updateMetrics = useCallback(async () => {
    const baseMetrics = collectCoreWebVitals();
    const swMetrics = await collectServiceWorkerMetrics();

    const newMetrics = {
      ...metrics,
      ...baseMetrics,
      ...swMetrics,
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    // Add to history (keep last 20 entries)
    setHistory(prev => [...prev.slice(-19), newMetrics]);

    // Check for performance alerts
    checkPerformanceAlerts(newMetrics);
  }, [
    metrics,
    collectCoreWebVitals,
    collectServiceWorkerMetrics,
    onMetricsUpdate,
  ]);

  // Check for performance issues and create alerts
  const checkPerformanceAlerts = useCallback(
    (currentMetrics: PerformanceMetrics) => {
      const newAlerts: typeof alerts = [];

      // Check Core Web Vitals
      if (currentMetrics.lcp && currentMetrics.lcp > thresholds.lcp.poor) {
        newAlerts.push({
          type: 'error',
          message: `LCP is poor (${Math.round(currentMetrics.lcp)}ms). Consider optimizing large images or critical rendering path.`,
          timestamp: Date.now(),
        });
      }

      if (currentMetrics.fid && currentMetrics.fid > thresholds.fid.poor) {
        newAlerts.push({
          type: 'error',
          message: `FID is poor (${Math.round(currentMetrics.fid)}ms). Consider reducing JavaScript execution time.`,
          timestamp: Date.now(),
        });
      }

      if (currentMetrics.cls && currentMetrics.cls > thresholds.cls.poor) {
        newAlerts.push({
          type: 'error',
          message: `CLS is poor (${currentMetrics.cls.toFixed(3)}). Consider adding dimensions to images and avoiding dynamic content.`,
          timestamp: Date.now(),
        });
      }

      // Check cache performance
      if (
        currentMetrics.cacheRatio < 60 &&
        currentMetrics.cacheHits + currentMetrics.cacheMisses > 10
      ) {
        newAlerts.push({
          type: 'warning',
          message: `Cache hit rate is low (${Math.round(currentMetrics.cacheRatio)}%). Consider reviewing caching strategy.`,
          timestamp: Date.now(),
        });
      }

      // Check memory usage
      if (currentMetrics.usedJSHeapSize && currentMetrics.jsHeapSizeLimit) {
        const memoryUsage =
          (currentMetrics.usedJSHeapSize / currentMetrics.jsHeapSizeLimit) *
          100;
        if (memoryUsage > 80) {
          newAlerts.push({
            type: 'warning',
            message: `High memory usage (${Math.round(memoryUsage)}%). Consider optimizing memory-intensive operations.`,
            timestamp: Date.now(),
          });
        }
      }

      setAlerts(newAlerts);
    },
    []
  );

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    setupPerformanceObserver();
    updateMetrics();

    intervalRef.current = setInterval(updateMetrics, interval);
  }, [isMonitoring, setupPerformanceObserver, updateMetrics, interval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Export metrics
  const exportMetrics = useCallback(() => {
    const data = {
      currentMetrics: metrics,
      history,
      alerts,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, history, alerts]);

  // Clear Service Worker caches
  const clearCaches = useCallback(
    async (cacheType: string = 'all') => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        return new Promise<void>(resolve => {
          const channel = new MessageChannel();

          channel.port1.onmessage = event => {
            if (event.data.type === 'CACHE_CLEARED') {
              updateMetrics();
              resolve();
            }
          };

          navigator.serviceWorker.controller.postMessage(
            { type: 'CLEAR_CACHE', cacheType },
            [channel.port2]
          );
        });
      }
    },
    [updateMetrics]
  );

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format milliseconds
  const formatMs = (ms: number | null) => {
    if (ms === null) return 'N/A';
    return `${Math.round(ms)}ms`;
  };

  // Get metric color
  const getMetricColor = (
    metric: keyof typeof thresholds,
    value: number | null
  ) => {
    const rating = getPerformanceRating(metric, value);
    switch (rating) {
      case 'good':
        return 'text-green-500';
      case 'needs-improvement':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return stopMonitoring;
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Don't show the minimal performance monitor in development unless explicitly enabled
  if (!showDetails) {
    // Only show if explicitly enabled via environment variable
    if (!process.env.NEXT_PUBLIC_SHOW_PERFORMANCE_MONITOR) {
      return null;
    }

    return (
      <div className='fixed bottom-4 right-4 z-50'>
        <Card className='p-4 bg-white shadow-lg'>
          <div className='flex items-center space-x-3'>
            <div
              className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            <div className='text-sm'>
              <div className='font-medium'>Performance</div>
              {metrics.lcp && (
                <div
                  className={`text-xs ${getMetricColor('lcp', metrics.lcp)}`}
                >
                  LCP: {formatMs(metrics.lcp)}
                </div>
              )}
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? (
                <Activity className='w-4 h-4' />
              ) : (
                <Monitor className='w-4 h-4' />
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <Monitor className='w-6 h-6' />
          <h2 className='text-2xl font-bold'>Performance Monitor</h2>
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className='flex items-center space-x-2'>
          <Button variant='outline' size='sm' onClick={exportMetrics}>
            <Download className='w-4 h-4 mr-2' />
            Export
          </Button>
          <Button variant='outline' size='sm' onClick={() => clearCaches()}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Clear Cache
          </Button>
          <Button
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={() =>
              isMonitoring ? stopMonitoring() : startMonitoring()
            }
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className='space-y-2'>
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 ${
                alert.type === 'error'
                  ? 'bg-red-50 border-red-500 text-red-800'
                  : 'bg-yellow-50 border-yellow-500 text-yellow-800'
              }`}
            >
              <div className='flex items-start space-x-2'>
                {alert.type === 'error' ? (
                  <XCircle className='w-5 h-5 mt-0.5' />
                ) : (
                  <AlertTriangle className='w-5 h-5 mt-0.5' />
                )}
                <div className='flex-1'>
                  <p className='text-sm'>{alert.message}</p>
                  <p className='text-xs opacity-75 mt-1'>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Core Web Vitals */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Zap className={`w-5 h-5 ${getMetricColor('lcp', metrics.lcp)}`} />
            <div>
              <div className='text-sm font-medium'>LCP</div>
              <div
                className={`text-2xl font-bold ${getMetricColor('lcp', metrics.lcp)}`}
              >
                {formatMs(metrics.lcp)}
              </div>
              <div className='text-xs text-gray-500'>
                Largest Contentful Paint
              </div>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Clock
              className={`w-5 h-5 ${getMetricColor('fid', metrics.fid)}`}
            />
            <div>
              <div className='text-sm font-medium'>FID</div>
              <div
                className={`text-2xl font-bold ${getMetricColor('fid', metrics.fid)}`}
              >
                {formatMs(metrics.fid)}
              </div>
              <div className='text-xs text-gray-500'>First Input Delay</div>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <TrendingUp
              className={`w-5 h-5 ${getMetricColor('cls', metrics.cls)}`}
            />
            <div>
              <div className='text-sm font-medium'>CLS</div>
              <div
                className={`text-2xl font-bold ${getMetricColor('cls', metrics.cls)}`}
              >
                {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
              </div>
              <div className='text-xs text-gray-500'>
                Cumulative Layout Shift
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Database className='w-5 h-5 text-blue-500' />
            <div>
              <div className='text-sm font-medium'>Cache Hit Rate</div>
              <div className='text-xl font-bold'>
                {Math.round(metrics.cacheRatio)}%
              </div>
              <div className='text-xs text-gray-500'>
                {metrics.cacheHits} hits / {metrics.cacheMisses} misses
              </div>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Wifi className='w-5 h-5 text-green-500' />
            <div>
              <div className='text-sm font-medium'>Connection</div>
              <div className='text-xl font-bold'>{metrics.effectiveType}</div>
              <div className='text-xs text-gray-500'>
                {metrics.rtt ? `${metrics.rtt}ms RTT` : 'Unknown RTT'}
              </div>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Upload className='w-5 h-5 text-purple-500' />
            <div>
              <div className='text-sm font-medium'>Resources</div>
              <div className='text-xl font-bold'>{metrics.resourceCount}</div>
              <div className='text-xs text-gray-500'>
                {formatBytes(metrics.resourceSize)}
              </div>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center space-x-3'>
            <Activity className='w-5 h-5 text-orange-500' />
            <div>
              <div className='text-sm font-medium'>Memory</div>
              <div className='text-xl font-bold'>
                {metrics.usedJSHeapSize
                  ? formatBytes(metrics.usedJSHeapSize)
                  : 'N/A'}
              </div>
              <div className='text-xs text-gray-500'>
                {metrics.jsHeapSizeLimit
                  ? `of ${formatBytes(metrics.jsHeapSizeLimit)}`
                  : 'Heap usage'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card className='p-6'>
        <h3 className='text-lg font-semibold mb-4'>Detailed Metrics</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h4 className='font-medium mb-2'>Page Load Timing</h4>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>First Contentful Paint:</span>
                <span className={getMetricColor('fcp', metrics.fcp)}>
                  {formatMs(metrics.fcp)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Time to First Byte:</span>
                <span className={getMetricColor('ttfb', metrics.ttfb)}>
                  {formatMs(metrics.ttfb)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>DOM Content Loaded:</span>
                <span>{formatMs(metrics.domContentLoaded)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Load Complete:</span>
                <span>{formatMs(metrics.loadComplete)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className='font-medium mb-2'>Network Information</h4>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>Connection Type:</span>
                <span>{metrics.connectionType}</span>
              </div>
              <div className='flex justify-between'>
                <span>Effective Type:</span>
                <span>{metrics.effectiveType}</span>
              </div>
              <div className='flex justify-between'>
                <span>Round Trip Time:</span>
                <span>{metrics.rtt ? `${metrics.rtt}ms` : 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span>Downlink:</span>
                <span>
                  {metrics.downlink ? `${metrics.downlink} Mbps` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
