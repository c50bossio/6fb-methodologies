import { NextRequest, NextResponse } from 'next/server'
import { validateEmail } from '@/lib/utils'
import { verify6FBMembership } from '@/lib/stripe'
import { verifySkoolMember } from '@/lib/skool-members'
import { verifyCSVMember } from '@/lib/csv-members'

// Legacy fallback member list (kept for backward compatibility during transition)
const fallbackMembers = new Set([
  'dre@6fb.com',
  'nate@6fb.com',
  'bossio@6fb.com',
  'test@6fb.com',
  'member@6fb.com'
])

const fallbackMemberData: Record<string, { name: string; membershipType: string; joinDate: string }> = {
  'dre@6fb.com': { name: 'Dre', membershipType: 'Founder', joinDate: '2020-01-01' },
  'nate@6fb.com': { name: 'Nate', membershipType: 'Founder', joinDate: '2020-01-01' },
  'bossio@6fb.com': { name: 'Bossio', membershipType: 'Founder', joinDate: '2020-01-01' },
  'test@6fb.com': { name: 'Test User', membershipType: 'Pro', joinDate: '2023-06-15' },
  'member@6fb.com': { name: 'Demo Member', membershipType: 'Basic', joinDate: '2024-03-20' }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate input
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    console.log(`Verifying 6FB membership for: ${normalizedEmail}`)

    // Priority 1: Check CSV file members (monthly export from Skool)
    const csvVerification = verifyCSVMember(normalizedEmail)

    if (csvVerification.isVerified && csvVerification.member) {
      console.log(`✅ CSV membership verified for: ${normalizedEmail}`)

      return NextResponse.json({
        success: true,
        isVerified: true,
        member: {
          email: csvVerification.member.email,
          name: csvVerification.member.name,
          membershipType: csvVerification.member.membershipType,
          isActive: csvVerification.member.isActive,
          joinDate: csvVerification.member.joinDate,
          invitedBy: csvVerification.member.invitedBy
        },
        memberName: csvVerification.member.name,
        source: 'csv'
      })
    }

    console.log(`CSV verification result for: ${normalizedEmail} - not found in CSV members`)

    // Priority 2: Check Skool webhook verified members (new members via Zapier)
    const skoolVerification = verifySkoolMember(normalizedEmail)

    if (skoolVerification.isVerified && skoolVerification.member) {
      console.log(`✅ Skool membership verified for: ${normalizedEmail}`)

      return NextResponse.json({
        success: true,
        isVerified: true,
        member: {
          email: skoolVerification.member.email,
          name: skoolVerification.member.name,
          membershipType: skoolVerification.member.membershipType,
          isActive: skoolVerification.member.isActive,
          joinDate: skoolVerification.member.joinDate,
          transactionId: skoolVerification.member.transactionId
        },
        memberName: skoolVerification.member.name,
        source: 'skool'
      })
    }

    console.log(`Skool verification result for: ${normalizedEmail} - not found in Skool members`)

    // Priority 3: Try Stripe customer lookup for workshop purchases, etc.
    try {
      const stripeVerification = await verify6FBMembership(normalizedEmail)

      if (stripeVerification.isVerified && stripeVerification.member) {
        console.log(`✅ Stripe verification successful for: ${normalizedEmail}`)

        return NextResponse.json({
          success: true,
          isVerified: true,
          member: {
            email: stripeVerification.member.email,
            name: stripeVerification.member.name,
            membershipType: stripeVerification.member.membershipType,
            isActive: stripeVerification.member.isActive,
            joinDate: stripeVerification.member.joinDate,
            customerId: stripeVerification.member.customerId,
            lastPayment: stripeVerification.member.lastPayment
          },
          memberName: stripeVerification.member.name,
          source: 'stripe'
        })
      }

      console.log(`Stripe verification failed for: ${normalizedEmail}, reason: ${stripeVerification.error}`)
    } catch (stripeError) {
      console.error('Stripe verification error:', stripeError)
    }

    // Fallback to legacy member list (for testing and backward compatibility)
    const isFallbackMember = fallbackMembers.has(normalizedEmail)

    if (isFallbackMember && fallbackMemberData[normalizedEmail]) {
      const member = fallbackMemberData[normalizedEmail]

      console.log(`Fallback verification successful for: ${normalizedEmail}`)

      return NextResponse.json({
        success: true,
        isVerified: true,
        member: {
          email: normalizedEmail,
          name: member.name,
          membershipType: member.membershipType,
          isActive: true,
          joinDate: member.joinDate
        },
        memberName: member.name,
        source: 'fallback'
      })
    }

    // Member not found in either Stripe or fallback
    console.log(`Member verification failed for: ${normalizedEmail} - not found in Stripe or fallback list`)

    return NextResponse.json({
      success: true,
      isVerified: false,
      error: 'Email not found in 6FB member database'
    })

  } catch (error) {
    console.error('Member verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during verification' },
      { status: 500 }
    )
  }
}

// Add member to fallback list (for testing/admin purposes)
export async function PUT(request: NextRequest) {
  try {
    const { email, action = 'add', name, membershipType } = await request.json()

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (action === 'add') {
      fallbackMembers.add(normalizedEmail)
      if (name && membershipType) {
        fallbackMemberData[normalizedEmail] = {
          name,
          membershipType,
          joinDate: new Date().toISOString().split('T')[0]
        }
      }
    } else if (action === 'remove') {
      fallbackMembers.delete(normalizedEmail)
      delete fallbackMemberData[normalizedEmail]
    }

    console.log(`Fallback member ${action}: ${normalizedEmail}`)

    return NextResponse.json({
      success: true,
      message: `Fallback member ${action === 'add' ? 'added' : 'removed'} successfully`,
      memberCount: fallbackMembers.size,
      note: 'This only affects the fallback list. Primary verification uses Stripe customer data.'
    })

  } catch (error) {
    console.error('Member update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during update' },
      { status: 500 }
    )
  }
}

// GET method for testing and debugging
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    if (email) {
      // Test specific email verification
      const normalizedEmail = email.toLowerCase().trim()
      const csvVerification = verifyCSVMember(normalizedEmail)
      const skoolVerification = verifySkoolMember(normalizedEmail)
      const stripeVerification = await verify6FBMembership(normalizedEmail)
      const fallbackVerification = fallbackMembers.has(normalizedEmail)

      return NextResponse.json({
        email: normalizedEmail,
        csv: csvVerification,
        skool: skoolVerification,
        stripe: stripeVerification,
        fallback: {
          isVerified: fallbackVerification,
          data: fallbackVerification ? fallbackMemberData[normalizedEmail] : null
        },
        priority: csvVerification.isVerified ? 'csv' :
                 skoolVerification.isVerified ? 'skool' :
                 stripeVerification.isVerified ? 'stripe' :
                 fallbackVerification ? 'fallback' : 'none'
      })
    }

    // Return system status
    return NextResponse.json({
      status: 'active',
      fallbackMemberCount: fallbackMembers.size,
      fallbackMembers: Array.from(fallbackMembers),
      primaryVerification: 'stripe',
      endpoints: {
        POST: '/api/verify-member - Verify membership',
        PUT: '/api/verify-member - Add/remove fallback members',
        GET: '/api/verify-member?email=test@example.com - Test specific email'
      }
    })

  } catch (error) {
    console.error('GET verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}