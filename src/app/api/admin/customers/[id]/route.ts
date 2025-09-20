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
 * GET /api/admin/customers/[id]
 * Get detailed customer information including payments and tickets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin access
    if (!validateAdminAccess(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const customerId = params.id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer details with payments and tickets
    const customerDetails =
      await customerService.getCustomerDetails(customerId);

    if (!customerDetails) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate summary stats
    const totalSpent = customerDetails.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const totalTickets = customerDetails.tickets.length;

    const ticketTypes = customerDetails.tickets.reduce(
      (acc, ticket) => {
        acc[ticket.ticket_type] = (acc[ticket.ticket_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const cityAttendance = customerDetails.tickets.reduce(
      (acc, ticket) => {
        acc[ticket.city_id] = (acc[ticket.city_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        customer: customerDetails.customer,
        payments: customerDetails.payments,
        tickets: customerDetails.tickets,
        summary: {
          totalSpent,
          totalTickets,
          ticketTypes,
          cityAttendance,
          membershipStatus: customerDetails.customer.is_six_fb_member
            ? 'Member'
            : 'Non-Member',
          verificationStatus: customerDetails.customer.is_verified_member
            ? 'Verified'
            : 'Unverified',
          registeredAt: customerDetails.customer.created_at,
          lastActivity: customerDetails.customer.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customer details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
