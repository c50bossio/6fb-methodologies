// Comprehensive Error Handling and Logging Middleware for Workbook APIs
// Enterprise-grade error management, logging, monitoring, and alerting

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  WorkbookErrorResponseSchema,
  type WorkbookErrorResponse,
} from '@/lib/validation/workbook-schemas';
import {
  type ApiResponse,
  type ErrorResponse,
  type ApiValidationError,
  type AccessControlError,
  type RateLimitError,
} from '@/types/workbook-api';

// ==============================================================
// ERROR TYPES AND CLASSIFICATION
// ==============================================================

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL = 'internal',
  BUSINESS_LOGIC = 'business_logic',
  CONFIGURATION = 'configuration',
  SECURITY = 'security',
}

/**
 * Custom workbook error class
 */
export class WorkbookError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly timestamp: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    options: {
      code: string;
      category: ErrorCategory;
      severity: ErrorSeverity;
      statusCode: number;
      details?: Record<string, any>;
      originalError?: Error;
      requestId?: string;
    }
  ) {
    super(message);
    this.name = 'WorkbookError';
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.originalError = options.originalError;
    this.timestamp = Date.now();
    this.requestId = options.requestId;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkbookError);
    }
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }

  /**
   * Convert error to API response format
   */
  toApiResponse(): ErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// ==============================================================
// PREDEFINED ERROR CONSTRUCTORS
// ==============================================================

/**
 * Authentication errors
 */
export class AuthenticationError extends WorkbookError {
  constructor(
    message: string = 'Authentication required',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, {
      code: 'AUTHENTICATION_REQUIRED',
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 401,
      details,
      requestId,
    });
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends WorkbookError {
  constructor(
    message: string = 'Insufficient permissions',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, {
      code: 'INSUFFICIENT_PERMISSIONS',
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 403,
      details,
      requestId,
    });
  }
}

/**
 * Validation errors
 */
export class ValidationError extends WorkbookError {
  constructor(
    message: string,
    validationErrors?: Array<{ field: string; message: string; code?: string }>,
    requestId?: string
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      details: { validationErrors },
      requestId,
    });
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends WorkbookError {
  constructor(
    resource: string = 'Resource',
    resourceId?: string,
    requestId?: string
  ) {
    super(`${resource} not found${resourceId ? ` (ID: ${resourceId})` : ''}`, {
      code: 'RESOURCE_NOT_FOUND',
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      statusCode: 404,
      details: { resource, resourceId },
      requestId,
    });
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends WorkbookError {
  constructor(
    limit: number,
    windowMs: number,
    requestId?: string
  ) {
    super('Rate limit exceeded', {
      code: 'RATE_LIMIT_EXCEEDED',
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 429,
      details: {
        limit,
        windowMs,
        resetTime: Date.now() + windowMs,
      },
      requestId,
    });
  }
}

/**
 * Database errors
 */
export class DatabaseError extends WorkbookError {
  constructor(
    message: string = 'Database operation failed',
    originalError?: Error,
    requestId?: string
  ) {
    super(message, {
      code: 'DATABASE_ERROR',
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      statusCode: 500,
      originalError,
      requestId,
    });
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends WorkbookError {
  constructor(
    serviceName: string,
    message: string = 'External service error',
    originalError?: Error,
    requestId?: string
  ) {
    super(message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      statusCode: 502,
      details: { serviceName },
      originalError,
      requestId,
    });
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends WorkbookError {
  constructor(
    message: string,
    code: string = 'BUSINESS_LOGIC_ERROR',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, {
      code,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 422,
      details,
      requestId,
    });
  }
}

/**
 * Security errors
 */
export class SecurityError extends WorkbookError {
  constructor(
    message: string = 'Security violation detected',
    code: string = 'SECURITY_VIOLATION',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, {
      code,
      category: ErrorCategory.SECURITY,
      severity: ErrorSeverity.CRITICAL,
      statusCode: 403,
      details,
      requestId,
    });
  }
}

// ==============================================================
// LOGGING INFRASTRUCTURE
// ==============================================================

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  responseTime?: number;
  statusCode?: number;
  error?: {
    name: string;
    message: string;
    code?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    stack?: string;
    details?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error | WorkbookError, metadata?: Record<string, any>): void;
  fatal(message: string, error?: Error | WorkbookError, metadata?: Record<string, any>): void;
}

/**
 * Console logger implementation
 */
class ConsoleLogger implements Logger {
  private formatLog(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const requestId = entry.requestId ? ` [${entry.requestId}]` : '';

    let message = `${timestamp} ${level}${requestId} ${entry.message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${JSON.stringify(entry.error, null, 2)}`;
    }

    return message;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: Date.now(),
        level: LogLevel.DEBUG,
        message,
        metadata,
      };
      console.debug(this.formatLog(entry));
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: LogLevel.INFO,
      message,
      metadata,
    };
    console.info(this.formatLog(entry));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: LogLevel.WARN,
      message,
      metadata,
    };
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: Error | WorkbookError, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof WorkbookError ? {
          code: error.code,
          category: error.category,
          severity: error.severity,
          details: error.details,
        } : {}),
      } : undefined,
    };
    console.error(this.formatLog(entry));
  }

  fatal(message: string, error?: Error | WorkbookError, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: LogLevel.FATAL,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof WorkbookError ? {
          code: error.code,
          category: error.category,
          severity: error.severity,
          details: error.details,
        } : {}),
      } : undefined,
    };
    console.error(this.formatLog(entry));

    // In production, you might want to trigger alerts here
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service, send alerts, etc.
    }
  }
}

