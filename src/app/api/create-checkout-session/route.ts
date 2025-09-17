import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { validateEmail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    console.log('🔍 Checkout API - Full request body:', JSON.stringify(requestBody, null, 2))

    const {
      ticketType,
      quantity,
      customerEmail,
      customerName,
      isSixFBMember,
      registrationData,
    } = requestBody

    console.log('🔍 Checkout API - Extracted fields:', {
      ticketType,
      quantity,
      customerEmail,
      customerName,
      isSixFBMember,
      registrationData: registrationData ? 'present' : 'missing'
    })

    // Validate required fields
    if (!ticketType || !['GA', 'VIP', 'ga', 'vip'].includes(ticketType)) {
      console.error('❌ Validation failed: Invalid ticket type:', ticketType)
      return NextResponse.json(
        { success: false, error: 'Valid ticket type is required (GA, VIP, ga, or vip)' },
        { status: 400 }
      )
    }

    if (!quantity || quantity < 1 || quantity > 10) {
      console.error('❌ Validation failed: Invalid quantity:', quantity)
      return NextResponse.json(
        { success: false, error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      )
    }

    if (customerEmail && !validateEmail(customerEmail)) {
      console.error('❌ Validation failed: Invalid email:', customerEmail)
      return NextResponse.json(
        { success: false, error: 'Valid customer email is required' },
        { status: 400 }
      )
    }

    console.log('✅ All validation checks passed, proceeding to create checkout session')

    // Normalize ticket type to uppercase for consistency
    const normalizedTicketType = ticketType.toUpperCase()

    // Create metadata for the checkout session
    const metadata: Record<string, string> = {
      workshopEvent: '6FB Methodologies Workshop',
      registrationSource: 'website',
      createdAt: new Date().toISOString(),
    }

    // Add registration data to metadata if provided
    if (registrationData) {
      if (registrationData.firstName) metadata.firstName = registrationData.firstName
      if (registrationData.lastName) metadata.lastName = registrationData.lastName
      if (registrationData.businessName) metadata.businessName = registrationData.businessName
      if (registrationData.businessType) metadata.businessType = registrationData.businessType
      if (registrationData.yearsExperience) metadata.yearsExperience = registrationData.yearsExperience
      if (registrationData.phone) metadata.phone = registrationData.phone
    }

    // Add customer name to metadata
    if (customerName) metadata.customerName = customerName

    // Create Stripe checkout session
    console.log('🚀 Creating Stripe checkout session with params:', {
      ticketType: normalizedTicketType,
      quantity,
      isSixFBMember: Boolean(isSixFBMember),
      customerEmail,
      metadataKeys: Object.keys(metadata)
    })

    const { sessionId, url, pricing } = await createCheckoutSession({
      ticketType: normalizedTicketType,
      quantity,
      isSixFBMember: Boolean(isSixFBMember),
      customerEmail,
      metadata,
    })

    console.log('✅ Checkout session created successfully:', { sessionId, url: url ? 'present' : 'missing' })

    // Return checkout session details
    return NextResponse.json({
      success: true,
      sessionId,
      checkoutUrl: url,
      pricing: {
        originalAmount: pricing.originalAmount / 100, // Convert to dollars
        finalAmount: pricing.finalAmount / 100,
        discountAmount: pricing.discountAmount / 100,
        discountPercentage: pricing.discountPercentage,
        discountReason: pricing.discountReason,
      },
    })

  } catch (error) {
    console.error('Checkout session creation error:', error)

    // Handle specific Stripe errors
    if (error instanceof Error && error.message.includes('Invalid API Key')) {
      return NextResponse.json(
        { success: false, error: 'Payment system configuration error' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve session details
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const { getCheckoutSession } = await import('@/lib/stripe')
    const session = await getCheckoutSession(sessionId)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        metadata: session.metadata,
      },
    })

  } catch (error) {
    console.error('Session retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}