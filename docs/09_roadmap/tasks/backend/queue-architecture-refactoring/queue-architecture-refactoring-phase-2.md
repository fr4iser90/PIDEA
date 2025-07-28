# Queue Architecture Refactoring - Phase 2: StepProgressService Removal

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Focus**: StepProgressService Removal & Event Unification
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Dependencies**: Phase 1 completion
- **Created**: 2025-01-28T19:18:51.000Z

## 🎯 Phase Goals
- [ ] Remove StepProgressService completely
- [ ] Enhance QueueMonitoringService with step progress functionality
- [ ] Update all task:step:* event emitters to workflow:step:*
- [ ] Update event listeners in backend services
- [ ] Write integration tests for unified event system

## 📁 Files to Modify

### Backend Services
- [ ] `backend/domain/services/queue/QueueMonitoringService.js` - Enhance with step progress functionality
- [ ] `backend/domain/services/queue/StepProgressService.js` - **DELETE** (functionality moved to QueueMonitoringService)
- [ ] `backend/presentation/websocket/TaskProgressTracker.js` - Update to use workflow events only
- [ ] `backend/infrastructure/external/task-execution/services/CustomTaskService.js` - Update event emissions
- [ ] `backend/infrastructure/external/task-execution/services/ScriptService.js` - Update event emissions

### New Files to Create
- [ ] `backend/tests/integration/EventSystemUnification.test.js` - Integration tests for unified events

## 🔧 Implementation Steps

### Step 1: Enhance QueueMonitoringService (1 hour)
```javascript
// backend/domain/services/queue/QueueMonitoringService.js
class QueueMonitoringService {
  // Add step progress functionality from StepProgressService
  
  async updateStepProgress(projectId, workflowId, stepId, progress) {
    // Enhanced step progress tracking
    // Emits 'workflow:step:progress' instead of 'task:step:progress'
  }
  
  async startStep(projectId, workflowId, stepId, context) {
    // Start step tracking
    // Emits 'workflow:step:started'
  }
  
  async completeStep(projectId, workflowId, stepId, result) {
    // Complete step tracking
    // Emits 'workflow:step:completed'
  }
  
  async failStep(projectId, workflowId, stepId, error) {
    // Fail step tracking
    // Emits 'workflow:step:failed'
  }
}
```

### Step 2: Remove StepProgressService (30 minutes)
```bash
# Remove the file completely
rm backend/domain/services/queue/StepProgressService.js

# Update dependency injection
# Remove StepProgressService from service registry
# Update all imports that reference StepProgressService
```

### Step 3: Update Event Emitters (1 hour)
```javascript
// ❌ OLD: task:step:* events - COMPLETELY REMOVED
// this.eventBus.emit('task:step:progress', { projectId, taskId, stepId, progress });
// this.eventBus.emit('task:step:started', { projectId, taskId, stepId });
// this.eventBus.emit('task:step:completed', { projectId, taskId, stepId, result });
// this.eventBus.emit('task:step:failed', { projectId, taskId, stepId, error });

// ✅ NEW: workflow:step:* events ONLY
this.eventBus.emit('workflow:step:progress', { projectId, workflowId, stepId, progress });
this.eventBus.emit('workflow:step:started', { projectId, workflowId, stepId });
this.eventBus.emit('workflow:step:completed', { projectId, workflowId, stepId, result });
this.eventBus.emit('workflow:step:failed', { projectId, workflowId, stepId, error });
```

### Step 4: Update Event Listeners (30 minutes)
```javascript
// ❌ OLD: Listen to task events - COMPLETELY REMOVED
// eventBus.on('task:step:progress', handleStepProgress);
// eventBus.on('task:step:started', handleStepStarted);
// eventBus.on('task:step:completed', handleStepCompleted);
// eventBus.on('task:step:failed', handleStepFailed);

// ✅ NEW: Listen to workflow events ONLY
eventBus.on('workflow:step:progress', handleStepProgress);
eventBus.on('workflow:step:started', handleStepStarted);
eventBus.on('workflow:step:completed', handleStepCompleted);
eventBus.on('workflow:step:failed', handleStepFailed);
```

## 🧪 Testing Strategy

### Integration Tests for Event Unification
```javascript
// backend/tests/integration/EventSystemUnification.test.js
describe('Event System Unification', () => {
  it('should emit only workflow:step:* events', async () => {
    // Test that no task:step:* events are emitted
  });
  
  it('should handle step progress through workflow events', async () => {
    // Test step progress tracking via workflow events
  });
  
  it('should maintain backward compatibility for existing listeners', async () => {
    // Test that existing workflow event listeners still work
  });
});
```

