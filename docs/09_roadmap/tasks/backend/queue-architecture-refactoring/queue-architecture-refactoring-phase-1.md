# Queue Architecture Refactoring - Phase 1: TaskService Refactoring

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Focus**: TaskService Refactoring
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Dependencies**: None
- **Created**: 2025-01-28T19:18:51.000Z

## 🎯 Phase Goals
- [ ] Create QueueTaskExecutionService for queue-based task execution
- [ ] Refactor TaskService.executeTask() to use queue system instead of direct execution
- [ ] Update TaskApplicationService to use new queue-based approach
- [ ] Update TaskController to handle queue-based responses
- [ ] Write comprehensive unit tests for new service

## 📁 Files to Modify

### Backend Services
- [ ] `backend/domain/services/task/TaskService.js` - Refactor executeTask() method
- [ ] `backend/application/services/TaskApplicationService.js` - Update executeTask() method
- [ ] `backend/presentation/api/TaskController.js` - Update executeTask endpoint

### New Files to Create
- [ ] `backend/domain/services/queue/QueueTaskExecutionService.js` - New service for queue-based task execution
- [ ] `backend/tests/unit/QueueTaskExecutionService.test.js` - Unit tests for new service

## 🔧 Implementation Steps

### Step 1: Create QueueTaskExecutionService (1 hour)
```javascript
// backend/domain/services/queue/QueueTaskExecutionService.js
class QueueTaskExecutionService {
  constructor(dependencies = {}) {
    this.queueMonitoringService = dependencies.queueMonitoringService;
    this.taskRepository = dependencies.taskRepository;
    this.eventBus = dependencies.eventBus;
    this.logger = new ServiceLogger('QueueTaskExecutionService');
  }

  async addTaskToQueue(projectId, userId, taskId, options = {}) {
    // 1. Validate task exists and belongs to project
    // 2. Create queue item with task metadata
    // 3. Add to queue with proper priority
    // 4. Emit queue:item:added event
    // 5. Return queue item ID
  }

  async getTaskExecutionStatus(queueItemId) {
    // 1. Get queue item from QueueMonitoringService
    // 2. Return execution status with progress
  }

  async cancelTaskExecution(queueItemId) {
    // 1. Cancel queue item
    // 2. Emit queue:item:cancelled event
  }
}
```

### Step 2: Refactor TaskService.executeTask() (1 hour)
```javascript
// backend/domain/services/task/TaskService.js
async executeTask(taskId, userId, options = {}) {
  // ❌ OLD: Direct execution
  // const task = await this.taskRepository.findById(taskId);
  // const stepResult = await stepRegistry.executeStep(step.step, stepContext);
  
  // ✅ NEW: Queue-based execution
  const queueItem = await this.queueTaskExecutionService.addTaskToQueue(
    options.projectId,
    userId,
    taskId,
    options
  );
  
  return {
    success: true,
    queueItemId: queueItem.id,
    status: 'queued',
    message: 'Task added to queue for execution'
  };
}
```

### Step 3: Update TaskApplicationService (30 minutes)
```javascript
// backend/application/services/TaskApplicationService.js
async executeTask(taskId, projectId, userId, options = {}) {
  // Update to handle queue-based responses
  const execution = await this.taskService.executeTask(taskId, userId, {
    ...options,
    projectId
  });
  
  return {
    taskId: execution.taskId,
    queueItemId: execution.queueItemId,
    status: execution.status,
    message: execution.message
  };
}
```

### Step 4: Update TaskController (30 minutes)
```javascript
// backend/presentation/api/TaskController.js
async executeTask(req, res) {
  // Update response format for queue-based execution
  const execution = await this.taskApplicationService.executeTask(id, projectId, userId, options);
  
  res.json({
    success: true,
    data: {
      taskId: execution.taskId,
      queueItemId: execution.queueItemId,
      status: execution.status,
      message: execution.message
    }
  });
}
```

## 🧪 Testing Strategy

