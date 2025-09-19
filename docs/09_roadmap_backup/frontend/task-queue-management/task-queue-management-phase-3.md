# Task Queue Management System – Phase 3: Integration & Testing

## Overview
Integrate the queue management system into the existing sidebar, implement WebSocket real-time integration, and complete comprehensive testing. This phase brings everything together and ensures the system works seamlessly with the existing application.

## Objectives
- [ ] Add Queue tab to SidebarRight component
- [ ] Integrate QueueManagementPanel into tab system
- [ ] Add queue tab styling to sidebar CSS
- [ ] Implement tab switching logic
- [ ] Add queue status indicators
- [ ] Implement WebSocket queue status updates
- [ ] Add real-time step progress updates
- [ ] Create step timeline real-time updates
- [ ] Add real-time queue item updates
- [ ] Create queue progress indicators
- [ ] Write comprehensive unit tests
- [ ] Test WebSocket integration and step events
- [ ] Test queue cancellation functionality
- [ ] Test step-specific actions (pause/resume steps)
- [ ] Polish UI/UX and responsive design
- [ ] Update documentation

## Deliverables
- **File**: `frontend/src/presentation/components/SidebarRight.jsx` - Updated with Queue tab
- **File**: `frontend/src/css/global/sidebar-right.css` - Queue tab styling
- **Integration**: Queue tab integration with existing tab system
- **Integration**: WebSocket real-time queue updates
- **Integration**: Real-time step progress updates
- **Test**: `frontend/tests/unit/SidebarRight.test.jsx` - Tab integration tests
- **Test**: `frontend/tests/integration/QueueIntegration.test.jsx` - Integration tests
- **Test**: `frontend/tests/e2e/QueueManagement.test.jsx` - End-to-end tests
- **Documentation**: Updated user guide and API documentation

## Dependencies
- Requires: Phase 1 (Backend Queue API Foundation) completion
- Requires: Phase 2 (Frontend Queue Components) completion
- Requires: Existing SidebarRight.jsx infrastructure
- Blocks: None (final phase)

## Estimated Time
8 hours

## Implementation Steps

### Step 1: Sidebar Integration (2 hours)
```javascript
// frontend/src/presentation/components/SidebarRight.jsx
function SidebarRight({ eventBus, activePort }) {
  const [currentTab, setCurrentTab] = useState('tasks');
  
  return (
    <div className="sidebar-right">
      {/* Tab Header */}
      <div className="tab-header">
        <button 
          className={`tab-btn${currentTab === 'tasks' ? ' active' : ''}`} 
          onClick={() => setCurrentTab('tasks')}
        >
          🗂️ Tasks
        </button>
        <button 
          className={`tab-btn${currentTab === 'queue' ? ' active' : ''}`} 
          onClick={() => setCurrentTab('queue')}
        >
          ⏳ Queue
        </button>
        <button 
          className={`tab-btn${currentTab === 'auto' ? ' active' : ''}`} 
          onClick={() => setCurrentTab('auto')}
        >
          🤖 Auto
        </button>
        {/* ... other tabs */}
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {currentTab === 'tasks' && <TasksPanelComponent eventBus={eventBus} activePort={activePort} />}
        {currentTab === 'queue' && <QueueManagementPanel eventBus={eventBus} activePort={activePort} />}
        {currentTab === 'auto' && <AutoPanelComponent eventBus={eventBus} activePort={activePort} />}
        {/* ... other tab content */}
      </div>
    </div>
  );
}
```

