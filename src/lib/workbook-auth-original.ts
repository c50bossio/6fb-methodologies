// import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { verify6FBMembership, MemberVerificationResult } from './stripe';
// import crypto from 'crypto';
// import bcrypt from 'bcryptjs';

// JWT Configuration
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Security Configuration
const BCRYPT_ROUNDS = 12; // High security for password hashing
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const CSRF_TOKEN_LENGTH = 32;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Security monitoring
interface SecurityEvent {
  type:
    | 'auth_attempt'
    | 'auth_success'
    | 'auth_failure'
    | 'token_refresh'
    | 'suspicious_activity';
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  timestamp: number;
  details?: Record<string, any>;
}

// In-memory store for failed attempts and security events
const failedAttempts = new Map<
  string,
  { count: number; lastAttempt: number; lockedUntil?: number }
>();
const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000; // Keep last 1000 events

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

// Type alias for compatibility with audio recording system
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

// Workshop access permissions
export const WORKBOOK_PERMISSIONS = {
  VIEW_CONTENT: 'view_content',
  RECORD_AUDIO: 'record_audio',
  TRANSCRIBE_AUDIO: 'transcribe_audio',
  SAVE_PROGRESS: 'save_progress',
  EXPORT_NOTES: 'export_notes',
  ACCESS_VIP_CONTENT: 'access_vip_content',
} as const;

// Map user roles to permissions
function getRolePermissions(role: WorkbookRole): string[] {
  const basePermissions = [
    WORKBOOK_PERMISSIONS.VIEW_CONTENT,
    WORKBOOK_PERMISSIONS.SAVE_PROGRESS,
  ];

  switch (role) {
    case WorkbookRole.VIP:
      return [
        ...basePermissions,
        WORKBOOK_PERMISSIONS.RECORD_AUDIO,
        WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO,
        WORKBOOK_PERMISSIONS.EXPORT_NOTES,
        WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT,
      ];
    case WorkbookRole.PREMIUM:
      return [
        ...basePermissions,
        WORKBOOK_PERMISSIONS.RECORD_AUDIO,
        WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO,
        WORKBOOK_PERMISSIONS.EXPORT_NOTES,
      ];
    case WorkbookRole.BASIC:
    default:
      return basePermissions;
  }
}

// Determine user role based on Stripe membership
function determineUserRole(memberInfo: MemberVerificationResult): WorkbookRole {
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

// Generate JWT token
export function generateToken(
  payload: Omit<WorkbookSession, 'iat' | 'exp'>
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: '6fb-methodologies',
    audience: 'workbook-users',
  });
}

// Generate refresh token
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: '6fb-methodologies',
  });
}

// Verify JWT token
export function verifyToken(token: string): WorkbookSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: '6fb-methodologies',
      audience: 'workbook-users',
    }) as WorkbookSession;

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: '6fb-methodologies',
    }) as any;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return { userId: decoded.userId };
  } catch (error) {
    console.error('Refresh token verification failed:', error);
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

// Authenticate user with email/password or session verification
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
    if (
      options.request &&
      detectSuspiciousActivity(options.request, normalizedEmail)
    ) {
      return {
        success: false,
        error: 'suspicious_activity',
        message: 'Request blocked due to suspicious activity',
      };
    }

    // Validate email input
    const emailValidation = validateInput(normalizedEmail, 'email');
    if (!emailValidation.isValid) {
      return {
        success: false,
        error: 'invalid_input',
        message: emailValidation.error || 'Invalid email format',
      };
    }

    // If password is provided, verify it against stored workbook users
    if (options.password) {
      // Validate password input
      const passwordValidation = validateInput(options.password, 'password');
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'invalid_input',
          message: passwordValidation.error || 'Invalid password format',
        };
      }

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

    // Verify 6FB membership via Stripe
    let memberInfo: MemberVerificationResult = { isVerified: false };

    if (options.verifyMembership !== false) {
      memberInfo = await verify6FBMembership(normalizedEmail);
    }

    // Determine user role
    const role = determineUserRole(memberInfo);
    const permissions = getRolePermissions(role);

    // Create session payload
    const sessionPayload = {
      userId:
        options.customerId ||
        memberInfo.member?.customerId ||
        `user_${Date.now()}`,
      email: normalizedEmail,
      name: memberInfo.member?.name || 'Workshop Participant',
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
        email: normalizedEmail,
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

// Refresh authentication token
export async function refreshAuthToken(
  refreshToken: string
): Promise<AuthResult> {
  try {
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return {
        success: false,
        error: 'Invalid refresh token',
      };
    }

    // Re-authenticate user (simplified - in production you'd fetch from database)
    // For now, we'll create a basic session
    const sessionPayload = {
      userId: decoded.userId,
      email: 'refreshed_user@example.com', // In production, fetch from database
      name: 'Workshop Participant',
      role: WorkbookRole.BASIC,
      permissions: getRolePermissions(WorkbookRole.BASIC),
    };

    const newToken = generateToken(sessionPayload);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    return {
      success: true,
      session: {
        ...sessionPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'Token refresh failed',
    };
  }
}

// Validate user has specific permission
export function hasPermission(
  session: WorkbookSession,
  permission: string
): boolean {
  return session.permissions.includes(permission);
}

// Check if user can access VIP content
export function canAccessVIPContent(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT);
}

