# Task Status Sync Step Implementation

## 1. Project Overview
- **Feature/Component Name**: Task Status Synchronization Step
- **Priority**: High
- **Category**: automation
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 8 hours
- **Dependencies**: TaskRepository, TaskStatusTransitionService, ManualTasksImportService, StepRegistry
- **Related Issues**: Task sync validation missing, completed tasks not moving to correct directories
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Winston Logger, fs.promises, path module
- **Architecture Pattern**: Domain-Driven Design (DDD), Step Pattern, Service Layer Pattern
- **Database Changes**: None (uses existing Task table and relationships)
- **API Changes**: None (internal step, no external API exposure)
- **Frontend Changes**: None (backend-only step)
- **Backend Changes**: New step class, integration with existing services, step registry updates

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/domain/services/task/ManualTasksImportService.js` - Add sync step integration after import
- [ ] `backend/domain/steps/StepRegistry.js` - Register new TaskStatusSyncStep
- [ ] `backend/domain/steps/index.js` - Export new step for global access
- [ ] `backend/domain/steps/execution/StepClassifier.js` - Add TaskStatusSyncStep to critical steps

### Files to Create:
- [ ] `backend/domain/steps/categories/task/task_status_sync_step.js` - Main step implementation with full sync logic
- [ ] `backend/tests/unit/TaskStatusSyncStep.test.js` - Comprehensive unit tests
- [ ] `backend/domain/steps/categories/task/README.md` - Step documentation and usage guide
- [ ] `backend/tests/integration/TaskStatusSyncStep.test.js` - Integration tests with real database

### Files to Delete:
- [ ] None (no obsolete files to remove)

## 4. Implementation Phases

### Phase 1: Foundation Setup (2 hours)
- [ ] Create step class structure in `backend/domain/steps/categories/task/task_status_sync_step.js`
- [ ] Follow existing step patterns (no BaseStep inheritance - use direct class pattern)
- [ ] Implement step configuration with `static getConfig()` method
- [ ] Set up Winston logging with structured logging levels
- [ ] Create initial context validation logic
- [ ] Add error handling with specific error types

### Phase 2: Core Sync Logic (3 hours)
- [ ] Implement file status detection from markdown files
- [ ] Add database status comparison logic
- [ ] Create status mismatch detection algorithm
- [ ] Implement automatic status transitions via TaskStatusTransitionService
- [ ] Add batch processing for multiple tasks
- [ ] Create file path normalization and validation
- [ ] Implement dry-run mode for testing

### Phase 3: Integration & Testing (2 hours)
- [ ] Integrate with ManualTasksImportService post-import hook
- [ ] Add step registration to StepRegistry
- [ ] Write comprehensive unit tests with mocks
- [ ] Create integration tests with real task data
- [ ] Test with various task status scenarios
- [ ] Validate error handling and edge cases
- [ ] Performance testing with large task sets

### Phase 4: Documentation & Validation (1 hour)
- [ ] Create comprehensive step documentation
- [ ] Add usage examples and integration guide
- [ ] Validate with existing workflow patterns
- [ ] Performance benchmarking and optimization
- [ ] Create troubleshooting guide
- [ ] Final code review and cleanup

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting, consistent indentation
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging, graceful degradation
- **Logging**: Winston logger with structured logging, different levels for operations (info, warn, error, debug)
- **Testing**: Jest framework, 90% coverage requirement, comprehensive test scenarios
- **Documentation**: JSDoc for all public methods, README updates, inline comments for complex logic

## 6. Security Considerations
- [ ] Input validation for task IDs and file paths to prevent injection
- [ ] Path traversal protection using path.resolve() and validation
- [ ] File system access validation with proper permissions checking
- [ ] Database query sanitization and parameterized queries
- [ ] Error message sanitization to prevent information leakage
- [ ] Rate limiting for sync operations to prevent abuse
- [ ] Audit logging for all sync operations and status changes

## 7. Performance Requirements
- **Response Time**: < 5 seconds for typical sync operations (50-100 tasks)
- **Throughput**: Handle 200+ tasks per sync operation efficiently
- **Memory Usage**: < 50MB for sync operations, stream processing for large datasets
- **Database Queries**: Optimized batch operations, indexed queries, connection pooling
- **Caching Strategy**: Cache task metadata during sync, invalidate after completion
- **Concurrency**: Support parallel processing of non-dependent tasks

## 8. Testing Strategy

### Intelligent Test Path Resolution:
```javascript
// Smart test path detection based on category, component type, and project structure
const resolveTestPath = (category, componentName, componentType = 'step') => {
  // Component type to test directory mapping
  const componentTypeMapping = {
    // Backend components
    'step': 'unit',
    'service': 'unit',
    'controller': 'unit',
    'repository': 'unit',
    'entity': 'unit',
    'middleware': 'unit',
    'handler': 'unit',
    'command': 'unit',
    'api': 'integration',
    'database': 'integration',
    'workflow': 'integration',
    
    // Frontend components
    'component': 'unit',
    'hook': 'unit',
    'store': 'unit',
    'service': 'unit',
    'page': 'integration',
    'flow': 'e2e'
  };
  
  // Category to base path mapping
  const categoryPaths = {
    'backend': 'backend/tests',
    'frontend': 'frontend/tests',
    'database': 'backend/tests',
    'api': 'backend/tests',
    'security': 'backend/tests',
    'performance': 'backend/tests',
    'testing': 'backend/tests',
    'documentation': 'backend/tests',
    'migration': 'backend/tests',
    'automation': 'backend/tests',
    'ai': 'backend/tests',
    'ide': 'backend/tests'
  };
  
  // File extension based on category
  const getFileExtension = (category) => {
    return category === 'frontend' ? '.test.jsx' : '.test.js';
  };
  
  const basePath = categoryPaths[category] || 'tests';
  const testType = componentTypeMapping[componentType] || 'unit';
  const extension = getFileExtension(category);
  
  return `${basePath}/${testType}/${componentName}${extension}`;
};

