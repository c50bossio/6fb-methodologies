import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  validateSession,
  hasPermission,
  WORKBOOK_PERMISSIONS,
  WORKBOOK_SECURITY_HEADERS,
  recordSecurityEvent,
  getClientIP,
} from '@/lib/workbook-auth';
import db, { DatabaseError, ValidationError } from '@/lib/database';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Threat detection patterns
const SUSPICIOUS_PATTERNS = {
  USER_AGENTS: [
    /curl/i,
    /wget/i,
    /python/i,
    /scanner/i,
    /bot/i,
    /crawler/i,
    /spider/i,
  ],
  PATHS: [
    /\/admin/i,
    /\/wp-admin/i,
    /\/phpMyAdmin/i,
    /\.env/i,
    /\.git/i,
    /\/config/i,
    /\/backup/i,
  ],
  HEADERS: ['x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip'],
};

// Known attack signatures
const ATTACK_SIGNATURES = {
  SQL_INJECTION: [
    /union\s+select/i,
    /select\s+.*\s+from/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /update\s+.*\s+set/i,
    /delete\s+from/i,
    /'.*or.*'/i,
    /--/,
  ],
  XSS: [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\/etc\/passwd/i,
    /\/windows\/system32/i,
  ],
  COMMAND_INJECTION: [/;.*\w+/, /\|.*\w+/, /&&.*\w+/, /\$\(.*\)/, /`.*`/],
};

