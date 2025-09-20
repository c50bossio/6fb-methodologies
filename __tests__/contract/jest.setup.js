/**
 * Jest setup for contract tests
 *
 * Global setup and configuration for API contract testing.
 * This file runs before each test file.
 */

// Extend Jest matchers
require('@testing-library/jest-dom');

// Global test configuration
beforeAll(() => {
  console.log('🔧 Setting up API Contract Tests');
  console.log('📋 These tests validate API endpoints against OpenAPI specification');
  console.log('⚠️  Tests will FAIL initially - APIs are not implemented yet');
  console.log('🎯 Use these tests to drive TDD implementation of the APIs');
});

afterAll(() => {
  console.log('✅ Contract test suite completed');
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock console methods to reduce noise in test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress specific warnings during tests
  console.warn = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('deprecated') ||
      message.includes('experimental') ||
      message.includes('Warning:')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('Warning:') ||
      message.includes('ReactDOMTestUtils')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test helpers
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

global.generateTimestamp = () => {
  return new Date().toISOString();
};

// API contract test expectations
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidISO8601(received) {
    const pass = typeof received === 'string' && !isNaN(Date.parse(received)) && received.endsWith('Z');

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO 8601 timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO 8601 timestamp`,
        pass: false,
      };
    }
  },

  toBeValidURL(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },

  toBeRecentTimestamp(received, maxAgeMs = 5000) {
    const receivedTime = new Date(received).getTime();
    const now = Date.now();
    const age = now - receivedTime;
    const pass = age >= 0 && age <= maxAgeMs;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a recent timestamp (within ${maxAgeMs}ms)`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a recent timestamp (within ${maxAgeMs}ms), but age was ${age}ms`,
        pass: false,
      };
    }
  }
});

// Add contract test context
global.CONTRACT_TEST_CONTEXT = {
  specificationPath: '/Users/bossio/6fb-methodologies/specs/001-deep-analysis-6fb/contracts/workbook-api.yaml',
  baseUrl: 'http://localhost:3000',
  apiPrefix: '/api',
  testStartTime: Date.now()
};

console.log('🚀 Contract test setup complete - Ready to validate API contracts!');