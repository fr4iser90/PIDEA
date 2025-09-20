# Queue Architecture Refactoring - Phase 3: Frontend Event Unification

## 📋 Phase Overview
- **Phase**: 3 of 3
- **Focus**: Frontend Event Unification & 24/7 Automation Testing
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1 & 2 completion
- **Created**: 2025-01-28T19:18:51.000Z

## 🎯 Phase Goals
- [ ] Remove task:step:* event listeners from frontend components
- [ ] Update QueueManagementPanel to only use workflow:step:* events
- [ ] Update TaskProgressComponent to use unified event system
- [ ] Test queue progress display functionality
- [ ] Validate 24/7 automation works without frontend intervention
- [ ] Ensure step progress properly displayed in queue UI

## 📁 Files to Modify

### Frontend Components
- [ ] `frontend/src/presentation/components/queue/QueueManagementPanel.jsx` - Remove task:step:* event listeners
- [ ] `frontend/src/presentation/components/TaskProgressComponent.jsx` - Remove task:step:* event listeners
- [ ] `frontend/src/presentation/components/chat/modal/TaskWorkflowProgress.jsx` - Update event handling
- [ ] `frontend/src/presentation/components/chat/sidebar-right/frameworks/steps/ExecutionStep.jsx` - Update event handling

### Frontend Services
- [ ] `frontend/src/application/services/TaskCreationService.jsx` - Update event tracking
- [ ] `frontend/src/infrastructure/repositories/TaskWorkflowRepository.jsx` - Update event handling

### Test Files
- [ ] `frontend/tests/e2e/QueueTaskExecution.test.jsx` - E2E tests for queue execution
- [ ] `frontend/tests/integration/QueueEventHandling.test.jsx` - Integration tests for event handling

## 🔧 Implementation Steps

### Step 1: Update QueueManagementPanel (45 minutes)
```javascript
// frontend/src/presentation/components/queue/QueueManagementPanel.jsx
useEffect(() => {
    const setupWebSocket = async () => {
        try {
            await webSocketService.connect();
            
            // ✅ KEEP: Queue events
            webSocketService.on('queue:updated', (data) => {
                logger.debug('Queue updated via WebSocket', { projectId, data });
                loadQueueStatus();
            });

            webSocketService.on('queue:item:added', (data) => {
                logger.debug('Queue item added via WebSocket', { projectId, data });
                loadQueueStatus();
            });

            // ✅ KEEP: Workflow events (unified)
            webSocketService.on('workflow:step:progress', (data) => {
                logger.debug('Step progress updated via WebSocket', { projectId, data });
                if (selectedTask && data.workflowId === selectedTask.id) {
                    loadStepProgress(selectedTask.id);
                }
            });

            webSocketService.on('workflow:step:started', (data) => {
                logger.debug('Step started via WebSocket', { projectId, data });
                if (selectedTask && data.workflowId === selectedTask.id) {
                    loadStepProgress(selectedTask.id);
                }
            });

            webSocketService.on('workflow:step:completed', (data) => {
                logger.debug('Step completed via WebSocket', { projectId, data });
                if (selectedTask && data.workflowId === selectedTask.id) {
                    loadStepProgress(selectedTask.id);
                }
            });

            // ❌ REMOVE: Task events - COMPLETELY REMOVED
            // webSocketService.on('task:step:progress', ...);
            // webSocketService.on('task:step:started', ...);
            // webSocketService.on('task:step:completed', ...);

            logger.info('WebSocket event listeners setup complete', { projectId });

        } catch (error) {
            logger.error('Failed to setup WebSocket', { projectId, error: error.message });
        }
    };

    setupWebSocket();

    return () => {
        // Cleanup WebSocket listeners
        webSocketService.off('queue:updated');
        webSocketService.off('queue:item:added');
        webSocketService.off('queue:item:cancelled');
        webSocketService.off('queue:item:updated');
        webSocketService.off('workflow:step:progress');
        webSocketService.off('workflow:step:started');
        webSocketService.off('workflow:step:completed');
        
        // ❌ REMOVE: Task event cleanup - COMPLETELY REMOVED
        // webSocketService.off('task:step:progress');
        // webSocketService.off('task:step:started');
        // webSocketService.off('task:step:completed');
    };
}, [projectId, selectedTask]);
```

