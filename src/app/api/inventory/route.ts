import { NextRequest, NextResponse } from 'next/server';
import {
  getAllInventoryStatuses,
  checkInventoryStatus,
  expandInventory,
  resetInventory,
  getInventoryTransactions,
  getInventoryExpansions,
  validateInventoryForCheckout,
} from '@/lib/inventory';

/**
 * GET /api/inventory - Get all inventory statuses
 * GET /api/inventory?cityId=xxx - Get specific city inventory
 * GET /api/inventory?cityId=xxx&validate=true&tier=ga&quantity=2 - Validate checkout
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const validate = searchParams.get('validate') === 'true';
    const tier = searchParams.get('tier') as 'ga' | 'vip';
    const quantity = parseInt(searchParams.get('quantity') || '1');

    // Validate inventory for checkout
    if (validate && cityId && tier) {
      const result = await validateInventoryForCheckout(cityId, tier, quantity);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Get specific city inventory
    if (cityId) {
      const status = await checkInventoryStatus(cityId);
      if (!status) {
        return NextResponse.json(
          { success: false, error: 'City not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    // Get all inventory statuses
    const statuses = await getAllInventoryStatuses();
    return NextResponse.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('Error in inventory API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory - Expand inventory (admin only)
 * Body: { cityId, tier, additionalSpots, authorizedBy, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityId, tier, additionalSpots, authorizedBy, reason } = body;

    // Validation
    if (!cityId || !tier || !additionalSpots || !authorizedBy) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: cityId, tier, additionalSpots, authorizedBy',
        },
        { status: 400 }
      );
    }

    if (!['ga', 'vip'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Tier must be "ga" or "vip"' },
        { status: 400 }
      );
    }

    if (typeof additionalSpots !== 'number' || additionalSpots <= 0) {
      return NextResponse.json(
        { success: false, error: 'Additional spots must be a positive number' },
        { status: 400 }
      );
    }

    // TODO: Add admin authentication check here
    // const isAuthorized = await checkAdminPermissions(authorizedBy)
    // if (!isAuthorized) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 403 }
    //   )
    // }

    const result = await expandInventory(
      cityId,
      tier,
      additionalSpots,
      authorizedBy,
      reason || 'Admin expansion via API'
    );

    if (result.success) {
      // Log admin action
      console.log(
        'inventory_expanded_via_api',
        {
          cityId,
          tier,
          additionalSpots,
          authorizedBy,
          reason,
          newLimit: result.newLimit,
          timestamp: new Date().toISOString(),
        },
        'inventory',
        'medium'
      );

      return NextResponse.json({
        success: true,
        data: {
          cityId,
          tier,
          additionalSpots,
          newLimit: result.newLimit,
          authorizedBy,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error expanding inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory - Reset inventory (emergency admin only)
 * Body: { cityId, authorizedBy, reason }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { cityId, authorizedBy, reason } = body;

    // Validation
    if (!cityId || !authorizedBy || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: cityId, authorizedBy, reason',
        },
        { status: 400 }
      );
    }

    // TODO: Add strict admin authentication check here
    // const isAuthorized = await checkSuperAdminPermissions(authorizedBy)
    // if (!isAuthorized) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized - Super admin required' },
    //     { status: 403 }
    //   )
    // }

    const result = await resetInventory(cityId, authorizedBy, reason);

    if (result.success) {
      // Log critical admin action
      console.log(
        'inventory_reset_via_api',
        {
          cityId,
          authorizedBy,
          reason,
          timestamp: new Date().toISOString(),
        },
        'inventory',
        'critical'
      );

      // Send alert about inventory reset
      if (process.env.TEAM_ALERT_PHONE) {
        // Could send SMS alert about reset
        console.log('Inventory reset alert:', { cityId, authorizedBy, reason });
      }

      return NextResponse.json({
        success: true,
        data: {
          cityId,
          authorizedBy,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error resetting inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
