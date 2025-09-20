import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use encrypted cookies or session storage)
const csrfTokenStore = new Map<string, string>();

// Security configuration
const SECURITY_CONFIG = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
    blockDuration: 60 * 60 * 1000, // Block for 1 hour after exceeding limit
  },
  blockedPaths: [
    '/.env',
    '/config',
    '/backup',
    '/phpmyadmin',
    '/wp-admin',
    '/.git',
  ],
};

function getClientIP(request: NextRequest): string {
  // Try various headers to get real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteAddr || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.rateLimiting.windowMs,
    });
    return false;
  }

  if (record.count >= SECURITY_CONFIG.rateLimiting.maxRequests) {
    return true;
  }

  record.count += 1;
  return false;
}

function isBlockedPath(pathname: string): boolean {
  return SECURITY_CONFIG.blockedPaths.some(blocked =>
    pathname.toLowerCase().includes(blocked.toLowerCase())
  );
}

function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function validateCSRFToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) return false;
  const storedToken = csrfTokenStore.get(sessionId);
  return storedToken === token;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const clientIP = getClientIP(request);

  // Block suspicious paths immediately
  if (isBlockedPath(pathname)) {
    console.warn(
      `Blocked suspicious path attempt: ${pathname} from IP: ${clientIP}`
    );
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Apply rate limiting (bypass for localhost in development)
  const isLocalhost =
    clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'unknown';
  const shouldApplyRateLimit = !(
    process.env.NODE_ENV === 'development' && isLocalhost
  );

  if (shouldApplyRateLimit && isRateLimited(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '3600', // 1 hour
        'X-RateLimit-Limit':
          SECURITY_CONFIG.rateLimiting.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(
          Date.now() + SECURITY_CONFIG.rateLimiting.blockDuration
        ).toISOString(),
      },
    });
  }

  // Set comprehensive security headers
  const securityHeaders = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      pathname.startsWith('/workbook') || pathname.startsWith('/api/workbook')
        ? // Relaxed CSP for workbook functionality
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.openai.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https: blob:; " +
          "connect-src 'self' https://api.openai.com https://api.stripe.com; " +
          "media-src 'self' blob: data:; " +
          "worker-src 'self' blob:; " +
          "frame-src 'self'; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self';"
        : // Standard CSP for regular pages
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https: blob:; " +
          "connect-src 'self' https://api.stripe.com https://hooks.zapier.com https://analytics.google.com; " +
          'frame-src https://js.stripe.com https://hooks.stripe.com; ' +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self' https://checkout.stripe.com; " +
          'upgrade-insecure-requests; ' +
          'block-all-mixed-content',

    // MIME type sniffing protection
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // HSTS (HTTP Strict Transport Security)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Remove server information
    'X-Powered-By': '',
    Server: '',

    // Permissions Policy (formerly Feature Policy) - Updated to remove deprecated features
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.stripe.com"), ' +
      'accelerometer=(), autoplay=(), encrypted-media=(), fullscreen=(), gyroscope=(), ' +
      'magnetometer=(), midi=(), sync-xhr=(), usb=(), web-share=()',

    // Cross-Origin policies (relaxed for workbook API)
    'Cross-Origin-Opener-Policy': pathname.startsWith('/api/workbook')
      ? 'same-origin-allow-popups'
      : 'same-origin',
    'Cross-Origin-Embedder-Policy': pathname.startsWith('/api/workbook')
      ? 'unsafe-none'
      : 'require-corp',
    'Cross-Origin-Resource-Policy': pathname.startsWith('/api/workbook')
      ? 'cross-origin'
      : 'same-origin',

    // Additional security headers
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };

  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Handle CSRF protection for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const isAPIRoute = pathname.startsWith('/api/');

    if (isAPIRoute) {
      const csrfToken = request.headers.get('x-csrf-token');
      const sessionId = request.headers.get('x-session-id') || clientIP;

      // Skip CSRF for webhooks, payment endpoints, and test endpoints (they use signature verification or are for testing)
      const skipCSRF =
        pathname.includes('/webhooks/') ||
        pathname.includes('/test-email') ||
        pathname.includes('/verify-member') ||
        pathname.includes('/create-checkout-session') ||
        (process.env.NODE_ENV === 'development' && pathname.includes('/api/'));

      if (!skipCSRF) {
        if (!csrfToken || !validateCSRFToken(csrfToken, sessionId)) {
          console.warn(
            `CSRF token validation failed for ${pathname} from IP: ${clientIP}`
          );
          return new NextResponse('CSRF Token Invalid', { status: 403 });
        }
      }
    }
  }

  // Generate and store CSRF token for GET requests
  if (request.method === 'GET' && !pathname.startsWith('/api/')) {
    const sessionId = request.headers.get('x-session-id') || clientIP;
    const csrfToken = generateCSRFToken();
    csrfTokenStore.set(sessionId, csrfToken);
    response.headers.set('X-CSRF-Token', csrfToken);
  }

  // Add rate limit headers
  const record = rateLimitStore.get(clientIP);
  if (record) {
    response.headers.set(
      'X-RateLimit-Limit',
      SECURITY_CONFIG.rateLimiting.maxRequests.toString()
    );
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(
        0,
        SECURITY_CONFIG.rateLimiting.maxRequests - record.count
      ).toString()
    );
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(record.resetTime).toISOString()
    );
  }

  // Note: Workbook authentication is handled at the API route level
  // since middleware cannot be async in Next.js. Each protected
  // workbook API route will handle authentication individually.

  // Enhanced security monitoring and logging
  if (pathname.startsWith('/api/')) {
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Basic security monitoring - enhanced suspicious activity detection disabled
    // to avoid workbook-auth dependencies

    // Enhanced API request logging
    console.log(
      `API Request: ${request.method} ${pathname} from IP: ${clientIP} UA: ${userAgent.substring(0, 50)}...`
    );

    // Log workbook specific activities
    if (pathname.startsWith('/api/workbook/')) {
      // Security event recording disabled to avoid crypto dependencies
      console.log(
        `Workbook API access: ${request.method} ${pathname} from ${clientIP}`
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
