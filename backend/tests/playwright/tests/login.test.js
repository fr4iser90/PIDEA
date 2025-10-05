const { test, expect } = require('@playwright/test');

// Configuration will be loaded from database via API
let testData = null;

// Load test configuration from database before running tests
test.beforeAll(async () => {
  try {
    // Load configuration from database via API
    const response = await fetch('http://localhost:4000/api/projects/PIDEA/tests/playwright/config');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        testData = data.data;
        console.log('Test configuration loaded from database');
      } else {
        throw new Error('Failed to load configuration from API');
      }
    } else {
      throw new Error(`API request failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to load configuration from database:', error);
    throw new Error('Cannot run tests without configuration from database');
  }
});

/**
 * Login Test Suite
 * 
 * Tests the login functionality with various scenarios:
 * - Valid credentials
 * - Invalid credentials
 * - Empty credentials
 * - Login form validation
 */
test.describe('Login Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure testData is loaded
    if (!testData) {
      throw new Error('Test configuration not loaded');
    }
    
    // Navigate to login page before each test
    await page.goto(testData.urls.login);
    await page.waitForLoadState('networkidle');
  });
  
  test('should login with valid credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    
    // Click login button
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: testData.timeouts.navigation });
    
    // Verify successful login
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.invalidCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.invalidCredentials.password);
    
    // Click login button
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for error message
    await expect(page.locator(testData.selectors.login.errorMessage)).toBeVisible();
    await expect(page.locator(testData.selectors.login.errorMessage)).toContainText('Invalid credentials');
    
    // Verify still on login page
    await expect(page).toHaveURL(/login/);
  });
  
  test('should show validation errors for empty credentials', async ({ page }) => {
    // Leave fields empty and click login
    await page.click(testData.selectors.login.loginButton);
    
    // Check for validation errors
    await expect(page.locator(testData.selectors.login.usernameField)).toHaveAttribute('required');
    await expect(page.locator(testData.selectors.login.passwordField)).toHaveAttribute('required');
    
    // Verify still on login page
    await expect(page).toHaveURL(/login/);
  });
  
  test('should redirect to login when accessing protected page', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto(testData.urls.dashboard);
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/login/);
    
    // Should see login form
    await expect(page.locator(testData.selectors.login.usernameField)).toBeVisible();
    await expect(page.locator(testData.selectors.login.passwordField)).toBeVisible();
  });
  
  test('should remember login state after page refresh', async ({ page }) => {
    // Login first
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
    
    // Click logout button
    await page.click(testData.selectors.navigation.logoutButton);
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/login/);
    
    // Should see login form
    await expect(page.locator(testData.selectors.login.usernameField)).toBeVisible();
  });
  
  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/login', route => route.abort());
    
    // Try to login
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Should show error message
    await expect(page.locator(testData.selectors.login.errorMessage)).toBeVisible();
    await expect(page.locator(testData.selectors.login.errorMessage)).toContainText('Network error');
  });
  
  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if login form is visible and usable
    await expect(page.locator(testData.selectors.login.usernameField)).toBeVisible();
    await expect(page.locator(testData.selectors.login.passwordField)).toBeVisible();
    await expect(page.locator(testData.selectors.login.loginButton)).toBeVisible();
    
    // Test login on mobile
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Should work on mobile too
    await page.waitForURL('**/dashboard', { timeout: testData.timeouts.navigation });
    await expect(page).toHaveURL(/dashboard/);
  });
});
