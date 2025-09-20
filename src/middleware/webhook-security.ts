// 6FB Methodologies Workshop - Webhook Security Middleware
// Comprehensive webhook signature verification and security measures

import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Webhook signature verification configuration
interface WebhookConfig {
  secret: string;
  algorithm: string;
  headerName: string;
  toleranceMs?: number; // Time tolerance for timestamp validation
  validateTimestamp?: boolean;
}

// Predefined webhook configurations
export const WEBHOOK_CONFIGS = {
  STRIPE: {
    secret: process.env.STRIPE_WEBHOOK_SECRET || '',
    algorithm: 'sha256',
    headerName: 'stripe-signature',
    toleranceMs: 300 * 1000, // 5 minutes
    validateTimestamp: true,
  },
  ZAPIER: {
    secret: process.env.ZAPIER_WEBHOOK_SECRET || '',
    algorithm: 'sha256',
    headerName: 'x-zapier-signature',
    toleranceMs: 600 * 1000, // 10 minutes
    validateTimestamp: false,
  },
  GENERIC: {
    secret: process.env.WEBHOOK_SECRET || '',
    algorithm: 'sha256',
    headerName: 'x-webhook-signature',
    toleranceMs: 300 * 1000, // 5 minutes
    validateTimestamp: true,
  },
} as const;

// Webhook verification result
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
  signatureAge?: number;
}