// Usage examples:
// resolveTestPath('automation', 'TaskStatusSyncStep', 'step') → 'backend/tests/unit/TaskStatusSyncStep.test.js'
// resolveTestPath('backend', 'TaskRepository', 'repository') → 'backend/tests/unit/TaskRepository.test.js'
// resolveTestPath('backend', 'TaskService', 'api') → 'backend/tests/integration/TaskService.test.js'
```

### Unit Tests:
- [ ] Test file: `backend/tests/unit/TaskStatusSyncStep.test.js` (auto-detected based on category and component type)
- [ ] Test cases: 
  - File status detection accuracy with various markdown formats
  - Database status comparison logic validation
  - Status transition logic for all valid transitions
  - Error handling scenarios (missing files, invalid paths, database errors)
  - Edge cases (empty task lists, malformed data, concurrent access)
  - Batch processing efficiency and correctness
  - Dry-run mode functionality
- [ ] Mock requirements: TaskRepository, TaskStatusTransitionService, fs.promises, path module

### Integration Tests:
- [ ] Test file: `backend/tests/integration/TaskStatusSyncStep.test.js` (auto-detected for step components)
- [ ] Test scenarios: 
  - Full sync workflow with real database and file system
  - Integration with ManualTasksImportService end-to-end
  - File system operations with actual task directories
  - Event emission validation and monitoring
  - Performance testing with large task datasets
  - Error recovery and rollback scenarios
- [ ] Test data: Sample task files with different statuses, realistic project structures

### Test Configuration:
- **Backend Tests**: Jest with Node.js environment, ES6+ support
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend components
- **Mock Strategy**: Comprehensive mocking of external dependencies
- **Test Data**: Realistic task data with various status combinations

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all public methods with parameter and return types
- [ ] README updates with new step functionality and usage
- [ ] Step configuration documentation with all available options
- [ ] Architecture diagrams for complex sync logic flows
- [ ] API documentation for step execution context and options

### User Documentation:
- [ ] User guide updates for task synchronization features
- [ ] Feature documentation for developers integrating the step
- [ ] Troubleshooting guide for common sync issues and solutions
- [ ] Migration guide for existing task management workflows
- [ ] Performance optimization guide for large task sets

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved by senior developer
- [ ] Documentation updated and reviewed for accuracy
- [ ] Security scan passed with no critical vulnerabilities
- [ ] Performance benchmarks met (response time, memory usage)
- [ ] Integration testing completed with existing workflows

### Deployment:
- [ ] Database migrations (if applicable) - none required for this step
- [ ] Environment variables configured for step execution
- [ ] Configuration updates applied to step registry
- [ ] Service restarts if needed for step registration
- [ ] Health checks configured for step execution monitoring
- [ ] Logging configuration updated for new step events

### Post-deployment:
- [ ] Monitor logs for errors and performance issues
- [ ] Verify functionality in production environment
- [ ] Performance monitoring active for sync operations
- [ ] User feedback collection enabled for sync improvements
- [ ] Automated alerts configured for sync failures

## 11. Rollback Plan
- [ ] Database rollback script prepared (none required for this step)
- [ ] Configuration rollback procedure documented
- [ ] Service rollback procedure for step deregistration
- [ ] Communication plan for stakeholders about sync functionality
- [ ] Data integrity verification after rollback

## 12. Success Criteria
- [ ] Feature works as specified in requirements with 100% accuracy
- [ ] All tests pass (unit, integration, e2e) with required coverage
- [ ] Performance requirements met (response time < 5s, memory < 50MB)
- [ ] Security requirements satisfied with no vulnerabilities
- [ ] Documentation complete and accurate with examples
- [ ] User acceptance testing passed with real task data
- [ ] Integration with existing workflows seamless and reliable

## 13. Risk Assessment

### High Risk:
- [ ] File system race conditions during concurrent sync operations - Mitigation: Use file locks, atomic operations, and proper sequencing
- [ ] Database consistency issues during status transitions - Mitigation: Use database transactions, rollback mechanisms, and validation checks
- [ ] Memory leaks with large task datasets - Mitigation: Implement streaming processing, proper cleanup, and memory monitoring

### Medium Risk:
- [ ] Performance impact on large task sets (500+ tasks) - Mitigation: Implement batch processing, pagination, and performance optimization
- [ ] Integration conflicts with existing step execution - Mitigation: Proper step ordering, dependency management, and conflict resolution
- [ ] File permission issues in different environments - Mitigation: Comprehensive permission checking and error handling

### Low Risk:
- [ ] Step registration conflicts with existing steps - Mitigation: Unique naming conventions and validation
- [ ] Logging overhead affecting performance - Mitigation: Configurable log levels and efficient logging patterns
- [ ] Configuration errors in different environments - Mitigation: Comprehensive validation and fallback defaults

## 14. AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-implementation.md'
- **category**: 'task' - Automatically set from Category field above
- **automation_level**: 'semi_auto' | 'full_auto' | 'manual'
- **confirmation_required**: true | false
- **max_attempts**: 3 (default)
- **git_branch_required**: true | false
- **new_chat_required**: true | false

### AI Execution Context:
```json
{
  "requires_new_chat": false,
  "git_branch_name": "feature/task-status-sync-step",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass with required coverage
- [ ] No build errors or linting issues
- [ ] Code follows established standards
- [ ] Documentation updated and accurate
- [ ] Integration with existing services working
- [ ] Performance benchmarks met

## 15. Initial Prompt Documentation

### Original Prompt (Sanitized):
```markdown
# Initial Prompt: Task Status Sync Step Implementation

## User Request:
Create a comprehensive development plan for implementing a TaskStatusSyncStep that synchronizes task status between filesystem and database. The step should detect when task files are already marked as completed but the database still shows pending/in-progress status, and automatically trigger the appropriate status transitions and file movements.

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Already in English
- **Sanitization Status**: ✅ No sensitive data to remove

## Prompt Analysis:
- **Intent**: Create a step to solve task status synchronization issues
- **Complexity**: High - requires integration with multiple services and file system operations
- **Scope**: Backend step implementation with database and file system integration
- **Dependencies**: TaskRepository, TaskStatusTransitionService, ManualTasksImportService

## Sanitization Applied:
- [ ] Credentials removed (API keys, passwords, tokens) - N/A
- [ ] Personal information anonymized - N/A
- [ ] Sensitive file paths generalized - N/A
- [ ] Language converted to English - N/A (already English)
- [ ] Technical terms preserved - ✅ Maintained
- [ ] Intent and requirements maintained - ✅ Preserved
```

### Sanitization Rules Applied:
- **Credentials**: No credentials in original prompt
- **Personal Info**: No personal information to anonymize
- **File Paths**: Used standard project paths
- **Language**: Already in English
- **Sensitive Data**: No sensitive data to replace

### Original Context Preserved:
- **Technical Requirements**: ✅ Maintained and expanded
- **Business Logic**: ✅ Preserved and detailed
- **Architecture Decisions**: ✅ Documented with rationale
- **Success Criteria**: ✅ Included with measurable metrics

## 16. References & Resources
- **Technical Documentation**: 
  - [Step Pattern Documentation](./docs/architecture/steps.md)
  - [Task Management System](./docs/features/task-management.md)
  - [Service Layer Pattern](./docs/architecture/services.md)
- **API References**: 
  - [TaskRepository API](./docs/api/task-repository.md)
  - [TaskStatusTransitionService API](./docs/api/status-transition.md)
  - [StepRegistry API](./docs/api/step-registry.md)
- **Design Patterns**: 
  - Domain-Driven Design (DDD) patterns
  - Step Pattern implementation
  - Service Layer Pattern
  - Repository Pattern
- **Best Practices**: 
  - Node.js error handling best practices
  - File system operation safety
  - Database transaction management
  - Logging and monitoring standards
- **Similar Implementations**: 
  - [TaskStatusUpdateStep](./backend/domain/steps/categories/task/task_status_update_step.js) - Note: Refactored to modern pattern (recommended)
  - [ManualTasksImportService](./backend/domain/services/task/ManualTasksImportService.js)
  - [GitGetStatusStep](./backend/domain/steps/categories/git/git_get_status.js) - Recommended pattern
  - [CreateChatStep](./backend/domain/steps/categories/chat/create_chat_step.js) - Recommended pattern

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Task Status Sync Step - Master Index

## 📋 Task Overview
- **Name**: Task Status Sync Step Implementation
- **Category**: automation
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 8 hours
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Original Language**: English
- **Prompt Sanitized**: ✅ Yes

## 📁 File Structure
```
docs/09_roadmap/pending/high/automation/task-status-sync-step/
├── task-status-sync-step-index.md (this file)
├── task-status-sync-step-implementation.md
├── task-status-sync-step-phase-1.md
├── task-status-sync-step-phase-2.md
├── task-status-sync-step-phase-3.md
└── task-status-sync-step-phase-4.md
```

## 🎯 Main Implementation
- **[Task Status Sync Step Implementation](./task-status-sync-step-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./task-status-sync-step-phase-1.md) | Planning | 2h | 0% |
| 2 | [Phase 2](./task-status-sync-step-phase-2.md) | Planning | 3h | 0% |
| 3 | [Phase 3](./task-status-sync-step-phase-3.md) | Planning | 2h | 0% |
| 4 | [Phase 4](./task-status-sync-step-phase-4.md) | Planning | 1h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Step Foundation Setup](./task-status-sync-step-phase-1.md) - Planning - 0%
- [ ] [Core Sync Logic](./task-status-sync-step-phase-2.md) - Planning - 0%
- [ ] [Integration & Testing](./task-status-sync-step-phase-3.md) - Planning - 0%
- [ ] [Documentation & Validation](./task-status-sync-step-phase-4.md) - Planning - 0%

