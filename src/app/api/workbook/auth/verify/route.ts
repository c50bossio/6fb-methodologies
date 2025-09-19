import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken, validateSession, WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth'

export async function GET(request: NextRequest) {
  try {
    // Extract token from cookie or Authorization header
    let token = request.cookies.get('workbook-token')?.value

    if (!token) {
      token = extractToken(request) || undefined
    }

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'No authentication token provided'
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Verify and decode token
    const session = verifyToken(token)

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'Invalid authentication token'
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Validate session data
    const validation = validateSession(session)

    if (!validation.isValid) {
      return NextResponse.json(
        {
          authenticated: false,
          error: validation.error
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Return session information (without sensitive data)
    return NextResponse.json(
      {
        authenticated: true,
        user: {
          userId: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
          permissions: session.permissions
        },
        expiresAt: session.exp
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    )

  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Authentication verification failed'
      },
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