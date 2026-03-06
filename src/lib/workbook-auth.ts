// Enhanced Workbook Authentication with simplified implementation
// Includes security functions without external crypto dependencies

import { NextRequest } from 'next/server';
import { verify6FBMembership, MemberVerificationResult } from './stripe';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Security Configuration
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_SECURITY_EVENTS = 1000;

// UUID namespace for consistent user ID generation
const USER_ID_NAMESPACE = '6fb37a3c-a4c3-4b2d-8e9f-1a2b3c4d5e6f';

// User ID conversion functions for database compatibility
export function stringToUuid(stringId: string): string {
  // If it's already a valid UUID, return it
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringId)) {
    return stringId;
  }

  // Generate a deterministic UUID from the string ID
  return uuidv5(stringId, USER_ID_NAMESPACE);
}

export function getDbUserId(sessionUserId: string): string {
  // Convert session user ID to database-compatible UUID
  return stringToUuid(sessionUserId);
}

// User roles for workbook access
export enum WorkbookRole {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

// Session data interface
export interface WorkbookSession {
  userId: string;
  email: string;
  name: string;
  role: WorkbookRole;
  stripeCustomerId?: string;
  workshopTickets?: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

// Type alias for compatibility
export type UserSession = WorkbookSession;

// Authentication result interface
export interface AuthResult {
  success: boolean;
  session?: WorkbookSession;
  token?: string;
  refreshToken?: string;
  error?: string;
  message?: string;
}

// Security monitoring
interface SecurityEvent {
  type: 'auth_attempt' | 'auth_success' | 'auth_failure' | 'token_refresh' | 'suspicious_activity';
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  timestamp: number;
  details?: Record<string, any>;
}

// Permissions
export const WORKBOOK_PERMISSIONS = {
  VIEW_CONTENT: 'view_content',
  RECORD_AUDIO: 'record_audio',
  TRANSCRIBE_AUDIO: 'transcribe_audio',
  SAVE_PROGRESS: 'save_progress',
  EXPORT_NOTES: 'export_notes',
  ACCESS_VIP_CONTENT: 'access_vip_content',
} as const;

export const WORKBOOK_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, private, no-cache, must-revalidate',
};

// In-memory stores for security tracking
const failedAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();
const securityEvents: SecurityEvent[] = [];
const workbookUsers = new Map<string, any>();

// Initialize test users for development
if (process.env.NODE_ENV === 'development') {
  const testUsers = [
    {
      email: 'test@6fbmethodologies.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      ticketType: 'GA',
      stripeSessionId: 'test_dev_session',
      createdAt: new Date().toISOString(),
    },
    {
      email: 'dre@tomb45.com',
      password: '6FB-VIP-2024',
      firstName: 'Dre',
      lastName: 'Workshop Leader',
      ticketType: 'VIP',
      stripeSessionId: 'test_vip_session',
      createdAt: new Date().toISOString(),
    },
  ];

  testUsers.forEach(user => {
    workbookUsers.set(user.email.toLowerCase().trim(), user);
  });
}

// Map user roles to permissions - All roles have all permissions for development
function getRolePermissions(role: WorkbookRole): string[] {
  // Give all roles all permissions for simplified development testing
  const allPermissions = [
    WORKBOOK_PERMISSIONS.VIEW_CONTENT,
    WORKBOOK_PERMISSIONS.SAVE_PROGRESS,
    WORKBOOK_PERMISSIONS.RECORD_AUDIO,
    WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO,
    WORKBOOK_PERMISSIONS.EXPORT_NOTES,
    WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT,
  ];

  return allPermissions;
}

// Rate limiting configuration per user role (generous for development)
export const RATE_LIMITS = {
  [WorkbookRole.BASIC]: {
    audioRecordings: { limit: 100, window: 3600 }, // 100 per hour (generous for dev)
    transcriptions: { limit: 200, window: 3600 }, // 200 per hour
    apiCalls: { limit: 1000, window: 3600 }, // 1000 per hour
    liveSessionList: { limit: 100, window: 3600 }, // 100 per hour
  },
  [WorkbookRole.PREMIUM]: {
    audioRecordings: { limit: 200, window: 3600 }, // 200 per hour
    transcriptions: { limit: 500, window: 3600 }, // 500 per hour
    apiCalls: { limit: 2000, window: 3600 }, // 2000 per hour
    liveSessionList: { limit: 200, window: 3600 }, // 200 per hour
  },
  [WorkbookRole.VIP]: {
    audioRecordings: { limit: 500, window: 3600 }, // 500 per hour
    transcriptions: { limit: 1000, window: 3600 }, // 1000 per hour
    apiCalls: { limit: 5000, window: 3600 }, // 5000 per hour
    liveSessionList: { limit: 500, window: 3600 }, // 500 per hour
  },
} as const;

// Get rate limits for user role
export function getRateLimits(role: WorkbookRole) {
  return RATE_LIMITS[role];
}

// Check if user can record audio (always true since all roles have all permissions)
export function canRecordAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.RECORD_AUDIO);
}

