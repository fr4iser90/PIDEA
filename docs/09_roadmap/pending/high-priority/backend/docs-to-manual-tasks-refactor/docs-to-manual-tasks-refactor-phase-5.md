# Docs Tasks to Manual Tasks Refactor – Phase 5: Integration Testing

## Overview
Perform comprehensive integration testing to verify all manual tasks functionality works correctly with the new naming. This phase ensures the entire system works end-to-end after the refactoring.

## Objectives
- [ ] Test manual tasks sync functionality
- [ ] Test manual tasks cleanup functionality
- [ ] Test manual task details modal
- [ ] Verify all UI elements display correctly
- [ ] Test API endpoints with new naming
- [ ] Verify end-to-end workflows

## Deliverables
- Test: Manual tasks sync functionality verification
- Test: Manual tasks cleanup functionality verification
- Test: Manual task details modal verification
- Test: UI elements display verification
- Test: API endpoints verification
- Test: End-to-end workflow verification

## Dependencies
- Requires: Phase 4 completion (documentation updates)
- Blocks: Task completion

## Estimated Time
1 hour

## Success Criteria
- [ ] Manual tasks sync works correctly
- [ ] Manual tasks cleanup works correctly
- [ ] Manual task details modal displays correctly
- [ ] All UI elements show correct terminology
- [ ] All API endpoints respond correctly
- [ ] End-to-end workflows function properly
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] All functionality preserved

## Implementation Details

### 1. Manual Tasks Sync Testing
```javascript
// Test manual tasks sync functionality
describe('Manual Tasks Sync', () => {
    it('should sync manual tasks from workspace', async () => {
        // Test the sync functionality
        const response = await api.syncManualTasks();
        expect(response.success).toBe(true);
        expect(response.data.importedCount).toBeGreaterThan(0);
    });

    it('should handle sync errors gracefully', async () => {
        // Test error handling
        // Implementation for error testing
    });
});
```

### 2. Manual Tasks Cleanup Testing
```javascript
// Test manual tasks cleanup functionality
describe('Manual Tasks Cleanup', () => {
    it('should clean manual tasks from database', async () => {
        // Test the cleanup functionality
        const response = await api.cleanManualTasks();
        expect(response.success).toBe(true);
        expect(response.data.deletedCount).toBeGreaterThan(0);
    });

    it('should handle cleanup errors gracefully', async () => {
        // Test error handling
        // Implementation for error testing
    });
});
```

### 3. Manual Task Details Modal Testing
```javascript
// Test manual task details modal
describe('Manual Task Details Modal', () => {
    it('should display manual task details correctly', async () => {
        // Test modal display
        await page.click('.manual-task-item');
        await page.waitForSelector('.manual-task-modal');
        expect(await page.isVisible('.manual-task-modal')).toBe(true);
    });

    it('should close modal correctly', async () => {
        // Test modal closing
        await page.click('.manual-task-modal-overlay');
        expect(await page.isVisible('.manual-task-modal')).toBe(false);
    });
});
```

### 4. UI Elements Testing
```javascript
// Test UI elements display
describe('UI Elements', () => {
    it('should display correct terminology', async () => {
        // Verify all text shows "manual tasks" instead of "docs tasks"
        const syncButton = await page.locator('button:has-text("Sync")');
        expect(await syncButton.isVisible()).toBe(true);
    });

    it('should show correct feedback messages', async () => {
        // Test feedback messages
        // Implementation for feedback testing
    });
});
```

### 5. API Endpoints Testing
```javascript
// Test API endpoints
describe('API Endpoints', () => {
    it('should respond to sync-manual endpoint', async () => {
        const response = await fetch('/api/projects/test/tasks/sync-manual', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer token' }
        });
        expect(response.status).toBe(200);
    });

    it('should respond to clean-manual endpoint', async () => {
        const response = await fetch('/api/projects/test/tasks/clean-manual', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer token' }
        });
        expect(response.status).toBe(200);
    });
});
```

### 6. End-to-End Workflow Testing
```javascript
// Test complete workflows
describe('End-to-End Workflows', () => {
    it('should complete manual task sync workflow', async () => {
        // Test complete sync workflow
        // 1. Click sync button
        // 2. Wait for sync completion
        // 3. Verify tasks appear in list
        // 4. Click on task to open modal
        // 5. Verify modal displays correctly
    });

    it('should complete manual task cleanup workflow', async () => {
        // Test complete cleanup workflow
        // 1. Click clean button
        // 2. Confirm cleanup dialog
        // 3. Wait for cleanup completion
        // 4. Verify tasks removed from list
    });
});
```

## Testing Checklist
- [ ] Manual tasks sync functionality works
- [ ] Manual tasks cleanup functionality works
- [ ] Manual task details modal displays correctly
- [ ] All UI elements show correct terminology
- [ ] All API endpoints respond correctly
- [ ] End-to-end workflows function properly
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] All functionality preserved
- [ ] Performance is maintained
- [ ] Error handling works correctly
- [ ] User experience is improved

## Rollback Plan
- Git revert available for all changes
- No database changes to rollback
- Integration testing rollback procedure documented

## Notes
- This phase validates the complete refactoring
- All functionality should work exactly as before
- Only terminology should be changed
- Performance should be maintained
- User experience should be improved with clearer naming 