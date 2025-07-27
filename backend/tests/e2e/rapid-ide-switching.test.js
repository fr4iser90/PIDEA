/**
 * Rapid IDE Switching E2E Test
 * 
 * End-to-end test to validate rapid IDE switching performance,
 * request deduplication, and user experience improvements.
 */

import { test, expect } from '@playwright/test';

test.describe('Rapid IDE Switching Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="ide-selector"]', { timeout: 10000 });
  });

  test('should handle rapid IDE switching without performance degradation', async ({ page }) => {
    // Get initial performance metrics
    const initialMetrics = await page.evaluate(() => {
      return {
        memory: performance.memory?.usedJSHeapSize || 0,
        timestamp: performance.now()
      };
    });

    // Perform rapid IDE switching (simulate user clicking quickly)
    const ideSwitches = [];
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const switchStart = Date.now();
      
      // Click on different IDE options rapidly
      await page.click(`[data-testid="ide-option-${i % 3}"]`);
      
      // Wait for the switch to complete (but don't wait too long)
      await page.waitForSelector('[data-testid="ide-status-active"]', { timeout: 2000 });
      
      const switchEnd = Date.now();
      ideSwitches.push(switchEnd - switchStart);
      
      // Small delay to simulate rapid clicking
      await page.waitForTimeout(100);
    }

    const totalTime = Date.now() - startTime;
    const averageSwitchTime = ideSwitches.reduce((a, b) => a + b, 0) / ideSwitches.length;

    // Performance assertions
    expect(totalTime).toBeLessThan(10000); // Total time should be under 10 seconds
    expect(averageSwitchTime).toBeLessThan(1000); // Average switch time should be under 1 second
    
    // Check that no switches took more than 2 seconds
    const slowSwitches = ideSwitches.filter(time => time > 2000);
    expect(slowSwitches.length).toBe(0);

    // Verify no memory leaks
    const finalMetrics = await page.evaluate(() => {
      return {
        memory: performance.memory?.usedJSHeapSize || 0,
        timestamp: performance.now()
      };
    });

    const memoryIncrease = finalMetrics.memory - initialMetrics.memory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });

  test('should deduplicate concurrent IDE switch requests', async ({ page }) => {
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/ide/switch')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    // Perform rapid switching
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(page.click(`[data-testid="ide-option-${i % 3}"]`));
    }

    // Execute all clicks simultaneously
    await Promise.all(promises);

    // Wait for all switches to complete
    await page.waitForTimeout(3000);

    // Verify that fewer actual requests were made than clicks
    expect(requests.length).toBeLessThan(5);
    
    // Verify that requests were deduplicated (same endpoint called multiple times)
    const uniqueUrls = [...new Set(requests.map(r => r.url))];
    expect(uniqueUrls.length).toBeLessThan(requests.length);
  });

  test('should cache IDE information and improve subsequent requests', async ({ page }) => {
    // First, get available IDEs (should make a request)
    const firstRequestTime = Date.now();
    await page.click('[data-testid="refresh-ides"]');
    await page.waitForSelector('[data-testid="ide-list"]', { timeout: 5000 });
    const firstRequestDuration = Date.now() - firstRequestTime;

    // Clear any existing cache by refreshing the page
    await page.reload();
    await page.waitForSelector('[data-testid="ide-selector"]', { timeout: 10000 });

    // Second request (should be faster due to caching)
    const secondRequestTime = Date.now();
    await page.click('[data-testid="refresh-ides"]');
    await page.waitForSelector('[data-testid="ide-list"]', { timeout: 5000 });
    const secondRequestDuration = Date.now() - secondRequestTime;

    // Cached request should be significantly faster
    expect(secondRequestDuration).toBeLessThan(firstRequestDuration * 0.5);
  });

  test('should handle network errors gracefully during IDE switching', async ({ page }) => {
    // Simulate network error by intercepting requests
    await page.route('**/api/ide/switch/**', route => {
      route.abort('failed');
    });

    // Try to switch IDE
    await page.click('[data-testid="ide-option-0"]');

    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    
    // Error should be user-friendly
    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('Unable to switch IDE');
    expect(errorText).toContain('Please try again');

    // Should not break the UI
    await expect(page.locator('[data-testid="ide-selector"]')).toBeVisible();
  });

  test('should maintain UI responsiveness during rapid switching', async ({ page }) => {
    // Start a background task to monitor UI responsiveness
    const responsivenessChecks = [];
    
    const checkResponsiveness = async () => {
      const start = performance.now();
      await page.evaluate(() => {
        // Simulate a UI interaction
        document.querySelector('[data-testid="ide-selector"]').click();
      });
      const end = performance.now();
      responsivenessChecks.push(end - start);
    };

    // Perform rapid switching while monitoring responsiveness
    const switchPromises = [];
    const responsivenessPromises = [];

    for (let i = 0; i < 5; i++) {
      switchPromises.push(page.click(`[data-testid="ide-option-${i % 3}"]`));
      responsivenessPromises.push(checkResponsiveness());
      
      // Small delay between switches
      await page.waitForTimeout(200);
    }

    await Promise.all(switchPromises);
    await Promise.all(responsivenessPromises);

    // UI should remain responsive (interactions under 100ms)
    const slowInteractions = responsivenessChecks.filter(time => time > 100);
    expect(slowInteractions.length).toBeLessThan(responsivenessChecks.length * 0.2); // Less than 20% slow interactions
  });

  test('should show loading states during IDE switching', async ({ page }) => {
    // Monitor for loading indicators
    const loadingStates = [];

    // Perform multiple switches and check for loading states
    for (let i = 0; i < 3; i++) {
      await page.click(`[data-testid="ide-option-${i % 3}"]`);
      
      // Check if loading indicator appears
      const loadingVisible = await page.isVisible('[data-testid="loading-indicator"]');
      loadingStates.push(loadingVisible);
      
      // Wait for switch to complete
      await page.waitForSelector('[data-testid="ide-status-active"]', { timeout: 2000 });
    }

    // Should show loading state for at least some switches
    expect(loadingStates.some(state => state)).toBe(true);
  });

  test('should prevent multiple simultaneous IDE switches', async ({ page }) => {
    // Try to trigger multiple switches simultaneously
    const switchPromises = [];
    
    for (let i = 0; i < 3; i++) {
      switchPromises.push(page.click(`[data-testid="ide-option-${i}"]`));
    }

    // Execute all clicks
    await Promise.all(switchPromises);

    // Wait for any switch to complete
    await page.waitForSelector('[data-testid="ide-status-active"]', { timeout: 5000 });

    // Should only have one active IDE
    const activeIDEs = await page.locator('[data-testid="ide-status-active"]').count();
    expect(activeIDEs).toBe(1);
  });

  test('should maintain state consistency during rapid switching', async ({ page }) => {
    // Get initial state
    const initialState = await page.evaluate(() => {
      return {
        activeIDE: document.querySelector('[data-testid="active-ide"]')?.textContent,
        availableIDEs: Array.from(document.querySelectorAll('[data-testid="ide-option"]')).map(el => el.textContent)
      };
    });

    // Perform rapid switching
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-testid="ide-option-${i % 3}"]`);
      await page.waitForTimeout(100);
    }

    // Wait for final switch to complete
    await page.waitForSelector('[data-testid="ide-status-active"]', { timeout: 5000 });

    // Get final state
    const finalState = await page.evaluate(() => {
      return {
        activeIDE: document.querySelector('[data-testid="active-ide"]')?.textContent,
        availableIDEs: Array.from(document.querySelectorAll('[data-testid="ide-option"]')).map(el => el.textContent)
      };
    });

    // Available IDEs should remain consistent
    expect(finalState.availableIDEs).toEqual(initialState.availableIDEs);
    
    // Should have an active IDE
    expect(finalState.activeIDE).toBeDefined();
    expect(finalState.activeIDE).not.toBe('');
  });

  test('should provide visual feedback for successful switches', async ({ page }) => {
    // Perform a switch
    await page.click('[data-testid="ide-option-0"]');
    
    // Should show success feedback
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    
    const successText = await page.textContent('[data-testid="success-message"]');
    expect(successText).toContain('IDE switched successfully');
    
    // Success message should disappear after a few seconds
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="success-message"]')).not.toBeVisible();
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Test switching to the same IDE multiple times
    await page.click('[data-testid="ide-option-0"]');
    await page.waitForSelector('[data-testid="ide-status-active"]', { timeout: 2000 });
    
    // Try to switch to the same IDE again
    await page.click('[data-testid="ide-option-0"]');
    
    // Should handle gracefully (no error, no duplicate requests)
    await page.waitForTimeout(1000);
    
    // Should still have only one active IDE
    const activeIDEs = await page.locator('[data-testid="ide-status-active"]').count();
    expect(activeIDEs).toBe(1);
  });
}); 