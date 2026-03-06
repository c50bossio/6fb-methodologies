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
 * GET /api/admin/analytics
 * Get customer registration analytics and insights
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
    const cityId = searchParams.get('cityId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    // Get analytics data
    const analyticsParams: {
      startDate?: Date;
      endDate?: Date;
      cityId?: string;
    } = {};

    if (startDate) analyticsParams.startDate = startDate;
    if (endDate) analyticsParams.endDate = endDate;
    if (cityId) analyticsParams.cityId = cityId;

    const analytics = await customerService.getAnalytics(analyticsParams);

    // Calculate additional metrics
    const averageRevenuePerCustomer =
      analytics.totalCustomers > 0
        ? analytics.totalRevenue / analytics.totalCustomers
        : 0;

    const conversionMetrics = {
      totalTickets: analytics.ticketsSold.ga + analytics.ticketsSold.vip,
      vipConversionRate:
        analytics.ticketsSold.ga + analytics.ticketsSold.vip > 0
          ? (analytics.ticketsSold.vip /
              (analytics.ticketsSold.ga + analytics.ticketsSold.vip)) *
            100
          : 0,
      averageTicketsPerCustomer:
        analytics.totalCustomers > 0
          ? (analytics.ticketsSold.ga + analytics.ticketsSold.vip) /
            analytics.totalCustomers
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers: analytics.totalCustomers,
          totalRevenue: analytics.totalRevenue,
          averageRevenuePerCustomer,
          totalTickets: conversionMetrics.totalTickets,
        },
        ticketSales: {
          ga: analytics.ticketsSold.ga,
          vip: analytics.ticketsSold.vip,
          vipConversionRate: conversionMetrics.vipConversionRate,
          averageTicketsPerCustomer:
            conversionMetrics.averageTicketsPerCustomer,
        },
        topCities: analytics.topCities,
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          cityFilter: cityId,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/export
 * Export customer data in various formats
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
      format = 'json',
      cityId,
      startDate,
      endDate,
      includePayments = true,
      includeTickets = true,
    } = body;

    // Get all customers (limited to prevent memory issues)
    const customers = await customerService.getAllCustomers({
      limit: 1000, // Reasonable limit for export
      offset: 0,
      cityId,
    });

    // If we need payment/ticket data, fetch details for each customer
    let exportData = customers.customers;

    if (includePayments || includeTickets) {
      exportData = await Promise.all(
        customers.customers.map(async customer => {
          const details = await customerService.getCustomerDetails(customer.id);
          return {
            ...customer,
            ...(includePayments && { payments: details?.payments || [] }),
            ...(includeTickets && { tickets: details?.tickets || [] }),
          };
        })
      );
    }

    // Filter by date if specified
    if (startDate || endDate) {
      exportData = exportData.filter(customer => {
        const customerDate = new Date(customer.created_at);
        if (startDate && customerDate < new Date(startDate)) return false;
        if (endDate && customerDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Format data based on requested format
    let responseData;
    let contentType = 'application/json';
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}`;

    switch (format.toLowerCase()) {
      case 'csv':
        // Simple CSV conversion (you might want to use a proper CSV library)
        const csvHeaders = Object.keys(exportData[0] || {}).join(',');
        const csvRows = exportData.map(customer =>
          Object.values(customer)
            .map(value =>
              typeof value === 'object' ? JSON.stringify(value) : value
            )
            .join(',')
        );
        responseData = [csvHeaders, ...csvRows].join('\n');
        contentType = 'text/csv';
        filename += '.csv';
        break;

      case 'json':
      default:
        responseData = JSON.stringify(
          {
            exportInfo: {
              generatedAt: new Date().toISOString(),
              totalRecords: exportData.length,
              filters: { cityId, startDate, endDate },
              includes: { payments: includePayments, tickets: includeTickets },
            },
            customers: exportData,
          },
          null,
          2
        );
        filename += '.json';
        break;
    }

    // Return the export data
    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting customer data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export customer data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
