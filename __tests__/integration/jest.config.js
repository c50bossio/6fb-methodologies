/**
 * Jest Configuration for Integration Tests
 *
 * Configures Jest specifically for integration testing with proper mocking,
 * setup files, and environment configuration for the 6FB Workbook platform.
 */

module.exports = {
  displayName: 'Integration Tests',

  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.{js,ts}',
  ],

  // TypeScript support
  preset: 'ts-jest',

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/integration/setup.ts',
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/integration/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/integration/global-teardown.ts',

  // Coverage configuration
  collectCoverageFrom: [
    'src/app/api/workbook/**/*.{ts,js}',
    'src/lib/workbook-*.{ts,js}',
    'src/middleware/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
  ],

  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],

  // Timeout for integration tests
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],

  // Environment variables for testing
  setupFiles: ['<rootDir>/__tests__/integration/env-setup.ts'],

  // Mock configuration
  moduleNameMapping: {
    // Mock Next.js modules
    'next/server': '<rootDir>/__tests__/__mocks__/next-server.ts',
    'next/navigation': '<rootDir>/__tests__/__mocks__/next-navigation.ts',

    // Mock AWS SDK
    '@aws-sdk/client-s3': '<rootDir>/__tests__/__mocks__/aws-s3.ts',
    '@aws-sdk/s3-request-presigner': '<rootDir>/__tests__/__mocks__/aws-s3-presigner.ts',

    // Mock OpenAI
    'openai': '<rootDir>/__tests__/__mocks__/openai.ts',

    // Mock file system
    'fs/promises': '<rootDir>/__tests__/__mocks__/fs-promises.ts',

    // Mock jsPDF
    'jspdf': '<rootDir>/__tests__/__mocks__/jspdf.ts',
  },

  // Error handling
  errorOnDeprecated: true,

  // Maximum worker processes
  maxWorkers: '50%',

  // Test result processor
  testResultsProcessor: '<rootDir>/__tests__/integration/results-processor.js',
};