// Check if user can record audio
export function canRecordAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.RECORD_AUDIO);
}

// Check if user can transcribe audio
export function canTranscribeAudio(session: WorkbookSession): boolean {
  return hasPermission(session, WORKBOOK_PERMISSIONS.TRANSCRIBE_AUDIO);
}

// Rate limiting configuration per user role
export const RATE_LIMITS = {
  [WorkbookRole.BASIC]: {
    audioRecordings: { limit: 5, window: 3600 }, // 5 per hour
    transcriptions: { limit: 10, window: 3600 }, // 10 per hour
    apiCalls: { limit: 100, window: 3600 }, // 100 per hour
  },
  [WorkbookRole.PREMIUM]: {
    audioRecordings: { limit: 20, window: 3600 }, // 20 per hour
    transcriptions: { limit: 50, window: 3600 }, // 50 per hour
    apiCalls: { limit: 500, window: 3600 }, // 500 per hour
  },
  [WorkbookRole.VIP]: {
    audioRecordings: { limit: 100, window: 3600 }, // 100 per hour
    transcriptions: { limit: 200, window: 3600 }, // 200 per hour
    apiCalls: { limit: 1000, window: 3600 }, // 1000 per hour
  },
} as const;

// Get rate limits for user role
export function getRateLimits(role: WorkbookRole) {
  return RATE_LIMITS[role];
}

// Session validation middleware function
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

// Security headers for workbook API responses (backward compatibility)
export const WORKBOOK_SECURITY_HEADERS = getSecurityHeaders(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);

// User Progress Management Functions
// Simple localStorage-based progress saving for client-side workbook

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

/**
 * Clear all user progress data
 */
export function clearUserProgress(userId: string): void {
  try {
    const keys = Object.keys(localStorage);
    const userKeys = keys.filter(key => key.startsWith(`workbook_${userId}_`));

    userKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear user progress:', error);
  }
}

/**
 * Get all available progress keys for a user
 */
export function getUserProgressKeys(userId: string): string[] {
  try {
    const keys = Object.keys(localStorage);
    const userKeys = keys.filter(key => key.startsWith(`workbook_${userId}_`));

    return userKeys.map(key => key.replace(`workbook_${userId}_`, ''));
  } catch (error) {
    console.error('Failed to get user progress keys:', error);
    return [];
  }
}

// Workbook User Management (Simple in-memory storage for MVP)
// TODO: Replace with database storage in production

interface WorkbookUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  ticketType: string;
  stripeSessionId: string;
  createdAt: string;
}

// In-memory storage for workbook users (for development)
const workbookUsers = new Map<string, WorkbookUser>();

// Initialize default test users for development
function initializeTestUsers() {
  if (process.env.NODE_ENV === 'development') {
    const defaultUsers: WorkbookUser[] = [
      {
        email: 'test@6fbmethodologies.com',
        password: '6FB-TEST-1234',
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
      {
        email: 'admin@6fbmethodologies.com',
        password: '6FB-ADMIN-TEST',
        firstName: 'Admin',
        lastName: 'User',
        ticketType: 'PREMIUM',
        stripeSessionId: 'test_admin_session',
        createdAt: new Date().toISOString(),
      },
    ];

    defaultUsers.forEach(user => {
      const normalizedEmail = user.email.toLowerCase().trim();
      workbookUsers.set(normalizedEmail, user);
    });

    console.log(
      `🔧 Initialized ${defaultUsers.length} test users for development`
    );
  }
}

/**
 * Generate secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate input for common security issues
 */
export function validateInput(
  input: string,
  type: 'email' | 'password' | 'general'
): {
  isValid: boolean;
  error?: string;
} {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input is required' };
  }

  // Check for common injection patterns
  const sqlInjectionPattern = /('|(\-\-)|(;)|(\||\|)|(\*|\*))/;
  const xssPattern = /<script[^>]*>.*?<\/script>/gi;
  const htmlPattern = /<[^>]+>/;

  if (sqlInjectionPattern.test(input)) {
    return { isValid: false, error: 'Invalid characters detected' };
  }

  if (xssPattern.test(input) && type === 'general') {
    return { isValid: false, error: 'HTML/script content not allowed' };
  }

  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        return { isValid: false, error: 'Invalid email format' };
      }
      if (input.length > 254) {
        return { isValid: false, error: 'Email too long' };
      }
      break;

    case 'password':
      if (input.length < 6) {
        return { isValid: false, error: 'Password too short' };
      }
      if (input.length > 128) {
        return { isValid: false, error: 'Password too long' };
      }
      break;

    case 'general':
      if (input.length > 1000) {
        return { isValid: false, error: 'Input too long' };
      }
      break;
  }

  return { isValid: true };
}

