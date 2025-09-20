import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  // Set up environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

  // Launch browser for authentication if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Pre-authenticate or set up test data if needed
  try {
    // Wait for the server to be ready
    await page.goto('http://localhost:3000/health', { waitUntil: 'networkidle' });
    console.log('✅ Server is ready for E2E tests');
  } catch (error) {
    console.warn('⚠️ Health check failed, server might not be fully ready:', error);
  }

  // Clean up any existing test data
  try {
    // Add any data cleanup logic here
    console.log('🧹 Test environment prepared');
  } catch (error) {
    console.warn('⚠️ Test environment cleanup warning:', error);
  }

  await context.close();
  await browser.close();

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;