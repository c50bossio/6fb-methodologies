import { NextRequest, NextResponse } from 'next/server'
import {
  addVerifiedSkoolMember,
  getAllVerifiedSkoolMembers,
  getVerifiedSkoolMemberCount,
  removeVerifiedSkoolMember,
  verifySkoolMember,
  type SkoolMember
} from '@/lib/skool-members'

interface SkoolWebhookPayload {
  firstName: string
  lastName: string
  email: string
  transactionId: string
  subscriptionDate: string
}

// Webhook endpoint to receive new paid member data from Skool via Zapier
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Skool webhook received')

    const payload: SkoolWebhookPayload = await request.json()

    // Validate required fields
    const { firstName, lastName, email, transactionId, subscriptionDate } = payload

    if (!email || !firstName || !lastName || !transactionId) {
      console.error('❌ Missing required fields in Skool webhook:', payload)
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Create member record
    const member: SkoolMember = {
      email: normalizedEmail,
      firstName,
      lastName,
      transactionId,
      subscriptionDate,
      verifiedAt: new Date().toISOString(),
      isActive: true
    }

    // Store verified member using shared service
    addVerifiedSkoolMember(member)

    console.log('✅ Skool member verified and added:', {
      email: normalizedEmail,
      name: `${firstName} ${lastName}`,
      transactionId,
      totalMembers: getVerifiedSkoolMemberCount()
    })

    // Log for debugging
    console.log('📊 Current verified Skool members:', getVerifiedSkoolMemberCount())

    return NextResponse.json({
      success: true,
      message: 'Member verified successfully',
      member: {
        email: normalizedEmail,
        name: `${firstName} ${lastName}`,
        membershipType: 'Skool-Member',
        isActive: true,
        verifiedAt: member.verifiedAt
      }
    })

  } catch (error) {
    console.error('❌ Skool webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for testing and debugging
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    if (email) {
      // Check specific member
      const normalizedEmail = email.toLowerCase().trim()
      const verification = verifySkoolMember(normalizedEmail)

      return NextResponse.json({
        email: normalizedEmail,
        isVerified: verification.isVerified,
        member: verification.member || null,
        source: 'skool-webhook'
      })
    }

    // Return all verified members (for debugging)
    const membersList = getAllVerifiedSkoolMembers()

    return NextResponse.json({
      status: 'active',
      totalMembers: getVerifiedSkoolMemberCount(),
      members: membersList.map(m => ({
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        transactionId: m.transactionId,
        subscriptionDate: m.subscriptionDate,
        verifiedAt: m.verifiedAt
      })),
      endpoints: {
        POST: '/api/webhooks/skool - Receive new member data from Zapier',
        GET: '/api/webhooks/skool?email=test@example.com - Check specific member',
        GET: '/api/webhooks/skool - List all verified members'
      }
    })

  } catch (error) {
    console.error('❌ Skool webhook GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT endpoint for manual member management (admin use)
export async function PUT(request: NextRequest) {
  try {
    const { email, action = 'add', firstName, lastName, transactionId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (action === 'add') {
      if (!firstName || !lastName) {
        return NextResponse.json(
          { success: false, error: 'firstName and lastName required for adding members' },
          { status: 400 }
        )
      }

      const member: SkoolMember = {
        email: normalizedEmail,
        firstName,
        lastName,
        transactionId: transactionId || `manual_${Date.now()}`,
        subscriptionDate: new Date().toISOString().split('T')[0],
        verifiedAt: new Date().toISOString(),
        isActive: true
      }

      addVerifiedSkoolMember(member)

      console.log('✅ Manual Skool member added:', {
        email: normalizedEmail,
        name: `${firstName} ${lastName}`
      })

    } else if (action === 'remove') {
      const existed = removeVerifiedSkoolMember(normalizedEmail)

      console.log(`🗑️ Manual Skool member removal: ${normalizedEmail} - ${existed ? 'removed' : 'not found'}`)
    }

    return NextResponse.json({
      success: true,
      message: `Member ${action === 'add' ? 'added' : 'removed'} successfully`,
      totalMembers: getVerifiedSkoolMemberCount()
    })

  } catch (error) {
    console.error('❌ Skool webhook PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// All member management functions are now available through @/lib/skool-members