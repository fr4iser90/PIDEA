# Phase 3: Integration & Testing

## 📋 Phase Overview
- **Phase**: 3
- **Name**: Integration & Testing
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Integrate the TaskStatusSyncStep with existing services and implement comprehensive testing.

## 📝 Tasks

### Task 3.1: Integrate with ManualTasksImportService (30 minutes)
- [ ] Modify `ManualTasksImportService._importFromWorkspace()` method
- [ ] Add sync step execution after import completion
- [ ] Pass imported task IDs to sync step
- [ ] Handle sync step errors gracefully
- [ ] Add configuration options for sync behavior
- [ ] Update import service logging

### Task 3.2: Add Step Registration (15 minutes)
- [ ] Register TaskStatusSyncStep in StepRegistry
- [ ] Add step to StepClassifier as critical step
- [ ] Update step index exports
- [ ] Configure step dependencies
- [ ] Add step metadata and documentation
- [ ] Validate step registration

### Task 3.3: Write Comprehensive Unit Tests (45 minutes)
- [ ] Create `backend/tests/unit/TaskStatusSyncStep.test.js` test file
- [ ] Mock all external dependencies (TaskRepository, TaskStatusTransitionService, fs)
- [ ] Test file status detection with various markdown formats
- [ ] Test database status comparison logic
- [ ] Test status mismatch detection algorithm
- [ ] Test automatic status transitions
- [ ] Test batch processing functionality
- [ ] Test error handling scenarios
- [ ] Test edge cases and malformed data
- [ ] Achieve 90%+ test coverage

### Task 3.4: Create Integration Tests (30 minutes)
- [ ] Create `backend/tests/integration/TaskStatusSyncStep.test.js` test file
- [ ] Test with real database and file system
- [ ] Test full sync workflow end-to-end
- [ ] Test integration with ManualTasksImportService
- [ ] Test performance with large task sets
- [ ] Test error recovery and rollback scenarios
- [ ] Test event emission and monitoring
- [ ] Validate real-world scenarios

## 🔧 Technical Implementation

### ManualTasksImportService Integration
```javascript
// In ManualTasksImportService._importFromWorkspace()
async _importFromWorkspace(workspacePath, projectId) {
  try {
    // ... existing import logic ...
    
    // After successful import, sync task statuses
    if (importedTasks.length > 0) {
      logger.info(`🔄 Starting task status sync for ${importedTasks.length} imported tasks`);
      
      try {
        const syncResult = await this.stepRegistry.executeStep('TaskStatusSyncStep', {
          projectId,
          importedTasks: importedTasks.map(t => t.id),
          validateFileStatus: true,
          autoMoveFiles: true,
          batchSize: 50
        });
        
        logger.info(`✅ Task status sync completed:`, {
          syncedTasks: syncResult.result?.syncedTasks || 0,
          mismatchesFound: syncResult.result?.mismatchesFound || 0,
          filesMoved: syncResult.result?.filesMoved || 0
        });
      } catch (syncError) {
        logger.error('❌ Task status sync failed:', syncError);
        // Don't fail the import if sync fails
      }
    }
    
    return {
      success: true,
      importedCount: importedTasks.length,
      totalFiles: totalProcessedFiles,
      workspacePath,
      syncCompleted: syncResult?.success || false
    };
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Step Registration
```javascript
// In StepRegistry initialization
await this.registerStep('TaskStatusSyncStep', {
  name: 'TaskStatusSyncStep',
  type: 'sync',
  description: 'Synchronizes task status between filesystem and database',
  category: 'task',
  version: '1.0.0',
  dependencies: ['TaskRepository', 'TaskStatusTransitionService'],
  settings: {
    timeout: 30000,
    batchSize: 50,
    validateFileStatus: true,
    autoMoveFiles: true
  }
}, 'task', TaskStatusSyncStep);
```

### Unit Test Structure
```javascript
describe('TaskStatusSyncStep', () => {
  let step;
  let mockTaskRepository;
  let mockStatusTransitionService;
  let mockFs;

  beforeEach(() => {
    // Setup mocks
    mockTaskRepository = {
      findById: jest.fn(),
      findByProjectId: jest.fn(),
      update: jest.fn()
    };
    
    mockStatusTransitionService = {
      moveTaskToCompleted: jest.fn(),
      moveTaskToInProgress: jest.fn(),
      moveTaskToPending: jest.fn()
    };
    
    mockFs = {
      readFile: jest.fn(),
      access: jest.fn(),
      mkdir: jest.fn(),
      rename: jest.fn()
    };
    
    step = new TaskStatusSyncStep();
    step.taskRepository = mockTaskRepository;
    step.statusTransitionService = mockStatusTransitionService;
    step.fs = mockFs;
  });

  describe('detectFileStatus', () => {
    it('should detect completed status from markdown', async () => {
      // Test implementation
    });
    
    it('should handle malformed markdown gracefully', async () => {
      // Test implementation
    });
  });

  describe('detectStatusMismatches', () => {
    it('should find tasks with status mismatches', async () => {
      // Test implementation
    });
  });

  describe('syncTaskStatus', () => {
    it('should trigger status transition for mismatched tasks', async () => {
      // Test implementation
    });
  });
});
```

### Integration Test Structure
```javascript
describe('TaskStatusSyncStep Integration', () => {
  let step;
  let realTaskRepository;
  let realStatusTransitionService;

  beforeAll(async () => {
    // Setup real services
    realTaskRepository = await getService('taskRepository');
    realStatusTransitionService = await getService('statusTransitionService');
    
    step = new TaskStatusSyncStep();
    step.taskRepository = realTaskRepository;
    step.statusTransitionService = realStatusTransitionService;
  });

  describe('End-to-End Sync Workflow', () => {
    it('should sync task statuses with real database and files', async () => {
      // Create test tasks with known status mismatches
      // Execute sync step
      // Verify results
    });
  });

  describe('Performance Testing', () => {
    it('should handle large task sets efficiently', async () => {
      // Create 100+ test tasks
      // Measure execution time
      // Verify performance requirements
    });
  });
});
```

## ✅ Success Criteria
- [ ] Integration with ManualTasksImportService working
- [ ] Step properly registered in StepRegistry
- [ ] Unit tests achieving 90%+ coverage
- [ ] Integration tests passing with real services
- [ ] Performance requirements met
- [ ] Error handling validated
- [ ] All test scenarios covered
- [ ] No regressions in existing functionality

## 🔗 Dependencies
- **Prerequisites**: Phase 2 completed
- **Required Services**: TaskRepository, TaskStatusTransitionService, StepRegistry
- **Testing Dependencies**: Jest, test database, mock services

## 📊 Progress Tracking
- **Started**: [Date]
- **Completed**: [Date]
- **Time Spent**: [Hours]
- **Issues Encountered**: [List any issues]
- **Next Phase**: Documentation & Validation

## 📝 Notes
- Focus on comprehensive test coverage
- Ensure integration doesn't break existing functionality
- Test with realistic data scenarios
- Validate performance under load
