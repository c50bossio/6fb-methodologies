import Stripe from 'stripe'

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export { stripe }

// Stripe configuration constants - only include valid parameters
export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'],
  billing_address_collection: 'required' as const,
  // Don't include shipping_address_collection if not needed (it's for physical products)
  allow_promotion_codes: false, // We handle discounts internally
  automatic_tax: {
    enabled: false, // Enable if you want Stripe to calculate tax
  },
  customer_creation: 'always' as const,
  mode: 'payment' as const,
  submit_type: 'pay' as const,
}

// Workshop pricing constants
export const WORKSHOP_PRICES = {
  GA: 100000, // $1000.00 in cents
  VIP: 150000, // $1500.00 in cents
} as const

// Discount constants
export const DISCOUNTS = {
  SIXFB_MEMBER: 0.20, // 20%
  BULK_2: 0.05, // 5%
  BULK_3: 0.10, // 10%
  BULK_4: 0.15, // 15%
} as const

// Helper functions for discount calculations (reusable by frontend)
export function calculateBulkDiscount(quantity: number): number {
  if (quantity >= 4) return DISCOUNTS.BULK_4 // 15% off for 4+
  if (quantity >= 3) return DISCOUNTS.BULK_3 // 10% off for 3
  if (quantity >= 2) return DISCOUNTS.BULK_2 // 5% off for 2
  return 0 // No discount for 1
}

export function getSixFBDiscount(): number {
  return DISCOUNTS.SIXFB_MEMBER // 20% off for 6FB members
}

// Helper function to calculate discounted price in cents
export function calculateStripePriceInCents(
  ticketType: 'GA' | 'VIP',
  quantity: number,
  isSixFBMember: boolean
): {
  originalAmount: number
  finalAmount: number
  discountAmount: number
  discountPercentage: number
  discountReason: string
} {
  const basePrice = WORKSHOP_PRICES[ticketType]
  const originalAmount = basePrice * quantity

  let finalAmount = originalAmount
  let discountReason = ''

  // Apply 6FB member discount - only ONE ticket gets member discount
  if (isSixFBMember) {
    if (quantity === 1) {
      // Single ticket: member gets 20% off
      const memberDiscount = getSixFBDiscount()
      finalAmount = Math.round(basePrice * (1 - memberDiscount))
      discountReason = '6FB Member Discount'
    } else {
      // Multiple tickets: 1 member ticket (20% off) + bulk pricing on remaining
      const memberTicketPrice = Math.round(basePrice * (1 - getSixFBDiscount()))
      const remainingQuantity = quantity - 1
      const bulkDiscount = calculateBulkDiscount(quantity) // Based on total quantity
      const bulkTicketPrice = Math.round(basePrice * (1 - bulkDiscount))

      finalAmount = memberTicketPrice + (bulkTicketPrice * remainingQuantity)
      const bulkPercentage = Math.round(bulkDiscount * 100)
      discountReason = `1 Member ticket (20% off) + ${remainingQuantity} Bulk tickets (${bulkPercentage}% off)`
    }
  }
  // Apply bulk discount for GA only (if no member)
  else if (ticketType === 'GA' && quantity > 1) {
    const bulkDiscount = calculateBulkDiscount(quantity)
    finalAmount = Math.round(originalAmount * (1 - bulkDiscount))
    discountReason = `Bulk Discount (${quantity} tickets)`
  }

  const discountAmount = originalAmount - finalAmount
  const discountPercentage = originalAmount > 0 ? Math.round((discountAmount / originalAmount) * 100) : 0

  return {
    originalAmount,
    finalAmount,
    discountAmount,
    discountPercentage,
    discountReason,
  }
}

