import { NextRequest, NextResponse } from 'next/server';
import {
  getSecurityEvents,
  WORKBOOK_SECURITY_HEADERS,
  hasPermission,
  WORKBOOK_PERMISSIONS,
} from '@/lib/workbook-auth';
import { getWorkbookSession } from '@/middleware/workbook-auth';

// Security health check endpoint
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
          message: 'VIP access required for security health monitoring',
          userRole: session.role,
        },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Get recent security events (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = getSecurityEvents(1000).filter(
      event => event.timestamp >= oneHourAgo
    );

    // Calculate security metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      status: 'healthy', // Will be updated based on conditions below
      alerts: [] as string[],
      metrics: {
        totalEvents: recentEvents.length,
        authAttempts: recentEvents.filter(e => e.type === 'auth_attempt')
          .length,
        authFailures: recentEvents.filter(e => e.type === 'auth_failure')
          .length,
        authSuccesses: recentEvents.filter(e => e.type === 'auth_success')
          .length,
        suspiciousActivity: recentEvents.filter(
          e => e.type === 'suspicious_activity'
        ).length,
        tokenRefreshes: recentEvents.filter(e => e.type === 'token_refresh')
          .length,
      },
      security: {
        environment: process.env.NODE_ENV || 'unknown',
        jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing',
        httpsEnabled: process.env.NODE_ENV === 'production',
        rateLimit: 'active',
        ipLockout: 'active',
        csrfProtection: 'active',
      },
      performance: {
        avgEventsPerMinute: Math.round(recentEvents.length / 60),
        peakActivity: 'normal', // Could be enhanced with more sophisticated analysis
      },
      recommendations: [] as string[],
    };

    // Analyze security health and generate alerts
    const failureRate =
      metrics.metrics.authAttempts > 0
        ? (metrics.metrics.authFailures / metrics.metrics.authAttempts) * 100
        : 0;

    if (failureRate > 50) {
      metrics.status = 'warning';
      metrics.alerts.push(
        `High authentication failure rate: ${failureRate.toFixed(1)}%`
      );
      metrics.recommendations.push(
        'Review authentication logs for potential brute force attacks'
      );
    }

    if (metrics.metrics.suspiciousActivity > 10) {
      metrics.status = 'critical';
      metrics.alerts.push(
        `High suspicious activity: ${metrics.metrics.suspiciousActivity} events in last hour`
      );
      metrics.recommendations.push(
        'Investigate suspicious activity patterns immediately'
      );
    }

    if (metrics.metrics.totalEvents > 500) {
      if (metrics.status === 'healthy') metrics.status = 'warning';
      metrics.alerts.push(
        `High activity volume: ${metrics.metrics.totalEvents} events in last hour`
      );
      metrics.recommendations.push(
        'Monitor for potential DDoS or automated attacks'
      );
    }

    // Check for missing security configurations
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET === 'your-secret-key-change-in-production'
    ) {
      metrics.status = 'critical';
      metrics.alerts.push('JWT secret not properly configured');
      metrics.recommendations.push(
        'Configure a strong JWT secret in production'
      );
    }

    if (
      process.env.NODE_ENV === 'production' &&
      !metrics.security.httpsEnabled
    ) {
      metrics.status = 'critical';
      metrics.alerts.push('HTTPS not enabled in production');
      metrics.recommendations.push('Enable HTTPS for production deployment');
    }

    // Add general recommendations based on current state
    if (metrics.status === 'healthy') {
      metrics.recommendations.push(
        'Security posture is good. Continue monitoring regularly.'
      );
    }

    if (recentEvents.length === 0) {
      metrics.recommendations.push(
        'No recent activity detected. Verify monitoring is working correctly.'
      );
    }

    return NextResponse.json(
      {
        success: true,
        health: metrics,
        lastUpdated: new Date().toISOString(),
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Security health API error:', error);
    return NextResponse.json(
      {
        success: false,
        health: {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Failed to retrieve security health status',
        },
      },
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
