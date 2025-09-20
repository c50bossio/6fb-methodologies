// Enhanced Workbook Authentication and Authorization Middleware
// Comprehensive security, role-based access control, and session management

import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import {
  UserSessionSchema,
  JWTPayloadSchema,
  RefreshTokenPayloadSchema,
  validateAndSanitizeEmail,
  type UserSession,
  type JWTPayload,
  type RefreshTokenPayload,
  type SubscriptionTier,
} from '@/lib/validation/workbook-schemas';
import {
  type WorkbookAuthSession,
  type AuthResult,
  type PermissionResult,
} from '@/types/workbook-api';

// ==============================================================
// CONFIGURATION AND CONSTANTS
// ==============================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.WORKBOOK_JWT_SECRET || 'your-super-secret-jwt-key-for-workbook-auth'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.WORKBOOK_REFRESH_SECRET || 'your-super-secret-refresh-key-for-workbook'
);

const JWT_ISSUER = '6fb-methodologies';
const JWT_AUDIENCE = 'workbook-users';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REMEMBER_ME_EXPIRY = '30d'; // 30 days

// Session configuration
const SESSION_COOKIE_NAME = 'workbook-session';
const REFRESH_COOKIE_NAME = 'workbook-refresh';
const CSRF_HEADER_NAME = 'x-csrf-token';

// ==============================================================
// ENHANCED PERMISSIONS SYSTEM
// ==============================================================

/**
 * Comprehensive permission definitions for workbook system
 */
export const WORKBOOK_PERMISSIONS = {
  // Content access permissions
  VIEW_CONTENT: 'workbook:content:view',
  VIEW_PREMIUM_CONTENT: 'workbook:content:view:premium',
  VIEW_VIP_CONTENT: 'workbook:content:view:vip',
  VIEW_ENTERPRISE_CONTENT: 'workbook:content:view:enterprise',

  // Progress and completion permissions
  SAVE_PROGRESS: 'workbook:progress:save',
  VIEW_PROGRESS: 'workbook:progress:view',
  VIEW_ALL_PROGRESS: 'workbook:progress:view:all',
  COMPLETE_LESSONS: 'workbook:lessons:complete',
  COMPLETE_MODULES: 'workbook:modules:complete',

  // Content creation and management
  CREATE_CONTENT: 'workbook:content:create',
  EDIT_CONTENT: 'workbook:content:edit',
  DELETE_CONTENT: 'workbook:content:delete',
  PUBLISH_CONTENT: 'workbook:content:publish',

  // User management
  VIEW_USERS: 'workbook:users:view',
  EDIT_USERS: 'workbook:users:edit',
  DELETE_USERS: 'workbook:users:delete',
  MANAGE_SUBSCRIPTIONS: 'workbook:subscriptions:manage',

  // Administrative permissions
  ADMIN: 'workbook:admin',
  SUPER_ADMIN: 'workbook:super_admin',
  INSTRUCTOR: 'workbook:instructor',
  MODERATOR: 'workbook:moderator',

  // Analytics and reporting
  VIEW_ANALYTICS: 'workbook:analytics:view',
  EXPORT_DATA: 'workbook:data:export',

  // System permissions
  MANAGE_SYSTEM: 'workbook:system:manage',
  VIEW_LOGS: 'workbook:logs:view',
  MANAGE_INTEGRATIONS: 'workbook:integrations:manage',
} as const;

/**
 * Permission sets by subscription tier
 */
const TIER_PERMISSIONS: Record<SubscriptionTier, string[]> = {
  basic: [
    WORKBOOK_PERMISSIONS.VIEW_CONTENT,
    WORKBOOK_PERMISSIONS.SAVE_PROGRESS,
    WORKBOOK_PERMISSIONS.VIEW_PROGRESS,
    WORKBOOK_PERMISSIONS.COMPLETE_LESSONS,
    WORKBOOK_PERMISSIONS.COMPLETE_MODULES,
  ],
  premium: [
    ...TIER_PERMISSIONS.basic,
    WORKBOOK_PERMISSIONS.VIEW_PREMIUM_CONTENT,
  ],
  vip: [
    ...TIER_PERMISSIONS.premium,
    WORKBOOK_PERMISSIONS.VIEW_VIP_CONTENT,
  ],
  enterprise: [
    ...TIER_PERMISSIONS.vip,
    WORKBOOK_PERMISSIONS.VIEW_ENTERPRISE_CONTENT,
    WORKBOOK_PERMISSIONS.VIEW_ANALYTICS,
    WORKBOOK_PERMISSIONS.INSTRUCTOR,
  ],
} as const;

