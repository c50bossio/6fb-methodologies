import { NextRequest, NextResponse } from 'next/server'
import { validateEmail } from '@/lib/utils'

// In-memory store for demo - replace with actual database
let verifiedMembers = new Set([
  'dre@6fb.com',
  'nate@6fb.com',
  'bossio@6fb.com',
  'test@6fb.com',
  'member@6fb.com'
])

// Mock member data - replace with actual member lookup
const memberData: Record<string, { name: string; membershipType: string; joinDate: string }> = {
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

    // Check if email is in verified members list
    // In production, this would query your actual member database or Zapier webhook data
    const isVerified = verifiedMembers.has(normalizedEmail)

    if (isVerified && memberData[normalizedEmail]) {
      const member = memberData[normalizedEmail]

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
        memberName: member.name
      })
    }

    // Member not found
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

// Optional: Add a method to update the verified members list via Zapier webhook
export async function PUT(request: NextRequest) {
  try {
    const { email, action = 'add' } = await request.json()

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (action === 'add') {
      verifiedMembers.add(normalizedEmail)
    } else if (action === 'remove') {
      verifiedMembers.delete(normalizedEmail)
    }

    return NextResponse.json({
      success: true,
      message: `Member ${action === 'add' ? 'added' : 'removed'} successfully`,
      memberCount: verifiedMembers.size
    })

  } catch (error) {
    console.error('Member update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during update' },
      { status: 500 }
    )
  }
}