### Step 2: WebSocket Real-time Integration (2 hours)
```javascript
// frontend/src/presentation/components/queue/QueueManagementPanel.jsx
function QueueManagementPanel({ eventBus, activePort }) {
  const { projectId, projectName } = useActiveIDE();
  const [queueItems, setQueueItems] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  
  useEffect(() => {
    if (!projectId) return;
    
    // Listen for project-specific queue updates
    const queueEvent = `queue:updated:${projectId}`;
    const stepEvent = `task:step:progress:${projectId}`;
    
    eventBus.on(queueEvent, handleQueueUpdated);
    eventBus.on(stepEvent, handleStepProgress);
    
    return () => {
      eventBus.off(queueEvent, handleQueueUpdated);
      eventBus.off(stepEvent, handleStepProgress);
    };
  }, [projectId]);
  
  const handleQueueUpdated = (data) => {
    setQueueItems(data.queuedItems);
    setActiveTasks(data.activeTasks);
  };
  
  const handleStepProgress = (data) => {
    setActiveTasks(prev => prev.map(task => 
      task.id === data.taskId 
        ? { ...task, currentStep: data.step, stepProgress: data.progress }
        : task
    ));
  };
}
```

### Step 3: CSS Integration (1 hour)
```css
/* frontend/src/css/global/sidebar-right.css */
.tab-btn {
  /* ... existing styles ... */
}

.tab-btn[data-tab="queue"] {
  position: relative;
}

.tab-btn[data-tab="queue"]::after {
  content: attr(data-count);
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--warning-color);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-btn[data-tab="queue"][data-count="0"]::after {
  display: none;
}

.queue-tab {
  height: 100%;
  overflow-y: auto;
}
```

### Step 4: Comprehensive Testing (2 hours)
```javascript
// frontend/tests/integration/QueueIntegration.test.jsx
describe('Queue Integration', () => {
  test('Queue tab appears in sidebar', () => {
    render(<SidebarRight eventBus={mockEventBus} activePort={9222} />);
    expect(screen.getByText('⏳ Queue')).toBeInTheDocument();
  });
  
  test('Queue tab shows queue panel when clicked', () => {
    render(<SidebarRight eventBus={mockEventBus} activePort={9222} />);
    fireEvent.click(screen.getByText('⏳ Queue'));
    expect(screen.getByText('Execution Queue')).toBeInTheDocument();
  });
  
  test('WebSocket events update queue status', async () => {
    render(<QueueManagementPanel eventBus={mockEventBus} activePort={9222} />);
    
    // Simulate WebSocket event
    mockEventBus.emit('queue:updated', {
      queuedItems: [{ id: '1', title: 'Test Task', type: 'task' }],
      activeTasks: []
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });
});

// frontend/tests/e2e/QueueManagement.test.jsx
describe('Queue Management E2E', () => {
  test('Complete queue workflow', async () => {
    // Navigate to queue tab
    await page.click('text=⏳ Queue');
    
    // Add task to queue
    await page.click('text=Add Task');
    await page.fill('[data-testid="task-title"]', 'Test Task');
    await page.click('text=Add to Queue');
    
    // Verify task appears in queue
    await expect(page.locator('text=Test Task')).toBeVisible();
    
    // Cancel task
    await page.click('[data-testid="cancel-task"]');
    await expect(page.locator('text=Test Task')).not.toBeVisible();
  });
});
```

### Step 5: Polish & Documentation (1 hour)
- UI/UX polish and responsive design improvements
- Performance optimization
- Error handling improvements
- User documentation updates
- API documentation updates

## Success Criteria
- [ ] Queue tab appears in right sidebar
- [ ] Tab switching works correctly
- [ ] Queue status indicators functional
- [ ] WebSocket real-time updates working
- [ ] Step progress updates in real-time
- [ ] Queue cancellation functionality operational
- [ ] Step-specific actions working
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] UI/UX polished and responsive
- [ ] Documentation complete and accurate
- [ ] Performance requirements met
- [ ] Error handling robust

## Risk Mitigation
- **Integration Complexity**: Test each integration point independently
- **WebSocket Reliability**: Implement fallback mechanisms and error recovery
- **UI Responsiveness**: Test on different screen sizes and devices
- **Performance**: Monitor and optimize real-time updates

## Final Validation
- [ ] Complete system integration working
- [ ] All features functional and tested
- [ ] Performance benchmarks met
- [ ] Security requirements satisfied
- [ ] User acceptance criteria met
- [ ] Documentation complete
- [ ] Ready for production deployment 