### Step 2: Update TaskProgressComponent (30 minutes)
```javascript
// frontend/src/presentation/components/TaskProgressComponent.jsx
const handleProgressUpdate = (event) => {
    const { sessionId: updateSessionId, event: eventType, data } = event.detail;
    
    if (updateSessionId !== sessionId) {
        return;
    }

    switch (eventType) {
        case 'session-start':
            setStatus('started');
            setStartTime(new Date());
            break;
            
        case 'workflow-start': // ✅ Updated from 'tasks-parsed'
            setTasks(data.tasks || []);
            setProgress(0);
            break;
            
        case 'workflow-step-start': // ✅ Updated from 'task-start'
            setCurrentTask(data.stepDescription);
            setStatus('running');
            break;
            
        case 'workflow-step-complete': // ✅ Updated from 'task-complete'
            updateTaskProgress(data);
            setProgress(data.progress || 0);
            break;
            
        case 'workflow-step-error': // ✅ Updated from 'task-error'
            handleTaskError(data);
            break;
            
        case 'workflow-complete': // ✅ Updated from 'session-complete'
            handleComplete(data);
            break;
            
        case 'workflow-error': // ✅ Updated from 'session-error'
            handleError(data.error);
            break;
            
        case 'workflow-cancelled': // ✅ Updated from 'session-cancelled'
            handleCancelled();
            break;
            
        default:
            break;
    }
};
```

### Step 3: Update TaskWorkflowProgress (30 minutes)
```javascript
// frontend/src/presentation/components/chat/modal/TaskWorkflowProgress.jsx
useEffect(() => {
    if (!eventBus) return;

    const handleProgress = (data) => {
        if (data.workflowId === workflowId) {
            logger.info('Workflow progress update received:', data);
            setProgress(prev => ({
                ...prev,
                ...data,
                lastUpdate: new Date()
            }));
            setIsLoading(false);
        }
    };

    const handleCompleted = (data) => {
        if (data.workflowId === workflowId) {
            logger.info('Workflow completed:', data);
            setProgress(prev => ({
                ...prev,
                status: 'completed',
                step: 'completed',
                progress: 100,
                details: 'Task creation completed successfully!',
                completedAt: new Date()
            }));
            setIsLoading(false);
            
            setTimeout(() => {
                if (onComplete) onComplete(data);
            }, 2000);
        }
    };

    const handleError = (data) => {
        if (data.workflowId === workflowId) {
            logger.error('Workflow error:', data);
            setProgress(prev => ({
                ...prev,
                status: 'error',
                error: data.error || 'An error occurred during task creation',
                lastUpdate: new Date()
            }));
            setIsLoading(false);
        }
    };

    // ✅ KEEP: Workflow events only
    eventBus.on('workflow:step:progress', handleProgress);
    eventBus.on('workflow:step:completed', handleCompleted);
    eventBus.on('workflow:step:failed', handleError);

    // ❌ REMOVE: Task events - COMPLETELY REMOVED
    // eventBus.on('task-creation:progress', handleProgress);
    // eventBus.on('task-creation:completed', handleCompleted);
    // eventBus.on('task-creation:error', handleError);

    return () => {
        eventBus.off('workflow:step:progress', handleProgress);
        eventBus.off('workflow:step:completed', handleCompleted);
        eventBus.off('workflow:step:failed', handleError);
        
        // ❌ REMOVE: Task event cleanup - COMPLETELY REMOVED
        // eventBus.off('task-creation:progress', handleProgress);
        // eventBus.off('task-creation:completed', handleCompleted);
        // eventBus.off('task-creation:error', handleError);
    };
}, [eventBus, workflowId]);
```

