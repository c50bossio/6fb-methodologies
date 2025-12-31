/**
 * 6FB Command Center API Configuration
 *
 * This module provides the API URL for the 6FB Command Center backend.
 * The backend handles user authentication, eligibility checks, and Stripe subscriptions.
 */

// Command Center Backend API URL
// In production, this should be set to the Vercel deployment URL
export const COMMAND_CENTER_API_URL =
  process.env.NEXT_PUBLIC_COMMAND_CENTER_API_URL ||
  'https://backend-6fb.vercel.app';

/**
 * Check if an email is eligible for 6FB Command Center access
 */
export async function checkEligibility(email: string): Promise<{
  eligible: boolean;
  reason: 'skool_member' | 'paid_subscriber' | 'already_registered' | 'not_eligible';
  message?: string;
  skoolMember?: { name: string; courses: string[] };
  stripeCustomer?: { subscriptionId: string };
}> {
  const response = await fetch(`${COMMAND_CENTER_API_URL}/api/auth/check-eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to check eligibility');
  }

  return response.json();
}

/**
 * Create a Stripe checkout session for app subscription
 */
export async function createSubscription(email: string, name?: string): Promise<{
  checkoutUrl: string;
  sessionId: string;
  customerId: string;
  isSkoolMember?: boolean;
  canProceedToSignup?: boolean;
  message?: string;
}> {
  const response = await fetch(`${COMMAND_CENTER_API_URL}/api/auth/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create subscription');
  }

  return data;
}

/**
 * Create a new user account after eligibility verification
 */
export async function createAccount(data: {
  email: string;
  password: string;
  name: string;
}): Promise<{
  user: { id: string; email: string; name: string };
  token: string;
  session: { id: string; expiresAt: string };
}> {
  const response = await fetch(`${COMMAND_CENTER_API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to create account');
  }

  return result;
}

/**
 * Get subscription pricing info
 */
export async function getSubscriptionInfo(): Promise<{
  pricing: {
    basePriceCents: number;
    basePriceDisplay: string;
    trialDays: number;
    currency: string;
  };
  features: string[];
}> {
  const response = await fetch(`${COMMAND_CENTER_API_URL}/api/auth/subscribe`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription info');
  }

  return response.json();
}
