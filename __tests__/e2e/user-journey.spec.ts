/**
 * T013: Complete User Journey E2E Test
 *
 * Tests the full user workflow from registration through module completion:
 * Registration → Login → Module Progress → Audio Recording → Note Creation
 *
 * This test validates:
 * - Complete user authentication flow
 * - Module access and progress tracking
 * - Audio recording and transcription workflow
 * - Note creation and search functionality
 * - Data persistence across the entire journey
 * - Authentication state management
 */

import { test, expect, Page } from '@playwright/test';

// Test data and utilities
const TEST_USER = {
  email: 'e2e-test-user@6fbmethodologies.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
  customerId: 'test-customer-12345'
};

const TEST_MODULE = {
  id: 'module-1-foundations',
  title: 'Module 1: Foundation Principles',
  lessonId: 'lesson-1-intro'
};

class WorkbookTestHelper {
  constructor(private page: Page) {}

  /**
   * Utility to wait for workbook authentication
   */
  async waitForAuth() {
    await this.page.waitForFunction(() => {
      return document.cookie.includes('workbook-token');
    }, { timeout: 10000 });
  }

  /**
   * Register a new test user
   */
  async registerUser() {
    await this.page.goto('/workbook/register');

    // Fill registration form
    await this.page.fill('[data-testid="register-email"]', TEST_USER.email);
    await this.page.fill('[data-testid="register-password"]', TEST_USER.password);
    await this.page.fill('[data-testid="register-name"]', TEST_USER.name);
    await this.page.fill('[data-testid="register-customer-id"]', TEST_USER.customerId);

    // Submit registration
    await this.page.click('[data-testid="register-submit"]');

    // Wait for success or redirect
    await expect(this.page.locator('[data-testid="registration-success"]')).toBeVisible({ timeout: 15000 });
  }

  /**
   * Login with test user credentials
   */
  async loginUser() {
    await this.page.goto('/workbook/login');

    // Fill login form
    await this.page.fill('[data-testid="login-email"]', TEST_USER.email);
    await this.page.fill('[data-testid="login-password"]', TEST_USER.password);

    // Submit login
    await this.page.click('[data-testid="login-submit"]');

    // Wait for authentication to complete
    await this.waitForAuth();

    // Should redirect to dashboard
    await expect(this.page).toHaveURL(/\/workbook\/dashboard/);
    await expect(this.page.locator('[data-testid="user-dashboard"]')).toBeVisible();
  }

  /**
   * Navigate to and access a module
   */
  async accessModule(moduleId: string) {
    await this.page.goto(`/workbook/modules/${moduleId}`);

    // Verify module loaded
    await expect(this.page.locator('[data-testid="module-content"]')).toBeVisible();

    // Check if user has access
    const accessDenied = await this.page.locator('[data-testid="access-denied"]').isVisible();
    if (accessDenied) {
      throw new Error(`User does not have access to module: ${moduleId}`);
    }

    return {
      startLesson: async (lessonId: string) => {
        await this.page.click(`[data-testid="lesson-${lessonId}"]`);
        await expect(this.page.locator('[data-testid="lesson-content"]')).toBeVisible();
      }
    };
  }

  /**
   * Record audio during a lesson
   */
  async recordAudio() {
    // Start audio recording
    await this.page.click('[data-testid="start-recording"]');
    await expect(this.page.locator('[data-testid="recording-active"]')).toBeVisible();

    // Simulate recording time
    await this.page.waitForTimeout(3000);

    // Stop recording
    await this.page.click('[data-testid="stop-recording"]');

    // Wait for processing
    await expect(this.page.locator('[data-testid="recording-complete"]')).toBeVisible({ timeout: 30000 });

    // Get recording ID from the UI
    const recordingId = await this.page.getAttribute('[data-testid="recording-complete"]', 'data-recording-id');
    return recordingId;
  }

  /**
   * Create notes during lesson
   */
  async createNote(content: string, tags: string[] = []) {
    await this.page.click('[data-testid="add-note"]');

    // Fill note content
    await this.page.fill('[data-testid="note-content"]', content);

    // Add tags
    for (const tag of tags) {
      await this.page.fill('[data-testid="note-tags-input"]', tag);
      await this.page.press('[data-testid="note-tags-input"]', 'Enter');
    }

    // Save note
    await this.page.click('[data-testid="save-note"]');

    // Wait for save confirmation
    await expect(this.page.locator('[data-testid="note-saved"]')).toBeVisible();

    // Get note ID
    const noteId = await this.page.getAttribute('[data-testid="note-saved"]', 'data-note-id');
    return noteId;
  }