/**
 * Role-based additional permissions
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  instructor: [
    WORKBOOK_PERMISSIONS.INSTRUCTOR,
    WORKBOOK_PERMISSIONS.CREATE_CONTENT,
    WORKBOOK_PERMISSIONS.EDIT_CONTENT,
    WORKBOOK_PERMISSIONS.VIEW_ALL_PROGRESS,
    WORKBOOK_PERMISSIONS.VIEW_ANALYTICS,
  ],
  moderator: [
    WORKBOOK_PERMISSIONS.MODERATOR,
    WORKBOOK_PERMISSIONS.VIEW_USERS,
    WORKBOOK_PERMISSIONS.EDIT_CONTENT,
    WORKBOOK_PERMISSIONS.PUBLISH_CONTENT,
  ],
  admin: [
    WORKBOOK_PERMISSIONS.ADMIN,
    WORKBOOK_PERMISSIONS.CREATE_CONTENT,
    WORKBOOK_PERMISSIONS.EDIT_CONTENT,
    WORKBOOK_PERMISSIONS.DELETE_CONTENT,
    WORKBOOK_PERMISSIONS.PUBLISH_CONTENT,
    WORKBOOK_PERMISSIONS.VIEW_USERS,
    WORKBOOK_PERMISSIONS.EDIT_USERS,
    WORKBOOK_PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    WORKBOOK_PERMISSIONS.VIEW_ANALYTICS,
    WORKBOOK_PERMISSIONS.EXPORT_DATA,
    WORKBOOK_PERMISSIONS.VIEW_LOGS,
  ],
  super_admin: [
    WORKBOOK_PERMISSIONS.SUPER_ADMIN,
    WORKBOOK_PERMISSIONS.DELETE_USERS,
    WORKBOOK_PERMISSIONS.MANAGE_SYSTEM,
    WORKBOOK_PERMISSIONS.MANAGE_INTEGRATIONS,
    ...ROLE_PERMISSIONS.admin,
  ],
};

// ==============================================================
// SESSION SECURITY FEATURES
// ==============================================================

/**
 * Security configuration
 */
interface SecurityConfig {
  maxSessionDuration: number; // Maximum session duration in milliseconds
  maxConcurrentSessions: number; // Maximum concurrent sessions per user
  requireCsrfToken: boolean; // Require CSRF token for state-changing operations
  requireSecureHeaders: boolean; // Require security headers
  ipWhitelist?: string[]; // Optional IP whitelist
  deviceTracking: boolean; // Track device fingerprints
  suspiciousActivityDetection: boolean; // Detect suspicious activity patterns
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentSessions: 5,
  requireCsrfToken: true,
  requireSecureHeaders: true,
  deviceTracking: true,
  suspiciousActivityDetection: true,
};

/**
 * Session metadata for security tracking
 */
interface SessionMetadata {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  securityFlags: {
    suspiciousActivity: boolean;
    forcedLogout: boolean;
    deviceChanged: boolean;
  };
}

/**
 * Enhanced session with security metadata
 */
interface EnhancedSession extends WorkbookAuthSession {
  metadata: SessionMetadata;
  csrfToken?: string;
  refreshToken?: string;
}

// ==============================================================
// AUTHENTICATION FUNCTIONS
// ==============================================================

/**
 * Generate secure JWT access token
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
  expiresIn: string = ACCESS_TOKEN_EXPIRY
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + parseExpirationTime(expiresIn);

  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: expiration,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  // Validate payload structure
  const validatedPayload = JWTPayloadSchema.parse(jwtPayload);

  return await new SignJWT(validatedPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(expiration)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(JWT_SECRET);
}

/**
 * Generate secure refresh token
 */
export async function generateRefreshToken(
  userId: string,
  expiresIn: string = REFRESH_TOKEN_EXPIRY
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + parseExpirationTime(expiresIn);

  const payload: RefreshTokenPayload = {
    userId,
    type: 'refresh',
    iat: now,
    exp: expiration,
    iss: JWT_ISSUER,
  };

  // Validate payload structure
  const validatedPayload = RefreshTokenPayloadSchema.parse(payload);

  return await new SignJWT(validatedPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(expiration)
    .setIssuer(JWT_ISSUER)
    .sign(REFRESH_SECRET);
}

/**
 * Verify and decode JWT access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 30, // 30 seconds clock tolerance
    });

    // Validate payload structure
    return JWTPayloadSchema.parse(payload);
  } catch (error) {
    throw new Error(`Invalid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify and decode refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      issuer: JWT_ISSUER,
      clockTolerance: 30,
    });

    // Validate payload structure
    return RefreshTokenPayloadSchema.parse(payload);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, maxAge: number = 60 * 60 * 1000): boolean {
  try {
    const [timestampStr, random] = token.split('-');
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // Check if token is not too old
    if (now - timestamp > maxAge) {
      return false;
    }

    // Check if random part exists and is valid format
    return random && random.length >= 8;
  } catch {
    return false;
  }
}

// ==============================================================
// SESSION MANAGEMENT
// ==============================================================

/**
 * Extract authentication token from request
 */
export function extractAuthToken(request: NextRequest): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (sessionCookie) {
    return sessionCookie.value;
  }

  // Try API key header
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    return apiKey;
  }

  return null;
}

