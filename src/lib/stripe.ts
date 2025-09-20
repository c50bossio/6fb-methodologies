import Stripe from 'stripe';
import { getCityById, getCityByName } from './cities';
import { validateMemberDiscountEligibility } from './member-discount-tracking';

// Initialize Stripe Account (Bossio Solution INC)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export { stripe };

// Stripe configuration constants - only include valid parameters
export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card', 'klarna', 'afterpay_clearpay', 'affirm'],
  billing_address_collection: 'required' as const,
  // Don't include shipping_address_collection if not needed (it's for physical products)
  allow_promotion_codes: false, // We handle discounts internally
  automatic_tax: {
    enabled: false, // Enable if you want Stripe to calculate tax
  },
  customer_creation: 'always' as const,
  mode: 'payment' as const,
  submit_type: 'pay' as const,
};

// Workshop pricing constants
export const WORKSHOP_PRICES = {
  GA: 100000, // $1000.00 in cents
  VIP: 150000, // $1500.00 in cents
} as const;

// Discount constants
export const DISCOUNTS = {
  SIXFB_MEMBER_GA: 0.2, // 20% for GA
  SIXFB_MEMBER_VIP: 0.1, // 10% for VIP
  BULK_2: 0.05, // 5%
  BULK_3: 0.1, // 10%
  BULK_4: 0.15, // 15%
} as const;

// Helper functions for discount calculations (reusable by frontend)
export function calculateBulkDiscount(quantity: number): number {
  if (quantity >= 4) return DISCOUNTS.BULK_4; // 15% off for 4+
  if (quantity >= 3) return DISCOUNTS.BULK_3; // 10% off for 3
  if (quantity >= 2) return DISCOUNTS.BULK_2; // 5% off for 2
  return 0; // No discount for 1
}

export function getSixFBDiscount(ticketType: 'GA' | 'VIP' = 'GA'): number {
  return ticketType === 'VIP'
    ? DISCOUNTS.SIXFB_MEMBER_VIP
    : DISCOUNTS.SIXFB_MEMBER_GA;
}

// Helper function to calculate discounted price in cents
export async function calculateStripePriceInCents(
  ticketType: 'GA' | 'VIP',
  quantity: number,
  isSixFBMember: boolean,
  memberEmail?: string
): Promise<{
  originalAmount: number;
  finalAmount: number;
  discountAmount: number;
  discountPercentage: number;
  discountReason: string;
  discountEligible: boolean;
  discountBlocked?: string;
}> {
  const basePrice = WORKSHOP_PRICES[ticketType];
  const originalAmount = basePrice * quantity;

  let finalAmount = originalAmount;
  let discountReason = '';
  let discountEligible = true;
  let discountBlocked: string | undefined;

  // Check member discount eligibility if member email is provided
  if (isSixFBMember && memberEmail) {
    const eligibility = await validateMemberDiscountEligibility(
      memberEmail,
      ticketType
    );
    if (!eligibility.eligible) {
      discountEligible = false;
      discountBlocked = eligibility.reason;
      isSixFBMember = false; // Prevent applying discount below
    }
  }

  // Apply 6FB member discount - GA gets 20%, VIP gets 10%
  if (isSixFBMember && discountEligible) {
    if (quantity === 1) {
      // Single ticket: member gets discount (20% GA, 10% VIP)
      const memberDiscount = getSixFBDiscount(ticketType);
      finalAmount = Math.round(basePrice * (1 - memberDiscount));
      const discountPercent = Math.round(memberDiscount * 100);
      discountReason = `6FB Member Discount (One-time use)`;
    } else {
      // Multiple tickets: Compare member+bulk vs pure bulk and apply the better discount
      const memberDiscount = getSixFBDiscount(ticketType);
      const bulkDiscount = calculateBulkDiscount(quantity);

      // Option 1: Member discount on 1 ticket + bulk discount on remaining
      const memberTicketPrice = Math.round(basePrice * (1 - memberDiscount));
      const remainingQuantity = quantity - 1;
      const bulkTicketPrice = Math.round(basePrice * (1 - bulkDiscount));
      const memberPlusBulkTotal = memberTicketPrice + bulkTicketPrice * remainingQuantity;

      // Option 2: Pure bulk discount on all tickets (if applicable for GA)
      const pureBulkTotal = ticketType === 'GA' && quantity > 1
        ? Math.round(originalAmount * (1 - bulkDiscount))
        : originalAmount; // VIP doesn't get bulk discount normally

      // Choose the better option for the customer (lower price)
      if (memberPlusBulkTotal <= pureBulkTotal) {
        // Member + bulk combination is better or equal
        finalAmount = memberPlusBulkTotal;
        const memberPercentage = Math.round(memberDiscount * 100);
        const bulkPercentage = Math.round(bulkDiscount * 100);
        discountReason = `1 Member ticket (${memberPercentage}% off) + ${remainingQuantity} Bulk tickets (${bulkPercentage}% off)`;
      } else {
        // Pure bulk is better (rare case, but possible with high bulk discounts)
        finalAmount = pureBulkTotal;
        const bulkPercentage = Math.round(bulkDiscount * 100);
        discountReason = `Bulk Discount (${quantity} tickets, ${bulkPercentage}% off) - Better than member combo`;
      }
    }
  }
  // Apply bulk discount for GA only (if no member discount)
  else if (ticketType === 'GA' && quantity > 1) {
    const bulkDiscount = calculateBulkDiscount(quantity);
    finalAmount = Math.round(originalAmount * (1 - bulkDiscount));
    const bulkPercentage = Math.round(bulkDiscount * 100);
    discountReason = `Bulk Discount (${quantity} tickets, ${bulkPercentage}% off)`;
  }

  const discountAmount = originalAmount - finalAmount;
  const discountPercentage =
    originalAmount > 0
      ? Math.round((discountAmount / originalAmount) * 100)
      : 0;

  return {
    originalAmount,
    finalAmount,
    discountAmount,
    discountPercentage,
    discountReason,
    discountEligible,
    discountBlocked,
  };
}

