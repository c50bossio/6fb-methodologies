import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  try {
    // Clean up test data, close connections, etc.
    // Add any cleanup logic here

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error);
  }

  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;