// Check if user can transcribe audio (always true since all roles have all permissions)
export function canTranscribeAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO);
}

// Determine user role from test user ticketType (development only)
function determineTestUserRole(ticketType: string): WorkbookRole {
  const normalizedType = ticketType.toLowerCase().trim();

  switch (normalizedType) {
    case 'vip':
      return WorkbookRole.VIP;
    case 'premium':
    case 'pro':
      return WorkbookRole.PREMIUM;
    case 'ga':
    case 'general':
    case 'basic':
    default:
      return WorkbookRole.BASIC;
  }
}

// Determine user role based on Stripe membership or test user ticketType
function determineUserRole(memberInfo: MemberVerificationResult, testUser?: any): WorkbookRole {
  // In development, use test user ticketType if available
  if (process.env.NODE_ENV === 'development' && testUser?.ticketType) {
    return determineTestUserRole(testUser.ticketType);
  }

  if (!memberInfo.isVerified || !memberInfo.member) {
    return WorkbookRole.BASIC;
  }

  const membershipType = memberInfo.member.membershipType.toLowerCase();

  if (membershipType === 'vip') {
    return WorkbookRole.VIP;
  } else if (membershipType === 'premium' || membershipType === 'pro') {
    return WorkbookRole.PREMIUM;
  }

  return WorkbookRole.BASIC;
}

// Simple token generation (development only)
export function generateToken(payload: Omit<WorkbookSession, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
    iss: '6fb-methodologies', // Required by validation schema
    aud: 'workbook-users', // Required by validation schema
  };

  // Simple base64 encoding for development
  return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
}

// Simple refresh token generation
export function generateRefreshToken(userId: string): string {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    iss: '6fb-methodologies', // Required by validation schema
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Simple token verification with legacy JWT cleanup and type detection
export function verifyToken(token: string): WorkbookSession | null {
  try {
    // Check if this is a legacy JWT token (has dots indicating JWT format)
    if (token.includes('.') && token.split('.').length === 3) {
      console.log('Token verification failed: Legacy JWT token detected, needs cleanup');
      return null;
    }

    // Try to decode as base64 JSON
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

    // Check if this is a refresh token (not an access token)
    if (decoded.type === 'refresh') {
      console.log('Token verification failed: Refresh token provided instead of access token');
      return null;
    }

    // Check if this looks like our access token format (has userId, email, etc.)
    if (!decoded.userId || !decoded.email || !decoded.exp) {
      console.log('Token verification failed: Invalid access token structure');
      return null;
    }

    // Check required fields for validation
    if (!decoded.iss || !decoded.aud) {
      console.log('Token verification failed: Missing required iss/aud fields');
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp <= now) {
      console.log('Token verification failed: Token expired');
      return null;
    }

    return decoded as WorkbookSession;
  } catch (error) {
    // Token parsing failed - likely from old authentication system
    console.log('Token verification failed (likely old format):', error.message);
    return null;
  }
}

// Extract token from request headers
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies as fallback
  const tokenCookie = request.cookies.get('workbook-token');
  return tokenCookie?.value || null;
}

// Session validation
export function validateSession(session: WorkbookSession | null): {
  isValid: boolean;
  error?: string;
} {
  if (!session) {
    return { isValid: false, error: 'No session provided' };
  }

  // Check if session is expired
  const now = Math.floor(Date.now() / 1000);
  if (session.exp < now) {
    return { isValid: false, error: 'Session expired' };
  }

  // Check required fields
  if (!session.userId || !session.email) {
    return { isValid: false, error: 'Invalid session data' };
  }

  return { isValid: true };
}

