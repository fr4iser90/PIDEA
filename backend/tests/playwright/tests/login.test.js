const { test, expect } = require('@playwright/test');

// Test data from frontend configuration (not static JSON)
const testData = {
  urls: {
    login: process.env.BASE_URL',
    dashboard: process.env.BASE_URL',
    home: process.env.BASE_URL'
  },
  selectors: {
    login: {
      usernameField: "input[name='email']",
      passwordField: "input[name='password']", 
      loginButton: "button[type='submit']",
      errorMessage: ".error-message"
    },
    navigation: {
      logoutButton: "button[data-testid='logout']"
    }
  },
  testData: {
    login: {
      validCredentials: {
        username: process.env.TEST_USERNAME
        password: process.env.TEST_PASSWORD
      },
      invalidCredentials: {
        username: 'wrong@test.com',
        password: 'wrongpassword'
      }
    }
  },
  timeouts: {
    navigation: 10000,
    element: 5000,
    network: 30000
  }
};

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