### Unit Tests for Enhanced QueueMonitoringService
```javascript
// backend/tests/unit/QueueMonitoringService.test.js
describe('QueueMonitoringService Step Progress', () => {
  it('should track step progress correctly', async () => {
    // Test step progress tracking
  });
  
  it('should emit workflow:step:progress events', async () => {
    // Test event emission
  });
  
  it('should handle step completion', async () => {
    // Test step completion
  });
});
```

## 🔍 Code Changes Details

### QueueMonitoringService.js Enhancements
```javascript
// ADD to QueueMonitoringService.js
class QueueMonitoringService {
  // ... existing code ...
  
  /**
   * Enhanced step progress tracking (moved from StepProgressService)
   */
  async updateStepProgress(projectId, workflowId, stepId, progress) {
    try {
      this.logger.debug('Updating step progress', { projectId, workflowId, stepId, progress });

      const projectQueue = this.getProjectQueue(projectId);
      const workflowIndex = projectQueue.findIndex(item => item.id === workflowId);
      
      if (workflowIndex === -1) {
        throw new Error(`Workflow ${workflowId} not found in queue`);
      }

      const workflow = projectQueue[workflowIndex];
      
      // Find the step in the workflow
      const stepIndex = workflow.workflow?.steps?.findIndex(step => step.id === stepId);
      if (stepIndex === -1) {
        throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
      }

      // Update step progress
      const step = workflow.workflow.steps[stepIndex];
      step.progress = Math.min(100, Math.max(0, progress));
      step.lastUpdated = new Date().toISOString();

      // Update overall workflow progress
      const completedSteps = workflow.workflow.steps.filter(step => step.status === 'completed').length;
      const totalSteps = workflow.workflow.steps.length;
      workflow.workflow.progress = Math.round((completedSteps / totalSteps) * 100);

      // Emit workflow event (not task event)
      if (this.eventBus) {
        this.eventBus.emit('workflow:step:progress', {
          projectId,
          workflowId,
          stepId,
          progress,
          step,
          workflow: workflow.workflow
        });
      }

      return workflow;

    } catch (error) {
      this.logger.error('Failed to update step progress', { 
        projectId, 
        workflowId, 
        stepId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Start step tracking
   */
  async startStep(projectId, workflowId, stepId, context = {}) {
    try {
      this.logger.info('Starting step', { projectId, workflowId, stepId });

      const projectQueue = this.getProjectQueue(projectId);
      const workflowIndex = projectQueue.findIndex(item => item.id === workflowId);
      
      if (workflowIndex === -1) {
        throw new Error(`Workflow ${workflowId} not found in queue`);
      }

      const workflow = projectQueue[workflowIndex];
      const stepIndex = workflow.workflow?.steps?.findIndex(step => step.id === stepId);
      
      if (stepIndex === -1) {
        throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
      }

      const step = workflow.workflow.steps[stepIndex];
      step.status = 'running';
      step.startedAt = new Date().toISOString();
      step.progress = 0;

      // Emit workflow event
      if (this.eventBus) {
        this.eventBus.emit('workflow:step:started', {
          projectId,
          workflowId,
          stepId,
          step,
          context
        });
      }

      return workflow;

    } catch (error) {
      this.logger.error('Failed to start step', { 
        projectId, 
        workflowId, 
        stepId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Complete step tracking
   */
  async completeStep(projectId, workflowId, stepId, result = {}) {
    try {
      this.logger.info('Completing step', { projectId, workflowId, stepId });

      const projectQueue = this.getProjectQueue(projectId);
      const workflowIndex = projectQueue.findIndex(item => item.id === workflowId);
      
      if (workflowIndex === -1) {
        throw new Error(`Workflow ${workflowId} not found in queue`);
      }

      const workflow = projectQueue[workflowIndex];
      const stepIndex = workflow.workflow?.steps?.findIndex(step => step.id === stepId);
      
      if (stepIndex === -1) {
        throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
      }

      const step = workflow.workflow.steps[stepIndex];
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.progress = 100;
      step.result = result;

      // Emit workflow event
      if (this.eventBus) {
        this.eventBus.emit('workflow:step:completed', {
          projectId,
          workflowId,
          stepId,
          step,
          result
        });
      }

      return workflow;

    } catch (error) {
      this.logger.error('Failed to complete step', { 
        projectId, 
        workflowId, 
        stepId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fail step tracking
   */
  async failStep(projectId, workflowId, stepId, error) {
    try {
      this.logger.error('Failing step', { projectId, workflowId, stepId, error: error.message });

      const projectQueue = this.getProjectQueue(projectId);
      const workflowIndex = projectQueue.findIndex(item => item.id === workflowId);
      
      if (workflowIndex === -1) {
        throw new Error(`Workflow ${workflowId} not found in queue`);
      }

      const workflow = projectQueue[workflowIndex];
      const stepIndex = workflow.workflow?.steps?.findIndex(step => step.id === stepId);
      
      if (stepIndex === -1) {
        throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
      }

      const step = workflow.workflow.steps[stepIndex];
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
      step.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      // Emit workflow event
      if (this.eventBus) {
        this.eventBus.emit('workflow:step:failed', {
          projectId,
          workflowId,
          stepId,
          step,
          error: step.error
        });
      }

      return workflow;

    } catch (err) {
      this.logger.error('Failed to fail step', { 
        projectId, 
        workflowId, 
        stepId, 
        error: err.message 
      });
      throw err;
    }
  }
}
```