// Frontend-friendly version that returns prices in dollars instead of cents
export async function calculatePricing(
  ticketType: 'GA' | 'VIP',
  quantity: number,
  isSixFBMember: boolean,
  memberEmail?: string,
  promoCode: string = '',
  isPromoValid: boolean = false
): Promise<{
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountReason: string;
  savings: number;
  discountEligible: boolean;
  discountBlocked?: string;
}> {
  // Use the main calculation function and convert to dollars
  const stripePricing = await calculateStripePriceInCents(
    ticketType,
    quantity,
    isSixFBMember,
    memberEmail
  );

  // Handle promo codes (if valid and no member discount was applied)
  let finalPrice = stripePricing.finalAmount / 100;
  let discountReason = stripePricing.discountReason;

  if (isPromoValid && promoCode && !stripePricing.discountReason) {
    const promoDiscount = 0.1; // 10% promo code discount
    const originalPrice = stripePricing.originalAmount / 100;
    finalPrice = originalPrice * (1 - promoDiscount);
    discountReason = `Promo Code: ${promoCode.toUpperCase()}`;
  }

  const originalPrice = stripePricing.originalAmount / 100;
  const savings = originalPrice - finalPrice;
  const discount =
    originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return {
    originalPrice,
    finalPrice,
    discount,
    discountReason,
    savings,
    discountEligible: stripePricing.discountEligible,
    discountBlocked: stripePricing.discountBlocked,
  };
}

