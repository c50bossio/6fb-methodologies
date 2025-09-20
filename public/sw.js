// Service Worker for 6FB Methodologies Workshop
// Version 2.0.0 - Enhanced Workbook Support & Performance

const CACHE_NAME = '6fb-methodologies-v2.0';
const STATIC_CACHE_NAME = '6fb-static-v2.0';
const CRITICAL_CACHE_NAME = '6fb-critical-v2.0';
const IMAGE_CACHE_NAME = '6fb-images-v2.0';
const WORKBOOK_CACHE_NAME = '6fb-workbook-v2.0';
const AUDIO_CACHE_NAME = '6fb-audio-v2.0';

// Critical assets to cache immediately (anti-flash)
const CRITICAL_ASSETS = [
  '/',
  '/workbook',
  '/pricing',
  '/register',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/images/6fb-banner.png',
];

// Workbook-specific patterns for caching
const WORKBOOK_PATTERNS = [
  '/workbook/',
  '/api/workbook/modules',
  '/api/workbook/progress',
  '/api/workbook/content',
];

// Audio file patterns (cache for offline access)
const AUDIO_PATTERNS = [
  '/api/workbook/audio',
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
];

// Static assets that change rarely
const PRECACHE_ASSETS = [
  // Add actual static assets here when available
];

// Assets to cache on first request
const RUNTIME_CACHE_URLS = ['/fonts/', '/images/', '/css/', '/_next/static/'];

// Install event - cache essential assets
self.addEventListener('install', event => {
  console.log('[SW] Installing anti-flash service worker v1.1');

  event.waitUntil(
    Promise.all([
      // Cache critical assets with high priority
      caches.open(CRITICAL_CACHE_NAME).then(cache => {
        console.log('[SW] Precaching critical assets');
        return cache.addAll(
          CRITICAL_ASSETS.map(
            url =>
              new Request(url, {
                cache: 'reload',
                priority: 'high',
                mode: 'cors',
              })
          )
        );
      }),
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(
          PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' }))
        );
      }),
    ]).catch(error => {
      console.error('[SW] Precaching failed:', error);
    })
  );

  // Force activation of new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating anti-flash service worker');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith('6fb-') &&
                ![
                  CACHE_NAME,
                  STATIC_CACHE_NAME,
                  CRITICAL_CACHE_NAME,
                  IMAGE_CACHE_NAME,
                  WORKBOOK_CACHE_NAME,
                  AUDIO_CACHE_NAME,
                ].includes(cacheName)
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Notify clients of activation for immediate cache refresh
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '1.3',
            timestamp: Date.now(),
          });
        });
      }),
    ])
  );

  // Take control of all pages immediately to prevent stale content
  self.clients.claim();
});

// Fetch event - optimized anti-flash strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle workbook API requests specially
  if (url.pathname.startsWith('/api/workbook/')) {
    if (isWorkbookCacheable(url.pathname)) {
      event.respondWith(workbookCacheStrategy(request));
      return;
    } else {
      // Skip real-time APIs (auth, sessions, live data)
      return;
    }
  }

  // Skip other API requests that should always be fresh
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip browser extension and development tool requests
  if (
    url.pathname.includes('/.well-known/') ||
    url.pathname.includes('/chrome-extension/') ||
    url.pathname.includes('/__nextjs_') ||
    url.pathname.includes('appspecific') ||
    url.searchParams.has('__nextjs_hmr')
  ) {
    return;
  }

  try {
    // Special handling for HTML pages to prevent content flash
    if (request.destination === 'document') {
      event.respondWith(staleWhileRevalidate(request, CRITICAL_CACHE_NAME));
    }
    // Handle critical assets with cache-first for instant loading
    else if (isCriticalAsset(url.pathname)) {
      event.respondWith(cacheFirst(request, CRITICAL_CACHE_NAME));
    }
    // Handle static assets with cache-first
    else if (shouldUseCacheFirst(request)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    }
    // Handle images with separate cache
    else if (request.destination === 'image') {
      event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    }
    // Handle audio files for workbook
    else if (isAudioRequest(request)) {
      event.respondWith(audioCacheStrategy(request));
    }
    // Handle workbook pages
    else if (isWorkbookPage(url.pathname)) {
      event.respondWith(workbookPageStrategy(request));
    }
    // Everything else uses network-first with better error handling
    else {
      event.respondWith(networkFirst(request));
    }
  } catch (error) {
    console.error('[SW] Fetch event handler error:', error);
  }
});

// Check if asset is critical for initial render
function isCriticalAsset(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/_next/static/chunks/app/') ||
    pathname.startsWith('/_next/static/css/') ||
    pathname === '/images/6fb-banner.png'
  );
}

// Stale-while-revalidate strategy (prevents content flash)
async function staleWhileRevalidate(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Always try to fetch in background
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        // Clone and cache the response
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('[SW] Network fetch failed:', error);
      return cachedResponse; // Return cached version on network failure
    });

  // Return cached version immediately if available, otherwise wait for network
  if (cachedResponse) {
    // Serve from cache instantly to prevent flash
    return cachedResponse;
  } else {
    // Wait for network if no cache available
    return fetchPromise;
  }
}

