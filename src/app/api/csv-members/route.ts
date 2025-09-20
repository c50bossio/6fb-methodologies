import { NextRequest, NextResponse } from 'next/server';
import {
  reloadCSVMembers,
  getCSVInfo,
  getCSVMemberCount,
  getAllCSVMembers,
  searchCSVMembers,
} from '@/lib/csv-members';

// GET endpoint for CSV member status and management
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const query = url.searchParams.get('q');

    if (action === 'info') {
      // Get CSV file information
      const info = getCSVInfo();
      const memberCount = getCSVMemberCount();

      return NextResponse.json({
        success: true,
        csvFile: info,
        memberCount,
        status: info.exists ? 'loaded' : 'missing',
      });
    }

    if (action === 'search' && query) {
      // Search for members
      const results = searchCSVMembers(query);

      return NextResponse.json({
        success: true,
        query,
        results: results.map(member => ({
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          joinedDate: member.joinedDate,
          invitedBy: member.invitedBy,
        })),
        count: results.length,
      });
    }

    if (action === 'list') {
      // List all members (limited for performance)
      const allMembers = getAllCSVMembers();
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const paginatedMembers = allMembers
        .slice(offset, offset + limit)
        .map(member => ({
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          joinedDate: member.joinedDate,
          invitedBy: member.invitedBy,
        }));

      return NextResponse.json({
        success: true,
        members: paginatedMembers,
        pagination: {
          total: allMembers.length,
          offset,
          limit,
          hasMore: offset + limit < allMembers.length,
        },
      });
    }

    // Default: return status
    const info = getCSVInfo();
    const memberCount = getCSVMemberCount();

    return NextResponse.json({
      status: 'active',
      csvFile: {
        exists: info.exists,
        lastModified: info.lastModified,
        memberCount,
        path: info.path.split('/').pop(), // Just filename for security
      },
      endpoints: {
        'GET /api/csv-members?action=info': 'Get CSV file information',
        'GET /api/csv-members?action=search&q=email': 'Search for members',
        'GET /api/csv-members?action=list&limit=50': 'List all members',
        'POST /api/csv-members': 'Reload CSV file (monthly update)',
      },
      instructions: {
        monthlyUpdate: 'POST to this endpoint after replacing CSV file',
        search: 'Add ?action=search&q=query to search members',
        info: 'Add ?action=info to get file details',
      },
    });
  } catch (error) {
    console.error('❌ CSV members GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to reload CSV file (for monthly updates)
export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 Reloading CSV member data...');

    const result = reloadCSVMembers();

    if (result.success) {
      console.log(`✅ CSV reload completed: ${result.count} members loaded`);

      return NextResponse.json({
        success: true,
        message: 'CSV file reloaded successfully',
        previousCount: result.previousCount,
        currentCount: result.count,
        difference: result.count - result.previousCount,
        reloadedAt: new Date().toISOString(),
      });
    } else {
      console.error(`❌ CSV reload failed: ${result.error}`);

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          previousCount: result.previousCount,
          currentCount: result.count,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ CSV reload endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during reload' },
      { status: 500 }
    );
  }
}

// PUT endpoint for CSV file operations
export async function PUT(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'reload') {
      // Same as POST - reload CSV
      const result = reloadCSVMembers();

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'CSV reloaded successfully' : 'Reload failed',
        previousCount: result.previousCount,
        currentCount: result.count,
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "reload".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ CSV members PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
