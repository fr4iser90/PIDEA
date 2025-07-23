# Docs Tasks to Manual Tasks Refactor – Phase 1: Backend Service Refactoring

## Overview
Rename all backend services, handlers, and methods from "docs tasks" to "manual tasks" terminology. This phase focuses on the core backend infrastructure changes.

## Objectives
- [ ] Rename DocsImportService to ManualTasksImportService
- [ ] Rename DocsTasksHandler to ManualTasksHandler
- [ ] Update all method names (syncDocsTasks → syncManualTasks, cleanDocsTasks → cleanManualTasks)
- [ ] Update route handlers and comments
- [ ] Update service registrations and dependencies

## Deliverables
- File: `backend/domain/services/task/ManualTasksImportService.js` - Renamed from DocsImportService
- File: `backend/application/handlers/categories/workflow/ManualTasksHandler.js` - Renamed from DocsTasksHandler
- File: `backend/application/services/TaskApplicationService.js` - Updated method names
- File: `backend/presentation/api/TaskController.js` - Updated method names
- File: `backend/Application.js` - Updated route comments and method calls
- File: `backend/application/services/IDEApplicationService.js` - Updated handler reference

## Dependencies
- Requires: None (independent phase)
- Blocks: Phase 2 start (frontend refactoring)

## Estimated Time
3 hours

## Success Criteria
- [ ] All backend services renamed from "docs" to "manual"
- [ ] All method names updated consistently
- [ ] All imports and references updated
- [ ] Service registrations updated in DI container
- [ ] Route handlers updated with new naming
- [ ] No build errors introduced
- [ ] All backend tests pass

## Implementation Details

### 1. Service Renaming
```javascript
// DocsImportService.js → ManualTasksImportService.js
class ManualTasksImportService {
    // Update all method names and comments
    async importManualTasksFromWorkspace(projectId, workspacePath) {
        // Implementation remains the same, just renamed
    }
}

// DocsTasksHandler.js → ManualTasksHandler.js
class ManualTasksHandler {
    // Update all method names and comments
    async getManualTasks(req, res) {
        // Implementation remains the same, just renamed
    }
}
```

### 2. Method Renaming
```javascript
// TaskApplicationService.js
async syncManualTasks(projectId, userId) {
    // Renamed from syncDocsTasks
}

async cleanManualTasks(projectId, userId) {
    // Renamed from cleanDocsTasks
}

// TaskController.js
async syncManualTasks(req, res) {
    // Renamed from syncDocsTasks
}

async cleanManualTasks(req, res) {
    // Renamed from cleanDocsTasks
}
```

### 3. Route Updates
```javascript
// Application.js
// Update route comments and method calls
app.post('/api/projects/:projectId/tasks/sync-manual', 
    (req, res) => taskController.syncManualTasks(req, res));

app.post('/api/projects/:projectId/tasks/clean-manual', 
    (req, res) => taskController.cleanManualTasks(req, res));
```

### 4. Service Registration Updates
```javascript
// Update DI container registrations
this.serviceRegistry.register('manualTasksImportService', manualTasksImportService);
this.serviceRegistry.register('manualTasksHandler', manualTasksHandler);
```

## Testing Checklist
- [ ] Verify all renamed services load correctly
- [ ] Test API endpoints with new naming
- [ ] Verify service dependencies resolve correctly
- [ ] Test manual tasks sync functionality
- [ ] Test manual tasks cleanup functionality
- [ ] Verify error handling works with new naming
- [ ] Check that all imports resolve correctly

## Rollback Plan
- Git revert available for all changes
- No database changes to rollback
- Service rollback procedure documented

## Notes
- This phase maintains all existing functionality
- Only naming changes, no logic modifications
- All error handling patterns preserved
- Logging messages updated to reflect new naming 