// Permission checking
export function hasPermission(
  session: WorkbookSession | null,
  permission: string
): boolean {
  if (!session || !session.permissions) {
    return false;
  }
  return session.permissions.includes(permission);
}

// Get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteAddr || 'unknown';
}

// Check if IP is locked out
export function isIPLockedOut(ip: string): boolean {
  const attempts = failedAttempts.get(ip);
  if (!attempts || !attempts.lockedUntil) return false;

  if (Date.now() > attempts.lockedUntil) {
    // Lock period expired, reset attempts
    failedAttempts.delete(ip);
    return false;
  }

  return true;
}

// Record failed attempt
function recordFailedAttempt(ip: string, email?: string): void {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  attempts.count += 1;
  attempts.lastAttempt = now;

  // Lock account if too many failures
  if (attempts.count >= FAILED_ATTEMPTS_LIMIT) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
    console.warn(`🚨 IP ${ip} locked out due to ${attempts.count} failed attempts`);
  }

  failedAttempts.set(ip, attempts);

  // Record security event
  recordSecurityEvent({
    type: 'auth_failure',
    email,
    ip,
    timestamp: now,
    details: {
      attemptCount: attempts.count,
      isLockedOut: !!attempts.lockedUntil,
    },
  });
}

// Clear failed attempts
function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// Record security event
export function recordSecurityEvent(event: SecurityEvent): void {
  securityEvents.push(event);

  // Keep only recent events
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.splice(0, securityEvents.length - MAX_SECURITY_EVENTS);
  }

  // Log suspicious activities
  if (event.type === 'suspicious_activity') {
    console.warn('🚨 Suspicious activity detected:', event);
  }
}

// Detect suspicious activity
export function detectSuspiciousActivity(
  request: NextRequest,
  userEmail?: string
): boolean {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  // Check for common bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /go-http/i,
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    recordSecurityEvent({
      type: 'suspicious_activity',
      email: userEmail,
      ip,
      userAgent,
      timestamp: Date.now(),
      details: { reason: 'bot_detected', userAgent },
    });
    return true;
  }

  // Check for suspicious referers
  if (
    referer &&
    !referer.includes('6fbmethodologies.com') &&
    !referer.includes('localhost') &&
    referer.includes('http')
  ) {
    recordSecurityEvent({
      type: 'suspicious_activity',
      email: userEmail,
      ip,
      userAgent,
      timestamp: Date.now(),
      details: { reason: 'suspicious_referer', referer },
    });
    return true;
  }

  return false;
}

// Verify workbook password
export async function verifyWorkbookPassword(
  email: string,
  password: string,
  ip: string = 'unknown'
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if IP is locked out
  if (isIPLockedOut(ip)) {
    console.warn(`🚨 Authentication blocked for locked IP: ${ip}`);
    return false;
  }

  const user = workbookUsers.get(normalizedEmail);

  if (!user) {
    console.warn(`🔍 Workbook user not found: ${normalizedEmail}`);
    recordFailedAttempt(ip, email);
    return false;
  }

  // Simple password comparison for development
  const isValid = user.password === password.trim();

  if (isValid) {
    clearFailedAttempts(ip);
    recordSecurityEvent({
      type: 'auth_success',
      email: normalizedEmail,
      ip,
      timestamp: Date.now(),
    });
    console.log(`🔐 Password verification for ${normalizedEmail}: SUCCESS`);
  } else {
    recordFailedAttempt(ip, email);
    console.log(`🔐 Password verification for ${normalizedEmail}: FAILED`);
  }

  return isValid;
}

