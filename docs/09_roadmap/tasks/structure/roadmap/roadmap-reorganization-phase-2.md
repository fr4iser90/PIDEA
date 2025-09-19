# Phase 2: Script Development

## 📋 Phase Overview
- **Phase Name**: Script Development
- **Duration**: 8 hours
- **Status**: Pending
- **Progress**: 0%
- **Dependencies**: Phase 1 completion, database schema updates

## 🎯 Phase Objectives
- Create migration script for 154 roadmap files
- Create automated status management script
- Create reference update script
- Test all scripts thoroughly
- Add error handling and logging

## 📝 Detailed Tasks

### Task 2.1: Create Roadmap Status Migration Script (3 hours)
- [ ] Create `scripts/roadmap-status-migration.js`
- [ ] Implement file discovery logic for all 154 roadmap files
- [ ] Implement status parsing from metadata
- [ ] Implement target path determination logic
- [ ] Implement file movement functionality
- [ ] Implement database record updates
- [ ] Add progress tracking and logging

**Script Structure:**
```javascript
class RoadmapStatusMigration {
  constructor() {
    this.sourcePath = 'docs/09_roadmap/tasks';
    this.targetPath = 'docs/09_roadmap';
    this.databaseConnection = null;
    this.logger = new Logger('RoadmapStatusMigration');
  }

  async migrateAllTasks() {
    // 1. Discover all task files
    // 2. Parse status from metadata
    // 3. Determine target directory
    // 4. Move files to new structure
    // 5. Update database records
    // 6. Update file references
  }

  determineTargetPath(task) {
    const { status, priority, category, completedAt } = task;
    
    if (status === 'completed') {
      const quarter = this.getCompletionQuarter(completedAt);
      return `docs/09_roadmap/completed/${quarter}/${category}/`;
    } else if (status === 'in_progress') {
      return `docs/09_roadmap/in-progress/${category}/`;
    } else if (status === 'pending') {
      return `docs/09_roadmap/pending/${priority}/${category}/`;
    } else if (status === 'blocked') {
      return `docs/09_roadmap/blocked/${category}/`;
    } else if (status === 'cancelled') {
      return `docs/09_roadmap/cancelled/${category}/`;
    }
    
    return `docs/09_roadmap/pending/low-priority/${category}/`;
  }
}
```

### Task 2.2: Create Automated Status Management Script (2 hours)
- [ ] Create `scripts/roadmap-status-manager.js`
- [ ] Implement database status change monitoring
- [ ] Implement automatic file movement on status changes
- [ ] Implement metadata updates
- [ ] Implement archive functionality for old completed tasks
- [ ] Add file system watching for consistency

**Script Structure:**
```javascript
class RoadmapStatusManager {
  constructor() {
    this.databaseConnection = null;
    this.fileSystemWatcher = null;
    this.logger = new Logger('RoadmapStatusManager');
  }

  async enableAutoStatusTransitions() {
    // Monitor database status changes
    // Automatically move files when status changes
    // Update metadata and references
  }

  async moveTaskOnStatusChange(taskId, newStatus) {
    // Get current task info
    // Determine new file path
    // Move files
    // Update database
    // Update references
  }

  async archiveCompletedTasks() {
    // Move completed tasks older than 1 year to archive/
    // Update database records
  }
}
```

### Task 2.3: Create Reference Update Script (2 hours)
- [ ] Create `scripts/update-roadmap-references.js`
- [ ] Implement hardcoded path detection
- [ ] Implement dynamic path replacement
- [ ] Update prompt templates
- [ ] Update service files
- [ ] Update workflow files
- [ ] Add backup functionality

**Script Structure:**
```javascript
class RoadmapReferenceUpdater {
  constructor() {
    this.filesToUpdate = [
      'content-library/prompts/task-management/task-analyze.md',
      'content-library/prompts/task-management/task-execute.md',
      'backend/domain/services/task/TaskService.js',
      'backend/domain/steps/categories/generate/task_prompt_generation_step.js'
    ];
    this.logger = new Logger('RoadmapReferenceUpdater');
  }

  async updateAllReferences() {
    // Update hardcoded paths in prompts
    // Update service file paths
    // Update workflow references
    // Update documentation
  }

  async updatePromptTemplates() {
    // Replace hardcoded paths with dynamic path resolution
    // Update template variables
  }
}
```

### Task 2.4: Add Error Handling and Logging (1 hour)
- [ ] Add comprehensive error handling to all scripts
- [ ] Add structured logging with Winston
- [ ] Add progress tracking for long operations
- [ ] Add rollback functionality for failed operations
- [ ] Add validation for file operations
- [ ] Add timeout handling for database operations

## 🧪 Testing Requirements

### Unit Tests:
- [ ] Test file discovery logic
- [ ] Test status parsing from metadata
- [ ] Test target path determination
- [ ] Test file movement operations
- [ ] Test database update operations
- [ ] Test error handling scenarios

### Integration Tests:
- [ ] Test with sample roadmap files
- [ ] Test with database operations
- [ ] Test with file system operations
- [ ] Test rollback functionality
- [ ] Test concurrent operations

### Performance Tests:
- [ ] Test with large number of files (154+)
- [ ] Test database performance during migration
- [ ] Test file system performance during movement
- [ ] Test memory usage during operations

## 📁 Files to Create

### 1. `scripts/roadmap-status-migration.js`
**Purpose**: Core migration script for moving 154 roadmap files
**Key Features**:
- File discovery and parsing
- Status-based path determination
- File movement with backup
- Database record updates
- Progress tracking and logging

### 2. `scripts/roadmap-status-manager.js`
**Purpose**: Automated status transition management
**Key Features**:
- Database status monitoring
- Automatic file movement
- Metadata updates
- Archive functionality
- File system watching

### 3. `scripts/update-roadmap-references.js`
**Purpose**: Update all hardcoded path references
**Key Features**:
- Hardcoded path detection
- Dynamic path replacement
- Template updates
- Service file updates
- Workflow file updates

## ✅ Success Criteria
- [ ] All 3 scripts created and functional
- [ ] Migration script can handle all 154 files
- [ ] Status management script works with database
- [ ] Reference update script updates all 25 files
- [ ] All scripts have comprehensive error handling
- [ ] All scripts have proper logging
- [ ] All scripts have rollback functionality
- [ ] All scripts pass unit and integration tests
- [ ] Performance requirements met

## ⚠️ Risk Mitigation
- **Risk**: File corruption during migration
  - **Mitigation**: Create backups before any file operations
- **Risk**: Database corruption during updates
  - **Mitigation**: Use transactions, test with sample data
- **Risk**: Script failures during execution
  - **Mitigation**: Comprehensive error handling, rollback functionality
- **Risk**: Performance issues with large files
  - **Mitigation**: Batch processing, progress tracking

## 📊 Progress Tracking
- **Start Time**: [To be set]
- **End Time**: [To be set]
- **Actual Duration**: [To be calculated]
- **Files Created**: [To be documented]
- **Issues Encountered**: [To be documented]
- **Lessons Learned**: [To be documented]

## 🔄 Next Phase
After completing Phase 2, proceed to **Phase 3: Service Layer Updates** which will update the backend services to work with the new status-based organization.

---

**Last Updated**: 2024-12-19T17:30:00.000Z
**Version**: 1.0.0
**Status**: Phase 2 Ready ✅
