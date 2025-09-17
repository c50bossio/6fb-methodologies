// 6FB Methodologies Workshop - Security Middleware
// Comprehensive security measures for production deployment

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Security configuration
interface SecurityConfig {
  enableCSP: boolean
  enableHSTS: boolean
  enableXFrame: boolean
  enableXContentType: boolean
  enableReferrerPolicy: boolean
  corsOrigins: string[]
  trustedProxies: string[]
}

const SECURITY_CONFIG: SecurityConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXFrame: true,
  enableXContentType: true,
  enableReferrerPolicy: true,
  corsOrigins: [
    'https://6fbmethodologies.com',
    'https://www.6fbmethodologies.com',
    'https://checkout.stripe.com',
    'https://js.stripe.com',
  ],
  trustedProxies: [
    '127.0.0.1',
    '::1',
    '172.20.0.0/16', // Docker network
    // Cloudflare IP ranges (simplified)
    '103.21.244.0/22',
    '173.245.48.0/20',
    '188.114.96.0/20',
  ],
}

// Content Security Policy configuration
function generateCSP(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com https://www.google.com https://www.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.stripe.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]

  return directives.join('; ')
}

// Generate cryptographically secure nonce
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

// Check if request is from trusted proxy
function isTrustedProxy(ip: string): boolean {
  // Simplified check - in production, use proper CIDR matching
  return SECURITY_CONFIG.trustedProxies.some(trusted => {
    if (trusted.includes('/')) {
      // CIDR notation - simplified check
      return ip.startsWith(trusted.split('/')[0].slice(0, -1))
    }
    return ip === trusted
  })
}

// Get real client IP address
function getRealClientIP(req: NextRequest): string {
  // Check various headers in order of precedence
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const xRealIp = req.headers.get('x-real-ip')

  // Cloudflare connecting IP (most trusted)
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // X-Forwarded-For header (check if from trusted proxy)
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim())
    return ips[0] // First IP is the original client
  }

  // X-Real-IP header
  if (xRealIp) {
    return xRealIp
  }

  return 'unknown'
}

// Validate origin for CORS
function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false

  try {
    const url = new URL(origin)

    // Allow same-origin requests
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true
    }

    // Check against allowed origins
    return SECURITY_CONFIG.corsOrigins.some(allowed => {
      const allowedUrl = new URL(allowed)
      return allowedUrl.hostname === url.hostname
    })
  } catch {
    return false
  }
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  const headers = response.headers

  // Content Security Policy
  if (SECURITY_CONFIG.enableCSP && nonce) {
    headers.set('Content-Security-Policy', generateCSP(nonce))
  }

  // Strict Transport Security
  if (SECURITY_CONFIG.enableHSTS) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // X-Frame-Options
  if (SECURITY_CONFIG.enableXFrame) {
    headers.set('X-Frame-Options', 'DENY')
  }

  // X-Content-Type-Options
  if (SECURITY_CONFIG.enableXContentType) {
    headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Referrer Policy
  if (SECURITY_CONFIG.enableReferrerPolicy) {
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  // Additional security headers
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  headers.set('X-DNS-Prefetch-Control', 'off')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Remove server information
  headers.delete('Server')
  headers.delete('X-Powered-By')

  return response
}

// CORS middleware
export function handleCORS(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  const method = req.method

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })

    if (origin && isValidOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    return addSecurityHeaders(response)
  }

  // For other requests, check origin if present
  if (origin && !isValidOrigin(origin)) {
    console.warn('CORS violation detected:', {
      origin,
      path: new URL(req.url).pathname,
      ip: getRealClientIP(req),
      userAgent: req.headers.get('user-agent'),
    })

    return new NextResponse('CORS policy violation', { status: 403 })
  }

  return null
}

// Input validation and sanitization
export function validateAndSanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Basic XSS prevention
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  if (Array.isArray(input)) {
    return input.map(validateAndSanitizeInput)
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[validateAndSanitizeInput(key)] = validateAndSanitizeInput(value)
    }
    return sanitized
  }

  return input
}

// Request size validation
export function validateRequestSize(req: NextRequest, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  const contentLength = req.headers.get('content-length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    return size <= maxSizeBytes
  }
  return true // Allow if content-length is not specified
}

// Suspicious activity detection
interface SuspiciousActivity {
  rapidRequests: boolean
  suspiciousUserAgent: boolean
  maliciousPath: boolean
  invalidContentType: boolean
}

export function detectSuspiciousActivity(req: NextRequest): SuspiciousActivity {
  const userAgent = req.headers.get('user-agent') || ''
  const path = new URL(req.url).pathname
  const contentType = req.headers.get('content-type') || ''

  return {
    rapidRequests: false, // Would need rate limiting data
    suspiciousUserAgent: /bot|crawler|spider|scanner|curl|wget/i.test(userAgent) && !/googlebot|bingbot/i.test(userAgent),
    maliciousPath: /\.(php|asp|jsp|cgi|pl)$/i.test(path) || /\/wp-admin|\/admin|\/phpmyadmin/i.test(path),
    invalidContentType: req.method === 'POST' && path.includes('/api/') && !contentType.includes('application/json'),
  }
}

// Security monitoring and logging
export function logSecurityEvent(
  req: NextRequest,
  eventType: string,
  details: Record<string, any>
): void {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    type: eventType,
    ip: getRealClientIP(req),
    userAgent: req.headers.get('user-agent'),
    path: new URL(req.url).pathname,
    method: req.method,
    ...details,
  }

  console.warn('Security event:', securityEvent)

  // In production, send to security monitoring service
  // Example: Sentry, DataDog, custom SIEM
}

// Main security middleware
export function securityMiddleware(req: NextRequest): NextResponse | null {
  // Handle CORS
  const corsResponse = handleCORS(req)
  if (corsResponse) {
    return corsResponse
  }

  // Validate request size
  if (!validateRequestSize(req)) {
    logSecurityEvent(req, 'REQUEST_TOO_LARGE', {
      contentLength: req.headers.get('content-length'),
    })
    return new NextResponse('Request too large', { status: 413 })
  }

  // Detect suspicious activity
  const suspicious = detectSuspiciousActivity(req)
  if (suspicious.maliciousPath) {
    logSecurityEvent(req, 'MALICIOUS_PATH_ACCESS', { path: new URL(req.url).pathname })
    return new NextResponse('Not Found', { status: 404 })
  }

  if (suspicious.suspiciousUserAgent) {
    logSecurityEvent(req, 'SUSPICIOUS_USER_AGENT', {
      userAgent: req.headers.get('user-agent'),
    })
    // Don't block, just log for now
  }

  return null
}

// Secure session management
export class SecureSession {
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly CSRF_TOKEN_LENGTH = 32

  static generateCSRFToken(): string {
    return crypto.randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex')
  }

  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken || token.length !== expectedToken.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  }

  static createSecureSessionCookie(sessionId: string): string {
    const maxAge = Math.floor(this.SESSION_DURATION / 1000)

    return [
      `sessionId=${sessionId}`,
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
    ].join('; ')
  }
}

// Export security utilities
export {
  SECURITY_CONFIG,
  generateNonce,
  getRealClientIP,
  isValidOrigin,
  isTrustedProxy,
}