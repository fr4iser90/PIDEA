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

### TaskController Endpoint
```javascript
// In TaskController.js
async reviewTasks(req, res) {
  try {
    const { taskIds, projectId } = req.body;
    const userId = req.user?.id || 'system';
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task IDs array is required'
      });
    }
    
    const result = await this.taskApplicationService.executeTaskReviewWorkflow(
      taskIds, 
      projectId, 
      userId
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    this.logger.error('Task review workflow failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
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

