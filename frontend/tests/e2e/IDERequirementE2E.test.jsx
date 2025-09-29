/**
 * IDE Requirement E2E Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

import { test, expect } from '@playwright/test';

test.describe('IDE Requirement Modal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/auth/validate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 'test-user', email: 'test@example.com' } }
        })
      });
    });

    await page.route('**/api/ide/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/ide/configurations/active', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/ide/configurations/download-links', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cursor: {
              windows: 'https://cursor.sh/download/windows',
              macos: 'https://cursor.sh/download/macos',
              linux: 'https://cursor.sh/download/linux'
            },
            vscode: {
              windows: 'https://code.visualstudio.com/download',
              macos: 'https://code.visualstudio.com/download',
              linux: 'https://code.visualstudio.com/download'
            },
            windsurf: {
              windows: 'https://windsurf.dev/download/windows',
              macos: 'https://windsurf.dev/download/macos',
              linux: 'https://windsurf.dev/download/linux'
            }
          }
        })
      });
    });

    await page.route('**/api/ide/configurations/default-paths', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cursor: 'cursor',
            vscode: 'code',
            windsurf: 'windsurf'
          }
        })
      });
    });
  });

  test('should show IDE requirement modal after login when no IDE is running', async ({ page }) => {
    await page.goto('/');

    // Wait for authentication to complete
    await page.waitForSelector('[data-testid="main-app"]', { timeout: 10000 });

    // IDE requirement modal should appear
    await expect(page.locator('.ide-start-modal')).toBeVisible();
    await expect(page.locator('.requirement-message')).toBeVisible();
    await expect(page.locator('text=IDE Required')).toBeVisible();
    await expect(page.locator('text=No IDE Running')).toBeVisible();
  });

  test('should display download links for selected IDE', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Check that download section is visible
    await expect(page.locator('text=Don\'t have this IDE?')).toBeVisible();
    await expect(page.locator('text=Download Cursor')).toBeVisible();

    // Click on VS Code option
    await page.click('text=VS Code');
    await expect(page.locator('text=Download VS Code')).toBeVisible();
  });

  test('should open download link in new tab', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Mock window.open
    await page.evaluate(() => {
      window.open = jest.fn();
    });

    // Click download button
    await page.click('text=Download Cursor');

    // Verify that window.open was called
    const openCalled = await page.evaluate(() => window.open.mock.calls.length > 0);
    expect(openCalled).toBe(true);
  });

  test('should validate executable path', async ({ page }) => {
    await page.route('**/api/ide/configurations/validate', async route => {
      const body = await route.request().postDataJSON();
      
      if (body.executablePath === '/usr/bin/cursor') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              valid: true,
              version: '1.0.0'
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              valid: false,
              error: 'File not found'
            }
          })
        });
      }
    });

    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Enter valid executable path
    const pathInput = page.locator('input[placeholder*="Path to IDE executable"]');
    await pathInput.fill('/usr/bin/cursor');

    // Wait for validation
    await expect(page.locator('text=Valid executable (version 1.0.0)')).toBeVisible();

    // Enter invalid path
    await pathInput.fill('/invalid/path');
    await expect(page.locator('text=File not found')).toBeVisible();
  });

  test('should use default path when button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Click default path button
    const defaultPathButton = page.locator('button[title="Use default path"]');
    await defaultPathButton.click();

    // Check that path input is filled
    const pathInput = page.locator('input[placeholder*="Path to IDE executable"]');
    await expect(pathInput).toHaveValue('cursor');
  });

  test('should start IDE successfully', async ({ page }) => {
    await page.route('**/api/ide/start', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            port: 9222,
            ideType: 'cursor',
            workspacePath: '/test/workspace'
          }
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Select Cursor IDE (should be selected by default)
    await expect(page.locator('.ide-type-option.selected')).toContainText('Cursor');

    // Click Start IDE button
    await page.click('text=Start IDE');

    // Modal should close and success notification should appear
    await expect(page.locator('.ide-start-modal')).not.toBeVisible();
    await expect(page.locator('text=IDE started successfully!')).toBeVisible();
  });

  test('should handle IDE start errors', async ({ page }) => {
    await page.route('**/api/ide/start', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to start IDE'
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Click Start IDE button
    await page.click('text=Start IDE');

    // Error message should be displayed
    await expect(page.locator('text=Failed to start IDE')).toBeVisible();
    await expect(page.locator('.ide-start-modal')).toBeVisible(); // Modal should remain open
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Click close button
    await page.click('.modal-close-btn');

    // Modal should close
    await expect(page.locator('.ide-start-modal')).not.toBeVisible();
  });

  test('should close modal when cancel button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Click cancel button
    await page.click('text=Cancel');

    // Modal should close
    await expect(page.locator('.ide-start-modal')).not.toBeVisible();
  });

  test('should close modal on escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Press escape key
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.ide-start-modal')).not.toBeVisible();
  });

  test('should validate form before submission', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Try to submit without selecting IDE type (should be selected by default)
    // Clear the selection by clicking elsewhere
    await page.click('body');

    // Click Start IDE button
    await page.click('text=Start IDE');

    // Should show validation error
    await expect(page.locator('text=Please select an IDE type')).toBeVisible();
  });

  test('should handle custom port selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Select custom port option
    await page.click('text=Custom');

    // Custom port input should appear
    const customPortInput = page.locator('input[placeholder="Enter port number"]');
    await expect(customPortInput).toBeVisible();

    // Enter valid port
    await customPortInput.fill('9225');

    // Should not show validation error
    await expect(page.locator('text=Port must be between')).not.toBeVisible();
  });

  test('should validate custom port range', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.ide-start-modal');

    // Select custom port option
    await page.click('text=Custom');

    // Enter invalid port
    const customPortInput = page.locator('input[placeholder="Enter port number"]');
    await customPortInput.fill('9999');

    // Click Start IDE button
    await page.click('text=Start IDE');

    // Should show validation error
    await expect(page.locator('text=Port must be between 9222 and 9231')).toBeVisible();
  });
});
