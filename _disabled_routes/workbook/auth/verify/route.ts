import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  extractToken,
  validateSession,
  WORKBOOK_SECURITY_HEADERS,
  recordSecurityEvent,
  detectSuspiciousActivity,
  getClientIP,
} from '@/lib/workbook-auth';
import {
  VerifyResponseSchema,
  ErrorResponseSchema,
  JWTPayloadSchema,
  type VerifyResponse,
} from '@/lib/validation/auth-schemas';

// Enhanced error response helper
function createErrorResponse(
  error: string,
  message?: string,
  statusCode = 401,
  details?: Record<string, any>
): NextResponse {
  const errorData = {
    authenticated: false,
    error,
    message: message || error,
    ...(details && { details }),
  };

  return NextResponse.json(errorData, {
    status: statusCode,
    headers: WORKBOOK_SECURITY_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(
      `🔍 Auth verification request from: ${request.url} (IP: ${clientIP})`
    );

    // Suspicious activity check with error handling
    try {
      if (detectSuspiciousActivity && detectSuspiciousActivity(request)) {
        console.warn(`🚨 Suspicious verification request from IP: ${clientIP}`);
        recordSecurityEvent({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent,
          timestamp: Date.now(),
          details: { reason: 'suspicious_verify_request', action: 'auth_verify' },
        });

        return createErrorResponse(
          'Request blocked due to suspicious activity',
          'This request has been flagged for security review.',
          403
        );
      }
    } catch (error) {
      console.warn('Suspicious activity detection failed:', error.message);
      // Continue with verification - fail open for security functions
    }

    // Debug: Log all cookies received (only in development)
    if (process.env.NODE_ENV === 'development') {
      const allCookies = request.cookies.getAll();
      console.log(
        `🍪 Cookies received:`,
        allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`)
      );
    }

    // Extract token from cookie or Authorization header
    let token = request.cookies.get('workbook-token')?.value;

    if (!token) {
      token = extractToken(request) || undefined;
      console.log(
        `🔑 No workbook-token cookie, trying Authorization header: ${token ? 'found' : 'not found'}`
      );
    } else {
      console.log(
        `🔑 Found workbook-token cookie: ${token.substring(0, 20)}...`
      );
    }

    if (!token) {
      console.log(`❌ No authentication token available from IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'no_token', action: 'auth_verify' },
      });

      return createErrorResponse(
        'No authentication token provided',
        'Authentication required to access this resource.',
        401
      );
    }

    // Verify and decode token
    const session = verifyToken(token);

    if (!session) {
      console.warn(`❌ Invalid authentication token from IP: ${clientIP}`);

      // Check if this is a legacy JWT token that needs cleanup (has dots indicating JWT format)
      const isLegacyJWT = token.includes('.') && token.split('.').length === 3;

      // Check if this is a refresh token being used incorrectly
      let isRefreshToken = false;
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        isRefreshToken = decoded.type === 'refresh';
      } catch (error) {
        // Token parsing failed, continue with legacy check
      }

      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: isLegacyJWT ? 'legacy_jwt_token' :
                   isRefreshToken ? 'refresh_token_used_for_access' : 'invalid_token',
          action: 'auth_verify'
        },
      });

      // Create response that clears invalid cookies
      const errorMessage = isLegacyJWT
        ? 'Legacy authentication token detected. Please log in again.'
        : isRefreshToken
          ? 'Refresh token used for access verification. Please log in again.'
          : 'The provided token is invalid or malformed.';

      const response = createErrorResponse(
        'Invalid authentication token',
        errorMessage,
        401
      );

      // Clear invalid cookies to allow fresh login - more comprehensive cleanup
      const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: 'lax' as const,
        maxAge: 0,
        path: '/',
        ...(process.env.NODE_ENV === 'development' && {
          domain: 'localhost',
        }),
      };

      response.cookies.set('workbook-token', '', cookieOptions);
      response.cookies.set('workbook-refresh', '', cookieOptions);

      // Also clear any other potential auth cookies
      response.cookies.set('authjs.session-token', '', cookieOptions);
      response.cookies.set('better-auth.session_token', '', cookieOptions);

      return response;
    }

    // Validate session data structure with Zod
    let validatedSession;
    try {
      validatedSession = JWTPayloadSchema.parse(session);
    } catch (error) {
      console.warn(
        `❌ Session validation failed from IP: ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'session_validation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'auth_verify',
        },
      });

      return createErrorResponse(
        'Invalid session data',
        'The session data structure is invalid.',
        401
      );
    }

    // Validate session data using workbook auth utilities
    const validation = validateSession(validatedSession);

    if (!validation.isValid) {
      console.warn(
        `❌ Session validation failed from IP: ${clientIP}: ${validation.error}`
      );
      recordSecurityEvent({
        type: 'auth_failure',
        userId: validatedSession.userId,
        email: validatedSession.email,
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'session_invalid',
          error: validation.error,
          action: 'auth_verify',
        },
      });

      return createErrorResponse(
        'Session expired or invalid',
        validation.error || 'Please log in again.',
        401
      );
    }

    // Check token expiration (additional safety check)
    const now = Math.floor(Date.now() / 1000);
    if (validatedSession.exp <= now) {
      console.warn(
        `❌ Token expired for user: ${validatedSession.userId} from IP: ${clientIP}`
      );
      recordSecurityEvent({
        type: 'auth_failure',
        userId: validatedSession.userId,
        email: validatedSession.email,
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'token_expired',
          expiredAt: validatedSession.exp,
          action: 'auth_verify',
        },
      });

      return createErrorResponse(
        'Token expired',
        'Your session has expired. Please log in again.',
        401
      );
    }

    // Log successful verification
    console.log(
      `✅ Token verification successful for user: ${validatedSession.userId} from IP: ${clientIP}`
    );

    // Record successful verification (only in development to avoid log spam)
    if (process.env.NODE_ENV === 'development') {
      recordSecurityEvent({
        type: 'auth_success',
        userId: validatedSession.userId,
        email: validatedSession.email,
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { action: 'auth_verify_success' },
      });
    }

    // Prepare response data with validation
    const responseData: VerifyResponse = {
      authenticated: true,
      user: {
        userId: validatedSession.userId,
        email: validatedSession.email,
        name: validatedSession.name,
        role: validatedSession.role,
        permissions: validatedSession.permissions,
      },
      expiresAt: validatedSession.exp,
      verifiedAt: now,
    };

    // Validate response data
    try {
      VerifyResponseSchema.parse(responseData);
    } catch (error) {
      console.error(
        `❌ Response validation failed for user: ${validatedSession.userId}:`,
        error
      );
      return createErrorResponse(
        'Authentication service error',
        'Invalid response format',
        500
      );
    }

    // Return session information (without sensitive data)
    return NextResponse.json(responseData, {
      status: 200,
      headers: WORKBOOK_SECURITY_HEADERS,
    });
  } catch (error) {
    console.error('Auth verification error:', error);

    // Record error event
    const clientIP = getClientIP(request);
    recordSecurityEvent({
      type: 'auth_failure',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      details: {
        reason: 'verify_service_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'auth_verify_exception',
      },
    });

    return createErrorResponse(
      'Authentication verification failed',
      'An unexpected error occurred while verifying your session.',
      500
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin':
        process.env.NODE_ENV === 'development'
          ? '*'
          : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
