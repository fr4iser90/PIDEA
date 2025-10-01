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
- [ ] **Task**: Remove directory-based status detection, implement markdown-only parsing
- [ ] **Location**: `backend/domain/services/task/ManualTasksImportService.js`
- [ ] **Purpose**: Establish single source of truth for task status from markdown content
- [ ] **Key Changes**:
  - Remove directory path status detection (lines 276-290)
  - Implement unified status extraction from markdown content
  - Replace 12+ regex patterns with single, robust pattern
  - Integrate content hash generation
  - Remove conflicting status sources
- [ ] **Dependencies**: TaskContentHashService from Phase 1

### 2.2 Create TaskStatusValidator Service (2 hours)
- [ ] **Task**: Implement status consistency validation service
- [ ] **Location**: `backend/domain/services/task/TaskStatusValidator.js`
- [ ] **Purpose**: Validate status consistency between markdown files and database
- [ ] **Key Features**:
  - Status consistency validation
  - Automatic conflict resolution
  - Status synchronization
  - Validation reporting
- [ ] **Dependencies**: TaskContentHashService, TaskRepository

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
- [ ] **Dependencies**: None

### 2.4 Integrate Content Hash Validation (1 hour)
- [ ] **Task**: Add content hash validation to existing task operations
- [ ] **Location**: `backend/domain/services/task/ManualTasksImportService.js`
- [ ] **Purpose**: Ensure data integrity through content hashing
- [ ] **Key Features**:
  - Content hash generation for all task files
  - Hash validation before status updates
  - Content change detection
  - Hash-based deduplication
- [ ] **Dependencies**: TaskContentHashService from Phase 1

## 🔧 Technical Implementation Details

### Unified Status Extraction Implementation
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

### ManualTasksImportService Refactoring
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

## 🧪 Testing Strategy

### Unit Tests
- [ ] **UnifiedStatusExtractor**: Test status extraction from various markdown formats
- [ ] **TaskStatusValidator**: Test consistency validation and synchronization
- [ ] **ManualTasksImportService**: Test refactored status detection logic
- [ ] **Mock Requirements**: File system operations, database connections, content hash service

### Integration Tests
- [ ] **Status Consistency**: Test end-to-end status validation workflow
- [ ] **Content Hash Integration**: Test content hash generation and validation
- [ ] **Status Synchronization**: Test automatic status synchronization

## 📊 Success Criteria
- [ ] ManualTasksImportService refactored to use markdown-only status detection
- [ ] TaskStatusValidator service implemented with consistency checks
- [ ] UnifiedStatusExtractor implemented with single regex pattern
- [ ] Content hash validation integrated into task operations
- [ ] All 12+ conflicting regex patterns removed
- [ ] Directory-based status detection completely eliminated
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code coverage > 90% for new services

## 🔄 Phase Dependencies
- **Input**: Phase 1 foundation services
- **Output**: Core status management logic implemented
- **Blockers**: None
- **Enables**: Integration and file movement fixes in Phase 3

## 📝 Phase Notes
This phase eliminates the critical architectural flaw of conflicting status sources by establishing markdown content as the single source of truth. The unified status extraction replaces the complex, conflicting regex patterns with a single, robust approach.

## 🚀 Next Phase Preview
Phase 3 will integrate these core services with the existing system and fix the file movement logic in TaskStatusTransitionService.
