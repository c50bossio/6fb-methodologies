import { NextRequest, NextResponse } from 'next/server'
import {
  checkInventoryStatus,
  getInventoryTransactions,
  getInventoryExpansions,
  getPublicAvailableSpots,
  getActualAvailableSpots
} from '@/lib/inventory'

interface RouteParams {
  params: {
    cityId: string
  }
}

/**
 * GET /api/inventory/[cityId] - Get detailed inventory for specific city
 * GET /api/inventory/[cityId]?transactions=true - Include transaction history
 * GET /api/inventory/[cityId]?expansions=true - Include expansion history
 * GET /api/inventory/[cityId]?public=true - Get only public availability
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { cityId } = params
    const searchParams = request.nextUrl.searchParams
    const includeTransactions = searchParams.get('transactions') === 'true'
    const includeExpansions = searchParams.get('expansions') === 'true'
    const publicOnly = searchParams.get('public') === 'true'

    // Get public availability only
    if (publicOnly) {
      const gaAvailable = await getPublicAvailableSpots(cityId, 'ga')
      const vipAvailable = await getPublicAvailableSpots(cityId, 'vip')

      return NextResponse.json({
        success: true,
        data: {
          cityId,
          publicAvailable: {
            ga: gaAvailable,
            vip: vipAvailable
          },
          timestamp: new Date().toISOString()
        }
      })
    }

    // Get full inventory status
    const status = await checkInventoryStatus(cityId)
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      )
    }

    // Build response data
    const responseData: any = {
      inventory: status
    }

    // Include transaction history if requested
    if (includeTransactions) {
      const transactions = await getInventoryTransactions(cityId, 100) // Last 100 transactions
      responseData.transactions = transactions
    }

    // Include expansion history if requested
    if (includeExpansions) {
      const expansions = await getInventoryExpansions(cityId)
      responseData.expansions = expansions
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error(`Error getting inventory for ${params.cityId}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inventory/[cityId]/spots?tier=ga - Get available spots for specific tier
 */
export async function GET_SPOTS(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { cityId } = params
    const searchParams = request.nextUrl.searchParams
    const tier = searchParams.get('tier') as 'ga' | 'vip'
    const actual = searchParams.get('actual') === 'true'

    if (!tier || !['ga', 'vip'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Tier parameter must be "ga" or "vip"' },
        { status: 400 }
      )
    }

    const available = actual
      ? await getActualAvailableSpots(cityId, tier)
      : await getPublicAvailableSpots(cityId, tier)

    return NextResponse.json({
      success: true,
      data: {
        cityId,
        tier,
        available,
        type: actual ? 'actual' : 'public',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error(`Error getting spots for ${params.cityId}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}