### Step 4: Update TaskCreationService (15 minutes)
```javascript
// frontend/src/application/services/TaskCreationService.jsx
trackWorkflowProgress(workflowId, progressData) {
    try {
        // Update local tracking
        if (this.activeWorkflows.has(workflowId)) {
            const workflow = this.activeWorkflows.get(workflowId);
            this.activeWorkflows.set(workflowId, {
                ...workflow,
                ...progressData,
                lastUpdate: new Date()
            });
        }

        // ✅ KEEP: Workflow events only
        if (window.eventBus) {
            window.eventBus.emit('workflow:step:progress', {
                workflowId,
                ...progressData
            });
        }

        logger.info('Workflow progress tracked:', { workflowId, progressData });

    } catch (error) {
        logger.error('Failed to track workflow progress:', error);
    }
}
```

## 🧪 Testing Strategy

### E2E Tests for Queue Execution
```javascript
// frontend/tests/e2e/QueueTaskExecution.test.jsx
describe('Queue Task Execution E2E', () => {
    it('should execute task through queue system', async () => {
        // Test complete task execution flow through queue
        // 1. Add task to queue
        // 2. Monitor progress via workflow events
        // 3. Verify completion
    });
    
    it('should display step progress correctly', async () => {
        // Test step progress display in queue UI
        // 1. Start task execution
        // 2. Verify step progress updates
        // 3. Check UI reflects current step
    });
    
    it('should handle 24/7 automation without frontend', async () => {
        // Test automation without frontend intervention
        // 1. Queue multiple tasks
        // 2. Close frontend
        // 3. Verify tasks complete automatically
    });
});
```

### Integration Tests for Event Handling
```javascript
// frontend/tests/integration/QueueEventHandling.test.jsx
describe('Queue Event Handling Integration', () => {
    it('should handle workflow events correctly', async () => {
        // Test workflow event handling
    });
    
    it('should not listen to task events', async () => {
        // Verify no task events are listened to
    });
    
    it('should update UI based on workflow progress', async () => {
        // Test UI updates from workflow events
    });
});
```

## 🔍 Code Changes Details

### QueueManagementPanel.jsx Complete Update
```javascript
// frontend/src/presentation/components/queue/QueueManagementPanel.jsx
const QueueManagementPanel = ({ eventBus, activePort }) => {
    // ... existing state and methods ...

    /**
     * Setup WebSocket event listeners - UPDATED for unified events
     */
    useEffect(() => {
        const setupWebSocket = async () => {
            try {
                await webSocketService.connect();
                
                // ✅ Queue Management Events
                webSocketService.on('queue:updated', (data) => {
                    logger.debug('Queue updated via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:added', (data) => {
                    logger.debug('Queue item added via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:cancelled', (data) => {
                    logger.debug('Queue item cancelled via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                webSocketService.on('queue:item:updated', (data) => {
                    logger.debug('Queue item updated via WebSocket', { projectId, data });
                    loadQueueStatus();
                });

                // ✅ Unified Workflow Step Events (for ALL task types)
                webSocketService.on('workflow:step:progress', (data) => {
                    logger.debug('Step progress updated via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                webSocketService.on('workflow:step:started', (data) => {
                    logger.debug('Step started via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                webSocketService.on('workflow:step:completed', (data) => {
                    logger.debug('Step completed via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                webSocketService.on('workflow:step:failed', (data) => {
                    logger.debug('Step failed via WebSocket', { projectId, data });
                    if (selectedTask && data.workflowId === selectedTask.id) {
                        loadStepProgress(selectedTask.id);
                    }
                });

                // ❌ REMOVED: Task-specific events - COMPLETELY REMOVED
                // webSocketService.on('task:step:progress', ...);
                // webSocketService.on('task:step:started', ...);
                // webSocketService.on('task:step:completed', ...);
                // webSocketService.on('task:step:failed', ...);

                logger.info('WebSocket event listeners setup complete with unified events', { projectId });

            } catch (error) {
                logger.error('Failed to setup WebSocket', { projectId, error: error.message });
            }
        };

        setupWebSocket();

        return () => {
            // Cleanup WebSocket listeners
            webSocketService.off('queue:updated');
            webSocketService.off('queue:item:added');
            webSocketService.off('queue:item:cancelled');
            webSocketService.off('queue:item:updated');
            webSocketService.off('workflow:step:progress');
            webSocketService.off('workflow:step:started');
            webSocketService.off('workflow:step:completed');
            webSocketService.off('workflow:step:failed');
            
            // ❌ REMOVED: Task event cleanup - COMPLETELY REMOVED
            // webSocketService.off('task:step:progress');
            // webSocketService.off('task:step:started');
            // webSocketService.off('task:step:completed');
            // webSocketService.off('task:step:failed');
        };
    }, [projectId, selectedTask]);

    // ... rest of component ...
};
```

