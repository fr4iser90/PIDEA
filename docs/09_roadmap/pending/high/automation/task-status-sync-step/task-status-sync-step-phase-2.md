# Phase 2: Core Sync Logic

## 📋 Phase Overview
- **Phase**: 2
- **Name**: Core Sync Logic
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Implement the core synchronization logic that detects status mismatches and triggers appropriate transitions.

## 📝 Tasks

### Task 2.1: Implement File Status Detection (45 minutes)
- [ ] Create `detectFileStatus(taskId, filePath)` method
- [ ] Parse markdown files for status information
- [ ] Extract status from task implementation files
- [ ] Handle different markdown formats and structures
- [ ] Validate extracted status against supported statuses
- [ ] Add error handling for malformed files

### Task 2.2: Add Database Status Comparison (30 minutes)
- [ ] Create `getDatabaseStatus(taskId)` method
- [ ] Query TaskRepository for current task status
- [ ] Handle database connection errors gracefully
- [ ] Add caching for repeated queries
- [ ] Implement status normalization (in-progress vs in_progress)
- [ ] Add validation for status consistency

### Task 2.3: Create Status Mismatch Detection (45 minutes)
- [ ] Implement `detectStatusMismatches(projectId)` method
- [ ] Compare file status vs database status for all tasks
- [ ] Identify tasks requiring status synchronization
- [ ] Categorize mismatches by type (file ahead, database ahead, invalid)
- [ ] Generate mismatch report with details
- [ ] Add filtering options for specific statuses

### Task 2.4: Implement Automatic Status Transitions (45 minutes)
- [ ] Create `syncTaskStatus(taskId)` method
- [ ] Use TaskStatusTransitionService for status changes
- [ ] Handle different transition scenarios (pending→completed, in-progress→completed)
- [ ] Implement file movement coordination
- [ ] Add rollback mechanism for failed transitions
- [ ] Emit events for status changes

### Task 2.5: Add Batch Processing (30 minutes)
- [ ] Implement `batchSyncTasks(taskIds)` method
- [ ] Process multiple tasks efficiently
- [ ] Add progress tracking for batch operations
- [ ] Implement parallel processing where safe
- [ ] Add batch size configuration
- [ ] Handle partial failures in batch operations

### Task 2.6: Create File Path Normalization (15 minutes)
- [ ] Implement `normalizeTaskName(taskName)` method
- [ ] Handle special characters and spaces
- [ ] Create consistent directory naming
- [ ] Add validation for path safety
- [ ] Handle edge cases (empty names, special characters)

## 🔧 Technical Implementation

### Core Methods Structure
```javascript
class TaskStatusSyncStep {
  // File status detection
  async detectFileStatus(taskId, filePath) {
    // Parse markdown for status information
    // Return normalized status
  }

  // Database status retrieval
  async getDatabaseStatus(taskId) {
    // Query TaskRepository
    // Return current database status
  }

  // Mismatch detection
  async detectStatusMismatches(projectId) {
    // Compare file vs database status
    // Return list of mismatches
  }

  // Individual task sync
  async syncTaskStatus(taskId) {
    // Trigger status transition
    // Coordinate file movement
  }

  // Batch processing
  async batchSyncTasks(taskIds) {
    // Process multiple tasks
    // Handle progress and errors
  }
}
```

### Status Detection Logic
```javascript
async detectFileStatus(taskId, filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Extract status from markdown content
    const statusMatch = content.match(/status[:\s]*([a-zA-Z-]+)/i);
    const progressMatch = content.match(/progress[:\s]*(\d+)%/i);
    
    // Normalize status
    const status = this.normalizeStatus(statusMatch?.[1] || 'pending');
    const progress = parseInt(progressMatch?.[1] || '0');
    
    return { status, progress, source: 'file' };
  } catch (error) {
    this.logger.warn(`Failed to detect file status for ${taskId}:`, error);
    return { status: 'unknown', progress: 0, source: 'error' };
  }
}
```

### Mismatch Detection Algorithm
```javascript
async detectStatusMismatches(projectId) {
  const mismatches = [];
  const tasks = await this.taskRepository.findByProjectId(projectId);
  
  for (const task of tasks) {
    const fileStatus = await this.detectFileStatus(task.id, task.sourcePath);
    const dbStatus = await this.getDatabaseStatus(task.id);
    
    if (fileStatus.status !== dbStatus.status) {
      mismatches.push({
        taskId: task.id,
        taskTitle: task.title,
        fileStatus: fileStatus.status,
        databaseStatus: dbStatus.status,
        fileProgress: fileStatus.progress,
        databaseProgress: dbStatus.progress,
        mismatchType: this.categorizeMismatch(fileStatus.status, dbStatus.status)
      });
    }
  }
  
  return mismatches;
}
```

## ✅ Success Criteria
- [ ] File status detection working accurately
- [ ] Database status comparison implemented
- [ ] Status mismatch detection functional
- [ ] Automatic status transitions working
- [ ] Batch processing efficient and reliable
- [ ] File path normalization consistent
- [ ] Error handling comprehensive
- [ ] All methods properly tested

## 🔗 Dependencies
- **Prerequisites**: Phase 1 completed
- **Required Services**: TaskRepository, TaskStatusTransitionService
- **External Dependencies**: fs.promises, path module, markdown parsing

## 📊 Progress Tracking
- **Started**: [Date]
- **Completed**: [Date]
- **Time Spent**: [Hours]
- **Issues Encountered**: [List any issues]
- **Next Phase**: Integration & Testing

## 📝 Notes
- Focus on accuracy of status detection
- Ensure robust error handling
- Optimize for performance with large task sets
- Maintain consistency with existing status values
