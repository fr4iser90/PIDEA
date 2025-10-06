const { test, expect } = require('@playwright/test');

// Configuration will be loaded from database via API
let testData = null;
let baseURL = null;

// Load test configuration from environment variables (no API call needed)
test.beforeAll(async () => {
  try {
    // Get base URL from environment or use default
    baseURL = process.env.TEST_BASE_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:4000';
    
    // Use environment variables for test data instead of API call
    testData = {
      login: {
        username: process.env.TEST_LOGIN_USERNAME,
        password: process.env.TEST_LOGIN_PASSWORD 
      },
      timeout: parseInt(process.env.TEST_TIMEOUT) || 30000
    };
    
    // Validate that credentials are provided
    if (!testData.login.username || !testData.login.password) {
      throw new Error('TEST_LOGIN_USERNAME and TEST_LOGIN_PASSWORD environment variables are required');
    }
    
    console.log('Test configuration loaded from environment:', JSON.stringify(testData, null, 2));
  } catch (error) {
    console.error('Failed to load configuration from environment:', error);
    throw new Error('Cannot run tests without configuration');
  }
});

/**
 * PIDEA Login Test Suite
 * 
 * Tests the login functionality with various scenarios:
 * - Valid credentials
 * - Invalid credentials
 * - Empty credentials
 * - Login form validation
 */
test.describe('PIDEA Login Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure testData is loaded
    if (!testData) {
      throw new Error('Test configuration not loaded');
    }
    
    // Navigate to PIDEA login page
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Wait for login form to be visible
    await expect(page.locator('h2')).toContainText('Sign in to PIDEA');
  });
  
  test('should login with valid credentials', async ({ page }) => {
    // Use credentials from config
    const email = testData.login.username;
    const password = testData.login.password;
    
    console.log('Using credentials:', { email, password: password ? '***' : 'empty' });
    
    // Fill in valid credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for main app to load (no redirect, just shows main interface)
    await page.waitForSelector('.app-root', { timeout: testData.timeout });
    
    // Verify successful login - should see main PIDEA interface
    await expect(page.locator('.app-root')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });
  
  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('.auth-error')).toBeVisible();
    
    // Should still be on login page
    await expect(page).toHaveURL(new RegExp(baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  
  test('should show validation errors for empty credentials', async ({ page }) => {
    // Leave fields empty and click login
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('input[name="email"]')).toHaveAttribute('required');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('required');
    
    // Verify still on login page
    await expect(page).toHaveURL(new RegExp(baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  
  test('should show login form when not authenticated', async ({ page }) => {
    // Go to PIDEA without being logged in
    await page.goto(baseURL);
    
    // Should see login form (no redirect, just shows login)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Sign in to PIDEA');
  });
});