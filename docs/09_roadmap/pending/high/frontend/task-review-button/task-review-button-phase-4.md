# Phase 4: Service Integration

## Goal
Create TaskReviewService in frontend to connect modal to backend review endpoint and implement workflow execution with progress feedback.

## Estimated Time
1 hour

## Tasks
- [ ] Create TaskReviewService in frontend
- [ ] Connect frontend to backend review endpoint
- [ ] Implement workflow execution with progress feedback
- [ ] Integrate with Queue Manager for status tracking
- [ ] Add error handling and user feedback
- [ ] Test end-to-end workflow

## Implementation Details

### TaskReviewService
```javascript
// New file: TaskReviewService.jsx
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
      
      const taskIds = selectedTasks.map(task => task.id);
      
      const response = await this.apiCall(`/api/projects/${projectId}/tasks/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskIds,
          projectId
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
  
  async getReviewProgress(taskIds, projectId) {
    // Implementation for progress tracking
    // This could be a WebSocket connection or polling endpoint
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

### Files to Create
- `frontend/src/application/services/TaskReviewService.jsx`

### Files to Modify
- `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`

### Success Criteria
- [ ] Service connects to backend review endpoint
- [ ] Workflow execution works end-to-end
- [ ] Progress feedback is displayed to user
- [ ] Queue Manager shows real-time status
- [ ] Error handling provides clear user feedback
- [ ] Task list refreshes after review completion
- [ ] Success/failure messages are shown
- [ ] Loading states work correctly

## Dependencies
- Backend review endpoint (Phase 3)
- TaskReviewSelectionModal (Phase 1)
- TasksPanelComponent integration (Phase 2)
- task-check-state.md workflow
- API call infrastructure

## Testing
- Service integration testing
- End-to-end workflow testing
- Error handling testing
- Progress feedback testing

