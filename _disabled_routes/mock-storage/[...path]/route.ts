import { NextRequest, NextResponse } from 'next/server';
import { getMockStorage } from '@/lib/mock-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const fileName = params.path[params.path.length - 1];

    if (!fileName) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const mockStorage = getMockStorage();
    const fileBuffer = await mockStorage.getFileBuffer(fileName);

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Determine content type based on file extension
    const contentType = fileName.endsWith('.webm')
      ? 'audio/webm'
      : fileName.endsWith('.mp3')
      ? 'audio/mpeg'
      : fileName.endsWith('.wav')
      ? 'audio/wav'
      : 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Mock storage serve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}