/**
 * Extract refresh token from request
 */
export function extractRefreshToken(request: NextRequest): string | null {
  // Try refresh cookie
  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME);
  if (refreshCookie) {
    return refreshCookie.value;
  }

  // Try refresh header
  const refreshHeader = request.headers.get('X-Refresh-Token');
  if (refreshHeader) {
    return refreshHeader;
  }

  return null;
}

/**
 * Extract CSRF token from request
 */
export function extractCsrfToken(request: NextRequest): string | null {
  // Try CSRF header
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
  if (csrfHeader) {
    return csrfHeader;
  }

  // Try form data for POST requests
  if (request.method === 'POST') {
    // Note: In practice, you'd parse the form data here
    // This is a simplified implementation
  }

  return null;
}

/**
 * Create session metadata from request
 */
function createSessionMetadata(request: NextRequest): SessionMetadata {
  const now = Date.now();
  const ipAddress = getClientIpAddress(request);
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  return {
    ipAddress,
    userAgent,
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 1,
    securityFlags: {
      suspiciousActivity: false,
      forcedLogout: false,
      deviceChanged: false,
    },
  };
}

/**
 * Get client IP address from request
 */
function getClientIpAddress(request: NextRequest): string {
  // Try various headers for real IP address
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('X-Real-IP');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to connection remote address
  return request.ip || 'unknown';
}

// ==============================================================
// PERMISSION AND ACCESS CONTROL
// ==============================================================

/**
 * Get permissions for user based on subscription tier and roles
 */
export function getUserPermissions(
  subscriptionTier: SubscriptionTier,
  roles: string[] = []
): string[] {
  // Start with tier-based permissions
  const tierPermissions = TIER_PERMISSIONS[subscriptionTier] || [];

  // Add role-based permissions
  const rolePermissions = roles.flatMap(role =>
    ROLE_PERMISSIONS[role] || []
  );

  // Combine and deduplicate permissions
  return [...new Set([...tierPermissions, ...rolePermissions])];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  session: WorkbookAuthSession | JWTPayload,
  requiredPermission: string
): boolean {
  if (!session || !session.permissions) {
    return false;
  }

  // Check for specific permission
  if (session.permissions.includes(requiredPermission)) {
    return true;
  }

  // Check for admin permissions (admins have all permissions)
  if (session.permissions.includes(WORKBOOK_PERMISSIONS.SUPER_ADMIN) ||
      session.permissions.includes(WORKBOOK_PERMISSIONS.ADMIN)) {
    return true;
  }

  return false;
}

/**
 * Check multiple permissions (user must have ALL permissions)
 */
export function hasAllPermissions(
  session: WorkbookAuthSession | JWTPayload,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(permission =>
    hasPermission(session, permission)
  );
}

/**
 * Check multiple permissions (user must have ANY permission)
 */
export function hasAnyPermission(
  session: WorkbookAuthSession | JWTPayload,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(permission =>
    hasPermission(session, permission)
  );
}

/**
 * Validate permission result
 */
export function validatePermissions(
  session: WorkbookAuthSession | JWTPayload,
  requiredPermissions: string | string[]
): PermissionResult {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const hasRequiredPermissions = hasAllPermissions(session, permissions);

  return {
    hasPermission: hasRequiredPermissions,
    requiredPermission: permissions.join(', '),
    userPermissions: session.permissions || [],
  };
}

// ==============================================================
// SESSION VALIDATION AND SECURITY
// ==============================================================

/**
 * Validate session with comprehensive security checks
 */