  /**
   * Search for notes and transcriptions
   */
  async searchContent(query: string) {
    await this.page.goto('/workbook/search');

    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');

    // Wait for search results
    await expect(this.page.locator('[data-testid="search-results"]')).toBeVisible();

    // Return results
    const results = await this.page.locator('[data-testid="search-result"]').all();
    return results;
  }

  /**
   * Verify progress tracking
   */
  async verifyProgress(moduleId: string, expectedProgress: number) {
    await this.page.goto('/workbook/dashboard');

    const progressElement = this.page.locator(`[data-testid="module-${moduleId}-progress"]`);
    await expect(progressElement).toBeVisible();

    const progressText = await progressElement.textContent();
    const actualProgress = parseInt(progressText?.match(/(\d+)%/)?.[1] || '0');

    expect(actualProgress).toBeGreaterThanOrEqual(expectedProgress);
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    // Clear cookies and local storage
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

test.describe('Complete User Journey - Registration to Module Completion', () => {
  let helper: WorkbookTestHelper;
  let recordingId: string | null = null;
  let noteId: string | null = null;

  test.beforeEach(async ({ page }) => {
    helper = new WorkbookTestHelper(page);

    // Ensure clean state
    await helper.cleanup();
  });

  test.afterEach(async () => {
    // Cleanup after each test
    await helper.cleanup();
  });

  test('should complete full user journey from registration to module completion', async ({ page }) => {
    // Step 1: User Registration
    console.log('🔵 Step 1: User Registration');
    await helper.registerUser();

    // Verify registration success
    await expect(page.locator('[data-testid="registration-success"]')).toContainText('Welcome to 6FB Methodologies');

    // Step 2: User Login
    console.log('🔵 Step 2: User Login');
    await helper.loginUser();

    // Verify authentication state
    const userInfo = await page.locator('[data-testid="user-info"]');
    await expect(userInfo).toContainText(TEST_USER.name);

    // Step 3: Access Module
    console.log('🔵 Step 3: Module Access');
    const module = await helper.accessModule(TEST_MODULE.id);

    // Verify module content is loaded
    await expect(page.locator('[data-testid="module-title"]')).toContainText(TEST_MODULE.title);

    // Step 4: Start Lesson
    console.log('🔵 Step 4: Lesson Start');
    await module.startLesson(TEST_MODULE.lessonId);

    // Verify lesson content
    await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();

    // Step 5: Audio Recording
    console.log('🔵 Step 5: Audio Recording');
    recordingId = await helper.recordAudio();

    // Verify recording was created
    expect(recordingId).toBeTruthy();
    console.log(`📹 Recording created: ${recordingId}`);

    // Step 6: Note Creation
    console.log('🔵 Step 6: Note Creation');
    const noteContent = 'This is my learning note about the foundation principles. Key insight: Focus on fundamentals first.';
    noteId = await helper.createNote(noteContent, ['foundations', 'important', 'key-insight']);

    // Verify note was created
    expect(noteId).toBeTruthy();
    console.log(`📝 Note created: ${noteId}`);

    // Step 7: Progress Tracking
    console.log('🔵 Step 7: Progress Verification');
    await helper.verifyProgress(TEST_MODULE.id, 25); // Should have some progress

    // Step 8: Search Functionality
    console.log('🔵 Step 8: Search Testing');
    const searchResults = await helper.searchContent('foundation principles');

    // Should find our note and potentially transcription
    expect(searchResults.length).toBeGreaterThan(0);

    // Step 9: Data Persistence Check
    console.log('🔵 Step 9: Data Persistence Check');

    // Refresh page and verify data persists
    await page.reload();
    await helper.waitForAuth();

    // Check that progress is still there
    await helper.verifyProgress(TEST_MODULE.id, 25);

    // Check that notes are still accessible
    await page.goto('/workbook/notes');
    await expect(page.locator(`[data-testid="note-${noteId}"]`)).toBeVisible();

    // Step 10: Cross-Feature Integration
    console.log('🔵 Step 10: Cross-Feature Integration');

    // Verify recording shows up in module history
    await page.goto(`/workbook/modules/${TEST_MODULE.id}/recordings`);
    await expect(page.locator(`[data-testid="recording-${recordingId}"]`)).toBeVisible();

    // Verify note is linked to module and lesson
    await page.goto('/workbook/notes');
    const noteElement = page.locator(`[data-testid="note-${noteId}"]`);
    await expect(noteElement.locator('[data-testid="note-module"]')).toContainText(TEST_MODULE.title);

    console.log('✅ Complete user journey test passed successfully!');
  });

  test('should handle authentication state across browser refresh', async ({ page }) => {
    // Register and login
    await helper.registerUser();
    await helper.loginUser();

    // Verify initial authenticated state
    await expect(page.locator('[data-testid="user-dashboard"]')).toBeVisible();

    // Refresh browser
    await page.reload();

    // Should maintain authentication
    await helper.waitForAuth();
    await expect(page.locator('[data-testid="user-dashboard"]')).toBeVisible();

    // Navigate to protected route
    await page.goto('/workbook/modules');
    await expect(page.locator('[data-testid="modules-list"]')).toBeVisible();
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Login user
    await helper.registerUser();
    await helper.loginUser();

    // Simulate session timeout by clearing auth cookies
    await page.context().clearCookies({ name: 'workbook-token' });

    // Try to access protected route
    await page.goto('/workbook/modules');

    // Should redirect to login
    await expect(page).toHaveURL(/\/workbook\/login/);
    await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
  });

  test('should preserve work in progress during temporary disconnection', async ({ page }) => {
    // Setup user and start working
    await helper.registerUser();
    await helper.loginUser();

    const module = await helper.accessModule(TEST_MODULE.id);
    await module.startLesson(TEST_MODULE.lessonId);

    // Start creating a note (but don't save yet)
    await page.click('[data-testid="add-note"]');
    await page.fill('[data-testid="note-content"]', 'Draft note content that should be preserved');

    // Simulate network disconnection
    await page.setOffline(true);

    // Content should still be in the form
    const content = await page.inputValue('[data-testid="note-content"]');
    expect(content).toBe('Draft note content that should be preserved');

    // Reconnect and save
    await page.setOffline(false);
    await page.click('[data-testid="save-note"]');

    // Should save successfully
    await expect(page.locator('[data-testid="note-saved"]')).toBeVisible();
  });
});

test.describe('User Journey Error Scenarios', () => {
  let helper: WorkbookTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new WorkbookTestHelper(page);
    await helper.cleanup();
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    await page.goto('/workbook/register');

    // Try to register with invalid email
    await page.fill('[data-testid="register-email"]', 'invalid-email');
    await page.fill('[data-testid="register-password"]', TEST_USER.password);
    await page.click('[data-testid="register-submit"]');

    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
  });

  test('should handle login failures with proper messaging', async ({ page }) => {
    await page.goto('/workbook/login');

    // Try to login with wrong credentials
    await page.fill('[data-testid="login-email"]', 'nonexistent@example.com');
    await page.fill('[data-testid="login-password"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');

    // Should show authentication error
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Authentication failed');
  });

  test('should handle module access denied properly', async ({ page }) => {
    // Login as user
    await helper.registerUser();
    await helper.loginUser();

    // Try to access a module that doesn't exist or user doesn't have access to
    await page.goto('/workbook/modules/restricted-module');

    // Should show access denied message
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('You do not have access');
  });

  test('should handle audio recording failures', async ({ page }) => {
    // Setup user and access module
    await helper.registerUser();
    await helper.loginUser();

    const module = await helper.accessModule(TEST_MODULE.id);
    await module.startLesson(TEST_MODULE.lessonId);

    // Mock permission denied for microphone
    await page.evaluate(() => {
      // Mock getUserMedia to reject
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Permission denied'));
    });

    // Try to start recording
    await page.click('[data-testid="start-recording"]');

    // Should show permission error
    await expect(page.locator('[data-testid="recording-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="recording-error"]')).toContainText('microphone permission');
  });
});