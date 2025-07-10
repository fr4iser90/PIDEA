const { test, expect } = require('@playwright/test');

test.describe('IDE Switching E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the IDE switching page
    await page.goto('/ide-switch');
  });

  test('should display IDE switching interface', async ({ page }) => {
    // Check if the main IDE switching components are visible
    await expect(page.locator('h1:has-text("IDE Switch")')).toBeVisible();
    await expect(page.locator('.ide-switch')).toBeVisible();
    await expect(page.locator('.switch-controls')).toBeVisible();
  });

  test('should show current and target IDE information', async ({ page }) => {
    // Mock current IDE data
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

    // Check current IDE display
    await expect(page.locator('.current-ide')).toBeVisible();
    await expect(page.locator('.current-ide')).toContainText('VS Code');
    await expect(page.locator('.current-ide')).toContainText('Port 9222');
  });

  test('should allow selecting target IDE', async ({ page }) => {
    // Mock available IDEs
    await page.route('/api/ide/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { port: 9222, name: 'VS Code', status: 'running' },
            { port: 9223, name: 'Cursor', status: 'running' },
            { port: 9224, name: 'WebStorm', status: 'running' }
          ]
        })
      });
    });

    // Select target IDE
    await page.selectOption('.target-ide-select', '9223');
    
    // Check if target is selected
    await expect(page.locator('.target-ide-select')).toHaveValue('9223');
    await expect(page.locator('.target-ide-info')).toContainText('Cursor');
  });

  test('should show switch button when target differs from current', async ({ page }) => {
    // Mock current IDE (9222)
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

    // Select different target (9223)
    await page.selectOption('.target-ide-select', '9223');
    
    // Check if switch button appears
    await expect(page.locator('.switch-button')).toBeVisible();
    await expect(page.locator('.switch-button')).toContainText('Switch to Cursor');
  });

  test('should hide switch button when target equals current', async ({ page }) => {
    // Mock current IDE (9222)
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

    // Select same target (9222)
    await page.selectOption('.target-ide-select', '9222');
    
    // Check if switch button is hidden
    await expect(page.locator('.switch-button')).not.toBeVisible();
  });

  test('should initiate IDE switch when button is clicked', async ({ page }) => {
    // Mock API responses
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

    // Select target and switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check if switch was initiated
    await expect(page.locator('.switch-status')).toContainText('Switching to Cursor');
  });

  test('should show switch progress during transition', async ({ page }) => {
    // Mock API with delay
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { currentPort: 9223, reason: 'manual' }
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

    // Start switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check progress indicators
    await expect(page.locator('.switch-progress')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.switch-status')).toContainText('Initiating switch...');
  });

  test('should show switch completion status', async ({ page }) => {
    // Mock successful switch
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
              reason: 'manual',
              completedAt: new Date().toISOString()
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

    // Complete switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Wait for completion
    await expect(page.locator('.switch-status')).toContainText('Switch completed');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should handle switch errors gracefully', async ({ page }) => {
    // Mock switch error
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Failed to switch IDE: Connection timeout'
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

    // Attempt switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check error handling
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Connection timeout');
    await expect(page.locator('.retry-button')).toBeVisible();
  });

  test('should allow canceling switch in progress', async ({ page }) => {
    // Mock API with delay
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Long delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { currentPort: 9223, reason: 'manual' }
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

    // Start switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Cancel switch
    await page.click('.cancel-button');
    
    // Check cancellation
    await expect(page.locator('.switch-status')).toContainText('Switch cancelled');
    await expect(page.locator('.cancel-button')).not.toBeVisible();
  });

  test('should show switch reason selection', async ({ page }) => {
    // Check if reason selector is visible
    await expect(page.locator('.switch-reason')).toBeVisible();
    await expect(page.locator('.switch-reason select')).toBeVisible();
    
    // Check reason options
    await expect(page.locator('option:has-text("Manual")')).toBeVisible();
    await expect(page.locator('option:has-text("Auto")')).toBeVisible();
    await expect(page.locator('option:has-text("Error Recovery")')).toBeVisible();
  });

  test('should include reason in switch request', async ({ page }) => {
    // Mock API and capture request
    let capturedRequest = null;
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        capturedRequest = route.request();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { currentPort: 9223, reason: 'auto' }
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

    // Select reason and switch
    await page.selectOption('.switch-reason select', 'auto');
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check if reason was included
    expect(capturedRequest).toBeTruthy();
    const requestBody = JSON.parse(await capturedRequest.postData());
    expect(requestBody.reason).toBe('auto');
  });

  test('should show switch history after completion', async ({ page }) => {
    // Mock successful switch
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
              reason: 'manual',
              completedAt: new Date().toISOString()
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

    // Complete switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check if history is updated
    await expect(page.locator('.switch-history')).toBeVisible();
    await expect(page.locator('.switch-history')).toContainText('VS Code → Cursor');
  });

  test('should handle auto-switch functionality', async ({ page }) => {
    // Mock auto-switch trigger
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
              reason: 'auto',
              trigger: 'connection_lost'
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

    // Enable auto-switch
    await page.click('.auto-switch-toggle');
    
    // Check auto-switch status
    await expect(page.locator('.auto-switch-status')).toContainText('Auto-switch enabled');
  });

  test('should show switch confirmation dialog', async ({ page }) => {
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

    // Select target and attempt switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check confirmation dialog
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.locator('.confirmation-dialog')).toContainText('Switch to Cursor?');
    await expect(page.locator('.confirm-button')).toBeVisible();
    await expect(page.locator('.cancel-button')).toBeVisible();
  });

  test('should handle switch with unsaved changes warning', async ({ page }) => {
    // Mock unsaved changes detection
    await page.evaluate(() => {
      window.hasUnsavedChanges = true;
    });

    // Attempt switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check unsaved changes warning
    await expect(page.locator('.unsaved-changes-warning')).toBeVisible();
    await expect(page.locator('.unsaved-changes-warning')).toContainText('Unsaved changes detected');
  });

  test('should show switch performance metrics', async ({ page }) => {
    // Mock switch with timing data
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { 
              currentPort: 9223, 
              reason: 'manual',
              switchTime: 1500,
              performance: 'good'
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

    // Complete switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check performance metrics
    await expect(page.locator('.switch-metrics')).toBeVisible();
    await expect(page.locator('.switch-metrics')).toContainText('1.5s');
    await expect(page.locator('.switch-metrics')).toContainText('Good');
  });

  test('should handle rapid switching prevention', async ({ page }) => {
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

    // Attempt rapid switches
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    await page.selectOption('.target-ide-select', '9224');
    await page.click('.switch-button');
    
    // Check if rapid switching is prevented
    await expect(page.locator('.rapid-switch-warning')).toBeVisible();
    await expect(page.locator('.rapid-switch-warning')).toContainText('Please wait before switching again');
  });

  test('should show switch prerequisites check', async ({ page }) => {
    // Mock prerequisites check
    await page.route('/api/ide/selection', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Prerequisites not met',
            missingPrerequisites: ['target_ide_running', 'valid_connection']
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

    // Attempt switch
    await page.selectOption('.target-ide-select', '9223');
    await page.click('.switch-button');
    
    // Check prerequisites error
    await expect(page.locator('.prerequisites-error')).toBeVisible();
    await expect(page.locator('.prerequisites-error')).toContainText('Target IDE not running');
    await expect(page.locator('.prerequisites-error')).toContainText('Invalid connection');
  });
}); 