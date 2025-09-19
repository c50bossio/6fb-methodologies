import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth'
import { rateLimit } from '@/middleware/rate-limiting'

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per IP per window
  message: 'Too many authentication attempts, please try again later'
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const body = await request.json()
    const { email, password, customerId } = body

    // Input validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    console.log(`🔐 Workbook authentication attempt for: ${email}`)

    // Authenticate user
    const authResult = await authenticateUser(email, {
      verifyMembership: true,
      customerId,
      password
    })

    if (!authResult.success) {
      console.warn(`❌ Authentication failed for ${email}: ${authResult.error}`)
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: authResult.message || 'Invalid credentials'
        },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    console.log(`✅ Workbook authentication successful for: ${email} (${authResult.session?.role})`)

    // Create response with secure headers
    const response = NextResponse.json(
      {
        success: true,
        message: authResult.message,
        user: {
          email: authResult.session?.email,
          name: authResult.session?.name,
          role: authResult.session?.role,
          permissions: authResult.session?.permissions
        }
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    )

    // Set secure HTTP-only cookies
    if (authResult.token) {
      response.cookies.set('workbook-token', authResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/workbook'
      })
    }

    if (authResult.refreshToken) {
      response.cookies.set('workbook-refresh', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/workbook'
      })
    }

    return response

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: WORKBOOK_SECURITY_HEADERS }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...WORKBOOK_SECURITY_HEADERS,
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://6fbmethodologies.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}