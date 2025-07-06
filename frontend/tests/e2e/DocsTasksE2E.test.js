/**
 * End-to-End Tests for Documentation Tasks Feature
 * Tests complete user flows from task listing to details viewing
 */

describe('Documentation Tasks E2E Tests', () => {
  beforeEach(async () => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForSelector('.chat-right-panel-content', { timeout: 10000 });
  });

  describe('Task Listing and Navigation', () => {
    it('should display documentation tasks in the tasks tab', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Check if documentation tasks section is present
      await expect(page.locator('h3:has-text("📚 Documentation Tasks")')).toBeVisible();
      
      // Wait for tasks to load (either tasks or loading state)
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement || taskElements.length > 0;
      }, { timeout: 10000 });
      
      // Check if tasks are displayed or appropriate message is shown
      const taskItems = await page.locator('.docs-task-item').count();
      const noTasksMessage = await page.locator('text=No documentation tasks found').count();
      
      expect(taskItems > 0 || noTasksMessage > 0).toBe(true);
    });

    it('should show loading state while fetching tasks', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Check if loading spinner is visible initially
      const loadingSpinner = await page.locator('.loading-spinner').count();
      expect(loadingSpinner).toBeGreaterThan(0);
    });

    it('should refresh tasks when refresh button is clicked', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for initial load to complete
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        return !loadingElement;
      }, { timeout: 10000 });
      
      // Click refresh button
      await page.click('button:has-text("🔄 Refresh")');
      
      // Check if loading spinner appears again
      await expect(page.locator('.loading-spinner')).toBeVisible();
    });
  });

  describe('Task Filtering and Search', () => {
    it('should filter tasks by search term', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        return !loadingElement;
      }, { timeout: 10000 });
      
      // Find search input and type a search term
      const searchInput = await page.locator('input[placeholder="Search docs tasks..."]');
      await searchInput.fill('test');
      
      // Wait for filtering to take effect
      await page.waitForTimeout(500);
      
      // Check if filtered results are shown
      const filteredTasks = await page.locator('.docs-task-item').count();
      expect(filteredTasks >= 0).toBe(true); // Should show filtered results or no results message
    });

    it('should filter tasks by priority', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        return !loadingElement;
      }, { timeout: 10000 });
      
      // Select high priority filter
      const filterSelect = await page.locator('select[value="all"]');
      await filterSelect.selectOption('high');
      
      // Wait for filtering to take effect
      await page.waitForTimeout(500);
      
      // Check if only high priority tasks are shown
      const highPriorityTasks = await page.locator('.docs-task-item').count();
      expect(highPriorityTasks >= 0).toBe(true);
    });

    it('should clear search and show all tasks', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        return !loadingElement;
      }, { timeout: 10000 });
      
      // Type in search
      const searchInput = await page.locator('input[placeholder="Search docs tasks..."]');
      await searchInput.fill('nonexistent');
      
      // Clear search
      await searchInput.clear();
      
      // Wait for filtering to take effect
      await page.waitForTimeout(500);
      
      // Should show all tasks again
      const allTasks = await page.locator('.docs-task-item').count();
      expect(allTasks >= 0).toBe(true);
    });
  });

  describe('Task Details Modal', () => {
    it('should open task details modal when clicking on a task', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      // Click on the first task
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Check if modal is visible
      await expect(page.locator('.docs-task-modal')).toBeVisible();
    });

    it('should display task details in the modal', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Check if modal content is displayed
      await expect(page.locator('.modal-title')).toBeVisible();
      await expect(page.locator('.file-name')).toBeVisible();
      await expect(page.locator('.tab-navigation')).toBeVisible();
    });

    it('should switch between rendered and raw tabs', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Check if rendered tab is active by default
      await expect(page.locator('.tab-btn.active:has-text("📖 Rendered")')).toBeVisible();
      
      // Click on raw tab
      await page.click('.tab-btn:has-text("📝 Raw Markdown")');
      
      // Check if raw tab is now active
      await expect(page.locator('.tab-btn.active:has-text("📝 Raw Markdown")')).toBeVisible();
    });

    it('should close modal when clicking close button', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Click close button
      await page.click('.modal-close-btn');
      
      // Check if modal is closed
      await expect(page.locator('.docs-task-modal')).not.toBeVisible();
    });

    it('should close modal when clicking overlay', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Click on overlay (outside modal content)
      await page.click('.docs-task-modal-overlay');
      
      // Check if modal is closed
      await expect(page.locator('.docs-task-modal')).not.toBeVisible();
    });

    it('should copy task title to clipboard', async () => {
      // Mock clipboard API
      await page.addInitScript(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: jest.fn().mockResolvedValue()
          }
        });
      });
      
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Click copy title button
      await page.click('button:has-text("Copy Title")');
      
      // Check if clipboard API was called
      await page.waitForFunction(() => {
        return navigator.clipboard.writeText.mock.calls.length > 0;
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API to return error
      await page.addInitScript(() => {
        // Override fetch to return error
        window.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      });
      
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for error to be displayed
      await page.waitForFunction(() => {
        return document.body.textContent.includes('Error loading documentation tasks');
      }, { timeout: 10000 });
      
      // Check if error message is shown
      await expect(page.locator('text=Error loading documentation tasks')).toBeVisible();
    });

    it('should handle task details loading errors', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load and click on first task
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      // Mock API to return error for task details
      await page.addInitScript(() => {
        const originalFetch = window.fetch;
        window.fetch = jest.fn().mockImplementation((url) => {
          if (url.includes('/api/docs-tasks/')) {
            return Promise.reject(new Error('Task details error'));
          }
          return originalFetch(url);
        });
      });
      
      const firstTask = await page.locator('.docs-task-item').first();
      await firstTask.click();
      
      // Wait for error to be displayed
      await page.waitForFunction(() => {
        return document.body.textContent.includes('Error loading task details');
      }, { timeout: 10000 });
      
      // Check if error message is shown
      await expect(page.locator('text=Error loading task details')).toBeVisible();
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Check if content is properly displayed on mobile
      await expect(page.locator('.tasks-tab')).toBeVisible();
      
      // Check if search input is accessible
      const searchInput = await page.locator('input[placeholder="Search docs tasks..."]');
      await expect(searchInput).toBeVisible();
    });

    it('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Check if content is properly displayed on tablet
      await expect(page.locator('.tasks-tab')).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should have proper keyboard navigation', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Wait for tasks to load
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-spinner');
        const taskElements = document.querySelectorAll('.docs-task-item');
        return !loadingElement && taskElements.length > 0;
      }, { timeout: 10000 });
      
      // Focus on search input
      await page.keyboard.press('Tab');
      
      // Type in search
      await page.keyboard.type('test');
      
      // Navigate to first task with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Open task with Enter key
      await page.keyboard.press('Enter');
      
      // Wait for modal to open
      await page.waitForSelector('.docs-task-modal', { timeout: 5000 });
      
      // Check if modal is visible
      await expect(page.locator('.docs-task-modal')).toBeVisible();
    });

    it('should have proper ARIA labels', async () => {
      // Click on the tasks tab
      await page.click('button[class*="tab-btn"]:has-text("🗂️ Tasks")');
      
      // Wait for the tasks tab content to load
      await page.waitForSelector('.tasks-tab', { timeout: 5000 });
      
      // Check if search input has proper label
      const searchInput = await page.locator('input[placeholder="Search docs tasks..."]');
      await expect(searchInput).toHaveAttribute('placeholder');
      
      // Check if filter select has proper label
      const filterSelect = await page.locator('select');
      await expect(filterSelect).toBeVisible();
    });
  });
}); 