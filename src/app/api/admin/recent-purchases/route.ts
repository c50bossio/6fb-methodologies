import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/CustomerService';

// Simple admin authentication - same as other admin endpoints
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
 * GET /api/admin/recent-purchases
 * Get recent ticket purchases with full details
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
    const cityId = searchParams.get('cityId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    const queryOptions: {
      limit?: number;
      offset?: number;
      cityId?: string;
      startDate?: Date;
      endDate?: Date;
    } = { limit, offset };

    if (cityId) queryOptions.cityId = cityId;
    if (startDate) queryOptions.startDate = new Date(startDate);
    if (endDate) queryOptions.endDate = new Date(endDate);

    const result = await customerService.getRecentPurchases(queryOptions);

    const totalPages = Math.ceil(result.total / limit);

    // Format the data for better display
    const formattedPurchases = result.purchases.map(purchase => ({
      ...purchase,
      // Convert cents to dollars for display
      amountDollars: (purchase.amountCents / 100).toFixed(2),
      discountAmountDollars: (purchase.discountAmountCents / 100).toFixed(2),
      // Format dates
      purchaseDate: new Date(purchase.purchaseDate).toLocaleString(),
      workshopDate: new Date(purchase.workshopDate).toLocaleDateString(),
      // Calculate total tickets
      totalTickets: purchase.tickets.length,
      // Get unique ticket types
      ticketTypes: [...new Set(purchase.tickets.map(t => t.tier.toUpperCase()))].join(', ')
    }));

    return NextResponse.json({
      success: true,
      data: {
        purchases: formattedPurchases,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          cityId,
          startDate,
          endDate,
        },
        summary: {
          totalPurchases: result.total,
          totalRevenue: result.purchases.reduce((sum, p) => sum + p.amountCents, 0) / 100,
          averageOrderValue: result.purchases.length > 0
            ? (result.purchases.reduce((sum, p) => sum + p.amountCents, 0) / result.purchases.length / 100).toFixed(2)
            : '0.00',
          totalTickets: result.purchases.reduce((sum, p) => sum + p.tickets.length, 0),
        }
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching recent purchases:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recent purchases',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/recent-purchases/search
 * Advanced search for purchases with detailed filters
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
      cityId,
      startDate,
      endDate,
      customerEmail,
      minAmount,
      maxAmount,
      ticketType,
      memberStatus,
      page = 1,
      limit = 20,
    } = body;

    const offset = (page - 1) * limit;

    const queryOptions: {
      limit?: number;
      offset?: number;
      cityId?: string;
      startDate?: Date;
      endDate?: Date;
    } = { limit, offset };

    if (cityId) queryOptions.cityId = cityId;
    if (startDate) queryOptions.startDate = new Date(startDate);
    if (endDate) queryOptions.endDate = new Date(endDate);

    let result = await customerService.getRecentPurchases(queryOptions);

    // Apply client-side filters (in production, move these to database queries)
    let filteredPurchases = result.purchases;

    if (customerEmail) {
      filteredPurchases = filteredPurchases.filter(p =>
        p.customerEmail.toLowerCase().includes(customerEmail.toLowerCase())
      );
    }

    if (minAmount) {
      filteredPurchases = filteredPurchases.filter(p =>
        p.amountCents >= (minAmount * 100)
      );
    }

    if (maxAmount) {
      filteredPurchases = filteredPurchases.filter(p =>
        p.amountCents <= (maxAmount * 100)
      );
    }

    if (ticketType) {
      filteredPurchases = filteredPurchases.filter(p =>
        p.tickets.some(t => t.tier.toLowerCase() === ticketType.toLowerCase())
      );
    }

    if (memberStatus) {
      if (memberStatus === 'member') {
        filteredPurchases = filteredPurchases.filter(p => p.isSixFBMember);
      } else if (memberStatus === 'non-member') {
        filteredPurchases = filteredPurchases.filter(p => !p.isSixFBMember);
      }
    }

    // Format the filtered data
    const formattedPurchases = filteredPurchases.map(purchase => ({
      ...purchase,
      amountDollars: (purchase.amountCents / 100).toFixed(2),
      discountAmountDollars: (purchase.discountAmountCents / 100).toFixed(2),
      purchaseDate: new Date(purchase.purchaseDate).toLocaleString(),
      workshopDate: new Date(purchase.workshopDate).toLocaleDateString(),
      totalTickets: purchase.tickets.length,
      ticketTypes: [...new Set(purchase.tickets.map(t => t.tier.toUpperCase()))].join(', ')
    }));

    const totalPages = Math.ceil(filteredPurchases.length / limit);

    return NextResponse.json({
      success: true,
      data: {
        purchases: formattedPurchases,
        pagination: {
          page,
          limit,
          total: filteredPurchases.length,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          cityId,
          startDate,
          endDate,
          customerEmail,
          minAmount,
          maxAmount,
          ticketType,
          memberStatus,
        },
        summary: {
          totalPurchases: filteredPurchases.length,
          totalRevenue: filteredPurchases.reduce((sum, p) => sum + p.amountCents, 0) / 100,
          averageOrderValue: filteredPurchases.length > 0
            ? (filteredPurchases.reduce((sum, p) => sum + p.amountCents, 0) / filteredPurchases.length / 100).toFixed(2)
            : '0.00',
          totalTickets: filteredPurchases.reduce((sum, p) => sum + p.tickets.length, 0),
        }
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error searching purchases:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search purchases',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}