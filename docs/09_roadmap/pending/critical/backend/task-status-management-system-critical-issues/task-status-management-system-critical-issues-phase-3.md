# Phase 3: Integration - Task Status Management System Critical Issues

## 📋 Phase Overview
- **Phase Number**: 3
- **Phase Name**: Integration
- **Estimated Time**: 6 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Phase 2 completion

## 🎯 Phase Objectives
Integrate the core status management services with existing system and fix the file movement logic in TaskStatusTransitionService.

## 📋 Phase Tasks

### 3.1 Fix TaskStatusTransitionService File Movement Logic (2 hours)
- [ ] **Task**: Fix path resolution and file movement logic with DI integration
- [ ] **Location**: `backend/domain/services/task/TaskStatusTransitionService.js`
- [ ] **Purpose**: Resolve file movement failures due to incorrect path assumptions
- [ ] **Key Changes**:
  - Fix path resolution logic (lines 153-197)
  - Implement proper file location detection
  - Add error handling and recovery
  - Integrate with TaskFileLocationService via DI
  - Remove unreliable fallback logic
  - Update constructor to use DI services
- [ ] **Dependencies**: TaskFileLocationService, TaskContentHashService, TaskEventStore from DI

### 3.2 Create TaskFileLocationService (2 hours)
- [ ] **Task**: Implement consistent task file location management with DI
- [ ] **Location**: `backend/domain/services/task/TaskFileLocationService.js`
- [ ] **Purpose**: Provide consistent path resolution across all services
- [ ] **Key Features**:
  - Standardized path resolution
  - File location caching
  - Path validation and sanitization
  - Error recovery for missing files
  - DI-compatible constructor
- [ ] **Dependencies**: File system service, task repository from DI

### 3.3 Integrate Content Hash Validation with Task Operations (1 hour)
- [ ] **Task**: Add content hash validation to existing task operations via DI
- [ ] **Location**: `backend/domain/services/task/TaskService.js`
- [ ] **Purpose**: Ensure data integrity through content hashing
- [ ] **Key Features**:
  - Content hash validation before status updates
  - Hash-based change detection
  - Content integrity verification
  - DI-based service integration
- [ ] **Dependencies**: TaskContentHashService, TaskStatusValidator from DI

### 3.4 Connect Event Sourcing with Task Status Changes (1 hour)
- [ ] **Task**: Integrate event sourcing with task status transitions via DI
- [ ] **Location**: `backend/domain/services/task/TaskStatusTransitionService.js`
- [ ] **Purpose**: Track all status changes as events for audit and replay
- [ ] **Key Features**:
  - Event emission for status changes
  - Event data serialization
  - Event versioning
  - DI-based TaskEventStore integration
- [ ] **Dependencies**: TaskEventStore from DI

## 🔧 Technical Implementation Details

### ServiceRegistry Updates for Phase 3
```javascript
// In ServiceRegistry.js - registerDomainServices() method
registerDomainServices() {
    this.logger.info('Registering domain services...');
    
    // ... existing services from Phase 1 & 2 ...

    // TaskFileLocationService - Consistent path resolution
    this.container.register('taskFileLocationService', (fileSystemService, taskRepository) => {
        const TaskFileLocationService = require('@domain/services/task/TaskFileLocationService');
        return new TaskFileLocationService(fileSystemService, taskRepository);
    }, { singleton: true, dependencies: ['fileSystemService', 'taskRepository'] });

    // Update TaskStatusTransitionService with new dependencies
    this.container.register('taskStatusTransitionService', (taskRepository, fileSystemService, eventBus, taskFileLocationService, taskEventStore, taskContentHashService) => {
        const TaskStatusTransitionService = require('@domain/services/task/TaskStatusTransitionService');
        return new TaskStatusTransitionService(taskRepository, fileSystemService, eventBus, taskFileLocationService, taskEventStore, taskContentHashService);
    }, { singleton: true, dependencies: ['taskRepository', 'fileSystemService', 'eventBus', 'taskFileLocationService', 'taskEventStore', 'taskContentHashService'] });

    // Update TaskService with additional dependencies
    this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService, queueTaskExecutionService, fileSystemService, eventBus, taskContentHashService, taskStatusValidator, taskStatusTransitionService) => {
        const TaskService = require('@domain/services/task/TaskService');
        return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService, null, null, queueTaskExecutionService, fileSystemService, eventBus, this, taskContentHashService, taskStatusValidator, taskStatusTransitionService);
    }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService', 'queueTaskExecutionService', 'fileSystemService', 'eventBus', 'taskContentHashService', 'taskStatusValidator', 'taskStatusTransitionService'] });
}
```

