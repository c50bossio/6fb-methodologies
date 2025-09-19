import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken, validateSession, canTranscribeAudio, WORKBOOK_SECURITY_HEADERS } from '@/lib/workbook-auth'
// import { transcribeAudio, validateAudioFile, checkRateLimit } from '@/lib/secure-audio'

export async function POST(request: NextRequest) {
  // Temporarily disabled - missing secure-audio dependency
  return NextResponse.json(
    { error: 'Audio transcription service temporarily unavailable' },
    { status: 503, headers: WORKBOOK_SECURITY_HEADERS }
  )
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