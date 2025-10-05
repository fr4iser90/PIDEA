const { test, expect } = require('@playwright/test');
const testData = require('../fixtures/test-data.json');

/**
 * Dashboard Test Suite
 * 
 * Tests the dashboard functionality including:
 * - Dashboard loading and display
 * - Navigation elements
 * - User information display
 * - Dashboard interactions
 */
test.describe('Dashboard Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(testData.urls.login);
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });
  
  test('should display dashboard correctly', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Check navigation menu
    await expect(page.locator(testData.selectors.navigation.navMenu)).toBeVisible();
    await expect(page.locator(testData.selectors.navigation.profileLink)).toBeVisible();
    await expect(page.locator(testData.selectors.navigation.logoutButton)).toBeVisible();
  });
  
  test('should show user information', async ({ page }) => {
    // Check if user info is displayed
    await expect(page.locator('.user-info')).toBeVisible();
    await expect(page.locator('.user-name')).toContainText(testData.users.admin.username);
    await expect(page.locator('.user-email')).toContainText(testData.users.admin.email);
  });
  
  test('should display project list', async ({ page }) => {
    // Check if projects are listed
    await expect(page.locator('.projects-list')).toBeVisible();
    await expect(page.locator('.project-item')).toHaveCount.greaterThan(0);
    
    // Check project details
    const firstProject = page.locator('.project-item').first();
    await expect(firstProject.locator('.project-name')).toBeVisible();
    await expect(firstProject.locator('.project-description')).toBeVisible();
    await expect(firstProject.locator('.project-status')).toBeVisible();
  });
  
  test('should navigate to profile page', async ({ page }) => {
    // Click profile link
    await page.click(testData.selectors.navigation.profileLink);
    
    // Should navigate to profile page
    await page.waitForURL('**/profile');
    await expect(page).toHaveURL(/profile/);
    await expect(page.locator('h1')).toContainText('Profile');
  });
  
  test('should navigate to settings page', async ({ page }) => {
    // Click settings link (assuming it exists in navigation)
    const settingsLink = page.locator('a[href*="settings"]');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL('**/settings');
      await expect(page).toHaveURL(/settings/);
    }
  });
  
  test('should handle project creation', async ({ page }) => {
    // Look for create project button
    const createButton = page.locator('button:has-text("Create Project")');
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should open project creation form
      await expect(page.locator('.project-form')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('textarea[name="description"]')).toBeVisible();
      
      // Fill form
      await page.fill('input[name="name"]', 'Test Project');
      await page.fill('textarea[name="description"]', 'A test project created by Playwright');
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should see success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Project created');
    }
  });
  
  test('should handle project deletion', async ({ page }) => {
    // Find a project with delete button
    const projectItem = page.locator('.project-item').first();
    const deleteButton = projectItem.locator('button:has-text("Delete")');
    
    if (await deleteButton.isVisible()) {
      // Click delete button
      await deleteButton.click();
      
      // Should show confirmation dialog
      await expect(page.locator('.confirmation-dialog')).toBeVisible();
      await expect(page.locator('.confirmation-dialog')).toContainText('Are you sure?');
      
      // Confirm deletion
      await page.click('.confirmation-dialog button:has-text("Confirm")');
      
      // Should see success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Project deleted');
    }
  });
  
  test('should display dashboard statistics', async ({ page }) => {
    // Check if statistics are displayed
    const statsContainer = page.locator('.dashboard-stats');
    
    if (await statsContainer.isVisible()) {
      await expect(statsContainer.locator('.stat-item')).toHaveCount.greaterThan(0);
      
      // Check individual stat items
      const statItems = statsContainer.locator('.stat-item');
      const count = await statItems.count();
      
      for (let i = 0; i < count; i++) {
        const statItem = statItems.nth(i);
        await expect(statItem.locator('.stat-label')).toBeVisible();
        await expect(statItem.locator('.stat-value')).toBeVisible();
      }
    }
  });
  
  test('should handle dashboard refresh', async ({ page }) => {
    // Get initial project count
    const initialCount = await page.locator('.project-item').count();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still show dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Project count should be the same
    const refreshedCount = await page.locator('.project-item').count();
    expect(refreshedCount).toBe(initialCount);
  });
  
  test('should handle empty dashboard state', async ({ page }) => {
    // Mock empty projects response
    await page.route('**/api/projects', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No projects found');
    
    // Should show create project button
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
  });
  
  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Navigation should be accessible on mobile
    await expect(page.locator(testData.selectors.navigation.menuButton)).toBeVisible();
  });
  
  test('should handle dashboard errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Error loading dashboard');
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});