### Completed Subtasks
- None yet

### Pending Subtasks
- [ ] [Step Foundation Setup](./task-status-sync-step-phase-1.md) - ⏳ Waiting
- [ ] [Core Sync Logic](./task-status-sync-step-phase-2.md) - ⏳ Waiting
- [ ] [Integration & Testing](./task-status-sync-step-phase-3.md) - ⏳ Waiting
- [ ] [Documentation & Validation](./task-status-sync-step-phase-4.md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Planning
- **Next Milestone**: Step Foundation Setup
- **Estimated Completion**: [Date + 8 hours]

## 🔗 Related Tasks
- **Dependencies**: TaskRepository, TaskStatusTransitionService, ManualTasksImportService
- **Dependents**: Task synchronization workflows, Manual task import processes
- **Related**: TaskStatusUpdateStep, ManualTasksImportService, StepRegistry

## 📝 Notes & Updates
### [Current Date] - Planning Phase
- Comprehensive implementation plan created
- All phases defined with detailed requirements
- Testing strategy established
- Integration points identified

## 🚀 Quick Actions
- [View Implementation Plan](./task-status-sync-step-implementation.md)
- [Start Phase 1](./task-status-sync-step-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)
```

---

## Database Task Creation Instructions

This markdown will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'PIDEA', -- From context
  'Task Status Sync Step Implementation', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'automation', -- From section 1 Category field
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-implementation.md', -- Main implementation file
  '[Full markdown content]', -- For reference
  '{"tech_stack": ["Node.js", "JavaScript ES6+", "Winston Logger", "fs.promises"], "architecture": "DDD", "dependencies": ["TaskRepository", "TaskStatusTransitionService", "ManualTasksImportService"], "automation_level": "semi_auto", "confirmation_required": true, "max_attempts": 3, "git_branch_required": true, "new_chat_required": false}', -- All technical details
  8 -- From section 1 Estimated Time
);
```

## Usage Instructions

1. **Fill in all sections completely** - Every field maps to database columns
2. **Be specific with file paths** - Enables precise file tracking
3. **Include exact time estimates** - Critical for project planning
4. **Specify AI execution requirements** - Automation level, confirmation needs
5. **List all dependencies** - Enables proper task sequencing
6. **Include success criteria** - Enables automatic completion detection
7. **Provide detailed phases** - Enables progress tracking
8. **Set correct category** - Automatically organizes tasks into category folders
9. **Use category-specific paths** - Tasks are automatically placed in correct folders
10. **Master Index Creation** - Automatically generates central overview file

## Automatic Category Organization

**Default Status**: All new tasks are created with `pending` status and placed in `docs/09_roadmap/pending/` directory. This ensures consistent organization and allows for proper status transitions later.

**Status Transition Flow**:
- **pending** → **in-progress**: Task moves to `docs/09_roadmap/in-progress/high/automation/task-status-sync-step/`
- **in-progress** → **completed**: Task moves to `docs/09_roadmap/completed/[quarter]/automation/task-status-sync-step/`
- **completed** → **archive**: Task moves to `docs/09_roadmap/completed/archive/automation/task-status-sync-step/` (after 1 year)

When you specify **Category** as `automation` in section 1, the system automatically:

1. **Creates status folder** if it doesn't exist: `docs/09_roadmap/pending/` (default status)
2. **Creates priority folder** if it doesn't exist: `docs/09_roadmap/pending/high/`
3. **Creates category folder** if it doesn't exist: `docs/09_roadmap/pending/high/automation/`
4. **Creates task folder** for each task: `docs/09_roadmap/pending/high/automation/task-status-sync-step/`
5. **Places main implementation file**: `docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-implementation.md`
6. **Creates phase files** for subtasks: `docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-phase-[number].md`
7. **Creates master index file**: `docs/09_roadmap/pending/high/automation/task-status-sync-step/task-status-sync-step-index.md`
8. **Sets database category** field to `automation`
9. **Organizes tasks hierarchically** for better management

### Available Categories:
- **ai** - AI-related features and machine learning
- **automation** - Automation and workflow features
- **backend** - Backend development and services
- **frontend** - Frontend development and UI
- **ide** - IDE integration and development tools
- **migration** - System migrations and data transfers
- **performance** - Performance optimization and monitoring
- **security** - Security features and improvements
- **testing** - Testing infrastructure and test automation
- **documentation** - Documentation and guides
- **uncategorized** - Tasks that don't fit other categories

### Example Folder Structure:
```
docs/09_roadmap/
├── pending/
│   ├── high/
│   │   ├── automation/
│   │   │   ├── task-status-sync-step/
│   │   │   │   ├── task-status-sync-step-index.md
│   │   │   │   ├── task-status-sync-step-implementation.md
│   │   │   │   ├── task-status-sync-step-phase-1.md
│   │   │   │   ├── task-status-sync-step-phase-2.md
│   │   │   │   ├── task-status-sync-step-phase-3.md
│   │   │   │   └── task-status-sync-step-phase-4.md
│   │   │   └── workflow-automation/
│   │   │       ├── workflow-automation-index.md
│   │   │       ├── workflow-automation-implementation.md
│   │   │       └── workflow-automation-phase-1.md
│   │   └── backend/
│   │       └── user-authentication/
│   │           ├── user-authentication-index.md
│   │           ├── user-authentication-implementation.md
│   │           └── user-authentication-phase-1.md
│   └── medium/
│       └── ide/
│           └── vscode-integration/
│               ├── vscode-integration-index.md
│               ├── vscode-integration-implementation.md
│               └── vscode-integration-phase-1.md
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for implementing a TaskStatusSyncStep that synchronizes task status between filesystem and database. The step should detect when task files are already marked as completed but the database still shows pending/in-progress status, and automatically trigger the appropriate status transitions and file movements. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
