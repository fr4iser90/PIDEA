# Task 4: Architecture Cleanup (NIEDRIG)

## Goal
Remove duplicate workflow logic, optimize code structure, and finalize architecture improvements.

## Priority
🟢 **LOW** - Code cleanup and optimization

## Estimated Time
4-6 hours

## Dependencies
- Task 1 (ExecuteTaskCommand Implementation) - Required
- Task 2 (WorkflowOrchestrationService Integration) - Required
- Task 3 (TaskController Enhancement) - Required

## Current Problem
- Duplicate workflow logic in multiple services
- TaskService has Git operations that should be in WorkflowGitService
- AI refactoring logic mixed with task business logic
- Code structure not optimized
- Documentation outdated

## Files to Modify

### 1. TaskService.js
**Path**: `backend/domain/services/TaskService.js`
**Changes**: Remove Git operations and AI refactoring logic
**Lines**: 401-800 (Git operations and AI logic)

### 2. TaskExecutionService.js
**Path**: `backend/domain/services/TaskExecutionService.js`
**Changes**: Remove entirely or merge unique functionality
**Lines**: 1-760 (entire file)

### 3. WorkflowGitService.js
**Path**: `backend/domain/services/WorkflowGitService.js`
**Changes**: Ensure all Git operations are here
**Lines**: 1-541 (verify completeness)

### 4. Documentation
**Path**: Various documentation files
**Changes**: Update to reflect new architecture

## Implementation Details

### 1. TaskService.js Cleanup
```javascript
// backend/domain/services/TaskService.js
class TaskService {
  constructor(taskRepository, workflowOrchestrationService) {
    this.taskRepository = taskRepository;
    this.workflowOrchestrationService = workflowOrchestrationService;
  }

  // KEEP: Task business logic methods
  async createTask(taskData) {
    // ... existing implementation
  }

  async updateTask(taskId, updates) {
    // ... existing implementation
  }

  async deleteTask(taskId) {
    // ... existing implementation
  }

  async getTasks(filters) {
    // ... existing implementation
  }

  async getTaskById(taskId) {
    // ... existing implementation
  }

  // KEEP: executeTask (now uses WorkflowOrchestrationService)
  async executeTask(taskId, userId, options = {}) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return await this.workflowOrchestrationService.executeWorkflow(task, options);
  }

  // REMOVE: Git operations (lines 401-600)
  // - createWorkflowBranch
  // - determineBranchStrategy
  // - git operations

  // REMOVE: AI refactoring logic (lines 601-800)
  // - buildRefactoringPrompt
  // - buildTaskExecutionPrompt
  // - AI-specific methods
}
```

### 2. TaskExecutionService.js - Remove
```javascript
// backend/domain/services/TaskExecutionService.js
// REMOVE ENTIRE FILE
// All functionality now handled by WorkflowOrchestrationService

// Update Application.js to not register TaskExecutionService
// Remove from DI container registration
```

### 3. WorkflowGitService.js - Verify Completeness
```javascript
// backend/domain/services/WorkflowGitService.js
// VERIFY all Git operations are here:
// - createWorkflowBranch
// - determineBranchStrategy
// - completeWorkflow
// - rollbackWorkflow
// - All Git-specific operations

// If any Git operations are missing from TaskService, move them here
```

### 4. Create AI Refactoring Service (Optional)
```javascript
// backend/domain/services/AIRefactoringService.js
// NEW FILE: Move AI refactoring logic here
class AIRefactoringService {
  constructor(cursorIDEService, aiService) {
    this.cursorIDEService = cursorIDEService;
    this.aiService = aiService;
  }

  async buildRefactoringPrompt(task) {
    // Move from TaskService
  }

  async buildTaskExecutionPrompt(task) {
    // Move from TaskService
  }

  async executeAIRefactoring(task) {
    // Move from TaskService
  }
}

module.exports = AIRefactoringService;
```

## Integration Points

### 1. Application.js Cleanup
```javascript
// backend/Application.js
// Remove TaskExecutionService registration
// this.taskExecutionService = this.serviceRegistry.getService('taskExecutionService');

// Optionally add AIRefactoringService
// this.aiRefactoringService = new AIRefactoringService(this.cursorIDEService, this.aiService);
```

### 2. WorkflowOrchestrationService Integration
```javascript
// backend/domain/services/WorkflowOrchestrationService.js
// Ensure it uses WorkflowGitService for all Git operations
// Ensure it uses AIRefactoringService for AI operations (if created)
```

## Testing Requirements

### Unit Tests
- [ ] TaskService.test.js
  - Test that Git operations are removed
  - Test that AI logic is removed
  - Test that business logic still works
  - Test WorkflowOrchestrationService integration

- [ ] WorkflowGitService.test.js
  - Test all Git operations are here
  - Test integration with WorkflowOrchestrationService

### Integration Tests
- [ ] End-to-end workflow tests
- [ ] Git workflow tests
- [ ] AI refactoring tests (if separated)

## Success Criteria
- [ ] TaskService only contains task business logic
- [ ] TaskExecutionService removed
- [ ] All Git operations in WorkflowGitService
- [ ] AI refactoring logic separated (optional)
- [ ] No duplicate workflow logic
- [ ] Clean separation of concerns
- [ ] All tests pass
- [ ] Documentation updated

## Risk Assessment
- **LOW RISK**: Removing duplicate code
- **LOW RISK**: Code cleanup
- **LOW RISK**: Documentation updates

## Next Steps
1. Remove Git operations from TaskService
2. Remove AI refactoring logic from TaskService
3. Remove TaskExecutionService entirely
4. Verify WorkflowGitService completeness
5. Update documentation
6. Run all tests

---

**Status**: Ready for Implementation
**Priority**: LOW
**Blocked By**: Task 1, Task 2, Task 3
**Blocks**: Nothing (final task) 