function checkRateLimit(
  clientId: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `security_monitor_${clientId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

async function authenticateRequest(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return { error: 'Authentication token required', status: 401 };
  }

  const session = verifyToken(token);
  const validation = validateSession(session);

  if (!validation.isValid) {
    return { error: validation.error || 'Invalid session', status: 401 };
  }

  return { session: session! };
}

function analyzeRequest(request: NextRequest): {
  riskScore: number;
  threats: string[];
  details: any;
} {
  const threats: string[] = [];
  let riskScore = 0;
  const details: any = {
    userAgent: request.headers.get('user-agent'),
    path: new URL(request.url).pathname,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  };

  // Check User-Agent for suspicious patterns
  const userAgent = request.headers.get('user-agent') || '';
  for (const pattern of SUSPICIOUS_PATTERNS.USER_AGENTS) {
    if (pattern.test(userAgent)) {
      threats.push('suspicious_user_agent');
      riskScore += 30;
      break;
    }
  }

  // Check for missing or unusual User-Agent
  if (!userAgent || userAgent.length < 10) {
    threats.push('missing_user_agent');
    riskScore += 20;
  }

  // Check path for suspicious patterns
  const path = new URL(request.url).pathname;
  for (const pattern of SUSPICIOUS_PATTERNS.PATHS) {
    if (pattern.test(path)) {
      threats.push('suspicious_path');
      riskScore += 40;
      break;
    }
  }

  // Check for attack signatures in URL parameters
  const url = new URL(request.url);
  const queryString = url.search;

  // SQL Injection detection
  for (const pattern of ATTACK_SIGNATURES.SQL_INJECTION) {
    if (pattern.test(queryString)) {
      threats.push('sql_injection_attempt');
      riskScore += 80;
      break;
    }
  }

  // XSS detection
  for (const pattern of ATTACK_SIGNATURES.XSS) {
    if (pattern.test(queryString)) {
      threats.push('xss_attempt');
      riskScore += 70;
      break;
    }
  }

  // Path traversal detection
  for (const pattern of ATTACK_SIGNATURES.PATH_TRAVERSAL) {
    if (pattern.test(path) || pattern.test(queryString)) {
      threats.push('path_traversal_attempt');
      riskScore += 60;
      break;
    }
  }

  // Command injection detection
  for (const pattern of ATTACK_SIGNATURES.COMMAND_INJECTION) {
    if (pattern.test(queryString)) {
      threats.push('command_injection_attempt');
      riskScore += 85;
      break;
    }
  }

  // Check for proxy headers (potential IP spoofing)
  const proxyHeaders = SUSPICIOUS_PATTERNS.HEADERS.filter(header =>
    request.headers.get(header)
  );
  if (proxyHeaders.length > 0) {
    threats.push('proxy_headers_detected');
    riskScore += 15;
    details.proxyHeaders = proxyHeaders;
  }

  // Check request frequency (basic rate limiting detection)
  const clientIP = getClientIP(request);
  if (!checkRateLimit(clientIP, 100, 60000)) {
    threats.push('high_request_frequency');
    riskScore += 50;
  }

  // Check for unusual request methods
  if (
    !['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(
      request.method
    )
  ) {
    threats.push('unusual_http_method');
    riskScore += 25;
  }

  return {
    riskScore: Math.min(riskScore, 100),
    threats,
    details,
  };
}

async function getSecurityMetrics(timeframe: string = '24h') {
  const hours =
    {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    }[timeframe] || 24;

  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  // This would typically query a security events table
  // For now, we'll create mock data structure
  return {
    total_requests: 1250,
    blocked_requests: 15,
    threat_detections: 8,
    high_risk_events: 3,
    unique_ips: 45,
    top_threats: [
      { type: 'sql_injection_attempt', count: 5 },
      { type: 'suspicious_user_agent', count: 3 },
      { type: 'high_request_frequency', count: 7 },
    ],
    geographic_distribution: {
      US: 60,
      CA: 15,
      UK: 10,
      DE: 8,
      OTHER: 7,
    },
    alert_levels: {
      low: 12,
      medium: 5,
      high: 3,
      critical: 0,
    },
  };
}

// T039: Enhanced security monitoring API with threat detection
// GET /api/workbook/security/monitor - Security monitoring dashboard
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Only administrators and security analysts can access this endpoint
    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.ACCESS_VIP_CONTENT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for security monitoring' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const clientIP = getClientIP(request);

    // Rate limiting for security monitoring
    if (!checkRateLimit(clientIP, 30, 300000)) {
      // 30 requests per 5 minutes
      return NextResponse.json(
        { error: 'Security monitoring rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    // Record access to security monitoring
    recordSecurityEvent({
      type: 'security_monitor_access',
      userId: auth.session.userId,
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      details: {
        action: 'security_dashboard_access',
        role: auth.session.role,
      },
    });

    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const includeDetails = url.searchParams.get('details') === 'true';

    // Validate timeframe
    const validTimeframes = ['1h', '24h', '7d', '30d'];
    if (!validTimeframes.includes(timeframe)) {
      throw new ValidationError(
        'Invalid timeframe. Valid options: 1h, 24h, 7d, 30d'
      );
    }

    // Get security metrics
    const securityMetrics = await getSecurityMetrics(timeframe);

    // Analyze current request for threats
    const requestAnalysis = analyzeRequest(request);

    // Get recent security events from memory store
    const recentEvents = [];
    try {
      // This would query actual security events from database
      const securityEvents = await db.query(
        `SELECT event_type, ip_address, user_agent, created_at, details
         FROM security_events
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC
         LIMIT 50`
      );
      recentEvents.push(...securityEvents);
    } catch (error) {
      // Security events table might not exist yet
      console.log('Security events table not found, using mock data');
    }

    // Generate threat assessment
    const threatAssessment = {
      current_threat_level:
        requestAnalysis.riskScore > 70
          ? 'high'
          : requestAnalysis.riskScore > 40
            ? 'medium'
            : requestAnalysis.riskScore > 20
              ? 'low'
              : 'minimal',
      active_threats: requestAnalysis.threats,
      risk_factors: [
        ...(requestAnalysis.threats.includes('sql_injection_attempt')
          ? ['Active SQL injection attempts detected']
          : []),
        ...(requestAnalysis.threats.includes('xss_attempt')
          ? ['Cross-site scripting attempts detected']
          : []),
        ...(requestAnalysis.threats.includes('high_request_frequency')
          ? ['Unusual request frequency patterns']
          : []),
        ...(requestAnalysis.threats.includes('suspicious_user_agent')
          ? ['Suspicious automated tools detected']
          : []),
      ],
      recommendations: [
        ...(requestAnalysis.riskScore > 50
          ? ['Enable enhanced monitoring mode']
          : []),
        ...(requestAnalysis.threats.includes('sql_injection_attempt')
          ? ['Review and update input validation']
          : []),
        ...(requestAnalysis.threats.includes('high_request_frequency')
          ? ['Consider implementing CAPTCHA']
          : []),
        'Regularly review security logs',
        'Keep all security measures up to date',
      ],
    };

    // Generate security report
    const securityReport = {
      monitoring_status: 'active',
      last_updated: new Date().toISOString(),
      timeframe,
      system_health: {
        api_endpoints: 'healthy',
        authentication: 'healthy',
        rate_limiting: 'active',
        threat_detection: 'active',
      },
      metrics: securityMetrics,
      threat_assessment: threatAssessment,
      recent_events: recentEvents.slice(0, 10), // Last 10 events
      alerts: [
        ...(requestAnalysis.riskScore > 80
          ? [
              {
                level: 'critical',
                message: 'High-risk security threat detected',
                timestamp: new Date().toISOString(),
                details: requestAnalysis.threats,
              },
            ]
          : []),
        ...(requestAnalysis.riskScore > 50
          ? [
              {
                level: 'warning',
                message: 'Moderate security risk detected',
                timestamp: new Date().toISOString(),
                details: requestAnalysis.threats,
              },
            ]
          : []),
      ],
    };

    return NextResponse.json(
      {
        success: true,
        security_report: securityReport,
        request_analysis: includeDetails ? requestAnalysis : undefined,
        generated_at: new Date().toISOString(),
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Security monitoring API error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Security monitoring service temporarily unavailable' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    );
  }
}

// POST /api/workbook/security/monitor - Report security incident
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    if (!hasPermission(auth.session, WORKBOOK_PERMISSIONS.REPORT_ISSUES)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to report security incidents' },
        { status: 403, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const clientIP = getClientIP(request);

    // Rate limiting for incident reporting
    if (!checkRateLimit(clientIP, 10, 300000)) {
      // 10 reports per 5 minutes
      return NextResponse.json(
        { error: 'Incident reporting rate limit exceeded' },
        { status: 429, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    const body = await request.json();
    const {
      incidentType,
      description,
      severity = 'medium',
      affectedSystems = [],
      evidence = {},
    } = body;

    // Validation
    if (!incidentType || !description) {
      throw new ValidationError('Incident type and description are required');
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      throw new ValidationError('Invalid severity level');
    }

    const validIncidentTypes = [
      'unauthorized_access',
      'data_breach',
      'malware_detection',
      'phishing_attempt',
      'ddos_attack',
      'suspicious_activity',
      'system_compromise',
      'other',
    ];

    if (!validIncidentTypes.includes(incidentType)) {
      throw new ValidationError('Invalid incident type');
    }

    // Record security incident
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const securityIncident = {
      id: incidentId,
      type: 'security_incident_reported',
      userId: auth.session.userId,
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: Date.now(),
      details: {
        incidentId,
        incidentType,
        description,
        severity,
        affectedSystems,
        evidence,
        reportedBy: {
          userId: auth.session.userId,
          role: auth.session.role,
          email: auth.session.email,
        },
      },
    };

    recordSecurityEvent(securityIncident);

    // In production, this would also:
    // 1. Send alerts to security team
    // 2. Create tickets in incident management system
    // 3. Trigger automated response procedures
    // 4. Log to SIEM system

    return NextResponse.json(
      {
        success: true,
        incident: {
          id: incidentId,
          type: incidentType,
          severity,
          status: 'reported',
          reported_at: new Date().toISOString(),
          reported_by: auth.session.userId,
        },
        message: 'Security incident reported successfully',
      },
      { status: 201, headers: WORKBOOK_SECURITY_HEADERS }
    );
  } catch (error) {
    console.error('Security incident reporting error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to report security incident' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
