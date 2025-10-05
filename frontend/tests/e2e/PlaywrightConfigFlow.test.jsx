import { test, expect } from '@playwright/test';

test.describe('Playwright Configuration E2E Tests', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load and display configuration form', async () => {
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Check if configuration form is visible
    await expect(page.locator('[data-testid="config-form"]')).toBeVisible();
    
    // Check if form fields are present
    await expect(page.locator('input[name="baseURL"]')).toBeVisible();
    await expect(page.locator('input[name="timeout"]')).toBeVisible();
    await expect(page.locator('select[name="browsers"]')).toBeVisible();
  });

  test('should load saved configuration from database', async () => {
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Wait for configuration to load
    await page.waitForSelector('[data-testid="config-loaded"]', { timeout: 5000 });
    
    // Check if configuration values are populated
    const baseURL = await page.inputValue('input[name="baseURL"]');
    const timeout = await page.inputValue('input[name="timeout"]');
    
    expect(baseURL).toBeTruthy();
    expect(timeout).toBeTruthy();
  });

  test('should save configuration to database', async () => {
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="config-form"]');
    
    // Fill in configuration
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.fill('input[name="timeout"]', '30000');
    await page.selectOption('select[name="browsers"]', 'chromium');
    
    // Click save button
    await page.click('[data-testid="save-config-button"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="config-success-message"]')).toBeVisible();
    
    // Verify success message content
    const successMessage = await page.textContent('[data-testid="config-success-message"]');
    expect(successMessage).toContain('Configuration saved successfully');
  });

  test('should handle configuration save errors', async () => {
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="config-form"]');
    
    // Fill in invalid configuration
    await page.fill('input[name="baseURL"]', 'invalid-url');
    await page.fill('input[name="timeout"]', '-1000');
    
    // Click save button
    await page.click('[data-testid="save-config-button"]');
    
    // Wait for error message
    await expect(page.locator('[data-testid="config-error-message"]')).toBeVisible();
    
    // Verify error message content
    const errorMessage = await page.textContent('[data-testid="config-error-message"]');
    expect(errorMessage).toContain('Failed to save configuration');
  });

  test('should show loading state during save', async () => {
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="config-form"]');
    
    // Fill in configuration
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.fill('input[name="timeout"]', '30000');
    
    // Click save button
    await page.click('[data-testid="save-config-button"]');
    
    // Check if save button shows loading state
    await expect(page.locator('[data-testid="save-config-button"]')).toHaveText('Saving...');
    
    // Check if save button is disabled
    await expect(page.locator('[data-testid="save-config-button"]')).toBeDisabled();
  });

  test('should execute tests with saved configuration', async () => {
    // First, save a configuration
    await page.click('[data-testid="test-configuration-tab"]');
    await page.waitForSelector('[data-testid="config-form"]');
    
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.fill('input[name="timeout"]', '30000');
    await page.selectOption('select[name="browsers"]', 'chromium');
    
    await page.click('[data-testid="save-config-button"]');
    await expect(page.locator('[data-testid="config-success-message"]')).toBeVisible();
    
    // Navigate to test execution
    await page.click('[data-testid="test-execution-tab"]');
    
    // Select a test file
    await page.click('[data-testid="test-file-login"]');
    
    // Execute test
    await page.click('[data-testid="execute-test-button"]');
    
    // Wait for test execution to start
    await expect(page.locator('[data-testid="test-running-indicator"]')).toBeVisible();
    
    // Wait for test completion
    await expect(page.locator('[data-testid="test-results"]')).toBeVisible({ timeout: 30000 });
    
    // Verify test results
    const testResults = await page.textContent('[data-testid="test-results"]');
    expect(testResults).toBeTruthy();
  });

  test('should persist configuration across page refreshes', async () => {
    // Save configuration
    await page.click('[data-testid="test-configuration-tab"]');
    await page.waitForSelector('[data-testid="config-form"]');
    
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.fill('input[name="timeout"]', '45000');
    await page.selectOption('select[name="browsers"]', 'firefox');
    
    await page.click('[data-testid="save-config-button"]');
    await expect(page.locator('[data-testid="config-success-message"]')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Navigate back to configuration
    await page.click('[data-testid="test-configuration-tab"]');
    await page.waitForSelector('[data-testid="config-form"]');
    
    // Verify configuration is still there
    const baseURL = await page.inputValue('input[name="baseURL"]');
    const timeout = await page.inputValue('input[name="timeout"]');
    const browser = await page.inputValue('select[name="browsers"]');
    
    expect(baseURL).toBe('http://localhost:4000');
    expect(timeout).toBe('45000');
    expect(browser).toBe('firefox');
  });

  test('should handle network errors gracefully', async () => {
    // Mock network failure
    await page.route('**/api/projects/*/tests/playwright/config', route => route.abort());
    
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Try to save configuration
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.click('[data-testid="save-config-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="config-error-message"]')).toBeVisible();
    
    const errorMessage = await page.textContent('[data-testid="config-error-message"]');
    expect(errorMessage).toContain('Network error');
  });

  test('should be responsive on mobile devices', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to test configuration page
    await page.click('[data-testid="test-configuration-tab"]');
    
    // Check if form is visible and usable on mobile
    await expect(page.locator('[data-testid="config-form"]')).toBeVisible();
    await expect(page.locator('input[name="baseURL"]')).toBeVisible();
    await expect(page.locator('input[name="timeout"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-config-button"]')).toBeVisible();
    
    // Test mobile interaction
    await page.fill('input[name="baseURL"]', 'http://localhost:4000');
    await page.fill('input[name="timeout"]', '30000');
    await page.click('[data-testid="save-config-button"]');
    
    // Should work on mobile too
    await expect(page.locator('[data-testid="config-success-message"]')).toBeVisible();
  });
});