// Global logger instance
export const logger: Logger = new ConsoleLogger();

// ==============================================================
// REQUEST CONTEXT AND TRACING
// ==============================================================

/**
 * Request context for tracing and logging
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent: string;
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `req_${timestamp}_${random}`;
}

/**
 * Create request context from NextRequest
 */
export function createRequestContext(request: NextRequest): RequestContext {
  const requestId = generateRequestId();
  const url = new URL(request.url);

  return {
    requestId,
    endpoint: url.pathname,
    method: request.method,
    ipAddress: getClientIpAddress(request),
    userAgent: request.headers.get('User-Agent') || 'unknown',
    startTime: Date.now(),
    metadata: {},
  };
}

/**
 * Get client IP address
 */
function getClientIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('X-Real-IP');
  if (realIp) {
    return realIp;
  }

  return request.ip || 'unknown';
}

// ==============================================================
// ERROR HANDLING MIDDLEWARE
// ==============================================================

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
  includeStackTrace: boolean;
  logErrors: boolean;
  alertOnCritical: boolean;
  sanitizeErrorMessages: boolean;
  rateLimitErrorLogging: boolean;
}

const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
  alertOnCritical: true,
  sanitizeErrorMessages: process.env.NODE_ENV === 'production',
  rateLimitErrorLogging: true,
};

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(error: Error | WorkbookError): string {
  if (error instanceof WorkbookError) {
    // WorkbookError messages are already sanitized
    return error.message;
  }

  // Generic error messages for unknown errors in production
  if (process.env.NODE_ENV === 'production') {
    return 'An internal error occurred';
  }

  return error.message;
}

/**
 * Convert any error to WorkbookError
 */
export function normalizeError(
  error: unknown,
  requestId?: string
): WorkbookError {
  if (error instanceof WorkbookError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return new ValidationError(
        error.message,
        undefined,
        requestId
      );
    }

    if (error.name === 'DatabaseError') {
      return new DatabaseError(
        'Database operation failed',
        error,
        requestId
      );
    }

    if (error.message.includes('permission') || error.message.includes('authorization')) {
      return new AuthorizationError(
        error.message,
        undefined,
        requestId
      );
    }

    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return new AuthenticationError(
        error.message,
        undefined,
        requestId
      );
    }

    // Generic error
    return new WorkbookError(error.message, {
      code: 'INTERNAL_ERROR',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      statusCode: 500,
      originalError: error,
      requestId,
    });
  }

  // Unknown error type
  return new WorkbookError('An unknown error occurred', {
    code: 'UNKNOWN_ERROR',
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
    details: { originalError: String(error) },
    requestId,
  });
}