// Create Stripe checkout session
export async function createCheckoutSession({
  ticketType,
  quantity,
  isSixFBMember,
  customerEmail,
  cityId,
  metadata = {},
}: {
  ticketType: 'GA' | 'VIP';
  quantity: number;
  isSixFBMember: boolean;
  customerEmail?: string;
  cityId?: string;
  metadata?: Record<string, string>;
}) {
  // Environment detection for Stripe pricing
  const isProduction = process.env.NODE_ENV === 'production' &&
                      process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
  const isDevelopment = process.env.NODE_ENV === 'development' ||
                       process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

  // Look up city-specific information if cityId is provided
  let city = null;
  let cityPriceId = null;
  let useCityPricing = false;

  console.log('🔍 Stripe createCheckoutSession - City lookup attempt:', {
    providedCityId: cityId,
    metadata: Object.keys(metadata),
  });

  if (cityId) {
    city = getCityById(cityId);
    if (city) {
      console.log(`✅ Successfully found city data for ${city.city}:`, {
        cityId,
        cityName: city.city,
        gaPriceId: city.stripe.gaPriceId,
        vipPriceId: city.stripe.vipPriceId,
        environment: isProduction ? 'production' : 'development',
      });
    } else {
      console.warn(`❌ City lookup failed for cityId: ${cityId}`);

      // Try fallback resolution from metadata if available
      if (metadata.cityName) {
        console.log(`🔍 Attempting fallback city resolution from metadata cityName: ${metadata.cityName}`);
        city = getCityByName(metadata.cityName);
        if (city) {
          console.log(`✅ Fallback resolution successful:`, {
            resolvedCityId: city.id,
            cityName: city.city,
          });
          // Update cityId for consistency
          cityId = city.id;
        } else {
          console.warn(`❌ Fallback city resolution failed for cityName: ${metadata.cityName}`);
        }
      }
    }
  } else {
    console.warn('❌ No cityId provided to createCheckoutSession');

    // Try to extract city from metadata as last resort
    if (metadata.cityName) {
      console.log(`🔍 No cityId provided, attempting to resolve from metadata cityName: ${metadata.cityName}`);
      city = getCityByName(metadata.cityName);
      if (city) {
        console.log(`✅ Successfully resolved city from metadata:`, {
          resolvedCityId: city.id,
          cityName: city.city,
        });
        cityId = city.id;
      }
    }
  }

  if (city) {
    console.log(`🏙️ Final city data for checkout session:`, {
      cityId: city.id,
      cityName: city.city,
      gaPriceId: city.stripe.gaPriceId,
      vipPriceId: city.stripe.vipPriceId,
      environment: isProduction ? 'production' : 'development',
    });

      cityPriceId =
        ticketType === 'GA' ? city.stripe.gaPriceId : city.stripe.vipPriceId;

      // Only use hardcoded price IDs in production environment
      useCityPricing = isProduction;

      if (!isProduction) {
        console.log(`⚠️ Development mode detected - using price_data instead of price IDs for ${city.city}`);
      }
    } else {
      console.warn(
        `⚠️ City not found for ID: ${cityId}, falling back to generic pricing`
      );
    }
  }

  const pricing = await calculateStripePriceInCents(
    ticketType,
    quantity,
    isSixFBMember,
    customerEmail
  );

  // Create city-specific product name
  const baseProductName = city
    ? `${city.city} Workshop - ${ticketType} Ticket`
    : `6FB Methodologies Workshop - ${ticketType} Ticket`;

  const productName =
    pricing.discountAmount > 0
      ? `${baseProductName} (${pricing.discountPercentage}% off - ${pricing.discountReason})`
      : baseProductName;

  const productDescription =
    ticketType === 'VIP'
      ? 'Complete workshop access plus VIP dinner (end of day one) and exclusive perks'
      : 'Complete workshop access with all core content and materials';

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (useCityPricing && cityPriceId && pricing.discountAmount === 0) {
    // Use city-specific price ID for full-price tickets
    console.log(`💳 Using city price ID: ${cityPriceId} for ${city.city}`);
    lineItems = [
      {
        price: cityPriceId,
        quantity,
      },
    ];
  } else {
    // Use city-specific price_data for discounted tickets or fallback to generic pricing
    const citySpecificName = city
      ? `${city.city} Workshop - ${ticketType} Ticket`
      : `6FB Methodologies Workshop - ${ticketType} Ticket`;

    console.log(
      `💳 Using city-specific price_data for ${city ? city.city : 'generic'}: $${pricing.finalAmount / quantity / 100}`
    );
    lineItems = [
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
              // Always include city information when available
              ...(city && {
                cityId,
                cityName: city.city,
                cityState: city.state,
                workshopDates: city.dates.join(', '),
                workshopMonth: city.month
              }),
              ...(pricing.discountAmount > 0 && {
                originalPrice: (
                  pricing.originalAmount /
                  quantity /
                  100
                ).toString(),
                discountReason: pricing.discountReason,
                discountPercentage: pricing.discountPercentage.toString(),
              }),
            },
          },
          unit_amount: Math.round(pricing.finalAmount / quantity), // Price per ticket after discount
        },
        quantity,
      },
    ];
  }

  // Create checkout session with explicit parameters to avoid camelCase issues
  console.log('🚀 Creating Stripe checkout session with parameters:', {
    mode: 'payment',
    currency: 'usd',
    lineItemsCount: lineItems.length,
    customerEmail: customerEmail || 'undefined',
    city: city?.city || 'generic',
    successUrl: `https://6fbmethodologies.com/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `https://6fbmethodologies.com/register?cancelled=true`,
    hasDiscount: pricing.discountAmount > 0,
  });

  // Try to create session, with graceful fallback for invalid price IDs
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'usd',
      payment_method_types: ['card', 'klarna', 'afterpay_clearpay', 'affirm'],
      billing_address_collection: 'required',
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      customer_creation: 'always',
      submit_type: 'pay',
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: `https://6fbmethodologies.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://6fbmethodologies.com/register?cancelled=true`,
      metadata: {
        workshopEvent: '6FB Methodologies Workshop',
        registrationSource: 'website',
        createdAt: new Date().toISOString(),
        originalPrice: (pricing.originalAmount / 100).toString(),
        finalPrice: (pricing.finalAmount / 100).toString(),
        discountAmount: (pricing.discountAmount / 100).toString(),
        discountReason: pricing.discountReason || '',
        savings: (
          (pricing.originalAmount - pricing.finalAmount) /
          100
        ).toString(),
        // Always include city information for tracking
        cityId: city?.id || '',
        cityName: city?.city || '',
        cityState: city?.state || '',
        workshopMonth: city?.month || '',
        workshopDates: city?.dates?.join(', ') || '',
        workshopLocation: city?.location || '',
        ticketType,
        quantity: quantity.toString(),
        ...metadata,
      },
    });
  } catch (error: any) {
    // Handle Stripe price ID errors gracefully
    if (error?.code === 'resource_missing' && useCityPricing && cityPriceId) {
      console.warn(`⚠️ Price ID ${cityPriceId} not found, falling back to price_data for ${city?.city}`);

      // Recreate line items with price_data fallback
      const fallbackLineItems = [
        {
          price_data: {
            currency: STRIPE_CONFIG.currency,
            product_data: {
              name: productName,
              description: productDescription,
              images: [],
              metadata: {
                ticketType,
                workshopEvent: '6FB Methodologies Workshop',
                // Always include city information when available
                ...(city && {
                  cityId,
                  cityName: city.city,
                  cityState: city.state,
                  workshopDates: city.dates.join(', '),
                  workshopMonth: city.month
                }),
              },
            },
            unit_amount: pricing.finalAmount / quantity, // Per-ticket price
          },
          quantity,
        },
      ];

      // Retry with fallback pricing
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'usd',
        payment_method_types: ['card', 'klarna', 'afterpay_clearpay', 'affirm'],
        billing_address_collection: 'required',
        allow_promotion_codes: false,
        automatic_tax: { enabled: false },
        customer_creation: 'always',
        submit_type: 'pay',
        line_items: fallbackLineItems,
        customer_email: customerEmail,
        success_url: `https://6fbmethodologies.com/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://6fbmethodologies.com/register?cancelled=true`,
        metadata: {
          workshopEvent: '6FB Methodologies Workshop',
          registrationSource: 'website',
          createdAt: new Date().toISOString(),
          originalPrice: (pricing.originalAmount / 100).toString(),
          finalPrice: (pricing.finalAmount / 100).toString(),
          discountAmount: (pricing.discountAmount / 100).toString(),
          discountReason: pricing.discountReason || '',
          savings: (
            (pricing.originalAmount - pricing.finalAmount) /
            100
          ).toString(),
          // Always include city information for tracking
          cityId: city?.id || '',
          cityName: city?.city || '',
          cityState: city?.state || '',
          workshopMonth: city?.month || '',
          workshopDates: city?.dates?.join(', ') || '',
          workshopLocation: city?.location || '',
          ticketType,
          quantity: quantity.toString(),
          fallbackReason: 'price_id_not_found',
          ...metadata,
        },
      });

      console.log(`✅ Fallback session created successfully for ${city?.city}`);
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  return {
    sessionId: session.id,
    url: session.url,
    pricing,
  };
}

