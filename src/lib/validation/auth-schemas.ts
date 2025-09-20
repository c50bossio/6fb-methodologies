// 6FB Methodologies - Authentication Validation Schemas
// Zod schemas for validating authentication API requests and responses

import { z } from 'zod';

// Login request validation schema
export const LoginRequestSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(254, 'Email too long')
    .transform(val => val.toLowerCase().trim()),

  password: z
    .string()
    .min(6, 'Access code must be at least 6 characters')
    .max(128, 'Access code too long')
    .refine(
      val => !/<script[^>]*>.*?<\/script>/gi.test(val),
      'Invalid characters detected'
    ),

  customerId: z
    .string()
    .optional()
    .refine(
      val => !val || /^cus_[A-Za-z0-9]+$/.test(val),
      'Invalid customer ID format'
    ),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// User session schema for responses
export const UserSessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['basic', 'premium', 'vip'], {
    errorMap: () => ({ message: 'Invalid user role' }),
  }),
  permissions: z.array(z.string()).min(1, 'At least one permission required'),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

// Login response validation schema
export const LoginResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().min(1, 'Message is required'),
  user: UserSessionSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Verify response validation schema
export const VerifyResponseSchema = z.object({
  authenticated: z.literal(true),
  user: UserSessionSchema,
  expiresAt: z.number().int().positive('Invalid expiration timestamp'),
  verifiedAt: z.number().int().positive('Invalid verification timestamp'),
});

export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

// Refresh token request schema (optional body)
export const RefreshRequestSchema = z
  .object({
    refreshToken: z.string().optional(),
  })
  .optional();

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// Refresh response validation schema
export const RefreshResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().min(1, 'Message is required'),
  user: UserSessionSchema,
  expiresAt: z.number().int().positive('Invalid expiration timestamp'),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string().min(1, 'Error message is required'),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Security validation schemas
export const SecurityEventSchema = z.object({
  type: z.enum([
    'auth_attempt',
    'auth_success',
    'auth_failure',
    'token_refresh',
    'suspicious_activity',
  ]),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  ip: z.string().min(1, 'IP address is required'),
  userAgent: z.string().optional(),
  timestamp: z.number().int().positive('Invalid timestamp'),
  details: z.record(z.any()).optional(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Request validation helpers
export const validateClientIP = (ip: string): boolean => {
  // Basic IP validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown';
};

export const validateUserAgent = (userAgent: string): boolean => {
  // Check for suspicious user agents
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /go-http/i,
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
};

// Enhanced input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
};

// Rate limiting validation
export const RateLimitConfigSchema = z.object({
  windowMs: z.number().int().positive('Window must be positive'),
  maxRequests: z.number().int().positive('Max requests must be positive'),
  message: z.string().optional(),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// JWT payload validation (for token verification)
export const JWTPayloadSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name required'),
  role: z.enum(['basic', 'premium', 'vip']),
  permissions: z.array(z.string()),
  iat: z.number().int().positive('Invalid issued at'),
  exp: z.number().int().positive('Invalid expiration'),
  iss: z.literal('6fb-methodologies'),
  aud: z.literal('workbook-users'),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// Refresh token payload schema
export const RefreshTokenPayloadSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  type: z.literal('refresh'),
  iat: z.number().int().positive('Invalid issued at'),
  exp: z.number().int().positive('Invalid expiration'),
  iss: z.literal('6fb-methodologies'),
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

// API response wrapper schema
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.number().int().positive().optional(),
  });

// Validation helper functions
export const validateAndSanitizeEmail = (email: string): string => {
  const sanitized = sanitizeInput(email.toLowerCase());
  const result = z.string().email().safeParse(sanitized);

  if (!result.success) {
    throw new Error('Invalid email format');
  }

  return result.data;
};

export const validateAndSanitizePassword = (password: string): string => {
  const result = z.string().min(6).max(128).safeParse(password);

  if (!result.success) {
    throw new Error('Invalid password format');
  }

  // Check for XSS patterns
  if (/<script[^>]*>.*?<\/script>/gi.test(password)) {
    throw new Error('Invalid characters detected');
  }

  return password; // Don't sanitize passwords, just validate
};

// CORS validation
export const corsOriginSchema = z.enum([
  'https://6fbmethodologies.com',
  'https://www.6fbmethodologies.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  '*', // Only for development
]);

export type CorsOrigin = z.infer<typeof corsOriginSchema>;

// Environment validation
export const environmentSchema = z.enum([
  'development',
  'staging',
  'production',
]);
export type Environment = z.infer<typeof environmentSchema>;

// Security headers validation
export const securityHeadersSchema = z.record(z.string());
export type SecurityHeaders = z.infer<typeof securityHeadersSchema>;

// Export validation middleware helpers
export const createValidationMiddleware = <T extends z.ZodType>(schema: T) => {
  return (data: unknown): z.infer<T> => {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  };
};

// Request body validation middleware
export const validateLoginRequest =
  createValidationMiddleware(LoginRequestSchema);
export const validateRefreshRequest =
  createValidationMiddleware(RefreshRequestSchema);
export const validateSecurityEvent =
  createValidationMiddleware(SecurityEventSchema);
