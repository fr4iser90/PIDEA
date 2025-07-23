# Docs Tasks to Manual Tasks Refactor – Phase 3: Test Files Refactoring

## Overview
Rename all test files and update test method names, descriptions, and assertions from "docs tasks" to "manual tasks" terminology. This phase ensures all tests work with the new naming.

## Objectives
- [ ] Rename test files with new naming convention
- [ ] Update test method names and descriptions
- [ ] Update mock data and assertions
- [ ] Ensure all tests pass after refactoring
- [ ] Update test imports and references

## Deliverables
- File: `backend/tests/unit/presentation/api/handlers/ManualTasksHandler.test.js` - Renamed from DocsTasksHandler.test.js
- File: `backend/tests/unit/presentation/api/TaskController.test.js` - Updated method names
- File: `frontend/tests/integration/ManualTasksIntegration.test.jsx` - Renamed from DocsTasksIntegration.test.jsx
- File: `frontend/tests/e2e/ManualTasksE2E.test.js` - Renamed from DocsTasksE2E.test.js

## Dependencies
- Requires: Phase 2 completion (frontend component refactoring)
- Blocks: Phase 4 start (documentation updates)

## Estimated Time
1 hour

## Success Criteria
- [ ] All test files renamed from "docs" to "manual"
- [ ] All test method names updated consistently
- [ ] All test descriptions updated
- [ ] All mock data updated with new naming
- [ ] All assertions updated
- [ ] All test imports resolved correctly
- [ ] All tests pass with new naming
- [ ] No test failures introduced

## Implementation Details

### 1. Backend Test File Renaming
```javascript
// DocsTasksHandler.test.js → ManualTasksHandler.test.js
const ManualTasksHandler = require('@api/handlers/ManualTasksHandler');

describe('ManualTasksHandler', () => {
    // Update all test descriptions
    it('should get manual tasks successfully', async () => {
        // Update test implementation
    });

    it('should handle manual tasks sync', async () => {
        // Update test implementation
    });
});
```

### 2. TaskController Test Updates
```javascript
// TaskController.test.js
describe('TaskController', () => {
    it('should sync manual tasks successfully', async () => {
        // Renamed from syncDocsTasks
        const result = await taskController.syncManualTasks(req, res);
        expect(result).toBeDefined();
    });

    it('should clean manual tasks successfully', async () => {
        // Renamed from cleanDocsTasks
        const result = await taskController.cleanManualTasks(req, res);
        expect(result).toBeDefined();
    });
});
```

### 3. Frontend Integration Test Updates
```javascript
// DocsTasksIntegration.test.jsx → ManualTasksIntegration.test.jsx
import ManualTaskDetailsModal from '../../src/presentation/components/chat/modal/ManualTaskDetailsModal';

describe('ManualTasksIntegration', () => {
    it('should display manual task details modal', () => {
        // Update test implementation
    });

    it('should sync manual tasks from API', async () => {
        // Update test implementation
    });
});
```

### 4. E2E Test Updates
```javascript
// DocsTasksE2E.test.js → ManualTasksE2E.test.js
describe('Manual Tasks E2E', () => {
    it('should sync manual tasks from workspace', async () => {
        // Update test selectors
        const taskElements = document.querySelectorAll('.manual-task-item');
        // Update test implementation
    });

    it('should display manual task modal', async () => {
        // Update test selectors
        await page.waitForSelector('.manual-task-modal', { timeout: 5000 });
        // Update test implementation
    });
});
```

### 5. Mock Data Updates
```javascript
// Update all mock data to use new naming
const mockManualTask = {
    id: '1',
    title: 'Test Manual Task',
    content: 'This is a test manual task',
    type: 'manual',
    // ... other properties
};

const mockManualTasksResponse = {
    success: true,
    data: [mockManualTask],
    count: 1
};
```

## Testing Checklist
- [ ] Verify all renamed test files load correctly
- [ ] Test backend unit tests with new naming
- [ ] Test frontend integration tests with new naming
- [ ] Test E2E tests with new naming
- [ ] Verify all test imports resolve correctly
- [ ] Verify all mock data is updated
- [ ] Verify all assertions use new naming
- [ ] Run full test suite to ensure no failures
- [ ] Check test coverage remains the same

## Rollback Plan
- Git revert available for all changes
- No database changes to rollback
- Test rollback procedure documented

## Notes
- This phase maintains all existing test coverage
- Only naming changes, no test logic modifications
- All test patterns and assertions preserved
- Mock data updated systematically
- Test descriptions updated for clarity 