const { test, expect } = require('@playwright/test');

test.describe('IDE Selection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the IDE selection page
    await page.goto('/ide-selection');
  });

  test('should display IDE selection interface', async ({ page }) => {
    // Check if the main IDE selection components are visible
    await expect(page.locator('h1:has-text("IDE Selection")')).toBeVisible();
    await expect(page.locator('.ide-selector')).toBeVisible();
    await expect(page.locator('.ide-switch')).toBeVisible();
  });

  test('should show available IDEs in dropdown', async ({ page }) => {
    // Mock the API response for available IDEs
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'Cursor', status: 'stopped' },
            { port: 9224, name: 'WebStorm', status: 'running' }
          ]
        })
      });
    });

    // Click on the IDE selector dropdown
    await page.click('.ide-selector select');
    
    // Check if all IDEs are listed
    await expect(page.locator('option:has-text("VS Code (Port 9222)")')).toBeVisible();
    await expect(page.locator('option:has-text("Cursor (Port 9223)")')).toBeVisible();
    await expect(page.locator('option:has-text("WebStorm (Port 9224)")')).toBeVisible();
  });

  test('should display IDE status indicators', async ({ page }) => {
    // Mock the API response
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'Cursor', status: 'stopped' }
          ]
        })
      });
    });

    // Check status indicators
    await expect(page.locator('.status-indicator.running')).toBeVisible();
    await expect(page.locator('.status-indicator.stopped')).toBeVisible();
  });

  test('should allow IDE selection from dropdown', async ({ page }) => {
    // Mock API responses
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'Cursor', status: 'stopped' }
          ]
        })
      });
    });

    await page.route('/api/ide/selection', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { port: 9223, name: 'Cursor', selectedAt: new Date().toISOString() }
        })
      });
    });

    // Select Cursor from dropdown
    await page.selectOption('.ide-selector select', '9223');
    
    // Check if selection was made
    await expect(page.locator('.ide-selector select')).toHaveValue('9223');
  });

  test('should show current IDE selection', async ({ page }) => {
    // Mock current selection API
    await page.route('/api/ide/selection', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { port: 9222, name: 'VS Code', selectedAt: new Date().toISOString() }
        })
      });
    });

    // Check if current selection is displayed
    await expect(page.locator('.current-selection')).toBeVisible();
    await expect(page.locator('.current-selection')).toContainText('VS Code');
    await expect(page.locator('.current-selection')).toContainText('Port 9222');
  });

  test('should handle IDE switching', async ({ page }) => {
    // Mock API responses
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'Cursor', status: 'running' }
          ]
        })
      });
    });

    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { 
              previousPort: 9222, 
              currentPort: 9223, 
              reason: 'manual' 
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { port: 9222, name: 'VS Code', selectedAt: new Date().toISOString() }
          })
        });
      }
    });

    // Select different IDE
    await page.selectOption('.ide-selector select', '9223');
    
    // Click switch button
    await page.click('.ide-switch button:has-text("Switch")');
    
    // Check if switch was successful
    await expect(page.locator('.switch-status')).toContainText('Switched to Cursor');
  });

  test('should show switch progress', async ({ page }) => {
    // Mock API with delay to test progress
    await page.route('/api/ide/selection', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { currentPort: 9223, reason: 'manual' }
        })
      });
    });

    // Select different IDE and switch
    await page.selectOption('.ide-selector select', '9223');
    await page.click('.ide-switch button:has-text("Switch")');
    
    // Check if progress is shown
    await expect(page.locator('.switch-progress')).toBeVisible();
    await expect(page.locator('.switch-progress')).toContainText('Switching...');
  });

  test('should handle switch errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/ide/selection', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to switch IDE'
        })
      });
    });

    // Attempt to switch
    await page.selectOption('.ide-selector select', '9223');
    await page.click('.ide-switch button:has-text("Switch")');
    
    // Check if error is displayed
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Failed to switch IDE');
  });

  test('should show IDE features when selected', async ({ page }) => {
    // Mock features API
    await page.route('/api/ide/features?port=9222', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ide: 'vscode',
            version: '1.85.0',
            features: {
              debugging: { available: true, version: '1.0.0' },
              intellisense: { available: true, version: '2.1.0' }
            }
          }
        })
      });
    });

    // Select VS Code
    await page.selectOption('.ide-selector select', '9222');
    
    // Check if features are displayed
    await expect(page.locator('.ide-features')).toBeVisible();
    await expect(page.locator('.ide-features')).toContainText('Debugging');
    await expect(page.locator('.ide-features')).toContainText('IntelliSense');
  });

  test('should update IDE mirror when selection changes', async ({ page }) => {
    // Mock mirror API
    await page.route('/api/ide/mirror/dom?port=9223', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            root: { id: 'root', tagName: 'DIV', children: [] },
            elementCount: 1
          }
        })
      });
    });

    // Select different IDE
    await page.selectOption('.ide-selector select', '9223');
    
    // Check if mirror updates
    await expect(page.locator('.ide-mirror')).toBeVisible();
    await expect(page.locator('.ide-mirror')).toContainText('IDE Mirror - Port 9223');
  });

  test('should handle WebSocket updates', async ({ page }) => {
    // Mock WebSocket connection
    await page.evaluate(() => {
      // Mock WebSocket
      window.WebSocket = class MockWebSocket {
        constructor(url) {
          this.url = url;
          this.readyState = 1; // OPEN
          setTimeout(() => {
            this.onmessage({ data: JSON.stringify({
              type: 'ideStatusChanged',
              data: { port: 9222, status: 'running' }
            })});
          }, 100);
        }
        send(data) {}
        close() {}
      };
    });

    // Check if WebSocket updates are handled
    await expect(page.locator('.status-indicator.running')).toBeVisible();
  });

  test('should persist IDE selection', async ({ page }) => {
    // Mock localStorage
    await page.evaluate(() => {
      localStorage.setItem('selectedIDE', JSON.stringify({
        port: 9222,
        name: 'VS Code',
        selectedAt: new Date().toISOString()
      }));
    });

    // Reload page
    await page.reload();
    
    // Check if selection is persisted
    await expect(page.locator('.ide-selector select')).toHaveValue('9222');
  });

  test('should show IDE connection status', async ({ page }) => {
    // Mock connection status
    await page.route('/api/ide/status?port=9222', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            port: 9222,
            name: 'VS Code',
            status: 'running',
            connected: true,
            lastPing: new Date().toISOString()
          }
        })
      });
    });

    // Check connection status
    await expect(page.locator('.connection-status.connected')).toBeVisible();
    await expect(page.locator('.connection-status')).toContainText('Connected');
  });

  test('should handle multiple IDE instances', async ({ page }) => {
    // Mock multiple IDEs
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'VS Code', status: 'running' },
            { port: 9224, name: 'Cursor', status: 'running' }
          ]
        })
      });
    });

    // Check if multiple instances are shown
    await expect(page.locator('option:has-text("VS Code (Port 9222)")')).toBeVisible();
    await expect(page.locator('option:has-text("VS Code (Port 9223)")')).toBeVisible();
    await expect(page.locator('option:has-text("Cursor (Port 9224)")')).toBeVisible();
  });

  test('should show IDE switching history', async ({ page }) => {
    // Mock history data
    await page.evaluate(() => {
      localStorage.setItem('ideSwitchHistory', JSON.stringify([
        { fromPort: 9222, toPort: 9223, reason: 'manual', timestamp: new Date().toISOString() },
        { fromPort: 9223, toPort: 9222, reason: 'auto', timestamp: new Date().toISOString() }
      ]));
    });

    // Check if history is displayed
    await expect(page.locator('.switch-history')).toBeVisible();
    await expect(page.locator('.switch-history')).toContainText('Recent Switches');
  });

  test('should handle rapid IDE switching', async ({ page }) => {
    // Mock API responses
    await page.route('/api/ide/selection', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { currentPort: 9223, reason: 'manual' }
        })
      });
    });

    // Rapidly switch between IDEs
    await page.selectOption('.ide-selector select', '9223');
    await page.click('.ide-switch button:has-text("Switch")');
    
    await page.selectOption('.ide-selector select', '9222');
    await page.click('.ide-switch button:has-text("Switch")');
    
    // Check if system handles rapid switching
    await expect(page.locator('.switch-status')).toBeVisible();
  });

  test('should validate IDE selection before switching', async ({ page }) => {
    // Try to switch without selecting an IDE
    await page.click('.ide-switch button:has-text("Switch")');
    
    // Check if validation error is shown
    await expect(page.locator('.validation-error')).toBeVisible();
    await expect(page.locator('.validation-error')).toContainText('Please select an IDE');
  });

  test('should show IDE selection confirmation', async ({ page }) => {
    // Mock confirmation dialog
    await page.route('/api/ide/selection', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { currentPort: 9223, reason: 'manual' }
        })
      });
    });

    // Select different IDE
    await page.selectOption('.ide-selector select', '9223');
    
    // Check if confirmation is shown
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.locator('.confirmation-dialog')).toContainText('Switch to Cursor?');
  });
}); 