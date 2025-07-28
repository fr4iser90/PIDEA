# Prompt: Create Comprehensive Development Task Plan (Database-First)

## Goal
Generate a complete, actionable development plan that will be parsed into a database task with all necessary details for AI auto-implementation, tracking, and execution.

## Phase
Check Plan against codebase, collect all data u need!
Create new Plan/Implementation [Name]-implementation.md in docs/09_roadmap/tasks/[category]/[name]/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Category → Task Name → Implementation files

## Template Structure

> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: docs/09_roadmap/tasks/[category]/[name]/[name]-index.md  
> If a file is missing, it must be created automatically. This pattern is required for orchestration and grouping in the system.  
> - **Implementation**: docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md  
> - **Phase**: docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md  


### 1. Project Overview
- **Feature/Component Name**: [Exact name for task.title]
- **Priority**: [High/Medium/Low - maps to task.priority]
- **Category**: [ai/automation/backend/frontend/ide/migration/performance/security/testing/documentation/ - maps to task.category]
- **Estimated Time**: [X hours/days - maps to task.metadata.estimated_hours]
- **Dependencies**: [List prerequisites - maps to task.dependencies]
- **Related Issues**: [Link to existing issues/tickets]
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

### 2. Technical Requirements
- **Tech Stack**: [List all technologies - maps to task.metadata.tech_stack]
- **Architecture Pattern**: [MVC, DDD, etc. - maps to task.metadata.architecture]
- **Database Changes**: [Schema updates, migrations - maps to task.metadata.database_changes]
- **API Changes**: [New endpoints, modifications - maps to task.metadata.api_changes]
- **Frontend Changes**: [Components, pages, state management - maps to task.metadata.frontend_changes]
- **Backend Changes**: [Services, controllers, handlers - maps to task.metadata.backend_changes]

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `path/to/file.js` - [Brief description of changes]
- [ ] `path/to/file.jsx` - [Brief description of changes]
- [ ] `path/to/file.md` - [Brief description of changes]

#### Files to Create:
- [ ] `path/to/new-file.js` - [Purpose and content overview]
- [ ] `path/to/new-file.jsx` - [Purpose and content overview]
- [ ] `path/to/new-file.md` - [Purpose and content overview]

#### Files to Delete:
- [ ] `path/to/obsolete-file.js` - [Reason for deletion]

### 4. Implementation Phases

#### Phase 1: Foundation Setup ([X] hours)
- [ ] Create base structure
- [ ] Set up dependencies
- [ ] Configure environment
- [ ] Create initial tests

#### Phase 2: Core Implementation ([X] hours)
- [ ] Implement main functionality
- [ ] Add error handling
- [ ] Implement validation
- [ ] Add logging

#### Phase 3: Integration ([X] hours)
- [ ] Connect with existing systems
- [ ] Update API endpoints
- [ ] Integrate with frontend
- [ ] Test integration points

#### Phase 4: Testing & Documentation ([X] hours)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Create user guides

#### Phase 5: Deployment & Validation ([X] hours)
- [ ] Deploy to staging
- [ ] Perform testing
- [ ] Fix issues
- [ ] Deploy to production

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation and sanitization
- [ ] User authentication and authorization
- [ ] Data privacy and protection
- [ ] Rate limiting for operations
- [ ] Audit logging for all actions
- [ ] Protection against malicious inputs

