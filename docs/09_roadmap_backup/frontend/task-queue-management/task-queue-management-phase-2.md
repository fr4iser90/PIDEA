# Task Queue Management System – Phase 2: Frontend Queue Components

## Overview
Implement the frontend queue management components with step progress tracking. This phase creates all the React components needed for queue visualization and control, including the step timeline and real-time updates.

## Objectives
- [ ] Create QueueRepository for API communication
- [ ] Add queue event handling to WebSocketService
- [ ] Create QueueManagementPanel component structure
- [ ] Implement ActiveTaskItem component with step progress tracking
- [ ] Create StepTimeline component for step visualization
- [ ] Implement QueueItem component for individual tasks
- [ ] Create QueueControls component for queue management
- [ ] Add queue and step timeline CSS styling
- [ ] Implement queue state management
- [ ] Add error handling for queue operations

## Deliverables
- **File**: `frontend/src/infrastructure/repositories/QueueRepository.jsx` - Queue API communication
- **File**: `frontend/src/presentation/components/queue/QueueManagementPanel.jsx` - Main queue interface
- **File**: `frontend/src/presentation/components/queue/ActiveTaskItem.jsx` - Active task with step progress
- **File**: `frontend/src/presentation/components/queue/QueueItem.jsx` - Individual queue item
- **File**: `frontend/src/presentation/components/queue/QueueControls.jsx` - Queue control buttons
- **File**: `frontend/src/presentation/components/queue/StepTimeline.jsx` - Step timeline visualization
- **File**: `frontend/src/css/panel/queue-panel.css` - Queue panel styling
- **File**: `frontend/src/css/panel/step-timeline.css` - Step timeline styling
- **Test**: `frontend/tests/unit/QueueManagementPanel.test.jsx` - Component tests
- **Test**: `frontend/tests/unit/ActiveTaskItem.test.jsx` - Active task tests
- **Test**: `frontend/tests/unit/StepTimeline.test.jsx` - Step timeline tests

## Dependencies
- Requires: Phase 1 (Backend Queue API Foundation) completion
- Requires: Existing WebSocketService.jsx infrastructure
- Blocks: Phase 3 (Sidebar Integration) start

## Estimated Time
12 hours

## Implementation Steps

### Step 1: Queue Repository & WebSocket Integration (2 hours)
```javascript
// frontend/src/infrastructure/repositories/QueueRepository.jsx
class QueueRepository {
  async getQueueStatus(projectId) {
    // Fetch project-specific queue status from API
  }
  
  async addToQueue(projectId, workflowItem) {
    // Add item to project-specific queue
  }
  
  async cancelQueueItem(projectId, itemId) {
    // Cancel queue item from project-specific queue
  }
}

// frontend/src/infrastructure/services/WebSocketService.jsx
class WebSocketService {
  handleQueueUpdated(projectId, data) {
    // Handle project-specific queue status updates
  }
  
  handleTaskStepProgress(projectId, data) {
    // Handle project-specific step progress updates
  }
}
```

### Step 2: Core Queue Components (4 hours)
```javascript
// frontend/src/presentation/components/queue/QueueManagementPanel.jsx
function QueueManagementPanel({ eventBus, activePort }) {
  const { projectId, projectName } = useActiveIDE();
  const [queueItems, setQueueItems] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  
  // Load queue for current project
  useEffect(() => {
    if (projectId) {
      loadQueueStatus();
    } else {
      setQueueItems([]);
      setActiveTasks([]);
    }
  }, [projectId]);
  
  return (
    <div className="queue-panel">
      <div className="queue-header">
        <h3>⏳ Execution Queue</h3>
        <div className="project-context">
          <span className="project-name">{projectName}</span>
        </div>
        <div className="queue-stats">
          <span>Tasks: {taskCount}</span>
          <span>Analysis: {analysisCount}</span>
          <span>Framework: {frameworkCount}</span>
        </div>
      </div>
      
      <div className="active-executions">
        {activeTasks.map(task => (
          <ActiveTaskItem key={task.id} task={task} onCancel={handleCancel} />
        ))}
      </div>
      
      <div className="queued-items">
        {queueItems.map(item => (
          <QueueItem key={item.id} item={item} onRemove={handleRemove} />
        ))}
      </div>
      
      <QueueControls onPauseAll={handlePauseAll} onClearCompleted={handleClearCompleted} />
    </div>
  );
}
```

### Step 3: Step Progress Components (3 hours)
```javascript
// frontend/src/presentation/components/queue/ActiveTaskItem.jsx
function ActiveTaskItem({ task, onCancel }) {
  const [currentStep, setCurrentStep] = useState(task.currentStep);
  const [stepProgress, setStepProgress] = useState(task.stepProgress || 0);
  
  return (
    <div className="active-task-item">
      <div className="task-header">
        <h4>{task.title}</h4>
        <span className="task-type">{task.type}</span>
        <button onClick={() => onCancel(task.id)}>❌</button>
      </div>
      
      <div className="step-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${stepProgress}%`}} />
        </div>
        <span className="progress-text">{stepProgress}%</span>
      </div>
      
      <StepTimeline steps={task.steps} currentStep={currentStep} />
    </div>
  );
}

// frontend/src/presentation/components/queue/StepTimeline.jsx
function StepTimeline({ steps, currentStep }) {
  return (
    <div className="step-timeline">
      {steps.map((step, index) => (
        <div key={index} className={`step-item ${getStepStatus(step, currentStep, index)}`}>
          <div className="step-indicator">{getStepIcon(step, currentStep, index)}</div>
          <div className="step-label">{step}</div>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: CSS Styling (2 hours)
```css
/* frontend/src/css/panel/queue-panel.css */
.queue-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  padding: 1rem;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.active-task-item {
  background: var(--success-bg);
  border: 1px solid var(--success-border);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

/* frontend/src/css/panel/step-timeline.css */
.step-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.step-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
```

### Step 5: Testing & Polish (1 hour)
- Unit tests for all components
- Component integration testing
- Error handling validation
- Performance optimization

## Success Criteria
- [ ] All queue components implemented and functional
- [ ] Step progress tracking working correctly
- [ ] Real-time updates via WebSocket operational
- [ ] Queue state management implemented
- [ ] Error handling for all operations
- [ ] CSS styling complete and responsive
- [ ] All unit tests passing
- [ ] Component integration working
- [ ] Performance requirements met

## Risk Mitigation
- **Component Complexity**: Break down into smaller, focused components
- **State Management**: Use React hooks and context for state management
- **Real-time Updates**: Implement proper WebSocket event handling
- **Performance**: Optimize re-renders and use React.memo where appropriate

## Next Phase Dependencies
- All queue components must be complete and tested
- WebSocket integration must be functional
- CSS styling must be complete
- Component state management must be operational 