// Retrieve checkout session
export async function getCheckoutSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer'],
  });
}

// Create a customer
export async function createCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

// Validate Stripe webhook signature
export function validateStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new Error('Invalid webhook signature');
  }
}

// Member verification utilities
export interface MemberVerificationResult {
  isVerified: boolean;
  member?: {
    email: string;
    name: string;
    customerId: string;
    membershipType: string;
    isActive: boolean;
    joinDate: string;
    lastPayment?: string;
    subscriptions?: Stripe.Subscription[];
  };
  error?: string;
}

// Verify 6FB membership via Skool API
export async function verify6FBMembership(
  email: string
): Promise<MemberVerificationResult> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Priority 1: Check Skool API for 6FB Community membership
    if (process.env.SKOOL_API_KEY && process.env.SKOOL_GROUP_URL) {
      console.log(`Checking Skool API for: ${normalizedEmail}`);

      try {
        // TODO: Implement Skool API member lookup
        // For now, we'll check Stripe for any successful payments as a fallback
        console.log(
          'Skool API integration pending - checking Stripe for membership history'
        );
      } catch (skoolError) {
        console.warn('Skool API check failed:', skoolError);
      }
    }

    // Check Stripe Account for workshop purchases (as membership indicator)
    console.log(
      `Checking Stripe account for membership history: ${normalizedEmail}`
    );

    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 10,
    });

    if (customers.data.length > 0) {
      for (const customer of customers.data) {
        const membershipInfo = await checkCustomerMembership(customer);

        if (membershipInfo.isVerified) {
          console.log(`✅ Membership verified for: ${normalizedEmail}`);
          return membershipInfo;
        }
      }
    }

    // No membership found
    return {
      isVerified: false,
      error: 'Email not found in 6FB member database',
    };
  } catch (error) {
    console.error('Error verifying 6FB membership:', error);
    return {
      isVerified: false,
      error: 'Internal error during verification',
    };
  }
}

