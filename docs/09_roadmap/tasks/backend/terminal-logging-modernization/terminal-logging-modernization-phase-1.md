# Terminal Logging Modernization - Phase 1: Foundation Setup

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Name**: Foundation Setup
- **Estimated Time**: 3 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
- Create ProjectLogManager service for project-based log management
- Update TerminalLogCaptureService to support project-based paths
- Create migration script for existing logs
- Update LogPermissionManager for project-based security

## 📝 Tasks

### 1.1 Create ProjectLogManager Service (1 hour)
- [ ] Create `backend/domain/services/terminal/ProjectLogManager.js`
- [ ] Implement project-based directory structure logic
- [ ] Add project-to-port mapping functionality
- [ ] Implement log directory creation and management
- [ ] Add security validation for project paths

**Key Features:**
```javascript
class ProjectLogManager {
  constructor(dependencies = {}) {
    this.projectService = dependencies.projectService;
    this.logger = dependencies.logger;
    this.baseLogDir = '/tmp/IDEWEB/projects';
  }

  async createProjectLogDirectory(projectId) {
    // Create project-based log directory
  }

  async getProjectLogPath(projectId) {
    // Get log path for project
  }

  async migratePortLogsToProject(port, projectId) {
    // Migrate existing port-based logs to project-based
  }
}
```

### 1.2 Update TerminalLogCaptureService (1 hour)
- [ ] Modify `backend/domain/services/terminal/TerminalLogCaptureService.js`
- [ ] Replace port-based paths with project-based paths
- [ ] Add project ID resolution logic
- [ ] Maintain backward compatibility during transition
- [ ] Update log directory creation methods

**Key Changes:**
```javascript
// OLD: Port-based
const logDir = `/tmp/IDEWEB/${port}/logs`;

// NEW: Project-based
const logDir = `/tmp/IDEWEB/projects/${projectId}/logs`;
```

### 1.3 Create Migration Script (45 minutes)
- [ ] Create `backend/scripts/migrate-terminal-logs-to-project-based.js`
- [ ] Implement port-to-project mapping logic
- [ ] Add backup functionality before migration
- [ ] Create rollback capability
- [ ] Add progress tracking and logging

**Migration Logic:**
```javascript
class TerminalLogMigration {
  async migrateAllLogs() {
    // 1. Scan existing port-based directories
    // 2. Map ports to projects
    // 3. Create project-based directories
    // 4. Move log files
    // 5. Update permissions
    // 6. Verify migration
  }
}
```

### 1.4 Update LogPermissionManager (15 minutes)
- [ ] Modify `backend/infrastructure/security/LogPermissionManager.js`
- [ ] Update path validation for project-based structure
- [ ] Add project-based permission checks
- [ ] Maintain security for new directory structure

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test file: `backend/tests/unit/domain/services/ProjectLogManager.test.js`
- [ ] Test project directory creation
- [ ] Test project-to-port mapping
- [ ] Test log path resolution
- [ ] Test security validation

### Integration Tests
- [ ] Test migration script functionality
- [ ] Test backward compatibility
- [ ] Test permission system updates

## 📊 Success Criteria
- [ ] ProjectLogManager service created and tested
- [ ] TerminalLogCaptureService updated for project-based paths
- [ ] Migration script created and tested
- [ ] LogPermissionManager updated for new structure
- [ ] All unit tests passing
- [ ] No breaking changes to existing functionality

## 🔄 Dependencies
- **Input**: Existing TerminalLogCaptureService
- **Output**: ProjectLogManager service, updated services, migration script
- **Blockers**: None

## 📝 Notes
- Maintain backward compatibility during transition
- Ensure security is not compromised during migration
- Test migration script thoroughly before production use
- Document all changes for future reference

## 🚀 Next Phase
After completing Phase 1, proceed to [Phase 2: Service Integration](./terminal-logging-modernization-phase-2.md)
