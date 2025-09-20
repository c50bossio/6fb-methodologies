/**
 * Jest configuration for contract tests
 *
 * Specialized configuration for running API contract tests
 * against the OpenAPI specification.
 */

const path = require('path');

module.exports = {
  displayName: 'Contract Tests',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.{js,ts}',
    '<rootDir>/**/*.spec.{js,ts}'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],

  // Module resolution
  moduleDirectories: ['node_modules', '<rootDir>/../../'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
  },

  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        target: 'ES2020',
        lib: ['ES2020'],
        skipLibCheck: true
      }
    }]
  },

  // Test configuration
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1, // Run contract tests sequentially to avoid conflicts

  // Coverage configuration (contract tests don't need coverage)
  collectCoverage: false,

  // Error handling
  bail: false, // Continue running all tests even if some fail
  errorOnDeprecated: false,

  // Custom reporters for contract test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/../../test-results/contract',
        outputName: 'contract-test-results.xml',
        suiteName: 'API Contract Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ]
  ],

  // Global test settings
  globals: {
    'ts-jest': {
      useESM: false
    }
  }
};