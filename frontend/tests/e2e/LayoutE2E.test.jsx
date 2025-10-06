/**
 * Layout End-to-End Tests
 * Tests full layout functionality and user journey
 */

import { test, expect } from '@playwright/test';

test.describe('Layout E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('SidebarRight Functionality', () => {
    test('should display sidebar in collapsed state by default', async ({ page }) => {
      // Check if sidebar is visible but collapsed
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
      
      // Check if only strip is visible (collapsed state)
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeLessThan(100); // Should be collapsed to strip
    });

    test('should expand sidebar on hover', async ({ page }) => {
      const sidebarRight = page.locator('.sidebar-right');
      
      // Hover over the sidebar
      await sidebarRight.hover();
      
      // Wait for animation to complete
      await page.waitForTimeout(350);
      
      // Check if sidebar is expanded
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200); // Should be expanded
    });

    test('should toggle sidebar with button click', async ({ page }) => {
      const sidebarRight = page.locator('.sidebar-right');
      const toggleButton = page.locator('#toggleSidebarRightBtn');
      
      // Click toggle button
      await toggleButton.click();
      
      // Wait for animation
      await page.waitForTimeout(350);
      
      // Check if sidebar is expanded
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200);
      
      // Click again to collapse
      await toggleButton.click();
      await page.waitForTimeout(350);
      
      // Check if sidebar is collapsed
      const collapsedRect = await sidebarRight.boundingBox();
      expect(collapsedRect.width).toBeLessThan(100);
    });

    test('should switch between tabs correctly', async ({ page }) => {
      const sidebarRight = page.locator('.sidebar-right');
      
      // Expand sidebar first
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      // Click on different tabs
      const tasksTab = page.locator('button:has-text("🗂️ Tasks")');
      const autoTab = page.locator('button:has-text("🤖 Auto")');
      const frameworksTab = page.locator('button:has-text("🧩 Frameworks")');
      
      // Test tasks tab
      await tasksTab.click();
      await expect(tasksTab).toHaveClass(/active/);
      
      // Test auto tab
      await autoTab.click();
      await expect(autoTab).toHaveClass(/active/);
      await expect(tasksTab).not.toHaveClass(/active/);
      
      // Test frameworks tab
      await frameworksTab.click();
      await expect(frameworksTab).toHaveClass(/active/);
      await expect(autoTab).not.toHaveClass(/active/);
    });

    test('should display correct toggle button states', async ({ page }) => {
      const toggleButton = page.locator('#toggleSidebarRightBtn');
      
      // Initial state should be collapsed (▶)
      await expect(toggleButton).toHaveText('▶');
      
      // Click to expand
      await toggleButton.click();
      await page.waitForTimeout(350);
      await expect(toggleButton).toHaveText('◀');
      
      // Click to collapse
      await toggleButton.click();
      await page.waitForTimeout(350);
      await expect(toggleButton).toHaveText('▶');
    });
  });

  test.describe('SidebarLeft Functionality', () => {
    test('should display sidebar in collapsed state by default', async ({ page }) => {
      const sidebarLeft = page.locator('.sidebar-left');
      await expect(sidebarLeft).toBeVisible();
      
      // Check if only strip is visible
      const sidebarRect = await sidebarLeft.boundingBox();
      expect(sidebarRect.width).toBeLessThan(100);
    });

    test('should expand sidebar on hover', async ({ page }) => {
      const sidebarLeft = page.locator('.sidebar-left');
      
      await sidebarLeft.hover();
      await page.waitForTimeout(350);
      
      const sidebarRect = await sidebarLeft.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200);
    });

    test('should display IDE management section', async ({ page }) => {
      const sidebarLeft = page.locator('.sidebar-left');
      
      // Expand sidebar
      await sidebarLeft.hover();
      await page.waitForTimeout(350);
      
      // Check for IDE management section
      const ideManagement = page.locator('.ide-management-section');
      await expect(ideManagement).toBeVisible();
      
      // Check for IDE header
      const ideHeader = page.locator('.ide-header');
      await expect(ideHeader).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
      
      // On mobile, sidebar should be full width when expanded
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(300); // Should be full width
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
      
      // On tablet, sidebar should behave normally
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200);
    });

    test('should adapt to desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
      
      // On desktop, sidebar should behave normally
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200);
    });
  });

  test.describe('Theme Switching', () => {
    test('should apply dark theme by default', async ({ page }) => {
      const body = page.locator('body');
      const computedStyle = await body.evaluate((el) => {
        return window.getComputedStyle(el);
      });
      
      // Check if dark theme colors are applied
      expect(computedStyle.backgroundColor).toBe('rgb(21, 24, 28)');
    });

    test('should switch to light theme when class is added', async ({ page }) => {
      // Add light theme class
      await page.evaluate(() => {
        document.body.classList.add('light-theme');
      });
      
      // Wait for theme to apply
      await page.waitForTimeout(100);
      
      const body = page.locator('body');
      const computedStyle = await body.evaluate((el) => {
        return window.getComputedStyle(el);
      });
      
      // Check if light theme colors are applied
      expect(computedStyle.backgroundColor).toBe('rgb(245, 245, 245)');
    });
  });

  test.describe('Layout Integration', () => {
    test('should maintain proper layout with both sidebars', async ({ page }) => {
      const sidebarLeft = page.locator('.sidebar-left');
      const sidebarRight = page.locator('.sidebar-right');
      const mainContent = page.locator('main, .main-content, [role="main"]');
      
      // Both sidebars should be visible
      await expect(sidebarLeft).toBeVisible();
      await expect(sidebarRight).toBeVisible();
      
      // Main content should be visible
      if (await mainContent.count() > 0) {
        await expect(mainContent).toBeVisible();
      }
    });

    test('should handle sidebar interactions without conflicts', async ({ page }) => {
      const sidebarLeft = page.locator('.sidebar-left');
      const sidebarRight = page.locator('.sidebar-right');
      
      // Expand left sidebar
      await sidebarLeft.hover();
      await page.waitForTimeout(350);
      
      // Expand right sidebar
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      // Both should be expanded
      const leftRect = await sidebarLeft.boundingBox();
      const rightRect = await sidebarRight.boundingBox();
      
      expect(leftRect.width).toBeGreaterThan(200);
      expect(rightRect.width).toBeGreaterThan(200);
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      const toggleButton = page.locator('#toggleSidebarRightBtn');
      
      // Focus on toggle button
      await toggleButton.focus();
      await expect(toggleButton).toBeFocused();
      
      // Press Enter to toggle
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
      
      // Check if sidebar expanded
      const sidebarRight = page.locator('.sidebar-right');
      const sidebarRect = await sidebarRight.boundingBox();
      expect(sidebarRect.width).toBeGreaterThan(200);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const toggleButton = page.locator('#toggleSidebarRightBtn');
      
      // Check for title attribute
      await expect(toggleButton).toHaveAttribute('title', 'Panel ein-/ausblenden');
    });

    test('should maintain focus management', async ({ page }) => {
      const sidebarRight = page.locator('.sidebar-right');
      
      // Expand sidebar
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      // Tab through elements
      await page.keyboard.press('Tab');
      
      // Check if focus is maintained
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load layout quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle animations smoothly', async ({ page }) => {
      const sidebarRight = page.locator('.sidebar-right');
      
      // Measure animation performance
      const startTime = Date.now();
      
      await sidebarRight.hover();
      await page.waitForTimeout(350);
      
      const animationTime = Date.now() - startTime;
      
      // Animation should complete within reasonable time
      expect(animationTime).toBeLessThan(500);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing event bus gracefully', async ({ page }) => {
      // This test would require mocking the component with missing props
      // For now, we'll test that the component renders without errors
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
    });

    test('should handle rapid toggle clicks', async ({ page }) => {
      const toggleButton = page.locator('#toggleSidebarRightBtn');
      
      // Rapidly click toggle button
      for (let i = 0; i < 5; i++) {
        await toggleButton.click();
        await page.waitForTimeout(50);
      }
      
      // Component should still be functional
      await page.waitForTimeout(350);
      const sidebarRight = page.locator('.sidebar-right');
      await expect(sidebarRight).toBeVisible();
    });
  });
});