### TaskFileLocationService Implementation
```javascript
class TaskFileLocationService {
  constructor(fileSystemService, taskRepository) {
    this.fileSystemService = fileSystemService;
    this.taskRepository = taskRepository;
    this.logger = new Logger('TaskFileLocationService');
    this.pathCache = new Map(); // Cache for resolved paths
  }

  generatePossiblePaths(task) {
    const { status, priority, category, metadata } = task;
    const taskName = metadata?.name || task.title?.toLowerCase().replace(/\s+/g, '-') || 'unknown-task';
    
    const basePaths = [
      // Current structure
      `docs/09_roadmap/${status}/${priority}/${category}/${taskName}/`,
      `docs/09_roadmap/${status}/${category}/${taskName}/`,
      `docs/09_roadmap/pending/${priority}/${category}/${taskName}/`,
      
      // Legacy structures
      `docs/09_roadmap/${status}/${taskName}/`,
      `docs/09_roadmap/${category}/${taskName}/`,
      `docs/09_roadmap/${taskName}/`
    ];

    // Add completed task paths with quarter
    if (status === 'completed' && task.completedAt) {
      const quarter = this.getCompletionQuarter(task.completedAt);
      basePaths.unshift(`docs/09_roadmap/completed/${quarter}/${category}/${taskName}/`);
    }

    return basePaths;
  }

  getCompletionQuarter(completedAt) {
    const date = new Date(completedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }

  async validateFilePath(filePath) {
    try {
      // Sanitize path to prevent directory traversal
      const sanitizedPath = path.normalize(filePath);
      if (sanitizedPath.includes('..')) {
        throw new Error('Path traversal detected');
      }
      
      return await this.fileSystemService.exists(sanitizedPath);
    } catch (error) {
      this.logger.error(`Error validating file path ${filePath}:`, error);
      return false;
    }
  }
}
```

### TaskStatusTransitionService Fixes
```javascript
// Key fixes to TaskStatusTransitionService.js

class TaskStatusTransitionService {
  constructor(taskRepository, fileSystemService, eventBus = null, taskFileLocationService, taskEventStore) {
    // ... existing constructor code ...
    this.taskFileLocationService = taskFileLocationService;
    this.taskEventStore = taskEventStore;
  }

  async moveTaskToCompleted(taskId) {
    try {
      this.logger.info(`🔄 Moving task ${taskId} to completed status`);

      // 1. Get task details
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // 2. Resolve current file path using TaskFileLocationService
      const currentPath = await this.taskFileLocationService.resolveTaskFilePath(taskId);
      this.logger.info(`📁 Current task path resolved: ${currentPath}`);

      // 3. Generate new path for completed status
      const newPath = this.generateNewStatusBasedPath('completed', task.priority, task.category, task.title);
      
      // 4. Move files with proper error handling
      await this.moveTaskFiles(currentPath, newPath, taskId);
      
      // 5. Update database with new status and content hash
      const fileContent = await this.fileSystemService.readFile(`${newPath}/task-implementation.md`);
      const contentHash = await this.taskContentHashService.generateContentHash(fileContent);
      
      await this.taskRepository.update(taskId, {
        status: 'completed',
        contentHash,
        filePath: newPath,
        lastSyncedAt: new Date(),
        completedAt: new Date()
      });

      // 6. Emit event for audit trail
      await this.taskEventStore.appendEvent({
        type: 'TaskStatusChanged',
        taskId,
        oldStatus: task.status,
        newStatus: 'completed',
        oldPath: currentPath,
        newPath,
        contentHash,
        timestamp: new Date()
      });

      // 7. Emit event bus notification
      if (this.eventBus) {
        await this.eventBus.emit('task.status.changed', {
          taskId,
          oldStatus: task.status,
          newStatus: 'completed',
          oldPath: currentPath,
          newPath
        });
      }

      this.logger.info(`✅ Task ${taskId} successfully moved to completed status`);
      
      return {
        success: true,
        taskId,
        oldStatus: task.status,
        newStatus: 'completed',
        oldPath: currentPath,
        newPath
      };

    } catch (error) {
      this.logger.error(`❌ Failed to move task ${taskId} to completed:`, error);
      throw error;
    }
  }

  async moveTaskFiles(oldPath, newPath, taskId) {
    try {
      // Ensure destination directory exists
      await this.fileSystemService.mkdir(newPath, { recursive: true });
      
      // Move all files from old path to new path
      const files = await this.fileSystemService.readdir(oldPath);
      
      for (const file of files) {
        if (!file.startsWith('.') && !file.endsWith('.gitkeep')) {
          const sourceFile = path.join(oldPath, file);
          const destFile = path.join(newPath, file);
          
          await this.fileSystemService.copyFile(sourceFile, destFile);
          this.logger.debug(`📄 Moved file: ${file}`);
        }
      }
      
      // Remove old directory if empty
      const remainingFiles = await this.fileSystemService.readdir(oldPath);
      const actualFiles = remainingFiles.filter(file => 
        !file.startsWith('.') && !file.endsWith('.gitkeep')
      );
      
      if (actualFiles.length === 0) {
        await this.fileSystemService.rmdir(oldPath);
        this.logger.debug(`🗑️ Removed empty directory: ${oldPath}`);
      }
      
    } catch (error) {
      this.logger.error(`Error moving files from ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }
}
```

### TaskService Integration
```javascript
// Key changes to TaskService.js

