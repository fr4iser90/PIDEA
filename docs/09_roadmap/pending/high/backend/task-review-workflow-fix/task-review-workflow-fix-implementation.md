# Prompt: Fix Task Review Workflow Database Sync Issue (Database-First)

## Goal
Fix the critical issue where the Task Review Modal loads outdated database data instead of synchronized filesystem data, causing completed tasks to appear as pending and be incorrectly selected for review.

## Phase
Check Plan against codebase, collect all data u need!
Create new Plan/Implementation task-review-workflow-fix-implementation.md in docs/09_roadmap/pending/high/backend/task-review-workflow-fix/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Status (default: pending) → Priority → Category → Task Name → Implementation files

## Template Structure

> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-index.md  
> If a file is missing, it must be created automatically. This pattern is required for orchestration and grouping in the system.  
> - **Implementation**: docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-implementation.md  
> - **Phase**: docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-phase-[number].md  


### 1. Project Overview
- **Feature/Component Name**: Task Review Workflow Database Sync Fix
- **Priority**: High - maps to task.priority
- **Category**: backend - maps to task.category
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 6 hours - maps to task.metadata.estimated_hours
- **Dependencies**: TaskStatusSyncController, TaskStatusTransitionService - maps to task.dependencies
- **Related Issues**: IDEController-fix task (deleted but referenced)
- **Created**: 2025-10-03T22:14:37.000Z - Reference `@timestamp-utility.md`

### 2. Technical Requirements
- **Tech Stack**: React.js, Node.js, Express.js, SQLite - maps to task.metadata.tech_stack
- **Architecture Pattern**: MVC with CQRS - maps to task.metadata.architecture
- **Database Changes**: None - maps to task.metadata.database_changes
- **API Changes**: Enhanced sync-status endpoint usage - maps to task.metadata.api_changes
- **Frontend Changes**: TasksPanelComponent.jsx modal loading logic - maps to task.metadata.frontend_changes
- **Backend Changes**: TaskStatusSyncController validation - maps to task.metadata.backend_changes

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Add sync before modal load
- [ ] `frontend/src/application/services/TaskReviewService.jsx` - Add status validation
- [ ] `backend/presentation/api/TaskStatusSyncController.js` - Enhance sync validation
- [ ] `backend/domain/services/task/TaskStatusTransitionService.js` - Improve sync logic

#### Files to Create:
- [ ] `frontend/tests/unit/TaskReviewSync.test.jsx` - Test sync before modal load
- [ ] `backend/tests/integration/TaskStatusSyncController.test.js` - Test sync API

#### Files to Delete:
- [ ] None

### 4. Implementation Phases

#### Phase 1: Frontend Sync Integration (2 hours)
- [ ] Add sync API call before modal load in TasksPanelComponent
- [ ] Implement automatic task list refresh after sync
- [ ] Add loading states during sync process
- [ ] Add error handling for sync failures

#### Phase 2: Backend Sync Enhancement (2 hours)
- [ ] Enhance TaskStatusSyncController validation
- [ ] Improve TaskStatusTransitionService sync logic
- [ ] Add proper error handling and logging
- [ ] Ensure atomic sync operations

#### Phase 3: Testing & Validation (2 hours)
- [ ] Write unit tests for frontend sync logic
- [ ] Write integration tests for sync API
- [ ] Test edge cases (network failures, partial sync)
- [ ] Validate sync accuracy

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation for project ID and user permissions
- [ ] User authentication and authorization for sync operations
- [ ] Rate limiting for sync API calls
- [ ] Audit logging for all sync operations
- [ ] Protection against malicious sync requests

### 7. Performance Requirements
- **Response Time**: < 2 seconds for sync operation
- **Throughput**: Handle 100+ tasks sync per request
- **Memory Usage**: < 50MB for sync operations
- **Database Queries**: Optimized batch operations
- **Caching Strategy**: Cache sync results for 30 seconds

### 8. Testing Strategy

