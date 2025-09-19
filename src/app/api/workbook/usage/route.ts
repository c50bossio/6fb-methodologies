import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken, validateSession, WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth'
// import { getUserUsageStats } from '@/lib/secure-audio'

export async function GET(request: NextRequest) {
  try {
    // Extract and verify authentication token
    let token = request.cookies.get('workbook-token')?.value

    if (!token) {
      token = extractToken(request) || undefined
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Verify session
    const session = verifyToken(token)
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    const validation = validateSession(session)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Get usage statistics - temporarily return mock data
    const usageStats = {
      audioRecordings: 0,
      transcriptions: 0,
      totalCost: 0,
      lastActivity: new Date().toISOString()
    }

    // Return usage data
    return NextResponse.json(
      {
        user: {
          userId: session.userId,
          role: session.role,
          permissions: session.permissions
        },
        usage: usageStats,
        timestamp: new Date().toISOString()
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    )

  } catch (error) {
    console.error('Usage stats API error:', error)
    return NextResponse.json(
      { error: 'Unable to retrieve usage statistics' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}