### Unit Tests for QueueTaskExecutionService
```javascript
// backend/tests/unit/QueueTaskExecutionService.test.js
describe('QueueTaskExecutionService', () => {
  describe('addTaskToQueue', () => {
    it('should add task to queue with proper metadata', async () => {
      // Test queue item creation
    });
    
    it('should validate task exists and belongs to project', async () => {
      // Test validation logic
    });
    
    it('should emit queue:item:added event', async () => {
      // Test event emission
    });
  });
  
  describe('getTaskExecutionStatus', () => {
    it('should return execution status from queue', async () => {
      // Test status retrieval
    });
  });
  
  describe('cancelTaskExecution', () => {
    it('should cancel queue item and emit event', async () => {
      // Test cancellation
    });
  });
});
```

### Integration Tests
```javascript
// backend/tests/integration/QueueTaskExecution.test.js
describe('Queue Task Execution Integration', () => {
  it('should execute task through queue system', async () => {
    // Test end-to-end queue execution
  });
  
  it('should handle task execution errors gracefully', async () => {
    // Test error handling
  });
});
```

## 🔍 Code Changes Details

### TaskService.js Changes
```javascript
// OLD CODE (lines 166-320)
async executeTask(taskId, userId, options = {}) {
  // Direct step execution with StepRegistry
  const stepResult = await stepRegistry.executeStep(step.step, stepContext);
  // Emits 'task:step:progress' events
}

// NEW CODE
async executeTask(taskId, userId, options = {}) {
  this.logger.info('🔍 [TaskService] executeTask called with queue system:', { taskId, options });
  
  try {
    // Validate task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Add to queue instead of direct execution
    const queueItem = await this.queueTaskExecutionService.addTaskToQueue(
      options.projectId,
      userId,
      taskId,
      {
        priority: options.priority || 'normal',
        createGitBranch: options.createGitBranch || false,
        branchName: options.branchName,
        autoExecute: options.autoExecute || true
      }
    );
    
    this.logger.info('✅ [TaskService] Task added to queue successfully', {
      taskId,
      queueItemId: queueItem.id
    });
    
    return {
      success: true,
      taskId: task.id,
      queueItemId: queueItem.id,
      status: 'queued',
      message: `Task "${task.title}" added to queue for execution`
    };
    
  } catch (error) {
    this.logger.error('❌ [TaskService] Failed to add task to queue:', error.message);
    throw error;
  }
}
```

### TaskApplicationService.js Changes
```javascript
// OLD CODE (lines 236-281)
async executeTask(taskId, projectId, userId, options = {}) {
  // Direct execution with progress tracking
  const execution = await this.taskService.executeTask(taskId, userId, {
    ...options,
    projectId,
    workspacePath,
    enableCategories: true
  });
  
  return {
    taskId: execution.taskId,
    executionId: execution.executionId,
    status: execution.status,
    progress: execution.progress,
    result: execution.result
  };
}

// NEW CODE
async executeTask(taskId, projectId, userId, options = {}) {
  this.logger.info(`🚀 Executing task: ${taskId} for project: ${projectId} via queue`);
  
  try {
    // Validate task belongs to project
    const task = await this.getTask(taskId, projectId);
    
    // Execute task using queue system
    const execution = await this.taskService.executeTask(taskId, userId, {
      ...options,
      projectId
    });
    
    this.logger.info(`✅ Task queued successfully: ${taskId}`);
    
    return {
      taskId: execution.taskId,
      queueItemId: execution.queueItemId,
      status: execution.status,
      message: execution.message,
      queuedAt: new Date().toISOString()
    };
    
  } catch (error) {
    this.logger.error('❌ Task queueing failed:', error);
    throw new Error(`Task queueing failed: ${error.message}`);
  }
}
```

## ✅ Success Criteria for Phase 1
- [ ] QueueTaskExecutionService created and tested
- [ ] TaskService.executeTask() refactored to use queue system
- [ ] TaskApplicationService updated for queue-based responses
- [ ] TaskController updated for new response format
- [ ] All unit tests pass
- [ ] No direct task execution bypassing queue
- [ ] Tasks properly added to queue with metadata
- [ ] Queue events emitted correctly

## 🔄 Next Phase Preparation
- [ ] QueueTaskExecutionService integrated with QueueMonitoringService
- [ ] StepProgressService removal planned
- [ ] Event system unification prepared
- [ ] Frontend changes identified

## 📝 Notes
- This phase focuses on backend refactoring only
- Frontend changes will be handled in Phase 3
- Queue system must handle task metadata properly
- Event emission must be consistent with existing queue events
- Error handling must be robust for queue operations 