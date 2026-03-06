import { NextRequest, NextResponse } from 'next/server';
import { WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth';

// Enhanced route to clear all workbook and legacy authentication cookies
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Clearing all authentication cookies for fresh start');

    const response = NextResponse.json(
      {
        success: true,
        message: 'All authentication cookies cleared successfully',
        clearedCookies: [
          'workbook-token',
          'workbook-refresh',
          'workbook-session',
          'authjs.session-token',
          'better-auth.session_token',
          'sb-dfhqjdoydihajmjxniee-auth-token'
        ]
      },
      {
        status: 200,
        headers: WORKBOOK_SECURITY_HEADERS
      }
    );

    // All potential authentication-related cookies to clear
    const cookiesToClear = [
      'workbook-token',
      'workbook-refresh',
      'workbook-session',
      'authjs.session-token',
      'better-auth.session_token',
      'sb-dfhqjdoydihajmjxniee-auth-token'
    ];

    // Cookie options for clearing with localhost domain
    const cookieOptionsWithDomain = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
      ...(process.env.NODE_ENV === 'development' && {
        domain: 'localhost',
      }),
    };

    // Cookie options for clearing without domain (broader compatibility)
    const cookieOptionsGeneral = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    };

    // Clear cookies with both domain settings to ensure complete cleanup
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', cookieOptionsWithDomain);
      response.cookies.set(cookieName, '', cookieOptionsGeneral);
    });

    console.log('✅ Successfully cleared all authentication cookies');
    return response;

  } catch (error) {
    console.error('Error clearing cookies:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cookies',
        message: 'An error occurred while clearing authentication cookies'
      },
      {
        status: 500,
        headers: WORKBOOK_SECURITY_HEADERS
      }
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}