class TaskService {
  constructor(/* ... existing parameters ... */, taskContentHashService, taskStatusValidator) {
    // ... existing constructor code ...
    this.taskContentHashService = taskContentHashService;
    this.taskStatusValidator = taskStatusValidator;
  }

  async updateTaskStatus(taskId, newStatus) {
    try {
      // Validate current status consistency
      const validation = await this.taskStatusValidator.validateTaskStatusConsistency(taskId);
      
      if (!validation.isConsistent) {
        this.logger.warn(`Status inconsistency detected for task ${taskId}, synchronizing...`);
        await this.taskStatusValidator.synchronizeTaskStatus(taskId, true);
      }

      // Update status with content hash validation
      const task = await this.taskRepository.findById(taskId);
      const fileContent = await this.fileSystemService.readFile(task.filePath);
      const contentHash = await this.taskContentHashService.generateContentHash(fileContent);
      
      await this.taskRepository.update(taskId, {
        status: newStatus,
        contentHash,
        lastSyncedAt: new Date()
      });

      this.logger.info(`Task ${taskId} status updated to: ${newStatus}`);
      return { success: true, taskId, newStatus };
      
    } catch (error) {
      this.logger.error(`Error updating task status for ${taskId}:`, error);
      throw error;
    }
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
- [ ] **TaskFileLocationService**: Test path resolution, caching, validation
- [ ] **TaskStatusTransitionService**: Test file movement, error handling
- [ ] **TaskService**: Test status update integration
- [ ] **Mock Requirements**: File system operations, database connections, event store

### Integration Tests
- [ ] **File Movement**: Test end-to-end file movement operations
- [ ] **Path Resolution**: Test path resolution with real file system
- [ ] **Event Sourcing**: Test event emission and storage
- [ ] **Status Synchronization**: Test status consistency across services

## 📊 Success Criteria
- [ ] TaskStatusTransitionService file movement logic fixed
- [ ] TaskFileLocationService implemented with consistent path resolution
- [ ] Content hash validation integrated with task operations
- [ ] Event sourcing connected to status changes
- [ ] File movement operations work reliably
- [ ] Path resolution handles all task locations correctly
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code coverage > 90% for modified services

## 🔄 Phase Dependencies
- **Input**: Phase 2 core implementation
- **Output**: Integrated status management system
- **Blockers**: None
- **Enables**: Testing and documentation in Phase 4

## 📝 Phase Notes
This phase integrates the core services with the existing system and fixes the critical file movement failures. The TaskFileLocationService provides reliable path resolution, while the event sourcing ensures all changes are tracked for audit and replay.

## 🚀 Next Phase Preview
Phase 4 will focus on testing and documentation to ensure the system is well-documented.
