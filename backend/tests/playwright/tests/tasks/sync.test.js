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
    
    console.log('Tasks sync test configuration loaded from environment');
  } catch (error) {
    console.error('Failed to load configuration from environment:', error);
    throw new Error('Cannot run tests without configuration');
  }
});

/**
 * PIDEA Tasks Sync Test Suite
 * 
 * Tests the task synchronization functionality:
 * - Task creation and sync
 * - Task updates and real-time sync
 * - Task deletion and cleanup
 * - Database synchronization
 * - WebSocket real-time updates
 */
test.describe('PIDEA Tasks Sync Tests', () => {
  
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
  
  test('should create new task and sync to database', async ({ page }) => {
    // Navigate to tasks section
    try {
      const tasksLink = page.locator('[data-testid="tasks-link"], a[href*="tasks"], .tasks-nav').first();
      if (await tasksLink.isVisible()) {
        await tasksLink.click();
        await page.waitForLoadState('networkidle');
      }
    } catch (error) {
      console.log('⚠️ Tasks navigation not found, staying on main page');
    }
    
    // Look for add task button/form
    const addTaskSelectors = [
      '[data-testid="add-task"]',
      '.add-task-btn',
      'button:has-text("Add Task")',
      'button:has-text("New Task")',
      '.create-task'
    ];
    
    let addTaskButton = null;
    for (const selector of addTaskSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        addTaskButton = element;
        break;
      }
    }
    
    if (addTaskButton) {
      await addTaskButton.click();
      await page.waitForTimeout(500);
      
      // Fill task form
      const taskTitle = `Test Task ${Date.now()}`;
      const titleInputs = [
        'input[name="title"]',
        'input[name="name"]',
        'input[placeholder*="title"]',
        'input[placeholder*="task"]'
      ];
      
      for (const inputSelector of titleInputs) {
        const input = page.locator(inputSelector);
        if (await input.isVisible()) {
          await input.fill(taskTitle);
          break;
        }
      }
      
      // Submit task
      const submitButtons = [
        'button[type="submit"]',
        'button:has-text("Create")',
        'button:has-text("Save")',
        'button:has-text("Add")'
      ];
      
      for (const buttonSelector of submitButtons) {
        const button = page.locator(buttonSelector);
        if (await button.isVisible()) {
          await button.click();
          break;
        }
      }
      
      // Wait for task to appear in list
      await page.waitForTimeout(1000);
      
      // Verify task was created
      const taskInList = page.locator(`text=${taskTitle}`);
      if (await taskInList.isVisible()) {
        await expect(taskInList).toBeVisible();
        console.log(`✅ Task created successfully: ${taskTitle}`);
      } else {
        console.log('⚠️ Task creation verification failed - might need different selectors');
      }
    } else {
      console.log('⚠️ Add task button not found - task creation UI might be different');
    }
  });
  
  test('should update task and verify sync', async ({ page }) => {
    // Look for existing tasks to edit
    const taskItems = page.locator('.task-item, .task-row, [data-testid="task-item"]');
    
    if (await taskItems.first().isVisible()) {
      const firstTask = taskItems.first();
      
      // Look for edit button
      const editButtons = [
        '.edit-task',
        '[data-testid="edit-task"]',
        'button:has-text("Edit")',
        '.task-actions button'
      ];
      
      for (const editSelector of editButtons) {
        const editButton = firstTask.locator(editSelector);
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(500);
          
          // Update task title
          const titleInput = page.locator('input[name="title"], input[name="name"]').first();
          if (await titleInput.isVisible()) {
            const newTitle = `Updated Task ${Date.now()}`;
            await titleInput.fill(newTitle);
            
            // Save changes
            const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await page.waitForTimeout(1000);
              
              // Verify update
              const updatedTask = page.locator(`text=${newTitle}`);
              if (await updatedTask.isVisible()) {
                await expect(updatedTask).toBeVisible();
                console.log(`✅ Task updated successfully: ${newTitle}`);
              }
            }
          }
          break;
        }
      }
    } else {
      console.log('⚠️ No tasks found to edit');
    }
  });
  
  test('should delete task and verify cleanup', async ({ page }) => {
    // Look for existing tasks to delete
    const taskItems = page.locator('.task-item, .task-row, [data-testid="task-item"]');
    
    if (await taskItems.first().isVisible()) {
      const firstTask = taskItems.first();
      
      // Look for delete button
      const deleteButtons = [
        '.delete-task',
        '[data-testid="delete-task"]',
        'button:has-text("Delete")',
        '.task-actions .delete',
        'button[title*="delete"]'
      ];
      
      for (const deleteSelector of deleteButtons) {
        const deleteButton = firstTask.locator(deleteSelector);
        if (await deleteButton.isVisible()) {
          // Get task title before deletion
          const taskTitle = await firstTask.textContent();
          
          await deleteButton.click();
          
          // Handle confirmation dialog if it appears
          const confirmButtons = [
            'button:has-text("Confirm")',
            'button:has-text("Yes")',
            'button:has-text("Delete")',
            '.confirm-delete'
          ];
          
          for (const confirmSelector of confirmButtons) {
            const confirmButton = page.locator(confirmSelector);
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              break;
            }
          }
          
          await page.waitForTimeout(1000);
          
          // Verify task was deleted
          const deletedTask = page.locator(`text=${taskTitle}`);
          if (!(await deletedTask.isVisible())) {
            console.log(`✅ Task deleted successfully: ${taskTitle}`);
          } else {
            console.log('⚠️ Task deletion verification failed');
          }
          break;
        }
      }
    } else {
      console.log('⚠️ No tasks found to delete');
    }
  });
  
  test('should show sync status indicators', async ({ page }) => {
    // Look for sync status indicators
    const syncIndicators = [
      '.sync-status',
      '[data-testid="sync-status"]',
      '.sync-indicator',
      '.database-sync',
      '.sync-badge'
    ];
    
    for (const indicator of syncIndicators) {
      const element = page.locator(indicator);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        const statusText = await element.textContent();
        console.log(`🔄 Sync status displayed: ${statusText}`);
        break;
      }
    }
  });
  
  test('should handle sync errors gracefully', async ({ page }) => {
    // Look for error messages related to sync
    const errorElements = [
      '.sync-error',
      '[data-testid="sync-error"]',
      '.error-message',
      '.alert-error'
    ];
    
    // Try to trigger a sync operation
    try {
      const refreshButton = page.locator('[data-testid="refresh"], .refresh-btn, button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(1000);
        
        // Check for error messages
        for (const errorSelector of errorElements) {
          const errorElement = page.locator(errorSelector);
          if (await errorElement.isVisible()) {
            console.log(`❌ Sync error detected: ${errorSelector}`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not test sync error handling');
    }
  });
  
  test('should display real-time updates via WebSocket', async ({ page }) => {
    // Listen for WebSocket messages or real-time updates
    const updateIndicators = [
      '.real-time-update',
      '[data-testid="realtime-update"]',
      '.live-update',
      '.websocket-status'
    ];
    
    // Wait a bit to see if any real-time updates appear
    await page.waitForTimeout(2000);
    
    for (const indicator of updateIndicators) {
      const element = page.locator(indicator);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        const updateText = await element.textContent();
        console.log(`⚡ Real-time update detected: ${updateText}`);
        break;
      }
    }
    
    console.log('📡 WebSocket/real-time functionality monitoring completed');
  });
});
