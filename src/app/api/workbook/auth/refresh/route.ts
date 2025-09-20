import { NextRequest, NextResponse } from 'next/server';
import {
  refreshAuthToken,
  verifyRefreshToken,
  WORKBOOK_SECURITY_HEADERS,
  recordSecurityEvent,
  detectSuspiciousActivity,
  isIPLockedOut,
  getClientIP,
} from '@/lib/workbook-auth';
import { rateLimit } from '@/middleware/rate-limiting';
import {
  RefreshRequestSchema,
  RefreshResponseSchema,
  RefreshTokenPayloadSchema,
  ErrorResponseSchema,
  type RefreshRequest,
  type RefreshResponse,
} from '@/lib/validation/auth-schemas';

// Rate limiting for token refresh (more generous than login)
const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 refresh attempts per IP per window
  message: 'Too many token refresh attempts, please log in again',
});

// Enhanced error response helper
function createErrorResponse(
  error: string,
  message?: string,
  statusCode = 401,
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

// Clear invalid cookies helper
function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete('workbook-token');
  response.cookies.delete('workbook-refresh');

  // Also set expired cookies to ensure cleanup
  response.cookies.set('workbook-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('workbook-refresh', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for security tracking
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`🔄 Token refresh attempt from IP: ${clientIP}`);

    // Check if IP is locked out
    if (isIPLockedOut(clientIP)) {
      console.warn(`🚨 Refresh token blocked for locked IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'ip_locked_out', action: 'token_refresh' }
      });

      return createErrorResponse(
        'Access temporarily restricted',
        'Too many failed attempts. Please try again later.',
        429
      );
    }

    // Apply rate limiting
    const rateLimitResult = await refreshRateLimit(request);
    if (rateLimitResult) {
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'rate_limited', action: 'token_refresh' }
      });
      return rateLimitResult;
    }

    // Check for suspicious activity
    if (detectSuspiciousActivity(request)) {
      console.warn(`🚨 Suspicious refresh token request from IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'suspicious_activity',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'suspicious_refresh_request', action: 'token_refresh' }
      });

      return createErrorResponse(
        'Request blocked due to suspicious activity',
        'Your request has been flagged for security review.',
        403
      );
    }

    // Parse request body for optional refresh token
    let requestBody: RefreshRequest = undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (Object.keys(body).length > 0) {
        requestBody = RefreshRequestSchema.parse(body);
      }
    } catch (error) {
      console.warn(`❌ Invalid request body from IP: ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return createErrorResponse(
        'Invalid request format',
        'Request body must be valid JSON.',
        400
      );
    }

    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('workbook-refresh')?.value;

    if (!refreshToken && requestBody?.refreshToken) {
      refreshToken = requestBody.refreshToken;
      console.log(`🔑 Using refresh token from request body from IP: ${clientIP}`);
    } else if (refreshToken) {
      console.log(`🔑 Using refresh token from cookie from IP: ${clientIP}`);
    }

    if (!refreshToken) {
      console.warn(`❌ No refresh token provided from IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'no_refresh_token', action: 'token_refresh' }
      });

      return createErrorResponse(
        'Refresh token required',
        'Please log in again to obtain a new session.',
        401
      );
    }

    // Verify refresh token first
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      console.warn(`❌ Invalid refresh token from IP: ${clientIP}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: { reason: 'invalid_refresh_token', action: 'token_refresh' }
      });

      // Clear invalid cookies and return error
      const response = createErrorResponse(
        'Invalid refresh token',
        'Your refresh token is invalid or expired. Please log in again.',
        401
      );

      return clearAuthCookies(response);
    }

    // Validate refresh token payload structure
    let validatedPayload;
    try {
      validatedPayload = RefreshTokenPayloadSchema.parse(decoded);
    } catch (error) {
      console.warn(`❌ Invalid refresh token payload from IP: ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'invalid_refresh_token_payload',
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'token_refresh'
        }
      });

      const response = createErrorResponse(
        'Invalid refresh token format',
        'The refresh token format is invalid. Please log in again.',
        401
      );

      return clearAuthCookies(response);
    }

    // Refresh authentication
    const authResult = await refreshAuthToken(refreshToken);

    if (!authResult.success) {
      console.warn(`❌ Token refresh failed from IP: ${clientIP}: ${authResult.error}`);
      recordSecurityEvent({
        type: 'auth_failure',
        ip: clientIP,
        userAgent,
        timestamp: Date.now(),
        details: {
          reason: 'refresh_failed',
          error: authResult.error,
          userId: validatedPayload.userId,
          action: 'token_refresh_failed'
        }
      });

      // Clear invalid cookies and return error
      const response = createErrorResponse(
        authResult.error || 'Token refresh failed',
        authResult.message || 'Unable to refresh your session. Please log in again.',
        401
      );

      return clearAuthCookies(response);
    }

    // Validate that session was created
    if (!authResult.session) {
      console.error(`❌ Token refresh succeeded but no session data for user: ${validatedPayload.userId} from IP: ${clientIP}`);
      const response = createErrorResponse(
        'Token refresh service error',
        'Session creation failed during refresh.',
        500
      );

      return clearAuthCookies(response);
    }

    console.log(`✅ Token refresh successful for user: ${authResult.session.userId} from IP: ${clientIP}`);

    // Record successful token refresh
    recordSecurityEvent({
      type: 'token_refresh',
      userId: authResult.session.userId,
      email: authResult.session.email,
      ip: clientIP,
      userAgent,
      timestamp: Date.now(),
      details: { action: 'token_refresh_success' }
    });

    // Prepare response data with validation
    const responseData: RefreshResponse = {
      success: true,
      message: 'Token refreshed successfully',
      user: {
        userId: authResult.session.userId,
        email: authResult.session.email,
        name: authResult.session.name,
        role: authResult.session.role,
        permissions: authResult.session.permissions,
      },
      expiresAt: authResult.session.exp,
    };

    // Validate response data
    try {
      RefreshResponseSchema.parse(responseData);
    } catch (error) {
      console.error(`❌ Response validation failed for user: ${authResult.session.userId}:`, error);
      return createErrorResponse(
        'Token refresh service error',
        'Invalid response format',
        500
      );
    }

    // Create response with new tokens
    const response = NextResponse.json(responseData, {
      status: 200,
      headers: WORKBOOK_SECURITY_HEADERS,
    });

    // Set new secure cookies with development-friendly settings
    if (authResult.token) {
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
    }

    if (authResult.refreshToken) {
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
    console.error('Token refresh API error:', error);

    // Record error event
    const clientIP = getClientIP(request);
    recordSecurityEvent({
      type: 'auth_failure',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      details: {
        reason: 'refresh_service_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'token_refresh_exception'
      }
    });

    return createErrorResponse(
      'Token refresh service unavailable',
      'An unexpected error occurred while refreshing your token. Please try again later.',
      500
    );
  }
}

// Optional: Handle GET to check refresh token status
export async function GET(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('workbook-refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { available: false, message: 'No refresh token available' },
        { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const decoded = verifyRefreshToken(refreshToken);

    return NextResponse.json(
      {
        available: !!decoded,
        userId: decoded?.userId,
        message: decoded ? 'Refresh token available' : 'Refresh token invalid',
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Refresh token check error:', error);
    return NextResponse.json(
      { available: false, message: 'Unable to check refresh token' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
