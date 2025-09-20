'use client';

import { useEffect } from 'react';

export function PerformanceOptimizer() {
  useEffect(() => {
    // Prevent Flash of Unstyled Content (FOUC)
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';

    // Performance optimizations
    const optimizePerformance = () => {
      // Preload critical resources
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          // Preload next page routes that user might visit
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = '/pricing';
          document.head.appendChild(link);

          const registerLink = document.createElement('link');
          registerLink.rel = 'prefetch';
          registerLink.href = '/register';
          document.head.appendChild(registerLink);
        });
      }

      // Optimize images loading
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
        if (img instanceof HTMLImageElement && !img.loading) {
          const rect = img.getBoundingClientRect();
          // Set loading="lazy" for images below the fold
          if (rect.top > window.innerHeight) {
            img.loading = 'lazy';
          }
        }
      });

      // Clear any cached content that might cause flashing
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('old') || cacheName.includes('stale')) {
              caches.delete(cacheName);
            }
          });
        });
      }
    };

    // Run optimizations
    optimizePerformance();

    // Set up performance observer for monitoring
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              // Log any performance issues in development
              if (process.env.NODE_ENV === 'development') {
                console.log('Navigation timing:', entry);
              }
            }
          });
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (e) {
        // PerformanceObserver not supported, ignore
      }
    }

    // Clean up memory on page unload
    const handleBeforeUnload = () => {
      // Clear any timers or intervals
      clearTimeout(window.setTimeout(() => {}, 0));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <style jsx global>{`
      /* Critical CSS to prevent FOUC */
      body {
        visibility: hidden;
        opacity: 0;
        transition: opacity 0.15s ease-in-out;
      }

      body.hydrated,
      body[style*='visibility: visible'] {
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Optimize font rendering */
      * {
        font-feature-settings: 'kern' 1;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Prevent layout shifts */
      .min-h-screen {
        min-height: 100vh;
        min-height: 100dvh;
      }

      /* Optimize images */
      img {
        max-width: 100%;
        height: auto;
      }

      /* Reduce motion for users who prefer it */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Improve scroll performance */
      * {
        scroll-behavior: smooth;
      }

      /* Content flash prevention */
      .hero-section,
      .pricing-section,
      .features-section {
        will-change: opacity;
        opacity: 1;
        transition: opacity 0.2s ease-in-out;
      }

      /* Optimize critical rendering path */
      .critical-content {
        contain: layout style paint;
        content-visibility: auto;
      }

      /* Prevent flash during route changes */
      [data-nextjs-router] {
        transition: opacity 0.15s ease-in-out;
      }

      /* Cache-busting for content updates */
      [data-version]:not(
        [data-version='${process.env.NODE_ENV === 'development'
          ? Date.now()
          : 'production'}']
      ) {
        display: none !important;
      }
    `}</style>
  );
}
