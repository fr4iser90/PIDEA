const { test, expect } = require('@playwright/test');

test.describe('PIDEA Agent Branch E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="git-management-panel"]');
  });

  test.describe('Component Integration', () => {
    test('should display PIDEA Agent Branch toggle button', async ({ page }) => {
      // Check if the toggle button is visible
      const toggleButton = page.locator('text=Show PIDEA Agent Branch');
      await expect(toggleButton).toBeVisible();
      
      // Verify button is clickable
      await expect(toggleButton).toBeEnabled();
    });

    test('should toggle PIDEA Agent Branch component visibility', async ({ page }) => {
      // Initially, the component should be hidden
      const pideaComponent = page.locator('[data-testid="pidea-agent-branch-component"]');
      await expect(pideaComponent).not.toBeVisible();

      // Click to show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Component should now be visible
      await expect(pideaComponent).toBeVisible();
      
      // Toggle button text should change
      await expect(page.locator('text=Hide PIDEA Agent Branch')).toBeVisible();

      // Click to hide the component
      await page.click('text=Hide PIDEA Agent Branch');
      
      // Component should be hidden again
      await expect(pideaComponent).not.toBeVisible();
      
      // Toggle button text should revert
      await expect(page.locator('text=Show PIDEA Agent Branch')).toBeVisible();
    });

    test('should display all PIDEA Agent Branch controls', async ({ page }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Check for all required elements
      await expect(page.locator('text=PIDEA Agent Branch')).toBeVisible();
      await expect(page.locator('text=Pull Changes')).toBeVisible();
      await expect(page.locator('text=Merge Changes')).toBeVisible();
      await expect(page.locator('text=Compare Changes')).toBeVisible();
      await expect(page.locator('text=Status:')).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should handle successful pull operation', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/git/pidea-agent/pull', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully pulled changes',
            changes: ['file1.js', 'file2.js'],
            status: 'up-to-date'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Click pull button
      await page.click('text=Pull Changes');
      
      // Check loading state
      await expect(page.locator('text=Pulling...')).toBeVisible();
      
      // Wait for operation to complete
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
      
      // Button should be enabled again
      await expect(page.locator('text=Pull Changes')).toBeEnabled();
    });

    test('should handle successful merge operation', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/git/pidea-agent/merge', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully merged changes',
            mergedFiles: ['file1.js', 'file2.js'],
            status: 'up-to-date'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Click merge button
      await page.click('text=Merge Changes');
      
      // Check loading state
      await expect(page.locator('text=Merging...')).toBeVisible();
      
      // Wait for operation to complete
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
      
      // Button should be enabled again
      await expect(page.locator('text=Merge Changes')).toBeEnabled();
    });

    test('should handle successful compare operation', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/git/pidea-agent/compare', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            differences: [
              { file: 'file1.js', status: 'modified', changes: 5 },
              { file: 'file2.js', status: 'added', changes: 10 }
            ]
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Click compare button
      await page.click('text=Compare Changes');
      
      // Check loading state
      await expect(page.locator('text=Comparing...')).toBeVisible();
      
      // Wait for operation to complete
      await expect(page.locator('text=Compare Changes')).toBeEnabled();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/git/pidea-agent/pull', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Click pull button
      await page.click('text=Pull Changes');
      
      // Wait for error handling
      await expect(page.locator('text=Pull Changes')).toBeEnabled();
      
      // Check for error message (assuming error handling displays messages)
      // This depends on how errors are displayed in the UI
    });

    test('should handle network errors', async ({ page }) => {
      // Mock network error
      await page.route('**/api/git/pidea-agent/pull', async route => {
        await route.abort('failed');
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Click pull button
      await page.click('text=Pull Changes');
      
      // Wait for error handling
      await expect(page.locator('text=Pull Changes')).toBeEnabled();
    });
  });

  test.describe('User Workflows', () => {
    test('should complete full pull workflow', async ({ page }) => {
      // Mock API responses
      await page.route('**/api/git/pidea-agent/status', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'behind',
            behindCount: 3
          })
        });
      });

      await page.route('**/api/git/pidea-agent/pull', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully pulled changes',
            status: 'up-to-date'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Check initial status
      await expect(page.locator('text=Status: Behind remote')).toBeVisible();
      
      // Perform pull operation
      await page.click('text=Pull Changes');
      
      // Wait for completion
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
    });

    test('should complete full merge workflow', async ({ page }) => {
      // Mock API responses
      await page.route('**/api/git/pidea-agent/merge', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully merged changes',
            status: 'up-to-date'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Perform merge operation
      await page.click('text=Merge Changes');
      
      // Wait for completion
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
    });

    test('should handle sequential operations', async ({ page }) => {
      // Mock API responses for sequential operations
      let pullCallCount = 0;
      let mergeCallCount = 0;

      await page.route('**/api/git/pidea-agent/pull', async route => {
        pullCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully pulled changes',
            status: 'up-to-date'
          })
        });
      });

      await page.route('**/api/git/pidea-agent/merge', async route => {
        mergeCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully merged changes',
            status: 'up-to-date'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Perform pull operation
      await page.click('text=Pull Changes');
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
      
      // Perform merge operation
      await page.click('text=Merge Changes');
      await expect(page.locator('text=Status: Up to date')).toBeVisible();
      
      // Verify both operations were called
      expect(pullCallCount).toBe(1);
      expect(mergeCallCount).toBe(1);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle rapid user interactions', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/git/pidea-agent/pull', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully pulled changes'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Rapid clicks should be ignored
      const pullButton = page.locator('text=Pull Changes');
      await pullButton.click();
      await pullButton.click();
      await pullButton.click();
      
      // Should show loading state
      await expect(page.locator('text=Pulling...')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('text=Pull Changes')).toBeEnabled();
    });

    test('should handle component state persistence', async ({ page }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
      
      // Hide the component
      await page.click('text=Hide PIDEA Agent Branch');
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).not.toBeVisible();
      
      // Show again - should maintain state
      await page.click('text=Show PIDEA Agent Branch');
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Focus on pull button
      await page.keyboard.press('Tab');
      await expect(page.locator('text=Pull Changes')).toBeFocused();
      
      // Navigate to merge button
      await page.keyboard.press('Tab');
      await expect(page.locator('text=Merge Changes')).toBeFocused();
      
      // Navigate to compare button
      await page.keyboard.press('Tab');
      await expect(page.locator('text=Compare Changes')).toBeFocused();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Check ARIA labels
      await expect(page.locator('[aria-label="Pull changes from pidea-agent branch"]')).toBeVisible();
      await expect(page.locator('[aria-label="Merge changes from pidea-agent branch"]')).toBeVisible();
      await expect(page.locator('[aria-label="Compare changes in pidea-agent branch"]')).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Check for screen reader friendly elements
      await expect(page.locator('[role="button"]')).toHaveCount(3);
      await expect(page.locator('[aria-expanded]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load component quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    test('should handle multiple operations efficiently', async ({ page }) => {
      // Mock fast API responses
      await page.route('**/api/git/pidea-agent/pull', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Success'
          })
        });
      });

      await page.route('**/api/git/pidea-agent/merge', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Success'
          })
        });
      });

      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      const startTime = Date.now();
      
      // Perform multiple operations
      await page.click('text=Pull Changes');
      await page.click('text=Merge Changes');
      await page.click('text=Compare Changes');
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in different browsers', async ({ page, browserName }) => {
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Basic functionality should work in all browsers
      await expect(page.locator('text=PIDEA Agent Branch')).toBeVisible();
      await expect(page.locator('text=Pull Changes')).toBeVisible();
      await expect(page.locator('text=Merge Changes')).toBeVisible();
      await expect(page.locator('text=Compare Changes')).toBeVisible();
      
      // Test interaction
      await page.click('text=Pull Changes');
      
      // Component should remain functional
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Show the component
      await page.click('text=Show PIDEA Agent Branch');
      
      // Component should be visible and usable
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
      await expect(page.locator('text=Pull Changes')).toBeVisible();
      await expect(page.locator('text=Merge Changes')).toBeVisible();
      await expect(page.locator('text=Compare Changes')).toBeVisible();
      
      // Test touch interaction
      await page.touchscreen.tap(page.locator('text=Pull Changes'));
      
      // Component should remain functional
      await expect(page.locator('[data-testid="pidea-agent-branch-component"]')).toBeVisible();
    });
  });
}); 