/**
 * Main error handler function
 */
export function handleError(
  error: unknown,
  context?: RequestContext,
  config: Partial<ErrorHandlerConfig> = {}
): ErrorResponse {
  const errorConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
  const normalizedError = normalizeError(error, context?.requestId);

  // Log error if configured
  if (errorConfig.logErrors) {
    const logMetadata = {
      requestId: context?.requestId,
      userId: context?.userId,
      endpoint: context?.endpoint,
      method: context?.method,
      ipAddress: context?.ipAddress,
      responseTime: context ? Date.now() - context.startTime : undefined,
    };

    if (normalizedError.severity === ErrorSeverity.CRITICAL) {
      logger.fatal('Critical error occurred', normalizedError, logMetadata);
    } else if (normalizedError.severity === ErrorSeverity.HIGH) {
      logger.error('High severity error occurred', normalizedError, logMetadata);
    } else if (normalizedError.severity === ErrorSeverity.MEDIUM) {
      logger.warn('Medium severity error occurred', normalizedError, logMetadata);
    } else {
      logger.info('Low severity error occurred', normalizedError, logMetadata);
    }
  }

  // Alert on critical errors
  if (errorConfig.alertOnCritical && normalizedError.severity === ErrorSeverity.CRITICAL) {
    // In production, trigger alerts here
    // sendAlert(normalizedError, context);
  }

  // Create API response
  const apiResponse = normalizedError.toApiResponse();

  // Sanitize error message if configured
  if (errorConfig.sanitizeErrorMessages) {
    apiResponse.error = sanitizeErrorMessage(normalizedError);
  }

  // Remove stack trace in production unless specifically configured
  if (!errorConfig.includeStackTrace && apiResponse.details) {
    delete apiResponse.details.stack;
  }

  return apiResponse;
}

/**
 * Error handling middleware for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>,
  config?: Partial<ErrorHandlerConfig>
): (...args: T) => Promise<NextResponse<R | ErrorResponse>> {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    let context: RequestContext | undefined;

    try {
      // Extract request from arguments if available
      const request = args.find(arg => arg && typeof arg.url === 'string') as NextRequest;
      if (request) {
        context = createRequestContext(request);
      }

      return await handler(...args);
    } catch (error) {
      const errorResponse = handleError(error, context, config);
      return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
    }
  };
}

/**
 * Async error boundary for API handlers
 */
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  context?: RequestContext,
  config?: Partial<ErrorHandlerConfig>
): Promise<{ success: true; data: T } | { success: false; error: ErrorResponse }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const errorResponse = handleError(error, context, config);
    return { success: false, error: errorResponse };
  }
}

// ==============================================================
// VALIDATION ERROR HELPERS
// ==============================================================

/**
 * Create validation error from Zod error
 */
export function createValidationError(
  zodError: z.ZodError,
  requestId?: string
): ValidationError {
  const validationErrors = zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return new ValidationError(
    'Validation failed',
    validationErrors,
    requestId
  );
}

/**
 * Validate data with error handling
 */
export function validateWithErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  requestId?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error, requestId);
    }
    throw error;
  }
}

// ==============================================================
// MONITORING AND METRICS
// ==============================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  databaseQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
  memoryUsage?: number;
  timestamp: number;
}

/**
 * Record performance metrics
 */
export function recordMetrics(
  context: RequestContext,
  statusCode: number,
  additionalMetrics?: Partial<PerformanceMetrics>
): void {
  const metrics: PerformanceMetrics = {
    requestId: context.requestId,
    endpoint: context.endpoint,
    method: context.method,
    statusCode,
    responseTime: Date.now() - context.startTime,
    timestamp: Date.now(),
    ...additionalMetrics,
  };

  // Log metrics
  logger.info('Request completed', { metrics });

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // sendMetrics(metrics);
  }
}

// Export utility functions
export {
  generateRequestId,
  createRequestContext,
  recordMetrics,
  logger,
};