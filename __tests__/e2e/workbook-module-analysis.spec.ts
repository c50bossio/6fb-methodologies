/**
 * Workbook Module Issue Analysis Test
 *
 * This test specifically analyzes the issues found in the screenshot:
 * - Module loading problems (0 / 1 modules showing)
 * - Progress inconsistencies (5% overall with 0 completed)
 * - API integration failures
 * - UI state management issues
 */

import { test, expect, Page } from '@playwright/test';

// Helper class for workbook testing
class WorkbookAnalysisHelper {
  constructor(private page: Page) {}

  /**
   * Intercept and log API calls to understand what's happening
   */
  async setupAPIInterception() {
    // Intercept modules API call
    await this.page.route('/api/workbook/modules*', async (route) => {
      console.log('🔍 Intercepted modules API call:', route.request().url());
      console.log('🔍 Request headers:', route.request().headers());

      const response = await route.fetch();
      const responseBody = await response.text();

      console.log('🔍 Response status:', response.status());
      console.log('🔍 Response body:', responseBody);

      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: responseBody
      });
    });

    // Intercept progress API calls
    await this.page.route('/api/workbook/progress*', async (route) => {
      console.log('🔍 Intercepted progress API call:', route.request().url());
      const response = await route.fetch();
      const responseBody = await response.text();

      console.log('🔍 Progress API response:', responseBody);
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: responseBody
      });
    });

    // Intercept auth API calls
    await this.page.route('/api/workbook/auth/*', async (route) => {
      console.log('🔍 Intercepted auth API call:', route.request().url());
      const response = await route.fetch();
      const responseBody = await response.text();

      console.log('🔍 Auth API response status:', response.status());
      console.log('🔍 Auth API response:', responseBody);
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: responseBody
      });
    });
  }

  /**
   * Navigate to workbook and handle authentication
   */
  async navigateToWorkbook() {
    // Use development bypass to skip authentication
    await this.page.goto('/workbook?dev=true');

    // Wait a bit for page to load
    await this.page.waitForTimeout(3000);

    const currentUrl = this.page.url();
    console.log('🔍 Current URL after navigation:', currentUrl);

    // Check if we're still on login page
    if (currentUrl.includes('/login')) {
      console.log('🔍 Redirected to login page, attempting authentication');
      await this.handleLogin();
    }

    return currentUrl;
  }

  /**
   * Handle login if needed
   */
  async handleLogin() {
    // Look for existing login form elements
    const emailInput = this.page.locator('input[type="email"], input[name="email"], [data-testid*="email"]').first();
    const passwordInput = this.page.locator('input[type="password"], input[name="password"], [data-testid*="password"]').first();
    const submitButton = this.page.locator('button[type="submit"], [data-testid*="submit"], [data-testid*="login"]').first();

    if (await emailInput.isVisible()) {
      console.log('🔍 Found email input, attempting login');

      // Use test credentials
      await emailInput.fill('test@6fbmethodologies.com');
      await passwordInput.fill('testpassword123');
      await submitButton.click();

      // Wait for potential redirect
      await this.page.waitForTimeout(3000);

      console.log('🔍 URL after login attempt:', this.page.url());
    } else {
      console.log('🔍 No login form found, checking for alternative auth');

      // Look for any auth-related buttons or links
      const authElements = await this.page.locator('button, a').filter({
        hasText: /login|sign|auth|access/i
      }).all();

      for (const element of authElements) {
        const text = await element.textContent();
        console.log('🔍 Found auth element:', text);
      }
    }
  }

  /**
   * Analyze the workbook module page state
   */
  async analyzeModulePage() {
    console.log('🔍 Analyzing workbook module page...');

    // Check page title and headers
    const title = await this.page.title();
    console.log('🔍 Page title:', title);

    // Look for main heading
    const mainHeading = await this.page.locator('h1, h2').first().textContent();
    console.log('🔍 Main heading:', mainHeading);

    // Check for loading states
    const loadingElements = await this.page.locator('[class*="loading"], [class*="spinner"], [aria-label*="loading"]').count();
    console.log('🔍 Loading elements found:', loadingElements);

    // Check for error messages
    const errorElements = await this.page.locator('[class*="error"], [aria-label*="error"], [role="alert"]').all();
    for (const error of errorElements) {
      const errorText = await error.textContent();
      console.log('🔍 Error message found:', errorText);
    }

    // Look for progress indicators
    const progressElements = await this.page.locator('[class*="progress"], [aria-label*="progress"]').all();
    for (const progress of progressElements) {
      const progressText = await progress.textContent();
      console.log('🔍 Progress element:', progressText);
    }

    // Look for module count indicators
    const moduleCountElements = await this.page.locator('text=/\\d+\\s*\\/\\s*\\d+\\s*modules?/i').all();
    for (const element of moduleCountElements) {
      const text = await element.textContent();
      console.log('🔍 Module count text:', text);
    }

    // Look for percentage indicators
    const percentageElements = await this.page.locator('text=/\\d+%/').all();
    for (const element of percentageElements) {
      const text = await element.textContent();
      console.log('🔍 Percentage text:', text);
    }

    return {
      title,
      mainHeading,
      loadingElements,
      errorCount: errorElements.length,
      progressCount: progressElements.length,
      moduleCountElements: moduleCountElements.length,
      percentageElements: percentageElements.length
    };
  }

  /**
   * Take a screenshot for comparison with the original issue
   */
  async captureScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/workbook-${name}-${Date.now()}.png`,
      fullPage: true
    });
    console.log(`🔍 Screenshot captured: workbook-${name}`);
  }

  /**
   * Analyze network activity
   */
  async analyzeNetworkActivity() {
    console.log('🔍 Analyzing network activity...');

    // Listen for network events
    const requests: any[] = [];
    const responses: any[] = [];

    this.page.on('request', request => {
      if (request.url().includes('/api/workbook')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
        console.log('🌐 Request:', request.method(), request.url());
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/workbook')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now()
        });
        console.log('🌐 Response:', response.status(), response.url());
      }
    });

    return { requests, responses };
  }

  /**
   * Check browser console for errors
   */
  async checkConsoleErrors() {
    const errors: string[] = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = `${msg.type()}: ${msg.text()}`;
        errors.push(error);
        console.log('🚨 Console Error:', error);
      }
    });

    this.page.on('pageerror', error => {
      const errorMsg = `Page Error: ${error.message}`;
      errors.push(errorMsg);
      console.log('🚨 Page Error:', errorMsg);
    });

    return errors;
  }
}

test.describe('Workbook Module Issue Analysis', () => {
  let helper: WorkbookAnalysisHelper;

  test.beforeEach(async ({ page }) => {
    helper = new WorkbookAnalysisHelper(page);

    // Setup monitoring
    await helper.setupAPIInterception();
    await helper.analyzeNetworkActivity();
    await helper.checkConsoleErrors();
  });

  test('should analyze the workbook module loading issue', async ({ page }) => {
    console.log('🔍 Starting workbook module analysis...');

    // Step 1: Navigate to workbook
    const currentUrl = await helper.navigateToWorkbook();

    // Step 2: Wait for page to settle
    await page.waitForTimeout(5000);

    // Step 3: Take screenshot of current state
    await helper.captureScreenshot('current-state');

    // Step 4: Analyze the page
    const analysis = await helper.analyzeModulePage();

    console.log('🔍 Page analysis results:', analysis);

    // Step 5: Check if we can find the specific elements from the screenshot

    // Look for "6FB Workshop Modules" heading
    const workshopHeading = page.locator('text=/6FB Workshop Modules/i');
    if (await workshopHeading.isVisible()) {
      console.log('✅ Found workshop modules heading');
    } else {
      console.log('❌ Workshop modules heading not found');
    }

    // Look for progress card
    const progressCard = page.locator('text=/6FB Workshop Progress/i');
    if (await progressCard.isVisible()) {
      console.log('✅ Found progress card');
    } else {
      console.log('❌ Progress card not found');
    }

    // Look for the specific progress values mentioned in the screenshot
    const overallProgress = page.locator('text=/5%/');
    const completedModules = page.locator('text=/0.*Completed Modules/i');
    const inProgress = page.locator('text=/1.*In Progress/i');
    const totalContent = page.locator('text=/2h.*Total Content/i');

    console.log('🔍 Progress indicators visibility:');
    console.log('  - 5% Overall:', await overallProgress.isVisible());
    console.log('  - 0 Completed:', await completedModules.isVisible());
    console.log('  - 1 In Progress:', await inProgress.isVisible());
    console.log('  - 2h Total:', await totalContent.isVisible());

    // Look for the search box
    const searchBox = page.locator('input[placeholder*="Search"], [placeholder*="search"]');
    if (await searchBox.isVisible()) {
      console.log('✅ Found search box');
    } else {
      console.log('❌ Search box not found');
    }

    // Look for module cards
    const moduleCards = page.locator('[class*="card"], [data-testid*="module"]');
    const moduleCount = await moduleCards.count();
    console.log('🔍 Module cards found:', moduleCount);

    // Look for the specific module mentioned: "Introduction to Six Figure Barber Methodology"
    const introModule = page.locator('text=/Introduction to Six Figure Barber/i');
    if (await introModule.isVisible()) {
      console.log('✅ Found intro module');

      // Check its progress
      const moduleCard = introModule.locator('..').locator('..'); // Go up to card container
      const progressText = await moduleCard.locator('text=/\\d+%/').textContent();
      console.log('🔍 Intro module progress:', progressText);
    } else {
      console.log('❌ Intro module not found');
    }

    // Step 6: Test interactions
    console.log('🔍 Testing interactions...');

    // Try to interact with filter dropdowns
    const filterDropdowns = page.locator('select, [role="combobox"]');
    const dropdownCount = await filterDropdowns.count();
    console.log('🔍 Filter dropdowns found:', dropdownCount);

    if (dropdownCount > 0) {
      try {
        await filterDropdowns.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ Successfully clicked first dropdown');
      } catch (error) {
        console.log('❌ Failed to click dropdown:', error);
      }
    }

    // Try to click on a module if found
    if (moduleCount > 0) {
      try {
        await moduleCards.first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Successfully clicked first module');

        // Check if anything changed
        const newUrl = page.url();
        console.log('🔍 URL after module click:', newUrl);
      } catch (error) {
        console.log('❌ Failed to click module:', error);
      }
    }

    // Step 7: Click on Workshop tab to see module content
    console.log('🔍 Clicking on Workshop tab to see module content...');

    const workshopTab = page.getByRole('tab', { name: 'Workshop' });
    if (await workshopTab.isVisible()) {
      try {
        await workshopTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ Successfully clicked Workshop tab');

        // Take screenshot of workshop tab content
        await helper.captureScreenshot('workshop-tab-content');

        // Look for the actual module content
        const workshopHeading = page.locator('text=/6FB Workshop Modules/i');
        const moduleCards = page.locator('[class*="card"], [data-testid*="module"]');
        const progressCards = page.locator('text=/6FB Workshop Progress/i');

        console.log('🔍 Workshop tab content analysis:');
        console.log('  - Workshop heading visible:', await workshopHeading.isVisible());
        console.log('  - Module cards found:', await moduleCards.count());
        console.log('  - Progress cards visible:', await progressCards.isVisible());

        // Look for the WorkshopContent component content
        const workshopContent = page.locator('[class*="workshop"], [class*="module"]');
        const workshopContentCount = await workshopContent.count();
        console.log('  - Workshop content elements:', workshopContentCount);

        if (workshopContentCount > 0) {
          console.log('🔍 Found workshop content elements:');
          for (let i = 0; i < Math.min(workshopContentCount, 5); i++) {
            const element = workshopContent.nth(i);
            const text = await element.textContent();
            console.log(`    - Element ${i + 1}: ${text?.substring(0, 100)}...`);
          }
        }

      } catch (error) {
        console.log('❌ Failed to click Workshop tab:', error);
      }
    } else {
      console.log('❌ Workshop tab not found');
    }

    // Step 8: Final screenshot after interactions
    await helper.captureScreenshot('after-interactions');

    // Step 9: Generate analysis report
    console.log('\n📊 WORKBOOK ANALYSIS REPORT');
    console.log('================================');
    console.log('Current URL:', currentUrl);
    console.log('Page Title:', analysis.title);
    console.log('Main Heading:', analysis.mainHeading);
    console.log('Loading Elements:', analysis.loadingElements);
    console.log('Error Count:', analysis.errorCount);
    console.log('Progress Elements:', analysis.progressCount);
    console.log('Module Cards:', moduleCount);
    console.log('Filter Dropdowns:', dropdownCount);

    // The test should pass if we can navigate to the page
    // Real issues will be logged in the console output
    expect(currentUrl).toContain('workbook');
  });

  test('should test API endpoints directly', async ({ page }) => {
    console.log('🔍 Testing API endpoints directly...');

    // Test the modules API endpoint
    try {
      const modulesResponse = await page.request.get('/api/workbook/modules?includeProgress=true');
      console.log('🔍 Modules API status:', modulesResponse.status());

      if (modulesResponse.ok()) {
        const modulesData = await modulesResponse.json();
        console.log('🔍 Modules API response:', JSON.stringify(modulesData, null, 2));
      } else {
        const errorText = await modulesResponse.text();
        console.log('🚨 Modules API error:', errorText);
      }
    } catch (error) {
      console.log('🚨 Modules API request failed:', error);
    }

    // Test auth status
    try {
      const authResponse = await page.request.get('/api/workbook/auth/verify');
      console.log('🔍 Auth verify status:', authResponse.status());

      if (authResponse.ok()) {
        const authData = await authResponse.json();
        console.log('🔍 Auth verify response:', JSON.stringify(authData, null, 2));
      } else {
        const errorText = await authResponse.text();
        console.log('🚨 Auth verify error:', errorText);
      }
    } catch (error) {
      console.log('🚨 Auth verify request failed:', error);
    }

    // This test always passes - we're just gathering information
    expect(true).toBe(true);
  });

  test('should test different authentication scenarios', async ({ page }) => {
    console.log('🔍 Testing authentication scenarios...');

    // Scenario 1: No authentication
    await page.goto('/workbook');
    await page.waitForTimeout(2000);

    let url1 = page.url();
    console.log('🔍 No auth URL:', url1);
    await helper.captureScreenshot('no-auth');

    // Scenario 2: Try with basic auth cookie
    await page.context().addCookies([{
      name: 'workbook-token',
      value: 'test-token-123',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/workbook');
    await page.waitForTimeout(2000);

    let url2 = page.url();
    console.log('🔍 With test token URL:', url2);
    await helper.captureScreenshot('with-test-token');

    // Scenario 3: Clear cookies and try again
    await page.context().clearCookies();
    await page.goto('/workbook');
    await page.waitForTimeout(2000);

    let url3 = page.url();
    console.log('🔍 Cleared cookies URL:', url3);
    await helper.captureScreenshot('cleared-cookies');

    console.log('\n📊 AUTH SCENARIO RESULTS');
    console.log('========================');
    console.log('No auth:', url1);
    console.log('Test token:', url2);
    console.log('Cleared:', url3);

    expect(true).toBe(true);
  });
});