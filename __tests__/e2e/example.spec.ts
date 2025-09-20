import { test, expect } from '@playwright/test';

test.describe('6FB Methodologies Workshop - Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/6FB Methodologies/);

    // Check for key navigation elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Test navigation to different sections
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);

    // Test first navigation link if it exists
    if (linkCount > 0) {
      const firstLink = navLinks.first();
      await expect(firstLink).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific functionality
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that the page is still usable on mobile
      await expect(page.locator('body')).toBeVisible();

      // Test mobile navigation if present
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    await page.goto('/non-existent-page');

    // Should show 404 page or redirect appropriately
    const response = await page.waitForLoadState('networkidle');

    // Check that we either get a 404 page or are redirected
    const url = page.url();
    const is404 = url.includes('404') || await page.locator('text=404').isVisible();
    const isRedirected = !url.includes('non-existent-page');

    expect(is404 || isRedirected).toBe(true);
  });
});

test.describe('6FB Methodologies Workshop - Performance', () => {
  test('should meet performance thresholds', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/', { waitUntil: 'networkidle' });

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const timing = window.performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });

    // Assert performance thresholds
    expect(performanceMetrics.loadTime).toBeLessThan(5000); // 5 seconds
    expect(performanceMetrics.domReady).toBeLessThan(3000); // 3 seconds
  });
});

test.describe('6FB Methodologies Workshop - Accessibility', () => {
  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();
    }

    // Check for proper form labels if forms exist
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });
});