// Frontend-friendly version that returns prices in dollars instead of cents
export function calculatePricing(
  ticketType: 'GA' | 'VIP',
  quantity: number,
  isSixFBMember: boolean,
  promoCode: string = '',
  isPromoValid: boolean = false
): {
  originalPrice: number
  finalPrice: number
  discount: number
  discountReason: string
  savings: number
} {
  const basePrice = WORKSHOP_PRICES[ticketType] / 100 // Convert to dollars
  const originalPrice = basePrice * quantity

  let finalPrice = originalPrice
  let discountReason = ''

  // Apply 6FB member discount - only ONE ticket gets member discount
  if (isSixFBMember) {
    if (quantity === 1) {
      // Single ticket: member gets 20% off
      const memberDiscount = getSixFBDiscount()
      finalPrice = basePrice * (1 - memberDiscount)
      discountReason = '6FB Member Discount'
    } else {
      // Multiple tickets: 1 member ticket (20% off) + bulk pricing on remaining
      const memberTicketPrice = basePrice * (1 - getSixFBDiscount())
      const remainingQuantity = quantity - 1
      const bulkDiscount = calculateBulkDiscount(quantity) // Based on total quantity
      const bulkTicketPrice = basePrice * (1 - bulkDiscount)

      finalPrice = memberTicketPrice + (bulkTicketPrice * remainingQuantity)
      const bulkPercentage = Math.round(bulkDiscount * 100)
      discountReason = `1 Member ticket (20% off) + ${remainingQuantity} Bulk tickets (${bulkPercentage}% off)`
    }
  }
  // Apply promo code discount (if valid and no member discount)
  else if (isPromoValid && promoCode) {
    const promoDiscount = 0.1 // 10% promo code discount
    finalPrice = originalPrice * (1 - promoDiscount)
    discountReason = `Promo Code: ${promoCode.toUpperCase()}`
  }
  // Apply bulk discount for GA only (if no other discounts)
  else if (ticketType === 'GA' && quantity > 1) {
    const bulkDiscount = calculateBulkDiscount(quantity)
    finalPrice = originalPrice * (1 - bulkDiscount)
    discountReason = `Bulk Discount (${quantity} tickets)`
  }

  const savings = originalPrice - finalPrice
  const discount = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0

  return {
    originalPrice,
    finalPrice,
    discount,
    discountReason,
    savings,
  }
}

// Create Stripe checkout session
export async function createCheckoutSession({
  ticketType,
  quantity,
  isSixFBMember,
  customerEmail,
  metadata = {},
}: {
  ticketType: 'GA' | 'VIP'
  quantity: number
  isSixFBMember: boolean
  customerEmail?: string
  metadata?: Record<string, string>
}) {
  const pricing = calculateStripePriceInCents(ticketType, quantity, isSixFBMember)

  // Create line item with discounted price
  const productName = pricing.discountAmount > 0
    ? `6FB Methodologies Workshop - ${ticketType} Ticket (${pricing.discountPercentage}% off - ${pricing.discountReason})`
    : `6FB Methodologies Workshop - ${ticketType} Ticket`

  const productDescription = ticketType === 'VIP'
    ? 'Complete workshop access plus VIP dinner and exclusive perks'
    : 'Complete workshop access with all core content and materials'

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: STRIPE_CONFIG.currency,
        product_data: {
          name: productName,
          description: productDescription,
          images: [], // Add workshop images if available
          metadata: {
            ticketType,
            workshopEvent: '6FB Methodologies Workshop',
            ...(pricing.discountAmount > 0 && {
              originalPrice: (pricing.originalAmount / quantity / 100).toString(),
              discountReason: pricing.discountReason,
              discountPercentage: pricing.discountPercentage.toString()
            })
          },
        },
        unit_amount: Math.round(pricing.finalAmount / quantity), // Price per ticket after discount
      },
      quantity,
    },
  ]

  // Create checkout session with explicit parameters to avoid camelCase issues
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'usd',
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    automatic_tax: { enabled: false },
    customer_creation: 'always',
    submit_type: 'pay',
    line_items: lineItems,
    customer_email: customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register?cancelled=true`,
    metadata: {
      ticketType,
      quantity: quantity.toString(),
      isSixFBMember: isSixFBMember.toString(),
      originalAmount: pricing.originalAmount.toString(),
      discountAmount: pricing.discountAmount.toString(),
      discountReason: pricing.discountReason,
      ...metadata,
    },
  })

  return {
    sessionId: session.id,
    url: session.url,
    pricing,
  }
}

// Retrieve checkout session
export async function getCheckoutSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer'],
  })
}

// Create a customer
export async function createCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string
  name?: string
  metadata?: Record<string, string>
}) {
  return await stripe.customers.create({
    email,
    name,
    metadata,
  })
}

// Validate Stripe webhook signature
export function validateStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    throw new Error('Invalid webhook signature')
  }
}