#### Intelligent Test Path Resolution:
```javascript
// Smart test path detection based on category, component type, and project structure
const resolveTestPath = (category, componentName, componentType = 'service') => {
  // Component type to test directory mapping
  const componentTypeMapping = {
    // Backend components
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
// resolveTestPath('backend', 'TaskStatusSyncController', 'controller') → 'backend/tests/unit/TaskStatusSyncController.test.js'
// resolveTestPath('frontend', 'TasksPanelComponent', 'component') → 'frontend/tests/unit/TasksPanelComponent.test.jsx'
// resolveTestPath('backend', 'TaskStatusSyncAPI', 'api') → 'backend/tests/integration/TaskStatusSyncAPI.test.js'
```

#### Unit Tests:
- [ ] Test file: `frontend/tests/unit/TasksPanelComponent.test.jsx` (auto-detected based on category and component type)
- [ ] Test cases: Sync before modal load, error handling, loading states
- [ ] Mock requirements: API calls, event bus, project context

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/TaskStatusSyncController.test.js` (auto-detected for API components)
- [ ] Test scenarios: Sync API endpoints, database interactions
- [ ] Test data: Mock tasks with different statuses

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/TaskReviewSyncWorkflow.test.jsx` (auto-detected for frontend flows)
- [ ] User flows: Complete sync and review workflow
- [ ] Browser compatibility: Chrome, Firefox compatibility

#### Test Path Examples by Category:
- **Backend Controller**: `backend/tests/unit/TaskStatusSyncController.test.js`
- **Backend Service**: `backend/tests/unit/TaskStatusTransitionService.test.js`
- **Backend API**: `backend/tests/integration/TaskStatusSyncAPI.test.js`
- **Frontend Component**: `frontend/tests/unit/TasksPanelComponent.test.jsx`
- **Frontend Service**: `frontend/tests/unit/TaskReviewService.test.jsx`
- **Frontend Flow**: `frontend/tests/e2e/TaskReviewSyncWorkflow.test.jsx`

#### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Frontend Tests**: Jest with jsdom environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend, `.test.jsx` for frontend

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for sync endpoints
- [ ] Architecture diagrams for sync workflow

#### User Documentation:
- [ ] User guide updates for task review workflow
- [ ] Feature documentation for developers
- [ ] Troubleshooting guide for sync issues
- [ ] Migration guide (if applicable)

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] No database migrations required
- [ ] Environment variables configured
- [ ] Configuration updates applied
- [ ] Service restarts if needed
- [ ] Health checks configured

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify functionality in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

### 11. Rollback Plan
- [ ] No database rollback script needed
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] Task Review Modal loads synchronized data
- [ ] Completed tasks are correctly identified and excluded
- [ ] Sync operation completes within 2 seconds
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### 13. Risk Assessment

#### High Risk:
- [ ] Sync operation fails during high load - Mitigation: Implement retry logic and circuit breaker
- [ ] Database corruption during sync - Mitigation: Atomic transactions and rollback capability

#### Medium Risk:
- [ ] Network timeout during sync - Mitigation: Proper timeout handling and user feedback
- [ ] Partial sync leaving inconsistent state - Mitigation: Transaction-based sync operations

#### Low Risk:
- [ ] UI loading state issues - Mitigation: Proper loading indicators and error states

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-implementation.md'
- **category**: 'backend' - Automatically set from Category field above
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3 (default)
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/task-review-sync-fix",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

### 15. Initial Prompt Documentation

#### Original Prompt (Sanitized):
```markdown
# Initial Prompt: Task Review Workflow Database Sync Fix

## User Request:
Fix the critical issue where the Task Review Modal loads outdated database data instead of synchronized filesystem data, causing completed tasks to appear as pending and be incorrectly selected for review.

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Converted to English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Fix database sync issue in task review workflow
- **Complexity**: Medium based on requirements
- **Scope**: Frontend modal loading and backend sync validation
- **Dependencies**: TaskStatusSyncController, TaskStatusTransitionService

## Sanitization Applied:
- [ ] Credentials removed (API keys, passwords, tokens)
- [ ] Personal information anonymized
- [ ] Sensitive file paths generalized
- [ ] Language converted to English
- [ ] Technical terms preserved
- [ ] Intent and requirements maintained
```