export async function validateSession(
  session: WorkbookAuthSession | JWTPayload | null,
  request?: NextRequest,
  config: Partial<SecurityConfig> = {}
): Promise<{
  isValid: boolean;
  session?: WorkbookAuthSession;
  error?: string;
  code?: string;
  requiresRefresh?: boolean;
}> {
  const securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  if (!session) {
    return {
      isValid: false,
      error: 'No session provided',
      code: 'NO_SESSION',
    };
  }

  try {
    // Validate session structure
    const validatedSession = UserSessionSchema.parse({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      permissions: session.permissions,
    });

    // Create enhanced session
    const enhancedSession: WorkbookAuthSession = {
      ...validatedSession,
      workshopAccessGranted: true, // This would be checked from database
      expiresAt: session.exp * 1000, // Convert to milliseconds
    };

    // Check session expiration
    const now = Date.now();
    if (session.exp && session.exp * 1000 < now) {
      return {
        isValid: false,
        error: 'Session has expired',
        code: 'SESSION_EXPIRED',
        requiresRefresh: true,
      };
    }

    // Check maximum session duration
    if (session.iat && (now - session.iat * 1000) > securityConfig.maxSessionDuration) {
      return {
        isValid: false,
        error: 'Session has exceeded maximum duration',
        code: 'SESSION_TOO_OLD',
        requiresRefresh: true,
      };
    }

    // Additional security checks if request is provided
    if (request) {
      // Check CSRF token for state-changing operations
      if (securityConfig.requireCsrfToken &&
          ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const csrfToken = extractCsrfToken(request);
        if (!csrfToken || !validateCsrfToken(csrfToken)) {
          return {
            isValid: false,
            error: 'Invalid or missing CSRF token',
            code: 'INVALID_CSRF_TOKEN',
          };
        }
      }

      // Check IP whitelist if configured
      if (securityConfig.ipWhitelist) {
        const clientIp = getClientIpAddress(request);
        if (!securityConfig.ipWhitelist.includes(clientIp)) {
          return {
            isValid: false,
            error: 'IP address not in whitelist',
            code: 'IP_NOT_WHITELISTED',
          };
        }
      }

      // Check security headers
      if (securityConfig.requireSecureHeaders) {
        const requiredHeaders = ['User-Agent'];
        for (const header of requiredHeaders) {
          if (!request.headers.get(header)) {
            return {
              isValid: false,
              error: `Missing required security header: ${header}`,
              code: 'MISSING_SECURITY_HEADERS',
            };
          }
        }
      }
    }

    return {
      isValid: true,
      session: enhancedSession,
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Session validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'VALIDATION_ERROR',
    };
  }
}

/**
 * Authenticate request with comprehensive security checks
 */
export async function authenticateRequest(
  request: NextRequest,
  config: Partial<SecurityConfig> = {}
): Promise<AuthResult> {
  try {
    // Extract authentication token
    const token = extractAuthToken(request);
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'Authentication token required',
        status: 401,
      };
    }

    // Verify and decode token
    let payload: JWTPayload;
    try {
      payload = await verifyAccessToken(token);
    } catch (error) {
      return {
        isAuthenticated: false,
        error: `Invalid authentication token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 401,
      };
    }

    // Validate session
    const validation = await validateSession(payload, request, config);
    if (!validation.isValid) {
      return {
        isAuthenticated: false,
        error: validation.error || 'Session validation failed',
        status: validation.requiresRefresh ? 401 : 403,
      };
    }

    return {
      isAuthenticated: true,
      session: validation.session!,
    };

  } catch (error) {
    return {
      isAuthenticated: false,
      error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 500,
    };
  }
}

// ==============================================================
// UTILITY FUNCTIONS
// ==============================================================

/**
 * Parse expiration time string to seconds
 */
function parseExpirationTime(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration time format: ${expiresIn}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Sanitize email for security
 */
export function sanitizeEmail(email: string): string {
  return validateAndSanitizeEmail(email);
}

/**
 * Create secure session context
 */
export async function createSessionContext(
  user: {
    userId: string;
    email: string;
    name: string;
    role: string;
    subscriptionTier: SubscriptionTier;
    additionalRoles?: string[];
  },
  request: NextRequest,
  options: {
    rememberMe?: boolean;
    generateRefresh?: boolean;
  } = {}
): Promise<{
  accessToken: string;
  refreshToken?: string;
  csrfToken: string;
  session: WorkbookAuthSession;
  metadata: SessionMetadata;
}> {
  // Generate user permissions
  const permissions = getUserPermissions(
    user.subscriptionTier,
    user.additionalRoles
  );

  // Create JWT payload
  const jwtPayload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role as any,
    permissions,
  };

  // Generate tokens
  const expiryTime = options.rememberMe ? REMEMBER_ME_EXPIRY : ACCESS_TOKEN_EXPIRY;
  const accessToken = await generateAccessToken(jwtPayload, expiryTime);

  let refreshToken: string | undefined;
  if (options.generateRefresh) {
    const refreshExpiryTime = options.rememberMe ? '60d' : REFRESH_TOKEN_EXPIRY;
    refreshToken = await generateRefreshToken(user.userId, refreshExpiryTime);
  }

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  // Create session
  const session: WorkbookAuthSession = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role as any,
    permissions,
    workshopAccessGranted: true,
    expiresAt: Date.now() + parseExpirationTime(expiryTime) * 1000,
  };

  // Create session metadata
  const metadata = createSessionMetadata(request);

  return {
    accessToken,
    refreshToken,
    csrfToken,
    session,
    metadata,
  };
}

// Export legacy compatibility functions
export const extractToken = extractAuthToken;
export const verifyToken = verifyAccessToken;

// Export constants for backward compatibility
export { WORKBOOK_PERMISSIONS } from './workbook-auth';