class WebhookSecurity {
  /**
   * Verify Stripe webhook signature
   * Stripe uses a specific format: t=timestamp,v1=signature
   */
  static verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string,
    tolerance: number = 300
  ): WebhookVerificationResult {
    try {
      const elements = signature.split(',');
      let timestamp: number | undefined;
      let expectedSignature: string | undefined;

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = parseInt(value, 10);
        } else if (key === 'v1') {
          expectedSignature = value;
        }
      }

      if (!timestamp || !expectedSignature) {
        return {
          isValid: false,
          error: 'Invalid signature format',
        };
      }

      // Check timestamp tolerance
      const now = Math.floor(Date.now() / 1000);
      const signatureAge = now - timestamp;

      if (signatureAge > tolerance) {
        return {
          isValid: false,
          error: 'Signature timestamp too old',
          timestamp,
          signatureAge,
        };
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Use crypto.timingSafeEqual to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );

      return {
        isValid,
        timestamp,
        signatureAge,
        error: isValid ? undefined : 'Signature verification failed',
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify generic webhook signature (HMAC)
   */
  static verifyGenericSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): WebhookVerificationResult {
    try {
      // Remove any prefix (like 'sha256=')
      const cleanSignature = signature.replace(/^(sha256=|sha1=|md5=)/, '');

      // Compute expected signature
      const computedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Use crypto.timingSafeEqual to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );

      return {
        isValid,
        error: isValid ? undefined : 'Signature verification failed',
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify webhook signature based on configuration
   */
  static verifyWebhook(
    payload: string,
    signature: string,
    config: WebhookConfig
  ): WebhookVerificationResult {
    if (!config.secret) {
      return {
        isValid: false,
        error: 'Webhook secret not configured',
      };
    }

    if (!signature) {
      return {
        isValid: false,
        error: 'Signature header missing',
      };
    }

    // Use Stripe-specific verification for Stripe webhooks
    if (config.headerName === 'stripe-signature') {
      return this.verifyStripeSignature(
        payload,
        signature,
        config.secret,
        (config.toleranceMs || 300000) / 1000
      );
    }

    // Use generic verification for other webhooks
    return this.verifyGenericSignature(
      payload,
      signature,
      config.secret,
      config.algorithm
    );
  }

  /**
   * Extract and verify webhook from Next.js request
   */
  static async verifyWebhookRequest(
    req: NextRequest,
    config: WebhookConfig
  ): Promise<{ isValid: boolean; payload: string; error?: string }> {
    try {
      // Get the signature from headers
      const signature = req.headers.get(config.headerName);
      if (!signature) {
        return {
          isValid: false,
          payload: '',
          error: `Missing ${config.headerName} header`,
        };
      }

      // Get the raw body
      const payload = await req.text();
      if (!payload) {
        return {
          isValid: false,
          payload: '',
          error: 'Empty request body',
        };
      }

      // Verify the signature
      const verification = this.verifyWebhook(payload, signature, config);

      return {
        isValid: verification.isValid,
        payload,
        error: verification.error,
      };
    } catch (error) {
      return {
        isValid: false,
        payload: '',
        error: `Request processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Webhook verification middleware
export async function verifyWebhookSignature(
  req: NextRequest,
  config: WebhookConfig
): Promise<{ success: boolean; payload?: string; error?: string }> {
  try {
    const result = await WebhookSecurity.verifyWebhookRequest(req, config);

    if (!result.isValid) {
      // Log security violation
      console.warn('Webhook signature verification failed:', {
        path: new URL(req.url).pathname,
        ip:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown',
        userAgent: req.headers.get('user-agent'),
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: result.error || 'Signature verification failed',
      };
    }

    return {
      success: true,
      payload: result.payload,
    };
  } catch (error) {
    console.error('Webhook verification error:', error);
    return {
      success: false,
      error: 'Internal verification error',
    };
  }
}

// Specific webhook verification functions
export async function verifyStripeWebhook(req: NextRequest) {
  return verifyWebhookSignature(req, WEBHOOK_CONFIGS.STRIPE);
}

export async function verifyZapierWebhook(req: NextRequest) {
  return verifyWebhookSignature(req, WEBHOOK_CONFIGS.ZAPIER);
}

export async function verifyGenericWebhook(req: NextRequest) {
  return verifyWebhookSignature(req, WEBHOOK_CONFIGS.GENERIC);
}

// Webhook security decorator
export function withWebhookSecurity(config: WebhookConfig) {
  return function (
    handler: (req: NextRequest, payload: string) => Promise<Response>
  ) {
    return async function (req: NextRequest): Promise<Response> {
      const verification = await verifyWebhookSignature(req, config);

      if (!verification.success) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message:
              verification.error || 'Webhook signature verification failed',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return handler(req, verification.payload!);
    };
  };
}

// Anti-replay protection
class ReplayProtection {
  private processedRequests = new Set<string>();
  private readonly maxCacheSize = 10000;
  private readonly ttlMs = 600000; // 10 minutes

  constructor() {
    // Periodically clean up old entries
    setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  private cleanup() {
    if (this.processedRequests.size > this.maxCacheSize) {
      this.processedRequests.clear();
    }
  }

  /**
   * Check if a request is a replay based on signature and timestamp
   */
  isReplay(signature: string, timestamp?: number): boolean {
    const now = Date.now();
    const key = `${signature}:${timestamp || 'no-timestamp'}`;

    // Check if we've seen this exact signature before
    if (this.processedRequests.has(key)) {
      return true;
    }

    // Check timestamp age if provided
    if (timestamp && now - timestamp * 1000 > this.ttlMs) {
      return true;
    }

    // Mark as processed
    this.processedRequests.add(key);
    return false;
  }
}

const replayProtection = new ReplayProtection();

// Enhanced webhook verification with replay protection
export async function verifyWebhookWithReplayProtection(
  req: NextRequest,
  config: WebhookConfig
): Promise<{ success: boolean; payload?: string; error?: string }> {
  const result = await verifyWebhookSignature(req, config);

  if (!result.success) {
    return result;
  }

  // Check for replay attacks
  const signature = req.headers.get(config.headerName) || '';
  const timestamp = config.validateTimestamp
    ? Math.floor(Date.now() / 1000)
    : undefined;

  if (replayProtection.isReplay(signature, timestamp)) {
    console.warn('Potential replay attack detected:', {
      path: new URL(req.url).pathname,
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      signature: signature.substring(0, 20) + '...',
      timestamp: timestamp || 'no-timestamp',
    });

    return {
      success: false,
      error: 'Replay attack detected',
    };
  }

  return result;
}

// Export classes and utilities
export { WebhookSecurity, replayProtection };

// Content type validation for webhooks
export function validateWebhookContentType(
  req: NextRequest,
  expectedType: string = 'application/json'
): boolean {
  const contentType = req.headers.get('content-type') || '';
  return contentType.toLowerCase().includes(expectedType.toLowerCase());
}
