import { test, expect } from '@playwright/test';

test.describe('Task Creation Modal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app-container"]');
  });

  test('complete task creation workflow - happy path', async ({ page }) => {
    // Step 1: Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Verify modal is open
    await expect(page.locator('[data-testid="task-create-modal"]')).toBeVisible();
    await expect(page.locator('text=🚀 Create New Task')).toBeVisible();

    // Step 2: Fill out the form
    await page.fill('[data-testid="task-title-input"]', 'Create User Authentication System');
    await page.fill('[data-testid="task-description-input"]', 
      'Implement JWT-based authentication with login/logout functionality, password reset, and user profile management');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'high');
    await page.fill('[data-testid="task-category-input"]', 'security');
    await page.fill('[data-testid="task-estimated-time-input"]', '4');

    // Step 3: Submit the form
    await page.click('[data-testid="create-task-submit-button"]');

    // Step 4: Verify progress tracking starts
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();
    await expect(page.locator('text=Initializing Workflow')).toBeVisible();
    await expect(page.locator('text=0% Complete')).toBeVisible();

    // Step 5: Wait for progress updates
    await expect(page.locator('text=AI Planning & Analysis')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=20% Complete')).toBeVisible();

    // Step 6: Wait for implementation step
    await expect(page.locator('text=Implementation')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=50% Complete')).toBeVisible();

    // Step 7: Wait for testing step
    await expect(page.locator('text=Testing & Validation')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=80% Complete')).toBeVisible();

    // Step 8: Wait for deployment step
    await expect(page.locator('text=Deployment & Cleanup')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=95% Complete')).toBeVisible();

    // Step 9: Wait for completion
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=100% Complete')).toBeVisible();

    // Step 10: Verify completion message
    await expect(page.locator('text=✅ Task Processing Complete')).toBeVisible();
    await expect(page.locator('text=Your task has been processed successfully')).toBeVisible();

    // Step 11: Close the modal
    await page.click('[data-testid="modal-close-button"]');
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="task-create-modal"]')).not.toBeVisible();
  });

  test('form validation - required fields', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Try to submit empty form
    await page.click('[data-testid="create-task-submit-button"]');

    // Verify validation errors
    await expect(page.locator('text=Task title is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
    await expect(page.locator('text=Task type is required')).toBeVisible();
    await expect(page.locator('text=Priority is required')).toBeVisible();

    // Fill required fields
    await page.fill('[data-testid="task-title-input"]', 'Test Task');
    await page.fill('[data-testid="task-description-input"]', 'Test description');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');

    // Submit again
    await page.click('[data-testid="create-task-submit-button"]');

    // Verify no validation errors
    await expect(page.locator('text=Task title is required')).not.toBeVisible();
    await expect(page.locator('text=Description is required')).not.toBeVisible();
  });

  test('form validation - field length limits', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Test title length limit
    const longTitle = 'A'.repeat(101);
    await page.fill('[data-testid="task-title-input"]', longTitle);
    await page.click('[data-testid="create-task-submit-button"]');
    
    await expect(page.locator('text=Task title must be less than 100 characters')).toBeVisible();

    // Test description length limit
    const longDescription = 'A'.repeat(1001);
    await page.fill('[data-testid="task-description-input"]', longDescription);
    await page.click('[data-testid="create-task-submit-button"]');
    
    await expect(page.locator('text=Description must be less than 1000 characters')).toBeVisible();

    // Test estimated time format
    await page.fill('[data-testid="task-estimated-time-input"]', 'invalid');
    await page.click('[data-testid="create-task-submit-button"]');
    
    await expect(page.locator('text=Estimated time must be a valid number')).toBeVisible();
  });

  test('modal accessibility and keyboard navigation', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="task-title-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="task-description-input"]')).toBeFocused();
    
    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="task-create-modal"]')).not.toBeVisible();
  });

  test('modal overlay and click outside behavior', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Click outside modal (on overlay)
    await page.click('[data-testid="modal-overlay"]');
    
    // Verify modal closes
    await expect(page.locator('[data-testid="task-create-modal"]')).not.toBeVisible();
  });

  test('workflow cancellation during execution', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Fill and submit form
    await page.fill('[data-testid="task-title-input"]', 'Cancellation Test');
    await page.fill('[data-testid="task-description-input"]', 'Test workflow cancellation');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');
    await page.click('[data-testid="create-task-submit-button"]');

    // Wait for progress to start
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();

    // Try to close modal during execution
    await page.click('[data-testid="modal-close-button"]');

    // Verify confirmation dialog appears
    await expect(page.locator('text=Task execution is in progress')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to close?')).toBeVisible();

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancellation-button"]');

    // Verify workflow is cancelled
    await expect(page.locator('text=Task creation was cancelled')).toBeVisible();
  });

  test('error handling and retry functionality', async ({ page }) => {
    // Mock API error by intercepting network requests
    await page.route('**/api/projects/*/auto-finish/process', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Fill and submit form
    await page.fill('[data-testid="task-title-input"]', 'Error Test');
    await page.fill('[data-testid="task-description-input"]', 'Test error handling');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');
    await page.click('[data-testid="create-task-submit-button"]');

    // Verify error message
    await expect(page.locator('text=Internal server error')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Mock successful response for retry
    await page.route('**/api/projects/*/auto-finish/process', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          workflowId: 'retry-test-123',
          success: true,
          status: 'started'
        })
      });
    });

    // Click retry
    await page.click('[data-testid="retry-button"]');

    // Verify retry was successful
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();
  });

  test('responsive design on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Verify modal is responsive
    await expect(page.locator('[data-testid="task-create-modal"]')).toBeVisible();
    
    // Check form elements are properly sized
    const titleInput = page.locator('[data-testid="task-title-input"]');
    const titleInputBox = await titleInput.boundingBox();
    expect(titleInputBox.width).toBeLessThan(350); // Should fit mobile screen
    
    // Test form interaction on mobile
    await page.fill('[data-testid="task-title-input"]', 'Mobile Test');
    await page.fill('[data-testid="task-description-input"]', 'Test mobile responsiveness');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');
    
    // Submit on mobile
    await page.click('[data-testid="create-task-submit-button"]');
    
    // Verify progress works on mobile
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();
  });

  test('task review modal functionality', async ({ page }) => {
    // Mock review data
    await page.route('**/api/tasks/review', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviewData: {
            title: 'Review Test Task',
            description: 'Test task for review',
            type: 'feature',
            priority: 'high',
            category: 'frontend',
            estimatedTime: 2,
            suggestedChanges: [
              'Consider adding error handling',
              'Include unit tests'
            ]
          }
        })
      });
    });

    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Fill form
    await page.fill('[data-testid="task-title-input"]', 'Review Test Task');
    await page.fill('[data-testid="task-description-input"]', 'Test task for review');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'high');
    await page.fill('[data-testid="task-category-input"]', 'frontend');
    await page.fill('[data-testid="task-estimated-time-input"]', '2');
    
    // Submit form
    await page.click('[data-testid="create-task-submit-button"]');

    // Verify review modal appears
    await expect(page.locator('[data-testid="task-review-modal"]')).toBeVisible();
    await expect(page.locator('text=Review Task Details')).toBeVisible();

    // Verify review data is displayed
    await expect(page.locator('text=Review Test Task')).toBeVisible();
    await expect(page.locator('text=Test task for review')).toBeVisible();
    await expect(page.locator('text=Consider adding error handling')).toBeVisible();

    // Test review actions
    await page.click('[data-testid="execute-task-button"]');

    // Verify workflow starts after review
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();
  });

  test('performance and loading states', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Verify loading state during form submission
    await page.fill('[data-testid="task-title-input"]', 'Performance Test');
    await page.fill('[data-testid="task-description-input"]', 'Test performance');
    await page.selectOption('[data-testid="task-type-select"]', 'feature');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');
    
    // Submit and check loading state
    await page.click('[data-testid="create-task-submit-button"]');
    
    // Verify submit button shows loading state
    await expect(page.locator('[data-testid="create-task-submit-button"]')).toBeDisabled();
    await expect(page.locator('text=Creating...')).toBeVisible();

    // Wait for progress to start
    await expect(page.locator('[data-testid="task-workflow-progress"]')).toBeVisible();
  });

  test('data persistence across modal reopens', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Fill form partially
    await page.fill('[data-testid="task-title-input"]', 'Persistence Test');
    await page.fill('[data-testid="task-description-input"]', 'Test data persistence');
    await page.selectOption('[data-testid="task-type-select"]', 'bugfix');
    
    // Close modal
    await page.click('[data-testid="modal-close-button"]');
    
    // Reopen modal
    await page.click('[data-testid="create-task-button"]');
    
    // Verify data is preserved
    await expect(page.locator('[data-testid="task-title-input"]')).toHaveValue('Persistence Test');
    await expect(page.locator('[data-testid="task-description-input"]')).toHaveValue('Test data persistence');
    await expect(page.locator('[data-testid="task-type-select"]')).toHaveValue('bugfix');
  });

  test('accessibility compliance', async ({ page }) => {
    // Open task creation modal
    await page.click('[data-testid="create-task-button"]');
    
    // Check ARIA labels
    await expect(page.locator('[data-testid="task-title-input"]')).toHaveAttribute('aria-label', 'Task Title');
    await expect(page.locator('[data-testid="task-description-input"]')).toHaveAttribute('aria-label', 'Description');
    await expect(page.locator('[data-testid="task-type-select"]')).toHaveAttribute('aria-label', 'Task Type');
    await expect(page.locator('[data-testid="task-priority-select"]')).toHaveAttribute('aria-label', 'Priority');
    
    // Check focus management
    await expect(page.locator('[data-testid="task-title-input"]')).toBeFocused();
    
    // Test screen reader support
    await expect(page.locator('[data-testid="task-create-modal"]')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('[data-testid="task-create-modal"]')).toHaveAttribute('aria-labelledby');
  });
}); 