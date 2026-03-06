import { NextRequest, NextResponse } from 'next/server';

/**
 * Socket.io compatibility API route for Vercel serverless
 * Provides a fallback mechanism for real-time features in serverless environments
 */

// In-memory store for serverless environments (not recommended for production)
// In production, you'd want to use Redis or a similar external store
const connections = new Map<string, any>();
const rooms = new Map<string, Set<string>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transport = searchParams.get('transport');

  // Handle Socket.io polling transport
  if (transport === 'polling') {
    const sid = searchParams.get('sid') || generateSessionId();

    // Return polling response
    return new NextResponse(
      `97:0{"sid":"${sid}","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}2:40`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
            ? 'https://6fbmethodologies.com'
            : 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        },
      }
    );
  }

  // Health check for Socket.io endpoint
  return NextResponse.json({
    status: 'online',
    transport: 'serverless-fallback',
    timestamp: new Date().toISOString(),
    note: 'Socket.io running in serverless compatibility mode'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sid = searchParams.get('sid');
    const transport = searchParams.get('transport');

    if (transport === 'polling') {
      const body = await request.text();

      // Parse Socket.io polling message
      if (body.startsWith('1:1')) {
        // Handle ping
        return new NextResponse('1:3', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=UTF-8',
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
              ? 'https://6fbmethodologies.com'
              : 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }

      // Handle other polling messages
      return new NextResponse('1:6', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
            ? 'https://6fbmethodologies.com'
            : 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid transport' }, { status: 400 });
  } catch (error) {
    console.error('Socket.io API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
        ? 'https://6fbmethodologies.com'
        : 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}