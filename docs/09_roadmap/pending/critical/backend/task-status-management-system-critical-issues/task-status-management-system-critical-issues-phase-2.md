# Phase 2: Core Implementation - Task Status Management System Critical Issues

## 📋 Phase Overview
- **Phase Number**: 2
- **Phase Name**: Core Implementation
- **Estimated Time**: 8 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: Phase 1 completion

## 🎯 Phase Objectives
Implement the core status management logic with unified markdown parsing, status validation, and content hash integration.

## 📋 Phase Tasks

### 2.1 Refactor ManualTasksImportService (3 hours)
- [ ] **Task**: Remove directory-based status detection, implement markdown-only parsing with DI
- [ ] **Location**: `backend/domain/services/task/ManualTasksImportService.js`
- [ ] **Purpose**: Establish single source of truth for task status from markdown content
- [ ] **Key Changes**:
  - Remove directory path status detection (lines 276-290)
  - Implement unified status extraction from markdown content
  - Replace 12+ regex patterns with single, robust pattern
  - Integrate content hash generation via DI
  - Remove conflicting status sources
  - Update constructor to use DI services
- [ ] **Dependencies**: TaskContentHashService, UnifiedStatusExtractor from DI

### 2.2 Create TaskStatusValidator Service (2 hours)
- [ ] **Task**: Implement status consistency validation service with DI
- [ ] **Location**: `backend/domain/services/task/TaskStatusValidator.js`
- [ ] **Purpose**: Validate status consistency between markdown files and database
- [ ] **Key Features**:
  - Status consistency validation
  - Automatic conflict resolution
  - Status synchronization
  - Validation reporting
  - DI-based constructor with automatic dependency injection
- [ ] **Dependencies**: TaskContentHashService, TaskRepository, UnifiedStatusExtractor from DI

### 2.3 Implement Unified Status Extraction (2 hours)
- [ ] **Task**: Create single, robust status extraction from markdown content
- [ ] **Location**: `backend/domain/services/task/UnifiedStatusExtractor.js`
- [ ] **Purpose**: Replace complex regex patterns with unified approach
- [ ] **Key Features**:
  - Single regex pattern for status detection
  - Support for all status formats (pending, in_progress, completed, etc.)
  - Emoji support (✅, ❌, ⏳, 🔄, 🚫, 🎉)
  - Markdown format support (**Status**: ✅ COMPLETED)
  - Fallback to 'pending' for unknown status
  - DI-compatible constructor
- [ ] **Dependencies**: None (stateless service)

### 2.4 Register Additional Services in DI System (1 hour)
- [ ] **Task**: Register TaskStatusValidator and update existing services in ServiceRegistry
- [ ] **Location**: `backend/infrastructure/dependency-injection/ServiceRegistry.js`
- [ ] **Purpose**: Complete DI integration for all new services
- [ ] **Key Features**:
  - Register TaskStatusValidator with proper dependencies
  - Update ManualTasksImportService registration to include new dependencies
  - Update TaskService registration to include new services
  - Verify dependency resolution order
- [ ] **Dependencies**: ServiceRegistry, all new services

## 🔧 Technical Implementation Details

### ServiceRegistry Updates for Phase 2
```javascript
// In ServiceRegistry.js - registerDomainServices() method
registerDomainServices() {
    this.logger.info('Registering domain services...');
    
    // ... existing services from Phase 1 ...

    // TaskStatusValidator - Status consistency validation
    this.container.register('taskStatusValidator', (taskRepository, taskContentHashService, unifiedStatusExtractor) => {
        const TaskStatusValidator = require('@domain/services/task/TaskStatusValidator');
        return new TaskStatusValidator(taskRepository, taskContentHashService, unifiedStatusExtractor);
    }, { singleton: true, dependencies: ['taskRepository', 'taskContentHashService', 'unifiedStatusExtractor'] });

    // Update ManualTasksImportService with new dependencies
    this.container.register('manualTasksImportService', (browserManager, taskService, taskRepository, fileSystemService, taskContentHashService, unifiedStatusExtractor) => {
        const ManualTasksImportService = require('@domain/services/task/ManualTasksImportService');
        return new ManualTasksImportService(browserManager, taskService, taskRepository, fileSystemService, taskContentHashService, unifiedStatusExtractor);
    }, { singleton: true, dependencies: ['browserManager', 'taskService', 'taskRepository', 'fileSystemService', 'taskContentHashService', 'unifiedStatusExtractor'] });

    // Update TaskService with new dependencies
    this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService, queueTaskExecutionService, fileSystemService, eventBus, taskContentHashService, taskStatusValidator) => {
        const TaskService = require('@domain/services/task/TaskService');
        return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService, null, null, queueTaskExecutionService, fileSystemService, eventBus, this, taskContentHashService, taskStatusValidator);
    }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService', 'queueTaskExecutionService', 'fileSystemService', 'eventBus', 'taskContentHashService', 'taskStatusValidator'] });
}
```