// Authenticate user
export async function authenticateUser(
  email: string,
  options: {
    verifyMembership?: boolean;
    customerId?: string;
    password?: string;
    ip?: string;
    userAgent?: string;
    request?: NextRequest;
  } = {}
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for suspicious activity
    if (options.request && detectSuspiciousActivity(options.request, normalizedEmail)) {
      return {
        success: false,
        error: 'suspicious_activity',
        message: 'Request blocked due to suspicious activity',
      };
    }

    // If password is provided, verify it
    if (options.password) {
      const passwordValid = await verifyWorkbookPassword(
        normalizedEmail,
        options.password,
        options.ip
      );
      if (!passwordValid) {
        return {
          success: false,
          error: 'invalid_credentials',
          message: 'Invalid email or access code',
        };
      }
    }

    // Check if this is a test user in development
    const testUser = process.env.NODE_ENV === 'development'
      ? workbookUsers.get(normalizedEmail)
      : null;

    // Verify 6FB membership via Stripe (skip for test users in development)
    let memberInfo: MemberVerificationResult = { isVerified: false };

    if (options.verifyMembership !== false && !testUser) {
      memberInfo = await verify6FBMembership(normalizedEmail);
    }

    // Determine user role (use test user ticketType in development)
    const role = determineUserRole(memberInfo, testUser);
    const permissions = getRolePermissions(role);

    // Create session payload
    const sessionPayload = {
      userId: options.customerId ||
              memberInfo.member?.customerId ||
              (testUser ? stringToUuid(normalizedEmail) : `user_${Date.now()}`),
      email: normalizedEmail,
      name: testUser
        ? `${testUser.firstName} ${testUser.lastName}`.trim()
        : (memberInfo.member?.name || 'Workshop Participant'),
      role,
      stripeCustomerId: memberInfo.member?.customerId,
      permissions,
    };

    // Generate tokens
    const token = generateToken(sessionPayload);
    const refreshToken = generateRefreshToken(sessionPayload.userId);

    // Record successful authentication
    recordSecurityEvent({
      type: 'auth_success',
      userId: sessionPayload.userId,
      email: normalizedEmail,
      ip: options.ip || 'unknown',
      userAgent: options.userAgent,
      timestamp: Date.now(),
      details: { role, membershipVerified: options.verifyMembership !== false },
    });

    return {
      success: true,
      session: {
        ...sessionPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      token,
      refreshToken,
      message: `Authenticated as ${role} user`,
    };
  } catch (error) {
    console.error('Authentication error:', error);

    // Record failed authentication
    if (options.ip) {
      recordSecurityEvent({
        type: 'auth_failure',
        email,
        ip: options.ip,
        userAgent: options.userAgent,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    return {
      success: false,
      error: 'authentication_failed',
      message: 'Unable to verify credentials',
    };
  }
}

// Verify refresh token (simplified version for development)
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    // In development, we use the same verification as regular tokens
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return null;
    }
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

// Refresh authentication token with updated permissions
export async function refreshAuthToken(refreshToken: string): Promise<AuthResult> {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return {
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired',
      };
    }

    // Extract user email from token to re-authenticate with current permission system
    const token = verifyToken(refreshToken);
    if (!token?.email) {
      return {
        success: false,
        error: 'Invalid token data',
        message: 'Unable to extract user information from token',
      };
    }

    // Re-authenticate user to get updated permissions
    const authResult = await authenticateUser(token.email, {
      verifyMembership: false, // Skip membership verification for refresh
    });

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Authentication failed',
        message: authResult.message || 'Unable to refresh authentication',
      };
    }

    return authResult;
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'Token refresh failed',
      message: 'An unexpected error occurred during token refresh',
    };
  }
}

// Client-side localStorage functions for user progress
/**
 * Save user progress data to localStorage
 */
export function saveUserProgress<T>(
  userId: string,
  key: string,
  data: T
): void {
  try {
    const storageKey = `workbook_${userId}_${key}`;
    const serializedData = JSON.stringify(data);
    localStorage.setItem(storageKey, serializedData);
  } catch (error) {
    console.error('Failed to save user progress:', error);
    throw new Error('Unable to save progress');
  }
}

/**
 * Load user progress data from localStorage
 */
export function loadUserProgress<T>(userId: string, key: string): T | null {
  try {
    const storageKey = `workbook_${userId}_${key}`;
    const serializedData = localStorage.getItem(storageKey);
    if (!serializedData) {
      return null;
    }
    return JSON.parse(serializedData) as T;
  } catch (error) {
    console.error('Failed to load user progress:', error);
    return null;
  }
}

// Additional placeholder exports for compatibility
export const generateCSRFToken = () => Math.random().toString(36).substring(2, 15);
export const generateSessionId = () => Math.random().toString(36).substring(2, 15);
export const hashPassword = async (password: string) => password; // Simple passthrough for dev
export const verifyPassword = async (password: string, hash: string) => password === hash;
