# Task 2: WorkflowOrchestrationService Integration (HOCH)

## Goal
Integrate WorkflowOrchestrationService as the central workflow coordinator and update all services to use it.

## Priority
🟡 **HIGH** - Architecture improvement, enables proper workflow orchestration

## Estimated Time
6-8 hours

## Dependencies
- Task 1 (ExecuteTaskCommand Implementation) - Can be done in parallel

## Current Problem
- WorkflowOrchestrationService exists but is not used anywhere
- Not registered in Application.js DI container
- TaskService has duplicate workflow logic
- TaskExecutionService is redundant
- No central workflow coordination

## Files to Modify

### 1. Application.js
**Path**: `backend/Application.js`
**Changes**: Register WorkflowOrchestrationService in DI container
**Lines**: 228-280 (initializeInfrastructure method)

### 2. TaskService.js
**Path**: `backend/domain/services/TaskService.js`
**Changes**: Update to use WorkflowOrchestrationService
**Lines**: 200-400 (executeTask method)

### 3. TaskExecutionService.js
**Path**: `backend/domain/services/TaskExecutionService.js`
**Changes**: Merge with WorkflowOrchestrationService or remove
**Lines**: 34-148 (executeTask method)

## Implementation Details

### 1. Application.js DI Registration
```javascript
// backend/Application.js - initializeInfrastructure()
async initializeInfrastructure() {
  // ... existing code ...

  // Register WorkflowOrchestrationService
  this.serviceRegistry.registerSingleton('workflowOrchestrationService', () => {
    return new WorkflowOrchestrationService({
      workflowGitService: this.serviceRegistry.getService('workflowGitService'),
      cursorIDEService: this.serviceRegistry.getService('cursorIDEService'),
      autoFinishSystem: this.autoFinishSystem,
      taskRepository: this.serviceRegistry.getService('taskRepository'),
      logger: this.logger,
      eventBus: this.eventBus
    });
  });

  // ... rest of existing code ...
}
```

### 2. TaskService.js Update
```javascript
// backend/domain/services/TaskService.js
class TaskService {
  constructor(taskRepository, workflowOrchestrationService) {
    this.taskRepository = taskRepository;
    this.workflowOrchestrationService = workflowOrchestrationService;
  }

  async executeTask(taskId, userId, options = {}) {
    // Get task from repository
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Use WorkflowOrchestrationService for execution
    return await this.workflowOrchestrationService.executeWorkflow(task, options);
  }

  // Keep other task business logic methods
  async createTask(taskData) { /* ... */ }
  async updateTask(taskId, updates) { /* ... */ }
  async deleteTask(taskId) { /* ... */ }
  async getTasks(filters) { /* ... */ }
}
```

### 3. TaskExecutionService.js - Remove or Merge
**Option A: Remove (Recommended)**
```javascript
// Remove TaskExecutionService.js entirely
// Update Application.js to not register it
// Update any references to use WorkflowOrchestrationService directly
```

**Option B: Merge with WorkflowOrchestrationService**
```javascript
// Move unique functionality from TaskExecutionService to WorkflowOrchestrationService
// Keep only what's not already in WorkflowOrchestrationService
```

## Integration Points

### 1. Application.js Service Registration
**Update**: Add WorkflowOrchestrationService to DI container
```javascript
// In initializeInfrastructure()
this.workflowOrchestrationService = this.serviceRegistry.getService('workflowOrchestrationService');
```

### 2. TaskController.js
**Update**: Inject WorkflowOrchestrationService
```javascript
// In initializePresentationLayer()
this.taskController = new TaskController(
  this.workflowOrchestrationService,
  this.taskService,
  this.docsTasksHandler
);
```

### 3. ExecuteTaskCommand.js
**Update**: Use WorkflowOrchestrationService
```javascript
// Already implemented in Task 1
const command = new ExecuteTaskCommand(this.workflowOrchestrationService, this.taskRepository);
```

## Testing Requirements

### Unit Tests
- [ ] WorkflowOrchestrationService.test.js
  - Test DI registration
  - Test service instantiation
  - Test workflow execution
  - Test error handling

- [ ] TaskService.test.js
  - Test executeTask with WorkflowOrchestrationService
  - Test other methods still work
  - Test error scenarios

### Integration Tests
- [ ] Application.js DI integration
- [ ] TaskController integration
- [ ] ExecuteTaskCommand integration

## Success Criteria
- [ ] WorkflowOrchestrationService registered in DI container
- [ ] TaskService uses WorkflowOrchestrationService
- [ ] TaskExecutionService removed or merged
- [ ] All services properly integrated
- [ ] No duplicate workflow logic
- [ ] Central workflow coordination working
- [ ] All tests pass

## Risk Assessment
- **MEDIUM RISK**: DI container changes
- **MEDIUM RISK**: Service integration
- **LOW RISK**: Removing duplicate code

## Next Steps
1. Register WorkflowOrchestrationService in Application.js
2. Update TaskService to use WorkflowOrchestrationService
3. Remove or merge TaskExecutionService
4. Update TaskController injection
5. Test integration

---

**Status**: Ready for Implementation
**Priority**: HIGH
**Blocked By**: Nothing (can be done in parallel with Task 1)
**Blocks**: Task 3 (TaskController Enhancement) 