### UnifiedStatusExtractor Implementation
```javascript
class UnifiedStatusExtractor {
  constructor() {
    this.logger = new Logger('UnifiedStatusExtractor');
    
    // Single, robust regex pattern for all status formats
    this.statusPattern = /(?:Status|status|\*\*Status\*\*).*?(?:✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z_\-]+)/i;
    
    // Status mapping for normalization
    this.statusMapping = {
      'pending': 'pending',
      'in_progress': 'in_progress',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'blocked': 'blocked',
      'cancelled': 'cancelled',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'paused': 'paused'
    };
  }

  extractStatusFromContent(content) {
    try {
      const match = content.match(this.statusPattern);
      if (!match) {
        this.logger.debug('No status pattern found in content, defaulting to pending');
        return 'pending';
      }

      const rawStatus = match[1].toLowerCase().trim();
      const normalizedStatus = this.statusMapping[rawStatus] || 'pending';
      
      this.logger.debug(`Status extracted: ${rawStatus} → ${normalizedStatus}`);
      return normalizedStatus;
    } catch (error) {
      this.logger.error('Error extracting status from content:', error);
      return 'pending';
    }
  }
}
```

### ManualTasksImportService Refactoring with DI
```javascript
// Key changes to ManualTasksImportService.js
class ManualTasksImportService {
  constructor(browserManager, taskService, taskRepository, fileSystemService, taskContentHashService, unifiedStatusExtractor) {
    // ... existing constructor code ...
    this.taskContentHashService = taskContentHashService;
    this.unifiedStatusExtractor = unifiedStatusExtractor;
  }

  async _importFromWorkspace(workspacePath, projectId) {
    // ... existing code until status determination ...

    // ✅ CRITICAL FIX: Single source of truth - markdown content only
    // Remove directory-based status detection completely
    const taskStatus = this.unifiedStatusExtractor.extractStatusFromContent(content);
    
    // Generate content hash for data integrity
    const contentHash = await this.taskContentHashService.generateContentHash(content);
    
    logger.info(`📄 Status determined from markdown content: ${taskStatus} for task: ${title}`);
    logger.info(`🔐 Content hash generated: ${contentHash}`);

    // ... rest of the method with contentHash integration ...
  }

  // Remove the old status detection method and replace with unified approach
  async extractTaskDetailsFromMarkdown(content, filename) {
    // ... existing code ...
    
    // Use unified status extraction
    const status = this.unifiedStatusExtractor.extractStatusFromContent(content);
    
    // ... rest of the method ...
  }
}
```

### TaskStatusValidator Implementation
```javascript
class TaskStatusValidator {
  constructor(taskRepository, taskContentHashService, unifiedStatusExtractor) {
    this.taskRepository = taskRepository;
    this.taskContentHashService = taskContentHashService;
    this.unifiedStatusExtractor = unifiedStatusExtractor;
    this.logger = new Logger('TaskStatusValidator');
  }

  async validateTaskStatusConsistency(taskId) {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get current file content
      const fileContent = await this.fileSystemService.readFile(task.filePath);
      const fileStatus = this.unifiedStatusExtractor.extractStatusFromContent(fileContent);
      
      // Compare with database status
      const isConsistent = task.status === fileStatus;
      
      if (!isConsistent) {
        this.logger.warn(`Status inconsistency detected for task ${taskId}: DB=${task.status}, File=${fileStatus}`);
      }

      return {
        taskId,
        isConsistent,
        databaseStatus: task.status,
        fileStatus,
        contentHash: await this.taskContentHashService.generateContentHash(fileContent)
      };
    } catch (error) {
      this.logger.error(`Error validating task status consistency for ${taskId}:`, error);
      throw error;
    }
  }

  async synchronizeTaskStatus(taskId, preferFileStatus = true) {
    try {
      const validation = await this.validateTaskStatusConsistency(taskId);
      
      if (validation.isConsistent) {
        return { synchronized: true, status: validation.databaseStatus };
      }

      const newStatus = preferFileStatus ? validation.fileStatus : validation.databaseStatus;
      
      // Update database with new status
      await this.taskRepository.update(taskId, {
        status: newStatus,
        contentHash: validation.contentHash,
        lastSyncedAt: new Date()
      });

      this.logger.info(`Task ${taskId} status synchronized to: ${newStatus}`);
      return { synchronized: true, status: newStatus };
    } catch (error) {
      this.logger.error(`Error synchronizing task status for ${taskId}:`, error);
      throw error;
    }
  }
}
```