### 7. Performance Requirements
- **Response Time**: [Target milliseconds]
- **Throughput**: [Requests per second]
- **Memory Usage**: [MB limit]
- **Database Queries**: [Optimization requirements]
- **Caching Strategy**: [What to cache, how long]

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
// resolveTestPath('backend', 'AuthService', 'service') → 'backend/tests/unit/AuthService.test.js'
// resolveTestPath('frontend', 'LoginForm', 'component') → 'frontend/tests/unit/LoginForm.test.jsx'
// resolveTestPath('backend', 'AuthController', 'api') → 'backend/tests/integration/AuthController.test.js'
// resolveTestPath('frontend', 'UserAuthentication', 'flow') → 'frontend/tests/e2e/UserAuthentication.test.jsx'
```

#### Unit Tests:
- [ ] Test file: `{resolvedTestPath}` (auto-detected based on category and component type)
- [ ] Test cases: [List specific scenarios to test]
- [ ] Mock requirements: [External dependencies to mock]

#### Integration Tests:
- [ ] Test file: `{resolvedTestPath}` (auto-detected for API/database components)
- [ ] Test scenarios: [API endpoints, database interactions]
- [ ] Test data: [Fixtures, seed data requirements]

#### E2E Tests:
- [ ] Test file: `{resolvedTestPath}` (auto-detected for frontend flows)
- [ ] User flows: [Complete user journeys to test]
- [ ] Browser compatibility: [Chrome, Firefox compatibility]

#### Test Path Examples by Category:
- **Backend Service**: `backend/tests/unit/AuthService.test.js`
- **Backend Controller**: `backend/tests/unit/AuthController.test.js`
- **Backend API**: `backend/tests/integration/AuthAPI.test.js`
- **Frontend Component**: `frontend/tests/unit/LoginForm.test.jsx`
- **Frontend Hook**: `frontend/tests/unit/useAuth.test.js`
- **Frontend Flow**: `frontend/tests/e2e/UserAuthentication.test.jsx`
- **Database Migration**: `backend/tests/integration/UserMigration.test.js`
- **Security Feature**: `backend/tests/unit/SecurityMiddleware.test.js`

#### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Frontend Tests**: Jest with jsdom environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend, `.test.jsx` for frontend

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for complex components

#### User Documentation:
- [ ] User guide updates for new features
- [ ] Feature documentation for developers
- [ ] Troubleshooting guide for common issues
- [ ] Migration guide (if applicable)

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Database migrations (if applicable)
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
- [ ] Database rollback script prepared
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] Feature works as specified in requirements
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### 13. Risk Assessment

#### High Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Medium Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

#### Low Risk:
- [ ] [Risk description] - Mitigation: [Specific mitigation strategy]

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md'
- **category**: '[category]' - Automatically set from Category field above
- **automation_level**: 'semi_auto' | 'full_auto' | 'manual'
- **confirmation_required**: true | false
- **max_attempts**: 3 (default)
- **git_branch_required**: true | false
- **new_chat_required**: true | false

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/[feature-name]",
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

### 15. References & Resources
- **Technical Documentation**: [Links to relevant technical docs]
- **API References**: [External API documentation]
- **Design Patterns**: [Patterns to follow in implementation]
- **Best Practices**: [Industry standards and project conventions]
- **Similar Implementations**: [Existing code examples in codebase]

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# [Task Name] - Master Index

## 📋 Task Overview
- **Name**: [Task Name]
- **Category**: [category]
- **Priority**: [High/Medium/Low]
- **Status**: [Planning/In Progress/Completed]
- **Total Estimated Time**: [X hours]
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"] - Reference `@timestamp-utility.md`

## 📁 File Structure
```
docs/09_roadmap/tasks/[category]/[name]/
├── [name]-index.md (this file)
├── [name]-implementation.md
├── [name]-phase-1.md
├── [name]-phase-2.md
└── [name]-phase-3.md
```

## 🎯 Main Implementation
- **[Task Name Implementation](./[name]-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./[name]-phase-1.md) | [Status] | [X]h | [X]% |
| 2 | [Phase 2](./[name]-phase-2.md) | [Status] | [X]h | [X]% |
| 3 | [Phase 3](./[name]-phase-3.md) | [Status] | [X]h | [X]% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Subtask Name](./[subtask-name].md) - [Status] - [Progress]%

### Completed Subtasks
- [x] [Completed Subtask](./[completed-subtask].md) - ✅ Done

### Pending Subtasks
- [ ] [Pending Subtask](./[pending-subtask].md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: [X]% Complete
- **Current Phase**: [Phase Number]
- **Next Milestone**: [Description]
- **Estimated Completion**: [Date]

## 🔗 Related Tasks
- **Dependencies**: [List of tasks this depends on]
- **Dependents**: [List of tasks that depend on this]
- **Related**: [List of related tasks]

## 📝 Notes & Updates
### [Date] - [Update Type]
- [Description of update]
- [Files modified]
- [Progress made]

### [Date] - [Update Type]
- [Description of update]
- [Files modified]
- [Progress made]

## 🚀 Quick Actions
- [View Implementation Plan](./[name]-implementation.md)
- [Start Phase 1](./[name]-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)
```

### Index File Auto-Updates
The index file should automatically update when:
1. **New phases are created** - Add to phase breakdown table
2. **Subtasks are split** - Add to subtask management section
3. **Progress is made** - Update progress tracking
4. **Status changes** - Update overall status
5. **Files are modified** - Update last modified date

### Index File Benefits
- **Central Navigation**: One place to see all task files
- **Progress Overview**: Quick status and progress check
- **Dependency Tracking**: See what depends on what
- **History**: Track changes and updates over time
- **Quick Access**: Direct links to all related files

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
  '[Feature/Component Name]', -- From section 1
  '[Full markdown content]', -- Complete description
  '[Derived from Technical Requirements]', -- 'feature'|'bug'|'refactor'|etc
  '[Category]', -- From section 1 Category field
  '[Priority]', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md', -- Main implementation file
  'docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '[Estimated Time in hours]' -- From section 1
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

When you specify a **Category** in section 1, the system automatically:

1. **Creates category folder** if it doesn't exist: `docs/09_roadmap/tasks/[category]/`
2. **Creates task folder** for each task: `docs/09_roadmap/tasks/[category]/[name]/`
3. **Places main implementation file**: `docs/09_roadmap/tasks/[category]/[name]/[name]-implementation.md`
4. **Creates phase files** for subtasks: `docs/09_roadmap/tasks/[category]/[name]/[name]-phase-[number].md`
5. **Creates master index file**: `docs/09_roadmap/tasks/[category]/[name]/[name]-index.md`
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
docs/09_roadmap/tasks/
├── backend/
│   ├── user-authentication/
│   │   ├── user-authentication-index.md
│   │   ├── user-authentication-implementation.md
│   │   ├── user-authentication-phase-1.md
│   │   ├── user-authentication-phase-2.md
│   │   └── user-authentication-phase-3.md
│   └── database-migration/
│       ├── database-migration-index.md
│       ├── database-migration-implementation.md
│       └── database-migration-phase-1.md
├── frontend/
│   └── ui-redesign/
│       ├── ui-redesign-index.md
│       ├── ui-redesign-implementation.md
│       └── ui-redesign-phase-1.md
└── ide/
    └── vscode-integration/
        ├── vscode-integration-index.md
        ├── vscode-integration-implementation.md
        └── vscode-integration-phase-1.md
```

## Example Usage

> Create a comprehensive development plan for implementing user authentication with JWT tokens. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.

