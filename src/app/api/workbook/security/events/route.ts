import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  getSecurityEvents,
  WORKBOOK_SECURITY_HEADERS,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  recordSecurityEvent,
  getClientIP,
} from '@/lib/workbook-auth';
import { getWorkbookSession } from '@/middleware/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

// Security monitoring endpoint - requires admin/VIP access
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getWorkbookSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Check if user has VIP access (admin functionality)
    if (!hasPermission(session, WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: 'VIP access required for security monitoring',
          userRole: session.role,
        },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
    const type = url.searchParams.get('type');
    const since = url.searchParams.get('since');

    // Get security events
    let events = getSecurityEvents(limit);

    // Filter by type if specified
    if (type) {
      events = events.filter(event => event.type === type);
    }

    // Filter by timestamp if specified
    if (since) {
      const sinceTimestamp = parseInt(since);
      if (!isNaN(sinceTimestamp)) {
        events = events.filter(event => event.timestamp >= sinceTimestamp);
      }
    }

    // Generate summary statistics
    const summary = {
      totalEvents: events.length,
      timeRange: {
        from: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : null,
        to: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : null,
      },
      eventTypes: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topIPs: events
        .reduce((acc, event) => {
          acc[event.ip] = (acc[event.ip] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      suspiciousActivity: events.filter(e => e.type === 'suspicious_activity').length,
      failedAttempts: events.filter(e => e.type === 'auth_failure').length,
      successfulLogins: events.filter(e => e.type === 'auth_success').length,
    };

    return NextResponse.json(
      {
        success: true,
        summary,
        events: events.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp).toISOString(),
        })),
        meta: {
          requestedLimit: limit,
          returnedCount: events.length,
          filters: { type, since },
        },
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Security events API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve security events' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}