// Check if a specific customer has valid membership
async function checkCustomerMembership(
  customer: Stripe.Customer
): Promise<MemberVerificationResult> {
  try {
    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    // Check for successful payments (for one-time purchases)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customer.id,
      limit: 20,
    });

    const successfulPayments = paymentIntents.data.filter(
      pi => pi.status === 'succeeded' && pi.amount > 0
    );

    // Check for successful invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      status: 'paid',
      limit: 10,
    });

    const hasActiveSubscription = subscriptions.data.length > 0;
    const hasSuccessfulPayments = successfulPayments.length > 0;
    const hasPaidInvoices = invoices.data.length > 0;

    if (hasActiveSubscription || hasSuccessfulPayments || hasPaidInvoices) {
      // Determine membership type based on subscription or payment amount
      let membershipType = 'Basic';
      let lastPayment: string | undefined;

      if (hasActiveSubscription) {
        const activeSubscription = subscriptions.data[0];
        membershipType = determineMembershipType(
          activeSubscription.items.data[0]?.price.unit_amount || 0
        );
        lastPayment = new Date(activeSubscription.created * 1000).toISOString();
      } else if (hasSuccessfulPayments) {
        const latestPayment = successfulPayments[0];
        membershipType = determineMembershipType(latestPayment.amount);
        lastPayment = new Date(latestPayment.created * 1000).toISOString();
      } else if (hasPaidInvoices) {
        const latestInvoice = invoices.data[0];
        membershipType = determineMembershipType(latestInvoice.amount_paid);
        lastPayment = new Date(latestInvoice.created * 1000).toISOString();
      }

      return {
        isVerified: true,
        member: {
          email: customer.email!,
          name: customer.name || 'Unknown Member',
          customerId: customer.id,
          membershipType,
          isActive: hasActiveSubscription,
          joinDate: new Date(customer.created * 1000).toISOString(),
          lastPayment,
          subscriptions: subscriptions.data,
        },
      };
    }

    return {
      isVerified: false,
      error: 'No qualifying payments or subscriptions found',
    };
  } catch (error) {
    console.error('Error checking customer membership:', error);
    return {
      isVerified: false,
      error: 'Error checking membership status',
    };
  }
}

// Determine membership type based on payment amount
function determineMembershipType(amountInCents: number): string {
  if (amountInCents >= 150000) {
    // $1500+ (VIP workshop or high-value subscription)
    return 'VIP';
  } else if (amountInCents >= 100000) {
    // $1000+ (GA workshop or premium subscription)
    return 'Premium';
  } else if (amountInCents >= 50000) {
    // $500+ (mid-tier)
    return 'Pro';
  } else if (amountInCents > 0) {
    // Any payment
    return 'Basic';
  }
  return 'Basic';
}

// Get member details by customer ID
export async function getMemberByCustomerId(
  customerId: string
): Promise<MemberVerificationResult> {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return {
        isVerified: false,
        error: 'Customer account deleted',
      };
    }

    return await checkCustomerMembership(customer as Stripe.Customer);
  } catch (error) {
    console.error('Error retrieving member by customer ID:', error);
    return {
      isVerified: false,
      error: 'Customer not found',
    };
  }
}

// Sync member from Stripe webhook data
export async function syncMemberFromWebhook(
  customer: Stripe.Customer,
  eventType: string,
  eventData?: any
): Promise<void> {
  try {
    console.log(`Syncing member from webhook: ${eventType}`, {
      customerId: customer.id,
      email: customer.email,
      eventType,
    });

    // This is where you would sync to your member database
    // For now, we'll just log the sync operation
    const membershipInfo = await checkCustomerMembership(customer);

    if (membershipInfo.isVerified) {
      console.log('Member synced successfully:', {
        email: customer.email,
        membershipType: membershipInfo.member?.membershipType,
        isActive: membershipInfo.member?.isActive,
      });
    }

    // TODO: Implement actual database sync here
    // await memberDatabase.upsert(membershipInfo.member)
  } catch (error) {
    console.error('Error syncing member from webhook:', error);
  }
}
