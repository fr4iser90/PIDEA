# Phase 2: TasksPanel Integration

## Goal
Add Review button next to Sync button in TasksPanelComponent header and implement modal open/close logic.

## Estimated Time
2 hours

## Tasks
- [ ] Add Review button next to Sync button in header
- [ ] Implement modal open/close logic
- [ ] Add button styling and disabled states
- [ ] Connect modal to task data
- [ ] Add loading states and error handling

## Implementation Details

### Button Integration
```jsx
// In TasksPanelComponent.jsx header section
<div className="tasks-header-buttons">
  <button 
    className="btn-primary text-sm"
    onClick={handleCreateTask}
    disabled={!projectId}
    title={projectId ? "Create new task" : "No project selected"}
  >
    ➕ Create
  </button>
  <button 
    className="btn-secondary text-sm"
    onClick={handleSyncTasks}
    disabled={isLoadingManualTasks || !projectId}
    title={projectId ? "Sync tasks with backend" : "No project selected"}
  >
    {isLoadingManualTasks ? 'Syncing...' : '🔄 Sync'}
  </button>
  <button 
    className="btn-secondary text-sm"
    onClick={handleOpenReviewModal}
    disabled={isLoadingManualTasks || !projectId || manualTasks.length === 0}
    title={projectId ? "Review selected tasks" : "No project selected"}
  >
    🔍 Review
  </button>
</div>
```

### Modal State Management
```jsx
// Add to TasksPanelComponent state
const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
const [isReviewLoading, setIsReviewLoading] = useState(false);

// Modal handlers
const handleOpenReviewModal = () => {
  setIsReviewModalOpen(true);
};

const handleCloseReviewModal = () => {
  setIsReviewModalOpen(false);
};

const handleStartReview = async (selectedTasks) => {
  setIsReviewLoading(true);
  try {
    // Call review workflow
    await startTaskReviewWorkflow(selectedTasks);
  } catch (error) {
    console.error('Review workflow failed:', error);
  } finally {
    setIsReviewLoading(false);
    setIsReviewModalOpen(false);
  }
};
```

### Files to Modify
- `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx`

### Success Criteria
- [ ] Review button appears next to Sync button
- [ ] Button is properly styled and positioned
- [ ] Button is disabled when appropriate (no project, no tasks, loading)
- [ ] Modal opens when button is clicked
- [ ] Modal closes properly
- [ ] Task data is passed to modal
- [ ] Loading states work correctly
- [ ] Error handling is implemented

## Dependencies
- TaskReviewSelectionModal component (Phase 1)
- Existing TasksPanelComponent structure
- Task data from manualTasks state

## Testing
- Integration tests for button functionality
- Modal open/close testing
- State management testing
- Error handling testing

