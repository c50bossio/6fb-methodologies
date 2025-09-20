import { NextRequest, NextResponse } from 'next/server';
import { WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 Workbook logout request');

    // Create response and clear authentication cookies
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200, headers: WORKBOOK_SECURITY_HEADERS }
    );

    // Clear authentication cookies
    response.cookies.delete('workbook-token');
    response.cookies.delete('workbook-refresh');

    // Also clear with root path to ensure removal
    response.cookies.set('workbook-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('workbook-refresh', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    console.log('✅ Workbook logout successful');
    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