### TaskProgressComponent.jsx Complete Update
```javascript
// frontend/src/presentation/components/TaskProgressComponent.jsx
const TaskProgressComponent = ({ sessionId, onComplete, onError, onCancelled }) => {
    // ... existing state ...

    /**
     * Handle progress updates from unified workflow events
     */
    const handleProgressUpdate = (event) => {
        const { sessionId: updateSessionId, event: eventType, data } = event.detail;
        
        if (updateSessionId !== sessionId) {
            return;
        }

        switch (eventType) {
            case 'workflow-start': // ✅ Updated from 'session-start'
                setStatus('started');
                setStartTime(new Date());
                break;
                
            case 'workflow-tasks-parsed': // ✅ Updated from 'tasks-parsed'
                setTasks(data.tasks || []);
                setProgress(0);
                break;
                
            case 'workflow-step-start': // ✅ Updated from 'task-start'
                setCurrentTask(data.stepDescription || data.stepName);
                setStatus('running');
                break;
                
            case 'workflow-step-progress': // ✅ Updated from 'task-progress'
                setProgress(data.progress || 0);
                if (data.stepDescription) {
                    setCurrentTask(data.stepDescription);
                }
                break;
                
            case 'workflow-step-complete': // ✅ Updated from 'task-complete'
                updateTaskProgress(data);
                setProgress(data.progress || 0);
                break;
                
            case 'workflow-step-error': // ✅ Updated from 'task-error'
                handleTaskError(data);
                break;
                
            case 'workflow-complete': // ✅ Updated from 'session-complete'
                handleComplete(data);
                break;
                
            case 'workflow-error': // ✅ Updated from 'session-error'
                handleError(data.error);
                break;
                
            case 'workflow-cancelled': // ✅ Updated from 'session-cancelled'
                handleCancelled();
                break;
                
            default:
                logger.debug('Unknown workflow event type:', eventType);
                break;
        }
    };

    /**
     * Update task progress for workflow steps
     */
    const updateTaskProgress = (data) => {
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === data.taskId || task.stepId === data.stepId
                    ? { ...task, status: 'completed', result: data.result }
                    : task
            )
        );
        
        setCurrentTask(null);
    };

    /**
     * Handle task error for workflow steps
     */
    const handleTaskError = (data) => {
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === data.taskId || task.stepId === data.stepId
                    ? { ...task, status: 'failed', error: data.error }
                    : task
            )
        );
        
        setCurrentTask(null);
    };

    // ... rest of component ...
};
```

## ✅ Success Criteria for Phase 3
- [ ] All task:step:* event listeners completely removed from frontend
- [ ] QueueManagementPanel only uses workflow:step:* events
- [ ] TaskProgressComponent completely updated for unified event system
- [ ] TaskWorkflowProgress uses workflow events only
- [ ] Step progress properly displayed in queue UI
- [ ] 24/7 automation works without frontend intervention
- [ ] E2E tests pass for queue execution
- [ ] Integration tests pass for event handling
- [ ] No task:step:* events listened to anywhere in frontend
- [ ] Queue shows current step and progress percentage correctly
- [ ] Complete frontend event system replacement - no fallbacks

## 🎯 Final Validation
- [ ] Queue shows "Analysis" workflow type correctly
- [ ] Queue shows current step (e.g., "code-quality-analysis") instead of "❓Unknown Type"
- [ ] Progress percentage updates correctly (not stuck at 0%)
- [ ] Multiple tasks can be queued and executed sequentially
- [ ] 24/7 automation works without frontend presence
- [ ] All event systems unified through workflow events

## 📝 Notes
- This phase completes the event system unification
- Frontend now only listens to workflow events for all task types
- Queue progress display should work correctly after this phase
- 24/7 automation is now fully queue-based
- No more direct task execution bypassing queue system
- Unified architecture enables proper step progress tracking 