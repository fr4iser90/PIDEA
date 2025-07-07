# Task 3: TaskController Enhancement (MEDIUM)

## Goal
Move docs-tasks endpoints from IDEController to TaskController and integrate with WorkflowOrchestrationService.

## Priority
🟡 **MEDIUM** - API organization and docs-tasks support

## Estimated Time
4-6 hours

## Dependencies
- Task 1 (ExecuteTaskCommand Implementation) - Required for docs task execution
- Task 2 (WorkflowOrchestrationService Integration) - Required for workflow execution

## Current Problem
- Docs-tasks endpoints are in IDEController (wrong place)
- TaskController missing docs-tasks support
- No proper API organization
- Docs-tasks cannot be executed through API

## Files to Modify

### 1. TaskController.js
**Path**: `backend/presentation/api/TaskController.js`
**Changes**: Add docs-tasks endpoints and WorkflowOrchestrationService integration
**Lines**: Add new methods

### 2. IDEController.js
**Path**: `backend/presentation/api/IDEController.js`
**Changes**: Remove docs-tasks endpoints
**Lines**: 649-714 (docs-tasks endpoints)

### 3. Application.js
**Path**: `backend/Application.js`
**Changes**: Update TaskController instantiation with WorkflowOrchestrationService
**Lines**: 554-630 (initializePresentationLayer)

## Implementation Details

### 1. TaskController.js Enhancement
```javascript
// backend/presentation/api/TaskController.js
class TaskController {
  constructor(workflowOrchestrationService, taskService, docsTasksHandler) {
    this.workflowOrchestrationService = workflowOrchestrationService;
    this.taskService = taskService;
    this.docsTasksHandler = docsTasksHandler;
  }

  // Existing task endpoints
  async getTasks(req, res) {
    // ... existing implementation
  }

  async getTask(req, res) {
    // ... existing implementation
  }

  async createTask(req, res) {
    // ... existing implementation
  }

  async updateTask(req, res) {
    // ... existing implementation
  }

  async deleteTask(req, res) {
    // ... existing implementation
  }

  // Updated executeTask method
  async executeTask(req, res) {
    try {
      const { taskId } = req.params;
      const options = req.body || {};

      const command = new ExecuteTaskCommand(this.workflowOrchestrationService, this.taskService.taskRepository);
      const result = await command.execute(taskId, options);

      res.json({
        success: true,
        result,
        message: `Task ${taskId} executed successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: `Failed to execute task ${req.params.taskId}`
      });
    }
  }

  // NEW: Docs-tasks endpoints
  async getDocsTasks(req, res) {
    try {
      await this.docsTasksHandler.getDocsTasks(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to get docs tasks'
      });
    }
  }

  async getDocsTaskDetails(req, res) {
    try {
      await this.docsTasksHandler.getDocsTaskDetails(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: `Failed to get docs task details for ${req.params.filename}`
      });
    }
  }

  async executeDocsTask(req, res) {
    try {
      const { filename } = req.params;
      const options = req.body || {};

      const command = new ExecuteDocsTaskCommand(this.workflowOrchestrationService, this.docsTasksHandler);
      const result = await command.execute(filename, options);

      res.json({
        success: true,
        result,
        message: `Docs task ${filename} executed successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: `Failed to execute docs task ${req.params.filename}`
      });
    }
  }
}

module.exports = TaskController;
```

### 2. IDEController.js Cleanup
```javascript
// backend/presentation/api/IDEController.js
// REMOVE these methods (lines 649-714):
// - getDocsTasks (lines 687-700)
// - getDocsTaskDetails (lines 701-714)
// - docs-tasks routes (lines 649-686)

// Keep only IDE-specific operations:
// - getAvailableIDEs()
// - startIDE()
// - switchIDE()
// - stopIDE()
// - getStatus()
// - setWorkspacePath()
// - detectWorkspacePaths()
// - terminal operations
```

### 3. Application.js TaskController Update
```javascript
// backend/Application.js - initializePresentationLayer()
async initializePresentationLayer() {
  // ... existing code ...

  // Update TaskController instantiation
  this.taskController = new TaskController(
    this.workflowOrchestrationService,
    this.taskService,
    this.docsTasksHandler
  );

  // ... rest of existing code ...
}
```

## API Routes

### Current Routes (to be moved from IDEController)
```
GET /api/docs-tasks
GET /api/docs-tasks/:filename
POST /api/docs-tasks/:filename/execute
```

### Updated Routes (in TaskController)
```
GET /api/tasks
GET /api/tasks/:taskId
POST /api/tasks
PUT /api/tasks/:taskId
DELETE /api/tasks/:taskId
POST /api/tasks/:taskId/execute
GET /api/docs-tasks
GET /api/docs-tasks/:filename
POST /api/docs-tasks/:filename/execute
```

## Integration Points

### 1. Application.js Routes
**Update**: Move docs-tasks routes from IDEController to TaskController
```javascript
// In setupRoutes()
// Remove from IDEController:
// app.get('/api/docs-tasks', this.ideController.getDocsTasks.bind(this.ideController));
// app.get('/api/docs-tasks/:filename', this.ideController.getDocsTaskDetails.bind(this.ideController));
// app.post('/api/docs-tasks/:filename/execute', this.ideController.executeDocsTask.bind(this.ideController));

// Add to TaskController:
app.get('/api/docs-tasks', this.taskController.getDocsTasks.bind(this.taskController));
app.get('/api/docs-tasks/:filename', this.taskController.getDocsTaskDetails.bind(this.taskController));
app.post('/api/docs-tasks/:filename/execute', this.taskController.executeDocsTask.bind(this.taskController));
```

### 2. Frontend Integration
**Update**: Frontend should use TaskController endpoints for docs-tasks
```javascript
// Update frontend API calls to use TaskController endpoints
// Instead of /api/docs-tasks, use /api/docs-tasks (same path, different controller)
```

## Testing Requirements

### Unit Tests
- [ ] TaskController.test.js
  - Test getDocsTasks endpoint
  - Test getDocsTaskDetails endpoint
  - Test executeDocsTask endpoint
  - Test error handling
  - Test WorkflowOrchestrationService integration

### Integration Tests
- [ ] API endpoint tests
- [ ] Frontend integration tests
- [ ] WorkflowOrchestrationService integration tests

## Success Criteria
- [ ] Docs-tasks endpoints moved to TaskController
- [ ] IDEController cleaned up (docs-tasks removed)
- [ ] TaskController has proper WorkflowOrchestrationService integration
- [ ] All docs-tasks API endpoints work
- [ ] Frontend can execute docs-tasks
- [ ] Proper error handling implemented
- [ ] All tests pass

## Risk Assessment
- **MEDIUM RISK**: API endpoint changes
- **LOW RISK**: Moving existing functionality
- **LOW RISK**: Frontend integration updates

## Next Steps
1. Add docs-tasks endpoints to TaskController
2. Remove docs-tasks endpoints from IDEController
3. Update Application.js routes
4. Update TaskController instantiation
5. Test API endpoints
6. Update frontend if needed

---

**Status**: Ready for Implementation
**Priority**: MEDIUM
**Blocked By**: Task 1, Task 2
**Blocks**: Task 4 (Architecture Cleanup) 