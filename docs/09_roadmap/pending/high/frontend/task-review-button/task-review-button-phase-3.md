# Phase 3: Backend Review Workflow

## Goal
Create backend review workflow endpoint and handler that integrates task-check-state.md workflow for multi-task processing.

## Estimated Time
2 hours

## Tasks
- [ ] Create review workflow endpoint in TaskController
- [ ] Implement TaskReviewHandler for workflow execution
- [ ] Integrate task-check-state.md workflow
- [ ] Add multi-task processing logic
- [ ] Implement progress tracking and error handling

## Implementation Details

### WorkflowController Integration
```javascript
// Use existing WorkflowController.executeWorkflow()
// Route: POST /api/projects/:projectId/workflow/execute
// Body: {
//   mode: 'task-review',
//   tasks: selectedTasks,
//   options: {
//     workflowPrompt: 'task-check-state.md',
//     autoExecute: true
//   }
// }
```

### TaskReviewHandler
```javascript
// New file: TaskReviewHandler.js
class TaskReviewHandler {
  constructor(taskService, workflowService, logger) {
    this.taskService = taskService;
    this.workflowService = workflowService;
    this.logger = logger;
  }
  
  async executeReviewWorkflow(taskIds, projectId, userId) {
    const results = [];
    
    for (const taskId of taskIds) {
      try {
        // Load task files
        const taskFiles = await this.loadTaskFiles(taskId);
        
        // Execute task-check-state.md workflow
        const stateCheckResult = await this.executeTaskCheckState(taskFiles, projectId);
        
        // Update task with results
        const updateResult = await this.updateTaskWithReviewResults(taskId, {
          stateCheck: stateCheckResult
        });
        
        results.push({
          taskId,
          success: true,
          result: updateResult
        });
        
      } catch (error) {
        results.push({
          taskId,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      totalTasks: taskIds.length,
      completedTasks: results.filter(r => r.success).length,
      failedTasks: results.filter(r => !r.success).length,
      results
    };
  }
}
```

### Files to Create
- `backend/application/handlers/TaskReviewHandler.js`

### Files to Modify
- `backend/presentation/api/TaskController.js`
- `backend/application/services/TaskApplicationService.js`

### Success Criteria
- [ ] Review endpoint accepts task IDs array
- [ ] Handler processes multiple tasks sequentially
- [ ] task-check-state.md workflow is integrated
- [ ] Progress tracking works for each task
- [ ] Error handling prevents batch failure
- [ ] Results are properly aggregated and returned

## Dependencies
- Existing TaskService and WorkflowService
- task-check-state.md workflow
- Task file structure and metadata

## Testing
- Unit tests for TaskReviewHandler
- Integration tests for review endpoint
- Multi-task processing testing
- Error handling testing

