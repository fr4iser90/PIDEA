# Phase 4: Service Integration

## Goal
Update existing TaskReviewService to connect modal to WorkflowController.executeWorkflow() endpoint with StepRegistry-based workflow execution.

## Estimated Time
1 hour

## Tasks
- [ ] **UPDATE** existing TaskReviewService in frontend (service already exists)
- [ ] Connect frontend to WorkflowController.executeWorkflow() endpoint
- [ ] Implement workflow execution with StepRegistry
- [ ] Add progress feedback and error handling
- [ ] Test end-to-end workflow with IDE communication

## Implementation Details

### TaskReviewService Update
```javascript
// UPDATE existing TaskReviewService.jsx
class TaskReviewService {
  constructor(apiCall, logger) {
    this.apiCall = apiCall;
    this.logger = logger;
  }
  
  async executeTaskReviewWorkflow(selectedTasks, projectId) {
    try {
      this.logger.info('Starting task review workflow:', {
        taskCount: selectedTasks.length,
        projectId
      });
      
      // Call WorkflowController.executeWorkflow()
      const response = await this.apiCall(`/api/projects/${projectId}/workflow/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'task-review', // WorkflowController recognizes this
          tasks: selectedTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Review workflow failed');
      }
      
      this.logger.info('Task review workflow completed:', response.data);
      
      return {
        success: true,
        data: response.data,
        message: `Review completed for ${response.data.completedTasks}/${response.data.totalTasks} tasks`
      };
      
    } catch (error) {
      this.logger.error('Task review workflow failed:', error);
      throw new Error(`Review workflow failed: ${error.message}`);
    }
  }
}
```

### Integration with TasksPanelComponent
```javascript
// In TasksPanelComponent.jsx
import TaskReviewService from '@/application/services/TaskReviewService';

// Add to component
const taskReviewService = new TaskReviewService(apiCall, logger);

const handleStartReview = async (selectedTasks) => {
  setIsReviewLoading(true);
  try {
    const result = await taskReviewService.executeTaskReviewWorkflow(
      selectedTasks, 
      projectId
    );
    
    setFeedback(result.message);
    
    // Refresh tasks to show updated status
    await loadTasks(true);
    
  } catch (error) {
    console.error('Review workflow failed:', error);
    setFeedback(`Review failed: ${error.message}`);
  } finally {
    setIsReviewLoading(false);
    setIsReviewModalOpen(false);
  }
};
```

### Files to Modify
- `frontend/src/application/services/TaskReviewService.jsx` - **UPDATE existing service**

### Success Criteria
- [ ] Service connects to WorkflowController.executeWorkflow() endpoint
- [ ] StepRegistry-based workflow execution works end-to-end
- [ ] IDE communication via SendMessageHandler + BrowserManager
- [ ] Progress feedback is displayed to user
- [ ] Error handling provides clear user feedback
- [ ] Task list refreshes after review completion
- [ ] Success/failure messages are shown
- [ ] Loading states work correctly

## Dependencies
- WorkflowController task-review mode (Phase 3)
- TaskReviewSelectionModal (Phase 1)
- TasksPanelComponent integration (Phase 2)
- task-check-state.md workflow content
- Existing TaskReviewService

## Testing
- Service integration testing with WorkflowController
- End-to-end workflow testing with IDE communication
- Error handling testing
- Progress feedback testing

