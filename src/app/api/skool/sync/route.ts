import { NextRequest, NextResponse } from 'next/server'
import { syncExistingSkoolMembers, createSkoolAPIClient } from '@/lib/skool-api'
import { getVerifiedSkoolMemberCount, getSkoolMemberStats } from '@/lib/skool-members'

// POST endpoint to sync existing Skool members
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Skool member sync...')

    const result = await syncExistingSkoolMembers()

    if (result.success) {
      console.log(`✅ Sync completed: ${result.imported} members imported`)

      return NextResponse.json({
        success: true,
        message: result.message,
        imported: result.imported,
        totalMembers: getVerifiedSkoolMemberCount(),
        stats: getSkoolMemberStats()
      })
    } else {
      console.error(`❌ Sync failed: ${result.message}`)

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          imported: result.imported
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Skool sync endpoint error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during sync' },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status and test API connection
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'test') {
      // Test API connection
      console.log('🧪 Testing Skool API connection...')

      const client = createSkoolAPIClient()
      if (!client) {
        return NextResponse.json({
          success: false,
          error: 'Skool API not configured',
          configured: false
        })
      }

      const testResult = await client.testConnection()

      return NextResponse.json({
        success: testResult.success,
        configured: true,
        connectionTest: testResult.success ? 'passed' : 'failed',
        error: testResult.error,
        groupInfo: testResult.data?.groupInfo
      })
    }

    // Default: return sync status
    const stats = getSkoolMemberStats()

    return NextResponse.json({
      status: 'ready',
      totalMembers: getVerifiedSkoolMemberCount(),
      stats,
      apiConfigured: !!(process.env.SKOOL_API_KEY && process.env.SKOOL_GROUP_URL),
      endpoints: {
        'POST /api/skool/sync': 'Sync existing Skool members',
        'GET /api/skool/sync?action=test': 'Test Skool API connection',
        'GET /api/skool/sync': 'Get sync status'
      },
      instructions: {
        sync: 'POST to this endpoint to import existing active Skool subscribers',
        test: 'Add ?action=test to test API connection',
        monitor: 'Check totalMembers count before/after sync'
      }
    })

  } catch (error) {
    console.error('❌ Skool sync GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT endpoint for manual member management
export async function PUT(request: NextRequest) {
  try {
    const { email, action = 'sync' } = await request.json()

    if (action === 'sync' && email) {
      // Sync specific member
      console.log(`🔍 Syncing specific member: ${email}`)

      const client = createSkoolAPIClient()
      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Skool API not configured' },
          { status: 500 }
        )
      }

      const memberResult = await client.fetchMemberByEmail(email)

      if (memberResult.success && memberResult.data) {
        const member = memberResult.data

        if (member.isActive && member.subscriptionStatus === 'active') {
          // Add to verified members
          const { addVerifiedSkoolMember } = await import('@/lib/skool-members')

          addVerifiedSkoolMember({
            email: member.email.toLowerCase().trim(),
            firstName: member.firstName,
            lastName: member.lastName,
            transactionId: `skool_manual_${member.id}`,
            subscriptionDate: member.joinedAt.split('T')[0],
            verifiedAt: new Date().toISOString(),
            isActive: true
          })

          return NextResponse.json({
            success: true,
            message: 'Member synced successfully',
            member: {
              email: member.email,
              name: `${member.firstName} ${member.lastName}`,
              subscriptionStatus: member.subscriptionStatus,
              joinedAt: member.joinedAt
            }
          })
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Member found but not active or subscription expired',
              member: {
                email: member.email,
                subscriptionStatus: member.subscriptionStatus,
                isActive: member.isActive
              }
            },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: memberResult.error || 'Member not found in Skool community'
          },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing email' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ Skool sync PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}