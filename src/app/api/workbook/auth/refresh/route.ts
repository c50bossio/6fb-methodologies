import { NextRequest, NextResponse } from 'next/server'
import { refreshAuthToken, WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    let refreshToken = request.cookies.get('workbook-refresh')?.value

    if (!refreshToken) {
      const body = await request.json()
      refreshToken = body.refreshToken
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )
    }

    console.log('🔄 Refreshing workbook authentication token')

    // Refresh authentication
    const authResult = await refreshAuthToken(refreshToken)

    if (!authResult.success) {
      console.warn('❌ Token refresh failed:', authResult.error)

      // Clear invalid cookies
      const response = NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401, headers: WORKBOOK_SECURITY_HEADERS }
      )

      response.cookies.delete('workbook-token')
      response.cookies.delete('workbook-refresh')

      return response
    }

    console.log('✅ Token refresh successful')

    // Create response with new tokens
    const response = NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        user: {
          email: authResult.session?.email,
          name: authResult.session?.name,
          role: authResult.session?.role,
          permissions: authResult.session?.permissions
        }
      },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    )

    // Set new secure cookies
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
    console.error('Token refresh API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}