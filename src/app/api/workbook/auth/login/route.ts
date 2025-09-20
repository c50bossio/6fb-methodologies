import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  WORKBOOK_SECURITY_HEADERS,
  detectSuspiciousActivity,
  isIPLockedOut,
  recordSecurityEvent,
  getClientIP,
} from '@/lib/workbook-auth';
import { rateLimit } from '@/middleware/rate-limiting';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  ErrorResponseSchema,
  validateLoginRequest,
  type LoginRequest,
  type LoginResponse,
} from '@/lib/validation/auth-schemas';

// Enhanced error response helper
function createErrorResponse(
  error: string,
  message?: string,
  statusCode = 400,
  details?: Record<string, any>
): NextResponse {
  const errorData = {
    error,
    message: message || error,
    ...(details && { details }),
  };

  return NextResponse.json(errorData, {
    status: statusCode,
    headers: WORKBOOK_SECURITY_HEADERS,
  });
}

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per IP per window
  message: 'Too many authentication attempts, please try again later',
});

export async function POST(request: NextRequest) {
  try {
    // Get client information for security tracking
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`🔐 Workbook authentication attempt from IP: ${clientIP}`);

    // Check if IP is locked out due to failed attempts
    if (isIPLockedOut(clientIP)) {
      console.warn(`🚨 Login blocked for locked IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'ip_locked_out', action: 'login_attempt' }
      });

      return createErrorResponse(
        'Access temporarily restricted due to multiple failed attempts',
        'Too many failed login attempts. Please try again later.',
        429
      );
    }

    // Apply rate limiting
    const rateLimitResult = await authRateLimit(request);
    if (rateLimitResult) {
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'rate_limited', action: 'login_attempt' }
      });
      return rateLimitResult;
    }

    // Check for suspicious activity early
    if (detectSuspiciousActivity(request)) {
      console.warn(`🚨 Suspicious login attempt from IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'suspicious_activity',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'suspicious_request_detected', action: 'login_attempt' }
      });

      return createErrorResponse(
        'Request blocked due to suspicious activity',
        'Your request has been flagged for security review.',
        403
      );
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.warn(`❌ Invalid JSON body from IP: ${clientIP}`);
      return createErrorResponse(
        'Invalid request format',
        'Request body must be valid JSON.',
        400
      );
    }

    // Validate request using Zod schema
    let validatedData: LoginRequest;
    try {
      validatedData = validateLoginRequest(requestBody);
    } catch (error) {
      console.warn(`❌ Request validation failed from IP: ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'validation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'login_attempt'
        }
      });

      return createErrorResponse(
        'Invalid request data',
        error instanceof Error ? error.message : 'Request validation failed',
        400
      );
    }

    const { email, password, customerId } = validatedData;

    console.log(`🔐 Workbook authentication attempt for: ${email} from IP: ${clientIP}`);

    // Record authentication attempt
    recordSecurityEvent({
      type: 'auth_attempt',
      email,
      ip: clientIP,
      userAgent,
      timestamp: Date.now(),
      details: { action: 'login_attempt', hasCustomerId: !!customerId }
    });

    // Authenticate user with enhanced security context
    const authResult = await authenticateUser(email, {
      verifyMembership: true,
      customerId,
      password,
      ip: clientIP,
      userAgent,
      request,
    });

    if (!authResult.success) {
      console.warn(
        `❌ Authentication failed for ${email} from IP ${clientIP}: ${authResult.error}`
      );

      // Record failed authentication for security monitoring
      recordSecurityEvent({
        type: 'auth_failure',
        email,
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: authResult.error || 'authentication_failed',
          message: authResult.message,
          action: 'login_failed'
        }
      });

      // Enhanced error handling with security context
      const statusCode = authResult.error === 'suspicious_activity' ? 403 : 401;
      const errorMessage = authResult.error === 'suspicious_activity'
        ? 'Request blocked due to suspicious activity'
        : 'Authentication failed';

      return createErrorResponse(
        errorMessage,
        authResult.message || 'Invalid email or access code',
        statusCode
      );
    }

    console.log(
      `✅ Workbook authentication successful for: ${email} (${authResult.session?.role}) from IP: ${clientIP}`
    );

    // Validate the auth result session data
    if (!authResult.session) {
      console.error(`❌ Authentication succeeded but no session data for: ${email}`);
      return createErrorResponse(
        'Authentication service error',
        'Session creation failed',
        500
      );
    }

    // Prepare response data with validation
    const responseData: LoginResponse = {
      success: true,
      message: authResult.message || `Authenticated as ${authResult.session.role} user`,
      user: {
        userId: authResult.session.userId,
        email: authResult.session.email,
        name: authResult.session.name,
        role: authResult.session.role,
        permissions: authResult.session.permissions,
      },
    };

    // Validate response data
    try {
      LoginResponseSchema.parse(responseData);
    } catch (error) {
      console.error(`❌ Response validation failed for: ${email}:`, error);
      return createErrorResponse(
        'Authentication service error',
        'Invalid response format',
        500
      );
    }

    // Create response with secure headers
    const response = NextResponse.json(responseData, {
      status: 200,
      headers: WORKBOOK_SECURITY_HEADERS,
    });

    // Set secure HTTP-only cookies with development-friendly settings
    if (authResult.token) {
      console.log(`🍪 Setting workbook-token cookie for: ${email}`);
      const cookieOptions = {
        httpOnly: true,
        secure: false, // Always false in development to ensure cookie works
        sameSite: 'lax' as const, // Lax allows same-site requests
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/', // Root path for broad access
        ...(process.env.NODE_ENV === 'development' && {
          domain: 'localhost', // Explicit domain for localhost
        }),
      };

      response.cookies.set('workbook-token', authResult.token, cookieOptions);
      console.log(`🍪 Cookie set with options:`, cookieOptions);
    }

    if (authResult.refreshToken) {
      console.log(`🍪 Setting workbook-refresh cookie for: ${email}`);
      const refreshCookieOptions = {
        httpOnly: true,
        secure: false, // Always false in development
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
        ...(process.env.NODE_ENV === 'development' && {
          domain: 'localhost',
        }),
      };

      response.cookies.set(
        'workbook-refresh',
        authResult.refreshToken,
        refreshCookieOptions
      );
    }

    return response;
  } catch (error) {
    console.error('Login API error:', error);

    // Record error event for security monitoring
    const clientIP = getClientIP(request);
    recordSecurityEvent({
      type: 'auth_failure',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      details: {
        reason: 'login_service_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'login_exception'
      }
    });

    return createErrorResponse(
      'Authentication service unavailable',
      'An unexpected error occurred. Please try again later.',
      500
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin':
        process.env.NODE_ENV === 'development'
          ? '*'
          : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
