/**
 * Queue History E2E Tests
 * Comprehensive end-to-end tests for queue history functionality
 * Tests navigation, filtering, search, real-time updates, and workflow type detection
 */

import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from '../setup.js';

test.describe('Queue History E2E Tests', () => {
    let testProjectId;
    let testTaskId;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Set up test environment
        const setup = await setupTestEnvironment(page);
        testProjectId = setup.projectId;
        
        // Create a test task for history
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Create a test task that will complete
        await page.click('[data-testid="create-task-button"]');
        await page.fill('[data-testid="task-name-input"]', 'E2E Test Task for History');
        await page.selectOption('[data-testid="workflow-type-select"]', 'documentation');
        await page.click('[data-testid="submit-task-button"]');
        
        // Wait for task to be created and get its ID
        await page.waitForSelector('[data-testid="active-task-item"]');
        testTaskId = await page.getAttribute('[data-testid="active-task-item"]', 'data-task-id');
        
        await context.close();
    });

    test.afterAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await cleanupTestEnvironment(page, testProjectId);
        await context.close();
    });

    test('should navigate to queue history tab', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Click on history tab
        await page.click('[data-testid="queue-tab-history"]');
        
        // Verify history panel is displayed
        await expect(page.locator('[data-testid="queue-history-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="queue-history-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="queue-history-content"]')).toBeVisible();
    });

    test('should display queue history statistics', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-statistics"]');
        
        // Verify statistics are displayed
        await expect(page.locator('[data-testid="stat-total"]')).toBeVisible();
        await expect(page.locator('[data-testid="stat-completed"]')).toBeVisible();
        await expect(page.locator('[data-testid="stat-failed"]')).toBeVisible();
        await expect(page.locator('[data-testid="stat-cancelled"]')).toBeVisible();
        
        // Verify statistics have numeric values
        const totalValue = await page.locator('[data-testid="stat-total"] .stat-value').textContent();
        expect(parseInt(totalValue)).toBeGreaterThanOrEqual(0);
    });

    test('should filter queue history by status', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-filters"]');
        
        // Filter by completed status
        await page.selectOption('[data-testid="status-filter"]', 'completed');
        await page.click('[data-testid="apply-filters-button"]');
        
        // Verify only completed items are shown
        const historyItems = page.locator('[data-testid="history-item"]');
        const itemCount = await historyItems.count();
        
        for (let i = 0; i < itemCount; i++) {
            const status = await historyItems.nth(i).locator('[data-testid="status-badge"]').textContent();
            expect(status.toLowerCase()).toContain('completed');
        }
    });

    test('should filter queue history by date range', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-filters"]');
        
        // Set date range for last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        await page.fill('[data-testid="date-from-input"]', sevenDaysAgo.toISOString().split('T')[0]);
        await page.fill('[data-testid="date-to-input"]', today.toISOString().split('T')[0]);
        await page.click('[data-testid="apply-filters-button"]');
        
        // Verify items are within date range
        const historyItems = page.locator('[data-testid="history-item"]');
        const itemCount = await historyItems.count();
        
        for (let i = 0; i < itemCount; i++) {
            const dateText = await historyItems.nth(i).locator('[data-testid="history-item-date"]').textContent();
            const itemDate = new Date(dateText);
            expect(itemDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
            expect(itemDate.getTime()).toBeLessThanOrEqual(today.getTime());
        }
    });

    test('should search queue history by task name', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-filters"]');
        
        // Search for test task
        await page.fill('[data-testid="search-input"]', 'E2E Test Task');
        await page.click('[data-testid="search-button"]');
        
        // Verify search results
        const historyItems = page.locator('[data-testid="history-item"]');
        const itemCount = await historyItems.count();
        expect(itemCount).toBeGreaterThan(0);
        
        // Verify all results contain search term
        for (let i = 0; i < itemCount; i++) {
            const taskName = await historyItems.nth(i).locator('[data-testid="history-item-name"]').textContent();
            expect(taskName.toLowerCase()).toContain('e2e test task');
        }
    });

    test('should display workflow type badges in history', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-content"]');
        
        // Wait for history items to load
        await page.waitForSelector('[data-testid="history-item"]', { timeout: 10000 });
        
        // Verify workflow type badges are displayed
        const workflowTypeBadges = page.locator('[data-testid="workflow-type-badge"]');
        const badgeCount = await workflowTypeBadges.count();
        expect(badgeCount).toBeGreaterThan(0);
        
        // Verify badge content
        for (let i = 0; i < badgeCount; i++) {
            const badge = workflowTypeBadges.nth(i);
            await expect(badge).toBeVisible();
            
            const type = await badge.getAttribute('data-type');
            expect(type).toBeTruthy();
            
            const confidence = await badge.getAttribute('data-confidence');
            expect(parseFloat(confidence)).toBeGreaterThan(0);
        }
    });

    test('should expand and collapse history item details', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="history-item"]');
        
        // Click on first history item to expand
        const firstItem = page.locator('[data-testid="history-item"]').first();
        await firstItem.click();
        
        // Verify details are expanded
        await expect(firstItem.locator('[data-testid="history-item-expanded"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="history-item-metadata"]')).toBeVisible();
        
        // Click again to collapse
        await firstItem.click();
        
        // Verify details are collapsed
        await expect(firstItem.locator('[data-testid="history-item-expanded"]')).not.toBeVisible();
    });

    test('should paginate through queue history', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-pagination"]');
        
        // Check if pagination controls are present
        const paginationInfo = page.locator('[data-testid="pagination-info"]');
        await expect(paginationInfo).toBeVisible();
        
        // Try to navigate to next page if available
        const nextButton = page.locator('[data-testid="pagination-next"]');
        if (await nextButton.isVisible()) {
            await nextButton.click();
            
            // Verify page changed
            const currentPage = await page.locator('[data-testid="pagination-current"]').textContent();
            expect(parseInt(currentPage)).toBe(2);
        }
    });

    test('should export queue history', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-actions"]');
        
        // Click export button
        await page.click('[data-testid="export-history-button"]');
        
        // Verify download starts (this is a basic check)
        // In a real scenario, you'd verify the actual file download
        await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible();
    });

    test('should clear queue history', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        await page.waitForSelector('[data-testid="queue-history-actions"]');
        
        // Get initial count
        const initialCount = await page.locator('[data-testid="history-item"]').count();
        
        if (initialCount > 0) {
            // Click clear history button
            await page.click('[data-testid="clear-history-button"]');
            
            // Confirm clear action
            await page.click('[data-testid="confirm-clear-button"]');
            
            // Verify history is cleared
            await expect(page.locator('[data-testid="no-history-message"]')).toBeVisible();
        }
    });

    test('should handle real-time updates in active tasks', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Create a new task for real-time testing
        await page.click('[data-testid="create-task-button"]');
        await page.fill('[data-testid="task-name-input"]', 'Real-time Test Task');
        await page.selectOption('[data-testid="workflow-type-select"]', 'testing');
        await page.click('[data-testid="submit-task-button"]');
        
        // Wait for task to appear in active tasks
        await page.waitForSelector('[data-testid="active-task-item"]');
        
        // Select the task to view step progress
        await page.click('[data-testid="active-task-item"]');
        
        // Verify step timeline is displayed with real-time updates
        await expect(page.locator('[data-testid="step-timeline"]')).toBeVisible();
        await expect(page.locator('[data-testid="overall-progress"]')).toBeVisible();
        
        // Wait for real-time updates (this would require actual task execution)
        // In a real scenario, you'd verify the progress updates over time
        await page.waitForTimeout(2000);
        
        // Verify workflow type badge is displayed in step timeline
        await expect(page.locator('[data-testid="workflow-type-badge"]')).toBeVisible();
    });

    test('should display workflow type badges in active tasks', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Wait for active tasks to load
        await page.waitForSelector('[data-testid="active-task-item"]', { timeout: 10000 });
        
        // Verify workflow type badges are displayed in active tasks
        const workflowTypeBadges = page.locator('[data-testid="workflow-type-badge"]');
        const badgeCount = await workflowTypeBadges.count();
        
        if (badgeCount > 0) {
            // Verify badge content
            for (let i = 0; i < badgeCount; i++) {
                const badge = workflowTypeBadges.nth(i);
                await expect(badge).toBeVisible();
                
                const type = await badge.getAttribute('data-type');
                expect(type).toBeTruthy();
                
                const confidence = await badge.getAttribute('data-confidence');
                expect(parseFloat(confidence)).toBeGreaterThan(0);
            }
        }
    });

    test('should handle error states gracefully', async ({ page }) => {
        await page.goto(`http://localhost:3000/projects/${testProjectId}`);
        await page.waitForSelector('[data-testid="queue-management-panel"]');
        
        // Navigate to history tab
        await page.click('[data-testid="queue-tab-history"]');
        
        // Simulate network error by intercepting API calls
        await page.route('**/api/projects/*/queue/history**', route => {
            route.abort('failed');
        });
        
        // Trigger a refresh or filter action
        await page.click('[data-testid="apply-filters-button"]');
        
        // Verify error message is displayed
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        
        // Verify retry functionality
        await page.click('[data-testid="retry-button"]');
        
        // Restore normal network behavior
        await page.unroute('**/api/projects/*/queue/history**');
        
        // Verify normal functionality resumes
        await expect(page.locator('[data-testid="queue-history-content"]')).toBeVisible();
    });
}); 