/**
 * Check for suspicious request patterns
 */
export function detectSuspiciousActivity(
  request: NextRequest,
  userEmail?: string
): boolean {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
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

/**
 * Enhanced security headers for different environments
 */
export function getSecurityHeaders(
  environment: 'development' | 'production' = 'development'
): Record<string, string> {
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };

  if (environment === 'production') {
    return {
      ...baseHeaders,
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.openai.com; " +
        "connect-src 'self' https://api.openai.com https://api.stripe.com; " +
        "media-src 'self' blob: data:; " +
        "worker-src 'self' blob:; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';",
    };
  }

  return {
    ...baseHeaders,
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.openai.com; " +
      "connect-src 'self' https://api.openai.com; " +
      "media-src 'self' blob: data:; " +
      "worker-src 'self' blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "object-src 'none';",
  };
}

// Initialize test users on module load
initializeTestUsers();

/**
 * Store workbook user credentials with password hashing
 */
export async function storeWorkbookUser(user: WorkbookUser): Promise<void> {
  const normalizedEmail = user.email.toLowerCase().trim();

  // Hash password if not already hashed
  if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    user.password = await hashPassword(user.password);
  }

  workbookUsers.set(normalizedEmail, user);
  console.log(`📝 Stored workbook user: ${normalizedEmail}`);
}

/**
 * Store workbook user credentials (sync version for backward compatibility)
 */
export function storeWorkbookUserSync(user: WorkbookUser): void {
  const normalizedEmail = user.email.toLowerCase().trim();
  workbookUsers.set(normalizedEmail, user);
  console.log(`📝 Stored workbook user (sync): ${normalizedEmail}`);
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify password against hash
 */
export async function verifyPasswordHash(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Check if IP is currently locked out due to failed attempts
 */
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

/**
 * Record failed authentication attempt
 */
export function recordFailedAttempt(ip: string, email?: string): void {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  attempts.count += 1;
  attempts.lastAttempt = now;

  // Lock account if too many failures
  if (attempts.count >= FAILED_ATTEMPTS_LIMIT) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
    console.warn(
      `🚨 IP ${ip} locked out due to ${attempts.count} failed attempts`
    );
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

/**
 * Clear failed attempts for IP (on successful auth)
 */
export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

/**
 * Record security event
 */
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

/**
 * Get security events for monitoring
 */
export function getSecurityEvents(limit = 100): SecurityEvent[] {
  return securityEvents.slice(-limit);
}

/**
 * Verify workbook password against stored credentials
 * Enhanced with proper password hashing and brute force protection
 */
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

  // For backward compatibility, check if password is already hashed
  let isValid = false;
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    // Password is hashed
    isValid = await verifyPasswordHash(password.trim(), user.password);
  } else {
    // Legacy plain text password (for development/testing)
    isValid = user.password === password.trim();

    // Hash the password for future use
    if (isValid && process.env.NODE_ENV !== 'development') {
      try {
        user.password = await hashPassword(password.trim());
        workbookUsers.set(normalizedEmail, user);
        console.log(`🔐 Password hashed for user: ${normalizedEmail}`);
      } catch (error) {
        console.error('Failed to hash password:', error);
      }
    }
  }

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

/**
 * Get workbook user by email
 */
export function getWorkbookUser(email: string): WorkbookUser | null {
  const normalizedEmail = email.toLowerCase().trim();
  return workbookUsers.get(normalizedEmail) || null;
}

/**
 * Helper function to get client IP from NextRequest
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteAddr || 'unknown';
}
