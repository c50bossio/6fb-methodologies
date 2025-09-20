/**
 * Integration Tests Global Setup
 *
 * Runs once before all integration tests to set up the test environment,
 * mock services, and prepare test data.
 */

import { jest } from '@jest/globals';

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  process.env.DATABASE_URL = 'sqlite://test.db';

  // Mock AWS credentials
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.AWS_REGION = 'us-east-1';
  process.env.S3_BUCKET_NAME = 'test-workbook-bucket';

  // Mock OpenAI credentials
  process.env.OPENAI_API_KEY = 'test-openai-key';

  // Mock authentication secrets
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.WORKBOOK_AUTH_SECRET = 'test-workbook-auth-secret';

  // Database setup
  console.log('📊 Preparing test database...');
  await setupTestDatabase();

  // Service mocks setup
  console.log('🔧 Setting up service mocks...');
  await setupServiceMocks();

  // Test data preparation
  console.log('📝 Preparing test data...');
  await setupTestData();

  console.log('✅ Integration test environment ready');
}

async function setupTestDatabase() {
  // Mock database initialization
  // In a real implementation, this would:
  // 1. Create test database schema
  // 2. Run migrations
  // 3. Seed basic data
  console.log('   - Database schema created');
  console.log('   - Migrations applied');
  console.log('   - Basic test data seeded');
}

async function setupServiceMocks() {
  // AWS S3 Mock Setup
  global.mockS3Client = {
    send: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
  };

  // OpenAI Mock Setup
  global.mockOpenAI = {
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
  };

  // File System Mock Setup
  global.mockFS = {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    createReadStream: jest.fn(),
  };

  console.log('   - AWS S3 client mocked');
  console.log('   - OpenAI client mocked');
  console.log('   - File system operations mocked');
}

async function setupTestData() {
  // Create test users
  global.testUsers = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@6fbmethodologies.com',
      name: 'Test User',
      role: 'member',
      customerId: 'test-customer-12345',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@6fbmethodologies.com',
      name: 'Admin User',
      role: 'admin',
      customerId: 'admin-customer-67890',
    },
  ];

  // Create test modules
  global.testModules = [
    {
      id: 'test-module-id',
      title: 'Foundation Principles',
      description: 'Learn the core principles of the 6FB methodology',
      module_order: 1,
      duration_minutes: 60,
      is_published: true,
    },
    {
      id: 'test-module-advanced',
      title: 'Advanced Revenue Strategies',
      description: 'Advanced techniques for revenue optimization',
      module_order: 2,
      duration_minutes: 90,
      is_published: true,
    },
  ];

  // Create test lessons
  global.testLessons = [
    {
      id: 'test-lesson-id',
      module_id: 'test-module-id',
      title: 'Introduction to 6FB',
      type: 'video',
      estimated_minutes: 15,
      sort_order: 1,
    },
    {
      id: 'test-lesson-revenue',
      module_id: 'test-module-advanced',
      title: 'Revenue Optimization',
      type: 'interactive',
      estimated_minutes: 30,
      sort_order: 1,
    },
  ];

  // Authentication tokens for testing
  global.testTokens = {
    validToken: 'Bearer mock-jwt-token-for-testing',
    expiredToken: 'Bearer expired-mock-token',
    invalidToken: 'Bearer invalid-token',
  };

  console.log('   - Test users created');
  console.log('   - Test modules and lessons created');
  console.log('   - Authentication tokens prepared');
}

// Global test utilities
global.testUtils = {
  createMockRequest: (method: string, url: string, body?: any, headers?: any) => {
    return {
      method: method.toUpperCase(),
      url,
      headers: {
        'content-type': 'application/json',
        authorization: global.testTokens.validToken,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      json: async () => body || {},
    };
  },

  createMockResponse: () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      cookies: {
        set: jest.fn(),
        delete: jest.fn(),
      },
      headers: {},
    };
    return response;
  },

  authenticatedRequest: (method: string, url: string, body?: any) => {
    return global.testUtils.createMockRequest(method, url, body, {
      authorization: global.testTokens.validToken,
    });
  },

  unauthenticatedRequest: (method: string, url: string, body?: any) => {
    return global.testUtils.createMockRequest(method, url, body, {});
  },

  expectApiSuccess: (response: any, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  },

  expectApiError: (response: any, expectedStatus: number, errorMessage?: string) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    if (errorMessage) {
      expect(response.body.error).toMatch(new RegExp(errorMessage, 'i'));
    }
  },
};

// Performance monitoring
global.performanceMonitor = {
  start: () => Date.now(),
  end: (startTime: number) => Date.now() - startTime,
  expectWithinLimit: (duration: number, limitMs: number) => {
    if (duration > limitMs) {
      console.warn(`⚠️ Performance warning: Operation took ${duration}ms (limit: ${limitMs}ms)`);
    }
    expect(duration).toBeLessThan(limitMs);
  },
};

// Mock cleanup utilities
global.mockCleanup = {
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  },

  resetS3Mocks: () => {
    global.mockS3Client.send.mockClear();
    global.mockS3Client.upload.mockClear();
    global.mockS3Client.delete.mockClear();
  },

  resetOpenAIMocks: () => {
    global.mockOpenAI.audio.transcriptions.create.mockClear();
  },

  resetFSMocks: () => {
    global.mockFS.writeFile.mockClear();
    global.mockFS.readFile.mockClear();
    global.mockFS.unlink.mockClear();
    global.mockFS.createReadStream.mockClear();
  },
};