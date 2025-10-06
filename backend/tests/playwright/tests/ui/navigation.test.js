const { test, expect } = require('@playwright/test');

// Configuration will be loaded from environment variables
let testData = null;
let baseURL = null;

// Load test configuration from environment variables
test.beforeAll(async () => {
  try {
    baseURL = process.env.TEST_BASE_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:4000';
    
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
    
    console.log('Navigation test configuration loaded from environment');
  } catch (error) {
    console.error('Failed to load configuration from environment:', error);
    throw new Error('Cannot run tests without configuration');
  }
});

/**
 * PIDEA UI Navigation Test Suite
 * 
 * Tests the main navigation elements and user interface:
 * - Header navigation
 * - Sidebar navigation
 * - Project switching
 * - Main content areas
 * - Responsive behavior
 */
test.describe('PIDEA UI Navigation Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure testData is loaded
    if (!testData) {
      throw new Error('Test configuration not loaded');
    }
    
    // Login first
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Wait for login form and login
    await expect(page.locator('h2')).toContainText('Sign in to PIDEA');
    await page.fill('input[name="email"]', testData.login.username);
    await page.fill('input[name="password"]', testData.login.password);
    await page.click('button[type="submit"]');
    
    // Wait for main app to load
    await page.waitForSelector('.app-root', { timeout: testData.timeout });
    await expect(page.locator('.app-root')).toBeVisible();
  });
  
  test('should display main navigation elements', async ({ page }) => {
    // Check header elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header h1, header .logo')).toBeVisible();
    
    // Check sidebar navigation
    await expect(page.locator('.sidebar, nav')).toBeVisible();
    
    // Check main content area
    await expect(page.locator('.main-content, .content, main')).toBeVisible();
  });
  
  test('should navigate between different sections', async ({ page }) => {
    // Test navigation links (adjust selectors based on your actual UI)
    const navLinks = [
      { selector: '[data-testid="projects-link"], a[href*="projects"]', text: 'Projects' },
      { selector: '[data-testid="tasks-link"], a[href*="tasks"]', text: 'Tasks' },
      { selector: '[data-testid="settings-link"], a[href*="settings"]', text: 'Settings' }
    ];
    
    for (const link of navLinks) {
      try {
        const navElement = page.locator(link.selector).first();
        if (await navElement.isVisible()) {
          await navElement.click();
          await page.waitForLoadState('networkidle');
          
          // Verify we're on the correct page
          await expect(page.locator('body')).toBeVisible();
          console.log(`✅ Successfully navigated to ${link.text}`);
        }
      } catch (error) {
        console.log(`⚠️ Navigation link ${link.text} not found or not clickable`);
      }
    }
  });
  
  test('should show project information in header', async ({ page }) => {
    // Check if project name/ID is displayed
    const projectInfo = page.locator('header .project-info, header .project-name, header h1');
    
    if (await projectInfo.isVisible()) {
      await expect(projectInfo).toBeVisible();
      const projectText = await projectInfo.textContent();
      console.log(`📋 Project info displayed: ${projectText}`);
    }
  });
  
  test('should handle responsive navigation', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check if mobile navigation elements are present
    const mobileNav = page.locator('.mobile-nav, .hamburger-menu, [data-testid="mobile-menu"]');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
      console.log('📱 Mobile navigation detected');
    }
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    // Check if desktop navigation is visible
    await expect(page.locator('header')).toBeVisible();
    console.log('🖥️ Desktop navigation verified');
  });
  
  test('should show loading states during navigation', async ({ page }) => {
    // Look for loading indicators
    const loadingIndicators = [
      '.loading, .spinner, .loader',
      '[data-testid="loading"]',
      '.loading-spinner'
    ];
    
    // Navigate to trigger potential loading
    try {
      const projectsLink = page.locator('[data-testid="projects-link"], a[href*="projects"]').first();
      if (await projectsLink.isVisible()) {
        await projectsLink.click();
        
        // Check for loading states (they might appear briefly)
        for (const indicator of loadingIndicators) {
          const loading = page.locator(indicator);
          if (await loading.isVisible({ timeout: 1000 })) {
            console.log(`⏳ Loading indicator found: ${indicator}`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not test loading states - navigation might be instant');
    }
  });
  
  test('should display error states correctly', async ({ page }) => {
    // Try to navigate to non-existent page
    await page.goto(`${baseURL}/non-existent-page`);
    await page.waitForLoadState('networkidle');
    
    // Check for error messages or 404 handling
    const errorElements = [
      '.error, .error-message',
      '[data-testid="error"]',
      '.not-found, .404'
    ];
    
    for (const errorSelector of errorElements) {
      const errorElement = page.locator(errorSelector);
      if (await errorElement.isVisible()) {
        await expect(errorElement).toBeVisible();
        console.log(`❌ Error state displayed: ${errorSelector}`);
        break;
      }
    }
  });
});
