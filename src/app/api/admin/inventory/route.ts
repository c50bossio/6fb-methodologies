import { NextRequest, NextResponse } from 'next/server';
import {
  getAllInventoryStatuses,
  checkInventoryStatus,
  expandInventory,
  resetInventory,
  getInventoryTransactions,
  getInventoryExpansions,
} from '@/lib/inventory';

/**
 * Admin Inventory Management API
 *
 * GET /api/admin/inventory - Get comprehensive inventory dashboard data
 * GET /api/admin/inventory?analytics=true - Include analytics summary
 * GET /api/admin/inventory?alerts=true - Include alert thresholds
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    // const user = await authenticateAdmin(request)
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const searchParams = request.nextUrl.searchParams;
    const includeAnalytics = searchParams.get('analytics') === 'true';
    const includeAlerts = searchParams.get('alerts') === 'true';

    // Get all inventory statuses
    const inventoryStatuses = await getAllInventoryStatuses();

    // Build response data
    const responseData: any = {
      summary: {
        totalCities: inventoryStatuses.length,
        soldOutCities: inventoryStatuses.filter(s => s.isPublicSoldOut).length,
        lowInventoryCities: inventoryStatuses.filter(
          s => s.publicAvailable.ga <= 5 || s.publicAvailable.vip <= 2
        ).length,
        timestamp: new Date().toISOString(),
      },
      inventories: inventoryStatuses,
    };

    // Include analytics if requested
    if (includeAnalytics) {
      const analytics = await generateInventoryAnalytics(inventoryStatuses);
      responseData.analytics = analytics;
    }

    // Include alert configurations if requested
    if (includeAlerts) {
      responseData.alertConfig = {
        gaThresholds: [25, 15, 10, 5, 2, 0],
        vipThresholds: [10, 5, 3, 1, 0],
        criticalLevel: 2,
        warningLevel: 5,
        notificationChannels: {
          sms: !!process.env.TEAM_ALERT_PHONE,
          slack: !!process.env.SLACK_INVENTORY_WEBHOOK,
          email: !!process.env.ADMIN_EMAIL,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error in admin inventory API:', error);
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
 * POST /api/admin/inventory - Bulk inventory operations
 * Body: { operation: 'expand' | 'reset' | 'alert', data: ... }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    const body = await request.json();
    const { operation, data, authorizedBy } = body;

    if (!operation || !data || !authorizedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: operation, data, authorizedBy',
        },
        { status: 400 }
      );
    }

    switch (operation) {
      case 'expand':
        return await handleBulkExpansion(data, authorizedBy);

      case 'reset':
        return await handleBulkReset(data, authorizedBy);

      case 'alert':
        return await handleManualAlert(data, authorizedBy);

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid operation. Must be expand, reset, or alert',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in admin inventory operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function generateInventoryAnalytics(statuses: any[]) {
  const analytics = {
    totalCapacity: {
      ga: statuses.reduce((sum, s) => sum + s.actualLimits.ga, 0),
      vip: statuses.reduce((sum, s) => sum + s.actualLimits.vip, 0),
    },
    totalSold: {
      ga: statuses.reduce((sum, s) => sum + s.sold.ga, 0),
      vip: statuses.reduce((sum, s) => sum + s.sold.vip, 0),
    },
    totalPublicCapacity: {
      ga: statuses.length * 35, // Public limit per city
      vip: statuses.length * 15,
    },
    sellThroughRate: {
      ga: 0,
      vip: 0,
    },
    cityBreakdown: statuses.map(s => ({
      cityId: s.cityId,
      fillRate: {
        ga: s.actualLimits.ga > 0 ? (s.sold.ga / s.actualLimits.ga) * 100 : 0,
        vip:
          s.actualLimits.vip > 0 ? (s.sold.vip / s.actualLimits.vip) * 100 : 0,
      },
      isExpanded: s.actualLimits.ga > 35 || s.actualLimits.vip > 15,
      expansionAmount: {
        ga: Math.max(0, s.actualLimits.ga - 35),
        vip: Math.max(0, s.actualLimits.vip - 15),
      },
    })),
    alerts: {
      criticalCities: statuses
        .filter(s => s.publicAvailable.ga <= 2 || s.publicAvailable.vip <= 1)
        .map(s => s.cityId),
      lowInventoryCities: statuses
        .filter(s => s.publicAvailable.ga <= 5 || s.publicAvailable.vip <= 3)
        .map(s => s.cityId),
      soldOutCities: statuses.filter(s => s.isPublicSoldOut).map(s => s.cityId),
    },
  };

  // Calculate sell-through rates
  if (analytics.totalPublicCapacity.ga > 0) {
    analytics.sellThroughRate.ga =
      (analytics.totalSold.ga / analytics.totalPublicCapacity.ga) * 100;
  }
  if (analytics.totalPublicCapacity.vip > 0) {
    analytics.sellThroughRate.vip =
      (analytics.totalSold.vip / analytics.totalPublicCapacity.vip) * 100;
  }

  return analytics;
}

async function handleBulkExpansion(data: any, authorizedBy: string) {
  const { cities, tier, additionalSpots, reason } = data;

  if (!Array.isArray(cities) || !tier || !additionalSpots) {
    return NextResponse.json(
      { success: false, error: 'Invalid bulk expansion data' },
      { status: 400 }
    );
  }

  const results = [];
  for (const cityId of cities) {
    try {
      const result = await expandInventory(
        cityId,
        tier,
        additionalSpots,
        authorizedBy,
        reason || 'Bulk expansion via admin API'
      );
      results.push({ cityId, success: result.success, error: result.error });
    } catch (error) {
      results.push({
        cityId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: failureCount === 0,
    data: {
      totalCities: cities.length,
      successCount,
      failureCount,
      results,
      operation: 'bulk_expansion',
      authorizedBy,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleBulkReset(data: any, authorizedBy: string) {
  const { cities, reason } = data;

  if (!Array.isArray(cities) || !reason) {
    return NextResponse.json(
      { success: false, error: 'Invalid bulk reset data' },
      { status: 400 }
    );
  }

  const results = [];
  for (const cityId of cities) {
    try {
      const result = await resetInventory(cityId, authorizedBy, reason);
      results.push({ cityId, success: result.success, error: result.error });
    } catch (error) {
      results.push({
        cityId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  // Log critical bulk reset
  console.log(
    'bulk_inventory_reset',
    {
      cities,
      authorizedBy,
      reason,
      successCount,
      failureCount,
      timestamp: new Date().toISOString(),
    },
    'inventory',
    'critical'
  );

  return NextResponse.json({
    success: failureCount === 0,
    data: {
      totalCities: cities.length,
      successCount,
      failureCount,
      results,
      operation: 'bulk_reset',
      authorizedBy,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleManualAlert(data: any, authorizedBy: string) {
  const { message, urgency, channels } = data;

  if (!message) {
    return NextResponse.json(
      { success: false, error: 'Alert message is required' },
      { status: 400 }
    );
  }

  console.log(
    'manual_admin_alert',
    {
      message,
      urgency: urgency || 'medium',
      authorizedBy,
      timestamp: new Date().toISOString(),
    },
    'inventory',
    urgency || 'medium'
  );

  // Could send alerts through various channels here
  // SMS, Slack, Email, etc.

  return NextResponse.json({
    success: true,
    data: {
      message: 'Manual alert sent',
      authorizedBy,
      timestamp: new Date().toISOString(),
    },
  });
}
