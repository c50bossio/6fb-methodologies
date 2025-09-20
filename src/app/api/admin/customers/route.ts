import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/CustomerService';

// Simple admin authentication - replace with proper auth system
const ADMIN_PASSWORD = 'tomb452026';

function validateAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  // Basic auth format: "Basic base64(username:password)"
  const base64Credentials = authHeader.split(' ')[1];
  if (!base64Credentials) return false;

  const credentials = Buffer.from(base64Credentials, 'base64').toString(
    'ascii'
  );
  const [, password] = credentials.split(':');

  return password === ADMIN_PASSWORD;
}

/**
 * GET /api/admin/customers
 * Get all customers with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    if (!validateAdminAccess(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const cityId = searchParams.get('cityId') || undefined;

    const offset = (page - 1) * limit;

    const customerParams: {
      limit?: number;
      offset?: number;
      search?: string;
      cityId?: string;
    } = { limit, offset };

    if (search) customerParams.search = search;
    if (cityId) customerParams.cityId = cityId;

    const result = await customerService.getAllCustomers(customerParams);

    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      success: true,
      data: {
        customers: result.customers,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          cityId,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/customers/search
 * Advanced customer search with filters
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    if (!validateAdminAccess(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      search,
      cityId,
      ticketType,
      memberStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = body;

    // This is a simplified search - you could extend this with more complex queries
    const result = await customerService.getAllCustomers({
      limit,
      offset: (page - 1) * limit,
      search,
      cityId,
    });

    // Filter results based on additional criteria (in a real implementation,
    // you'd want to do this at the database level for performance)
    let filteredCustomers = result.customers;

    if (memberStatus) {
      filteredCustomers = filteredCustomers.filter(customer => {
        if (memberStatus === 'member') return customer.is_six_fb_member;
        if (memberStatus === 'non-member') return !customer.is_six_fb_member;
        return true;
      });
    }

    if (dateFrom || dateTo) {
      filteredCustomers = filteredCustomers.filter(customer => {
        const customerDate = new Date(customer.created_at);
        if (dateFrom && customerDate < new Date(dateFrom)) return false;
        if (dateTo && customerDate > new Date(dateTo)) return false;
        return true;
      });
    }

    const totalPages = Math.ceil(filteredCustomers.length / limit);

    return NextResponse.json({
      success: true,
      data: {
        customers: filteredCustomers,
        pagination: {
          page,
          limit,
          total: filteredCustomers.length,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          cityId,
          ticketType,
          memberStatus,
          dateFrom,
          dateTo,
        },
      },
    });
  } catch (error) {
    console.error('Error searching customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search customers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
