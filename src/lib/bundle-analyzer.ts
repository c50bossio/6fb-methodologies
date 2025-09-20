/**
 * Bundle Analyzer - Runtime bundle analysis and optimization suggestions
 * Provides insights into bundle size, loading performance, and optimization opportunities
 */

interface BundleChunk {
  name: string;
  size: number;
  loadTime: number;
  cached: boolean;
  critical: boolean;
  dependencies: string[];
  route?: string;
}

interface BundleAnalysis {
  totalSize: number;
  criticalSize: number;
  nonCriticalSize: number;
  loadTime: number;
  cacheHitRate: number;
  chunks: BundleChunk[];
  recommendations: BundleRecommendation[];
  metrics: BundleMetrics;
}

interface BundleRecommendation {
  type: 'size' | 'performance' | 'caching' | 'splitting';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  solution: string;
  estimatedSavings?: {
    size?: number;
    loadTime?: number;
  };
}

interface BundleMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  resourceLoadTime: number;
  mainThreadBlockingTime: number;
}

class BundleAnalyzer {
  private chunks: Map<string, BundleChunk> = new Map();
  private loadStartTimes: Map<string, number> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    this.setupPerformanceObserver();
    this.setupMutationObserver();
    this.trackInitialLoad();
  }

  /**
   * Setup performance observer to track resource loading
   */
  private setupPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    try {
      this.performanceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            this.trackResourceLoad(entry as PerformanceResourceTiming);
          } else if (entry.entryType === 'navigation') {
            this.trackNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
      });

      this.performanceObserver.observe({
        entryTypes: ['resource', 'navigation'],
        buffered: true,
      });
    } catch (error) {
      console.warn('Failed to setup performance observer:', error);
    }
  }

  /**
   * Setup mutation observer to track dynamic imports
   */
  private setupMutationObserver() {
    if (!window.MutationObserver) return;

    this.mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && element.getAttribute('src')) {
              this.trackDynamicScript(element as HTMLScriptElement);
            }
          }
        });
      });
    });

    this.mutationObserver.observe(document.head, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Track initial page load resources
   */
  private trackInitialLoad() {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    resources.forEach(resource => {
      this.trackResourceLoad(resource);
    });
  }

  /**
   * Track resource loading
   */
  private trackResourceLoad(resource: PerformanceResourceTiming) {
    const url = new URL(resource.name);
    const pathname = url.pathname;

    // Only track JS and CSS bundles
    if (
      !pathname.includes('/_next/static/') ||
      (!pathname.endsWith('.js') && !pathname.endsWith('.css'))
    ) {
      return;
    }

    const chunkName = this.extractChunkName(pathname);
    const size = resource.transferSize || resource.encodedBodySize || 0;
    const loadTime = resource.responseEnd - resource.startTime;
    const cached = resource.transferSize === 0 && resource.encodedBodySize > 0;

    const chunk: BundleChunk = {
      name: chunkName,
      size,
      loadTime,
      cached,
      critical: this.isCriticalChunk(chunkName),
      dependencies: this.extractDependencies(chunkName),
      route: this.extractRoute(chunkName),
    };

    this.chunks.set(chunkName, chunk);
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming(navigation: PerformanceNavigationTiming) {
    // Store navigation metrics for analysis
  }

  /**
   * Track dynamically loaded scripts
   */
  private trackDynamicScript(script: HTMLScriptElement) {
    const src = script.src;
    if (!src.includes('/_next/static/')) return;

    const chunkName = this.extractChunkName(src);
    const startTime = performance.now();

    this.loadStartTimes.set(chunkName, startTime);

    script.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;

      const chunk = this.chunks.get(chunkName);
      if (chunk) {
        chunk.loadTime = loadTime;
      }
    });

    script.addEventListener('error', () => {
      console.error(`Failed to load chunk: ${chunkName}`);
    });
  }

  /**
   * Extract chunk name from path
   */
  private extractChunkName(path: string): string {
    const matches = path.match(/\/_next\/static\/chunks\/(.+?)\./);
    if (matches) return matches[1];

    const filename = path.split('/').pop() || 'unknown';
    return filename.replace(/\.[^.]+$/, '');
  }

  /**
   * Determine if chunk is critical for initial render
   */
  private isCriticalChunk(chunkName: string): boolean {
    const criticalPatterns = [
      'main',
      'app',
      'pages/_app',
      'runtime',
      'webpack',
      'framework',
    ];

    return criticalPatterns.some(pattern => chunkName.includes(pattern));
  }

  /**
   * Extract dependencies from chunk name
   */
  private extractDependencies(chunkName: string): string[] {
    // This would require build-time analysis or manifest parsing
    // For now, return empty array
    return [];
  }

  /**
   * Extract route from chunk name
   */
  private extractRoute(chunkName: string): string | undefined {
    if (chunkName.includes('pages/')) {
      return chunkName.replace('pages/', '/').replace(/\./g, '/');
    }
    return undefined;
  }

  /**
   * Analyze bundle performance and generate recommendations
   */
  async analyze(): Promise<BundleAnalysis> {
    const chunks = Array.from(this.chunks.values());
    const metrics = await this.collectMetrics();

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const criticalSize = chunks
      .filter(chunk => chunk.critical)
      .reduce((sum, chunk) => sum + chunk.size, 0);
    const nonCriticalSize = totalSize - criticalSize;

    const totalLoadTime = Math.max(...chunks.map(chunk => chunk.loadTime));
    const cachedChunks = chunks.filter(chunk => chunk.cached).length;
    const cacheHitRate =
      chunks.length > 0 ? (cachedChunks / chunks.length) * 100 : 0;

    const recommendations = this.generateRecommendations(chunks, metrics);

    return {
      totalSize,
      criticalSize,
      nonCriticalSize,
      loadTime: totalLoadTime,
      cacheHitRate,
      chunks,
      recommendations,
      metrics,
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<BundleMetrics> {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const fcp =
      paint.find(entry => entry.name === 'first-contentful-paint')?.startTime ||
      0;
    const lcp = await this.getLargestContentfulPaint();
    const cls = await this.getCumulativeLayoutShift();
    const tti = await this.getTimeToInteractive();

    return {
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      cumulativeLayoutShift: cls,
      timeToInteractive: tti,
      resourceLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
      mainThreadBlockingTime: this.calculateMainThreadBlockingTime(),
    };
  }

  /**
   * Get Largest Contentful Paint
   */
  private getLargestContentfulPaint(): Promise<number> {
    return new Promise(resolve => {
      if (!window.PerformanceObserver) {
        resolve(0);
        return;
      }

      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry?.startTime || 0);
          observer.disconnect();
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Timeout after 2 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 2000);
      } catch (error) {
        resolve(0);
      }
    });
  }

  /**
   * Get Cumulative Layout Shift
   */
  private getCumulativeLayoutShift(): Promise<number> {
    return new Promise(resolve => {
      if (!window.PerformanceObserver) {
        resolve(0);
        return;
      }

      let cls = 0;

      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          });
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(cls);
        }, 2000);
      } catch (error) {
        resolve(0);
      }
    });
  }

  /**
   * Estimate Time to Interactive
   */
  private getTimeToInteractive(): Promise<number> {
    return new Promise(resolve => {
      // Simplified TTI calculation
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const tti = navigation.domInteractive - navigation.navigationStart;
      resolve(tti);
    });
  }

  /**
   * Calculate Total Blocking Time
   */
  private calculateTotalBlockingTime(): number {
    // This would require long task API
    return 0;
  }

  /**
   * Calculate Main Thread Blocking Time
   */
  private calculateMainThreadBlockingTime(): number {
    // This would require long task API
    return 0;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    chunks: BundleChunk[],
    metrics: BundleMetrics
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];

    // Large bundle size recommendations
    const largeCriticalChunks = chunks.filter(
      chunk => chunk.critical && chunk.size > 250000
    ); // 250KB
    if (largeCriticalChunks.length > 0) {
      recommendations.push({
        type: 'size',
        severity: 'high',
        title: 'Large Critical Bundles Detected',
        description: `${largeCriticalChunks.length} critical chunks are larger than 250KB`,
        impact: 'Delays initial page render and increases Time to Interactive',
        solution:
          'Split large chunks, remove unused dependencies, or defer non-critical code',
        estimatedSavings: {
          size: largeCriticalChunks.reduce(
            (sum, chunk) => sum + Math.max(0, chunk.size - 250000),
            0
          ),
          loadTime: largeCriticalChunks.length * 200, // Rough estimate
        },
      });
    }

    // Poor cache hit rate
    const cacheHitRate =
      (chunks.filter(chunk => chunk.cached).length / chunks.length) * 100;
    if (cacheHitRate < 60 && chunks.length > 5) {
      recommendations.push({
        type: 'caching',
        severity: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Only ${Math.round(cacheHitRate)}% of chunks are being served from cache`,
        impact: 'Increased loading times for returning users',
        solution: 'Implement better caching strategies or check cache headers',
      });
    }

    // Slow LCP
    if (metrics.largestContentfulPaint > 4000) {
      recommendations.push({
        type: 'performance',
        severity: 'critical',
        title: 'Poor Largest Contentful Paint',
        description: `LCP is ${Math.round(metrics.largestContentfulPaint)}ms (should be < 2.5s)`,
        impact: 'Poor user experience and SEO ranking',
        solution:
          'Optimize critical resources, preload important content, or improve server response times',
        estimatedSavings: {
          loadTime: metrics.largestContentfulPaint - 2500,
        },
      });
    }

    // High CLS
    if (metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        title: 'High Cumulative Layout Shift',
        description: `CLS is ${metrics.cumulativeLayoutShift.toFixed(3)} (should be < 0.1)`,
        impact: 'Poor user experience due to unexpected layout changes',
        solution:
          'Add dimensions to images, avoid dynamic content insertion, or use CSS transforms',
      });
    }

    // Too many small chunks
    const smallChunks = chunks.filter(
      chunk => chunk.size < 10000 && !chunk.critical
    ); // 10KB
    if (smallChunks.length > 10) {
      recommendations.push({
        type: 'splitting',
        severity: 'medium',
        title: 'Too Many Small Chunks',
        description: `${smallChunks.length} chunks are smaller than 10KB`,
        impact: 'Increased HTTP overhead and connection costs',
        solution: 'Combine small chunks or adjust chunk splitting strategy',
        estimatedSavings: {
          loadTime: smallChunks.length * 50, // Overhead per request
        },
      });
    }

    // Unused route chunks
    const routeChunks = chunks.filter(chunk => chunk.route && !chunk.critical);
    const currentRoute = window.location.pathname;
    const unusedRouteChunks = routeChunks.filter(
      chunk =>
        chunk.route !== currentRoute && !chunk.route?.startsWith(currentRoute)
    );

    if (unusedRouteChunks.length > 3) {
      recommendations.push({
        type: 'splitting',
        severity: 'low',
        title: 'Unused Route Chunks Loaded',
        description: `${unusedRouteChunks.length} route chunks are loaded but not needed for current page`,
        impact: 'Unnecessary bandwidth usage and slower initial load',
        solution: 'Implement proper route-based code splitting',
        estimatedSavings: {
          size: unusedRouteChunks.reduce((sum, chunk) => sum + chunk.size, 0),
        },
      });
    }

    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get bundle analysis summary
   */
  getSummary() {
    const chunks = Array.from(this.chunks.values());

    return {
      totalChunks: chunks.length,
      criticalChunks: chunks.filter(chunk => chunk.critical).length,
      totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      averageChunkSize:
        chunks.length > 0
          ? chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunks.length
          : 0,
      cacheHitRate:
        chunks.length > 0
          ? (chunks.filter(chunk => chunk.cached).length / chunks.length) * 100
          : 0,
    };
  }

  /**
   * Export analysis data
   */
  exportAnalysis(): string {
    const analysis = this.getSummary();
    const chunks = Array.from(this.chunks.values());

    const data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      analysis,
      chunks: chunks.map(chunk => ({
        name: chunk.name,
        size: chunk.size,
        loadTime: chunk.loadTime,
        cached: chunk.cached,
        critical: chunk.critical,
        route: chunk.route,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clean up observers
   */
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// React hook for bundle analysis
import { useEffect, useState } from 'react';

export function useBundleAnalysis() {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeBundle = async () => {
    setLoading(true);
    try {
      const result = await bundleAnalyzer.analyze();
      setAnalysis(result);
    } catch (error) {
      console.error('Bundle analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Analyze after page load
    if (document.readyState === 'complete') {
      setTimeout(analyzeBundle, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(analyzeBundle, 1000);
      });
    }
  }, []);

  return {
    analysis,
    loading,
    refresh: analyzeBundle,
    summary: bundleAnalyzer.getSummary(),
    export: bundleAnalyzer.exportAnalysis,
  };
}