#### Sanitization Rules Applied:
- **Credentials**: Replaced with `[REDACTED]` or `[YOUR_API_KEY]`
- **Personal Info**: Replaced with `[USER_NAME]` or `[PROJECT_NAME]`
- **File Paths**: Generalized to `[PROJECT_ROOT]/path/to/file`
- **Language**: Converted to English while preserving technical accuracy
- **Sensitive Data**: Replaced with placeholders

#### Original Context Preserved:
- **Technical Requirements**: ✅ Maintained
- **Business Logic**: ✅ Preserved  
- **Architecture Decisions**: ✅ Documented
- **Success Criteria**: ✅ Included

#### Sanitization Function:
```javascript
const sanitizePrompt = (originalPrompt) => {
  return originalPrompt
    // Remove credentials
    .replace(/api[_-]?key[=:]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, 'api_key=[YOUR_API_KEY]')
    .replace(/password[=:]\s*['"]?[^'"]+['"]?/gi, 'password=[YOUR_PASSWORD]')
    .replace(/token[=:]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, 'token=[YOUR_TOKEN]')
    
    // Remove personal info
    .replace(/\/home\/[^\/\s]+/g, '[USER_HOME]')
    .replace(/\/Users\/[^\/\s]+/g, '[USER_HOME]')
    
    // Generalize file paths
    .replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, '[PROJECT_ROOT]/path/to/file')
    
    // Convert to English (if needed)
    .replace(/auf Deutsch/gi, 'in English')
    .replace(/deutsch/gi, 'English');
};
```

### 16. References & Resources
- **Technical Documentation**: TaskStatusSyncController API docs
- **API References**: `/api/projects/:projectId/tasks/sync-status` endpoint
- **Design Patterns**: MVC with CQRS pattern
- **Best Practices**: Database synchronization patterns
- **Similar Implementations**: Existing sync operations in TaskStatusTransitionService

---

## Database Task Creation Instructions

This markdown will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  '[project_id]', -- From context
  'Task Review Workflow Database Sync Fix', -- From section 1
  '[Full markdown content]', -- Complete description
  'bug', -- Derived from Technical Requirements
  'backend', -- From section 1 Category field
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/backend/task-review-workflow-fix/task-review-workflow-fix-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '6' -- From section 1
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
- **pending** → **in-progress**: Task moves to `docs/09_roadmap/in-progress/[priority]/[category]/[name]/`
- **in-progress** → **completed**: Task moves to `docs/09_roadmap/completed/[quarter]/[category]/[name]/`
- **completed** → **archive**: Task moves to `docs/09_roadmap/completed/archive/[category]/[name]/` (after 1 year)

When you specify a **Category** in section 1, the system automatically:

1. **Creates status folder** if it doesn't exist: `docs/09_roadmap/pending/` (default status)
2. **Creates priority folder** if it doesn't exist: `docs/09_roadmap/pending/[priority]/`
3. **Creates category folder** if it doesn't exist: `docs/09_roadmap/pending/[priority]/[category]/`
4. **Creates task folder** for each task: `docs/09_roadmap/pending/[priority]/[category]/[name]/`
5. **Places main implementation file**: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-implementation.md`
6. **Creates phase files** for subtasks: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-phase-[number].md`
7. **Creates master index file**: `docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-index.md`
6. **Sets database category** field to the specified category
7. **Organizes tasks hierarchically** for better management

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
- **** -  tasks that don't fit other categories

### Example Folder Structure:
```
docs/09_roadmap/
├── pending/
│   ├── high/
│   │   ├── backend/
│   │   │   ├── task-review-workflow-fix/
│   │   │   │   ├── task-review-workflow-fix-index.md
│   │   │   │   ├── task-review-workflow-fix-implementation.md
│   │   │   │   ├── task-review-workflow-fix-phase-1.md
│   │   │   │   ├── task-review-workflow-fix-phase-2.md
│   │   │   │   └── task-review-workflow-fix-phase-3.md
│   │   │   └── other-backend-tasks/
│   │   └── frontend/
│   │       └── ui-redesign/
│   └── medium/
│       └── ide/
│           └── vscode-integration/
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for fixing the task review workflow database sync issue. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