### TaskProgressTracker.js Updates
```javascript
// backend/presentation/websocket/TaskProgressTracker.js
class TaskProgressTracker {
  // ... existing code ...
  
  /**
   * Handle workflow execution progress (updated from task progress)
   */
  handleWorkflowExecutionProgress(data) {
    try {
      const { workflowId, progress, step, message, metrics } = data;
      
      const progressData = this.activeWorkflows.get(workflowId);
      if (!progressData) {
        return;
      }

      // Update progress data
      progressData.progress = progress;
      progressData.currentStep = step;
      progressData.metrics = { ...progressData.metrics, ...metrics };
      
      if (message) {
        progressData.logs.push({
          timestamp: new Date(),
          level: 'info',
          message
        });
      }

      // Add step to steps array if not already present
      if (step && !progressData.steps.find(s => s.name === step)) {
        progressData.steps.push({
          name: step,
          startTime: new Date(),
          progress: progress
        });
      }

      // Update step progress
      const currentStepObj = progressData.steps.find(s => s.name === step);
      if (currentStepObj) {
        currentStepObj.progress = progress;
        currentStepObj.lastUpdate = new Date();
      }

      this.activeWorkflows.set(workflowId, progressData);
      this.updateProgressHistory(workflowId, progressData);

      this.logger.debug('TaskProgressTracker: Workflow progress updated', {
        workflowId,
        progress,
        step
      });

      this.broadcastProgressUpdate(workflowId, 'progress', progressData);

    } catch (error) {
      this.logger.error('TaskProgressTracker: Failed to handle workflow execution progress', {
        error: error.message
      });
    }
  }

  /**
   * Handle workflow execution complete (updated from task complete)
   */
  handleWorkflowExecutionComplete(data) {
    try {
      const { workflowId, result, duration, metrics } = data;
      
      const progressData = this.activeWorkflows.get(workflowId);
      if (!progressData) {
        return;
      }

      // Update progress data
      progressData.status = 'completed';
      progressData.progress = 100;
      progressData.endTime = new Date();
      progressData.duration = duration;
      progressData.result = result;
      progressData.metrics = { ...progressData.metrics, ...metrics };
      progressData.currentStep = 'Completed';

      progressData.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Workflow execution completed successfully'
      });

      this.activeWorkflows.set(workflowId, progressData);
      this.finalizeProgressHistory(workflowId, progressData);

      this.logger.info('TaskProgressTracker: Workflow execution completed', {
        workflowId,
        duration
      });

      this.broadcastProgressUpdate(workflowId, 'complete', progressData);

      // Schedule cleanup
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
      }, 300000); // 5 minutes

    } catch (error) {
      this.logger.error('TaskProgressTracker: Failed to handle workflow execution complete', {
        error: error.message
      });
    }
  }
}
```

## ✅ Success Criteria for Phase 2
- [ ] StepProgressService completely removed
- [ ] QueueMonitoringService enhanced with step progress functionality
- [ ] All task:step:* event emitters completely replaced with workflow:step:*
- [ ] All event listeners updated to use workflow events only
- [ ] Integration tests pass for unified event system
- [ ] No task:step:* events emitted anywhere in codebase
- [ ] Step progress tracking works through workflow events
- [ ] Complete event system replacement - no backward compatibility needed

## 🔄 Next Phase Preparation
- [ ] Frontend event listener updates identified
- [ ] QueueManagementPanel changes planned
- [ ] TaskProgressComponent updates prepared
- [ ] 24/7 automation testing planned

## 📝 Notes
- This phase removes the duplicate event system completely
- All step progress now goes through workflow events ONLY
- QueueMonitoringService becomes the single source of truth for step progress
- Event unification ensures consistent progress tracking
- Complete event system replacement - no backward compatibility needed 