## 🧪 Testing Strategy

### Unit Tests with DI Integration
- [ ] **UnifiedStatusExtractor**: Test status extraction from various markdown formats
- [ ] **TaskStatusValidator**: Test consistency validation and synchronization with DI services
- [ ] **ManualTasksImportService**: Test refactored status detection logic with DI
- [ ] **Mock Requirements**: DI container mocking, service resolution testing

### Integration Tests
- [ ] **Status Consistency**: Test end-to-end status validation workflow with DI
- [ ] **Content Hash Integration**: Test content hash generation and validation
- [ ] **Status Synchronization**: Test automatic status synchronization
- [ ] **DI Service Resolution**: Test automatic dependency resolution

### DI Testing Examples
```javascript
// Example test with DI container mocking
describe('TaskStatusValidator with DI', () => {
  let mockContainer;
  let mockTaskRepository;
  let mockTaskContentHashService;
  let mockUnifiedStatusExtractor;

  beforeEach(() => {
    mockTaskRepository = { findById: jest.fn(), update: jest.fn() };
    mockTaskContentHashService = { generateContentHash: jest.fn() };
    mockUnifiedStatusExtractor = { extractStatusFromContent: jest.fn() };
    
    mockContainer = {
      resolve: jest.fn((serviceName) => {
        const services = {
          'taskRepository': mockTaskRepository,
          'taskContentHashService': mockTaskContentHashService,
          'unifiedStatusExtractor': mockUnifiedStatusExtractor
        };
        return services[serviceName];
      })
    };
  });

  it('should resolve all dependencies through DI', () => {
    const validator = mockContainer.resolve('taskStatusValidator');
    expect(validator).toBeDefined();
    expect(mockContainer.resolve).toHaveBeenCalledWith('taskRepository');
    expect(mockContainer.resolve).toHaveBeenCalledWith('taskContentHashService');
    expect(mockContainer.resolve).toHaveBeenCalledWith('unifiedStatusExtractor');
  });
});
```

## 📊 Success Criteria
- [ ] ManualTasksImportService refactored to use markdown-only status detection
- [ ] TaskStatusValidator service implemented with consistency checks
- [ ] UnifiedStatusExtractor implemented with single regex pattern
- [ ] **DI Integration**: All services registered in ServiceRegistry with proper dependencies
- [ ] **Service Resolution**: Automatic dependency resolution working for all services
- [ ] Content hash validation integrated into task operations
- [ ] All 12+ conflicting regex patterns removed
- [ ] Directory-based status detection completely eliminated
- [ ] All unit tests passing with DI integration
- [ ] Integration tests passing
- [ ] Code coverage > 90% for new services
- [ ] **DI Validation**: Service container resolves all dependencies correctly

## 🔄 Phase Dependencies
- **Input**: Phase 1 foundation services
- **Output**: Core status management logic implemented
- **Blockers**: None
- **Enables**: Integration and file movement fixes in Phase 3

## 📝 Phase Notes
This phase eliminates the critical architectural flaw of conflicting status sources by establishing markdown content as the single source of truth. The unified status extraction replaces the complex, conflicting regex patterns with a single, robust approach.

## 🚀 Next Phase Preview
Phase 3 will integrate these core services with the existing system and fix the file movement logic in TaskStatusTransitionService.
