import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  extractToken,
  validateSession,
  hasPermission,
  WORKBOOK_SECURITY_HEADERS,
  recordSecurityEvent,
  detectSuspiciousActivity,
  isIPLockedOut,
} from '@/lib/workbook-auth';

// Workbook authentication middleware
export async function workbookAuthMiddleware(
  request: NextRequest,
  requiredPermission?: string
): Promise<NextResponse | null> {
  try {
    // Extract token from cookie or Authorization header
    let token = request.cookies.get('workbook-token')?.value;

    if (!token) {
      token = extractToken(request) || undefined;
    }

    if (!token) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please log in to access the workbook',
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Verify and validate session
    const session = verifyToken(token);

    if (!session) {
      return NextResponse.json(
        {
          error: 'Invalid authentication token',
          message: 'Please log in again',
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const validation = validateSession(session);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error,
          message: 'Session expired, please log in again',
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check specific permission if required
    if (requiredPermission && !hasPermission(session, requiredPermission)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: `This feature requires ${requiredPermission} permission`,
          userRole: session.role,
          requiredPermission,
        },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Add user session to request headers for downstream use
    const response = NextResponse.next();

    // Add session info to response headers (for debugging in development)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Workbook-User-Id', session.userId);
      response.headers.set('X-Workbook-User-Role', session.role);
      response.headers.set(
        'X-Workbook-Permissions',
        session.permissions.join(',')
      );
    }

    return null; // Allow request to continue
  } catch (error) {
    console.error('Workbook authentication middleware error:', error);
    return NextResponse.json(
      {
        error: 'Authentication service unavailable',
        message: 'Please try again later',
      },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// Permission-specific middleware functions
export const requireViewContent = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'view_content');

export const requireRecordAudio = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'record_audio');

export const requireTranscribeAudio = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'transcribe_audio');

export const requireVIPAccess = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'access_vip_content');

export const requireSaveProgress = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'save_progress');

export const requireExportNotes = (request: NextRequest) =>
  workbookAuthMiddleware(request, 'export_notes');

// Helper function to extract session from request (for use in API routes)
export async function getWorkbookSession(request: NextRequest) {
  try {
    let token = request.cookies.get('workbook-token')?.value;

    if (!token) {
      token = extractToken(request) || undefined;
    }

    if (!token) {
      return null;
    }

    const session = verifyToken(token);
    if (!session) {
      return null;
    }

    const validation = validateSession(session);
    if (!validation.isValid) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error extracting workbook session:', error);
    return null;
  }
}

// Rate limiting by user role middleware
export async function workbookRateLimitMiddleware(
  request: NextRequest,
  action: 'audioRecordings' | 'transcriptions' | 'apiCalls'
): Promise<NextResponse | null> {
  try {
    const session = await getWorkbookSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required for rate limiting' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Import rate limiting here to avoid circular dependencies
    const { checkRateLimit } = await import('@/lib/secure-audio');
    const rateLimit = checkRateLimit(session.userId, action, session.role);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimit.error,
          resetTime: rateLimit.resetTime,
          remaining: rateLimit.remaining,
        },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return null; // Allow request to continue
  } catch (error) {
    console.error('Workbook rate limiting error:', error);
    // Fail open for rate limiting errors
    return null;
  }
}

// Combined middleware for protected workbook API routes
export async function protectedWorkbookMiddleware(
  request: NextRequest,
  options: {
    requiredPermission?: string;
    rateLimitAction?: 'audioRecordings' | 'transcriptions' | 'apiCalls';
  } = {}
): Promise<NextResponse | null> {
  // Apply authentication middleware
  const authResult = await workbookAuthMiddleware(
    request,
    options.requiredPermission
  );
  if (authResult) {
    return authResult;
  }

  // Apply rate limiting if specified
  if (options.rateLimitAction) {
    const rateLimitResult = await workbookRateLimitMiddleware(
      request,
      options.rateLimitAction
    );
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  return null; // All checks passed
}

// Utility to check if path requires workbook authentication
export function isWorkbookPath(pathname: string): boolean {
  return (
    pathname.startsWith('/workbook') || pathname.startsWith('/api/workbook')
  );
}

// Utility to check if path is a public workbook path (doesn't require auth)
export function isPublicWorkbookPath(pathname: string): boolean {
  const publicPaths = [
    '/api/workbook/auth/login',
    '/api/workbook/auth/logout',
    '/api/workbook/auth/refresh',
  ];

  return publicPaths.includes(pathname);
}

// Re-export security functions for use in middleware
export { recordSecurityEvent, detectSuspiciousActivity, isIPLockedOut };