// Network first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    );

    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise,
    ]);

    // Cache successful responses
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      networkResponse.status < 400
    ) {
      const cache = await caches.open(CACHE_NAME);
      // Only cache responses that are safe to cache
      if (request.method === 'GET' && !request.url.includes('/api/')) {
        cache.put(request, networkResponse.clone()).catch(err => {
          console.log('[SW] Cache put failed:', err);
        });
      }
    }

    return networkResponse;
  } catch (error) {
    // Reduce noise in console for expected failures
    if (error.message !== 'Request timeout') {
      console.log(
        '[SW] Network failed for:',
        request.url.split('?')[0],
        error.message
      );
    }

    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url.split('?')[0]);
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Offline - 6FB Methodologies</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 2rem;
              background: #1a1a1a;
              color: #ffffff;
            }
            .container { max-width: 400px; margin: 0 auto; }
            .btn {
              background: #00C851;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button class="btn" onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    throw error;
  }
}

// Cache first strategy (for static assets - prevents flash)
async function cacheFirst(request, cacheName = STATIC_CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Serve from cache immediately for instant loading
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache the response for future requests
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch and cache:', request.url, error);
    throw error;
  }
}

// Determine caching strategy based on request
function shouldUseNetworkFirst(request) {
  const url = new URL(request.url);

  // Use network first for HTML pages and API calls
  return (
    request.destination === 'document' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.html')
  );
}

function shouldUseCacheFirst(request) {
  const url = new URL(request.url);

  // Use cache first for static assets
  return (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/_next/static/')
  );
}

// Handle background sync (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'background-sync') {
      event.waitUntil(handleBackgroundSync());
    }
  });
}

// Background sync handler
async function handleBackgroundSync() {
  try {
    // Attempt to sync any pending data
    console.log('[SW] Performing background sync');

    // Add your background sync logic here
    // For example: sync form submissions, analytics data, etc.
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle push notifications (if supported)
if ('push' in self.registration) {
  self.addEventListener('push', event => {
    console.log('[SW] Push notification received');

    const options = {
      body: 'You have a new update from 6FB Methodologies',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1',
      },
    };

    event.waitUntil(
      self.registration.showNotification('6FB Methodologies', options)
    );
  });

  self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    event.waitUntil(self.clients.openWindow('/'));
  });
}

// =============================================================================
// Workbook-specific caching strategies
// =============================================================================

// Check if workbook API endpoint is cacheable
function isWorkbookCacheable(pathname) {
  const cacheableEndpoints = [
    '/api/workbook/modules',
    '/api/workbook/content',
    '/api/workbook/lessons',
    '/api/workbook/progress',
  ];

  return cacheableEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

// Check if request is for audio content
function isAudioRequest(request) {
  const url = new URL(request.url);
  return AUDIO_PATTERNS.some(pattern =>
    url.pathname.includes(pattern) || request.destination === 'audio'
  );
}

// Check if page is workbook-related
function isWorkbookPage(pathname) {
  return pathname.startsWith('/workbook/');
}

// Workbook cache strategy - network first with extended cache
async function workbookCacheStrategy(request) {
  const cache = await caches.open(WORKBOOK_CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses for 5 minutes
      const clonedResponse = networkResponse.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('sw-cached-at', Date.now().toString());

      const cachedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers,
      });

      cache.put(request, cachedResponse);
    }

    return networkResponse;
  } catch (error) {
    // Return cached version if network fails
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is still valid (5 minutes)
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const cacheAge = Date.now() - parseInt(cachedAt || '0');
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < maxAge) {
        console.log('[SW] Serving fresh workbook data from cache');
        return cachedResponse;
      }
    }

    throw error;
  }
}

// Audio cache strategy - cache first with long expiration
async function audioCacheStrategy(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving audio from cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache audio files for long term (30 days)
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached audio file:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch audio:', request.url, error);
    throw error;
  }
}

// Workbook page strategy - enhanced stale-while-revalidate
async function workbookPageStrategy(request) {
  const cache = await caches.open(WORKBOOK_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Always try to update in background
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('[SW] Workbook page network fetch failed:', error);
      return cachedResponse;
    });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Wait for network if no cache available
  return fetchPromise;
}

// Enhanced performance monitoring
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  errors: 0,
  averageResponseTime: 0,
  lastUpdated: Date.now(),
};

// Track cache performance
function trackCacheHit() {
  performanceMetrics.cacheHits++;
  updateMetrics();
}

function trackCacheMiss() {
  performanceMetrics.cacheMisses++;
  performanceMetrics.networkRequests++;
  updateMetrics();
}

function trackError() {
  performanceMetrics.errors++;
  updateMetrics();
}

function updateMetrics() {
  performanceMetrics.lastUpdated = Date.now();

  // Send metrics to main thread occasionally
  if (performanceMetrics.cacheHits % 10 === 0) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_METRICS',
          metrics: performanceMetrics,
        });
      });
    });
  }
}

// Handle performance monitoring messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_METRICS') {
    event.ports[0].postMessage({
      type: 'SW_METRICS',
      metrics: performanceMetrics,
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    const cacheType = event.data.cacheType;

    if (cacheType && cacheType !== 'all') {
      const cacheNames = {
        workbook: WORKBOOK_CACHE_NAME,
        audio: AUDIO_CACHE_NAME,
        images: IMAGE_CACHE_NAME,
        static: STATIC_CACHE_NAME,
      };

      if (cacheNames[cacheType]) {
        caches.delete(cacheNames[cacheType]).then(() => {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            cacheType,
          });
        });
      }
    } else {
      // Clear all caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('6fb-'))
            .map(name => caches.delete(name))
        );
      }).then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED',
          cacheType: 'all',
        });
      });
    }
  }
});

console.log('[SW] Enhanced service worker v2.0 loaded and ready');
