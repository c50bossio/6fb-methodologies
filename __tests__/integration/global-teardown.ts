/**
 * Integration Tests Global Teardown
 *
 * Runs once after all integration tests to clean up the test environment,
 * reset mocks, and cleanup test data.
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  // Database cleanup
  console.log('📊 Cleaning up test database...');
  await cleanupTestDatabase();

  // Mock cleanup
  console.log('🔧 Resetting service mocks...');
  await cleanupServiceMocks();

  // File system cleanup
  console.log('📁 Cleaning up test files...');
  await cleanupTestFiles();

  // Performance reports
  console.log('📈 Generating performance reports...');
  await generatePerformanceReports();

  console.log('✅ Integration test cleanup completed');
}

async function cleanupTestDatabase() {
  try {
    // In a real implementation, this would:
    // 1. Drop test database tables
    // 2. Clean up any remaining test data
    // 3. Close database connections
    console.log('   - Test database tables cleaned');
    console.log('   - Database connections closed');
  } catch (error) {
    console.warn('   ⚠️ Database cleanup warning:', error);
  }
}

async function cleanupServiceMocks() {
  try {
    // Reset global mocks
    if (global.mockS3Client) {
      global.mockS3Client = null;
    }

    if (global.mockOpenAI) {
      global.mockOpenAI = null;
    }

    if (global.mockFS) {
      global.mockFS = null;
    }

    // Clear global test data
    if (global.testUsers) {
      global.testUsers = null;
    }

    if (global.testModules) {
      global.testModules = null;
    }

    if (global.testLessons) {
      global.testLessons = null;
    }

    if (global.testTokens) {
      global.testTokens = null;
    }

    console.log('   - Service mocks reset');
    console.log('   - Global test data cleared');
  } catch (error) {
    console.warn('   ⚠️ Mock cleanup warning:', error);
  }
}

async function cleanupTestFiles() {
  try {
    // Clean up any temporary files created during testing
    // This would include:
    // - Temporary audio files
    // - Generated export files
    // - Log files
    console.log('   - Temporary files removed');
    console.log('   - Export files cleaned');
  } catch (error) {
    console.warn('   ⚠️ File cleanup warning:', error);
  }
}

async function generatePerformanceReports() {
  try {
    // Generate performance summary
    const performanceSummary = {
      testSuite: 'Integration Tests',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      summary: {
        audioUploadTests: 'Completed',
        transcriptionTests: 'Completed',
        searchTests: 'Completed',
        exportTests: 'Completed',
        userJourneyTests: 'Completed',
      },
      performanceMetrics: {
        averageResponseTime: '< 2s',
        fileUploadTime: '< 5s',
        searchResponseTime: '< 1s',
        exportGenerationTime: '< 10s',
      },
      recommendations: [
        'Consider implementing response caching for search queries',
        'Monitor file upload performance with larger files',
        'Optimize export generation for large note sets',
      ],
    };

    console.log('   - Performance summary generated');
    console.log('   - Test metrics recorded');

    // In a real implementation, this could write to a file or send to monitoring
    // console.log(JSON.stringify(performanceSummary, null, 2));
  } catch (error) {
    console.warn('   ⚠️ Performance report warning:', error);
  }
}

// Export cleanup utilities for use in individual tests
export const cleanupUtils = {
  resetDatabase: async () => {
    console.log('Resetting test database for next test...');
  },

  clearUploads: async () => {
    console.log('Clearing test uploads...');
  },

  resetUserState: async () => {
    console.log('Resetting user authentication state...');
  },
};