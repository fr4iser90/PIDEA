# Prompt: Create Comprehensive Development Task Plan (Database-First)

## Goal
Generate a complete, actionable development plan that will be parsed into a database task with all necessary details for AI auto-implementation, tracking, and execution.

## Phase
Check Plan against codebase, collect all data u need!
Create new Plan/Implementation [Name]-implementation.md in docs/09_roadmap/pending/[priority]/[category]/[name]/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Status (default: pending) → Priority → Category → Task Name → Implementation files

## Template Structure

> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-index.md  
> If a file is missing, it must be created automatically. This pattern is required for orchestration and grouping in the system.  
> - **Implementation**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-implementation.md  
> - **Phase**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-phase-[number].md  

### 1. Project Overview
- **Feature/Component Name**: Brainstorm Copilot - AI Memory Assistant Workflow (Master Task)
- **Priority**: High
- **Category**: ai
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 7 hours (4h backend + 3h frontend)
- **Dependencies**: Existing chat system, markdown file structure
- **Related Issues**: Split into backend and frontend components
- **Created**: 2025-10-01T21:21:18.000Z
- **Split Tasks**: 
  - [Brainstorm Copilot Backend Services](../backend/brainstorm-copilot-backend/brainstorm-copilot-backend-implementation.md)
  - [Brainstorm Copilot Frontend Interface](../frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-implementation.md)

### 2. Technical Requirements
- **Tech Stack**: Node.js, Express, WebSocket, React, Markdown processing
- **Architecture Pattern**: Workflow-based, Event-driven, Component-based
- **Database Changes**: Add 'brainstorm' session type to chat_sessions table (Backend Task)
- **API Changes**: New endpoint `/api/chat/brainstorm` for copilot sessions (Backend Task)
- **Frontend Changes**: Brainstorm button, copilot interface component (Frontend Task)
- **Backend Changes**: Brainstorm workflow handler, memory reader service (Backend Task)

### 3. File Impact Analysis
#### Files to Modify (Backend Task):
- [ ] `database/init-postgres.sql` - Add 'brainstorm' to session_type enum (line 163)
- [ ] `database/init-sqlite.sql` - Add 'brainstorm' to session_type enum (line 160)
- [ ] `backend/domain/entities/ChatSession.js` - Add brainstorm session support
- [ ] `backend/presentation/api/WebChatController.js` - Add brainstorm endpoint (POST /api/chat/brainstorm)

#### Files to Modify (Frontend Task):
- [ ] `frontend/src/presentation/components/Header.jsx` - Add brainstorm navigation button
- [ ] `frontend/src/presentation/components/SidebarRight.jsx` - Add brainstorm tab
- [ ] `frontend/src/presentation/components/chat/main/ChatComponent.jsx` - Add brainstorm mode support
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Add brainstorm state management
- [ ] `frontend/src/App.jsx` - Add brainstorm view routing (case 'brainstorm')

#### Files to Create (Backend Task):
- [ ] `backend/domain/workflows/BrainstormCopilotWorkflow.js` - Main workflow orchestration
- [ ] `backend/domain/services/brainstorm/MemoryReaderService.js` - Read markdown files
- [ ] `backend/domain/services/brainstorm/ContextSummarizerService.js` - Generate project summaries
- [ ] `backend/application/handlers/categories/chat/BrainstormCopilotHandler.js` - Handle brainstorm sessions
- [ ] `content-library/prompts/brainstorm/brainstorm-copilot-prompt.md` - AI prompt template
- [ ] `backend/domain/services/brainstorm/ProjectContextService.js` - Project context analysis (NOTE: ProjectContextService already exists, extend it)
- [ ] `backend/domain/services/brainstorm/ChatHistoryService.js` - Chat history analysis

#### Files to Create (Frontend Task):
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormCopilot.jsx` - Main brainstorm interface
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormSettings.jsx` - Settings panel
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormHistory.jsx` - Session history
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormContext.jsx` - Context display
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormControls.jsx` - Control buttons
- [ ] `frontend/src/css/brainstorm/brainstorm-copilot.css` - Main styles
- [ ] `frontend/src/css/brainstorm/brainstorm-settings.css` - Settings styles
- [ ] `frontend/src/css/brainstorm/brainstorm-history.css` - History styles
- [ ] `frontend/src/hooks/useBrainstorm.js` - Custom hook for brainstorm functionality
- [ ] `frontend/src/services/BrainstormService.js` - Frontend service layer

#### Files to Delete:
- [ ] None identified

### 4. Implementation Phases

#### Phase 1: Backend Foundation Setup (4 hours)
- [ ] Complete [Backend Task](../backend/brainstorm-copilot-backend/brainstorm-copilot-backend-implementation.md)
- [ ] Database & Entity Setup
- [ ] Core Services Implementation  
- [ ] Workflow & API Integration

#### Phase 2: Frontend Interface Development (3 hours)
- [ ] Complete [Frontend Task](../frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-implementation.md)
- [ ] UI Components & Navigation
- [ ] Settings & Configuration
- [ ] Integration & Polish

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
- **Response Time**: < 2 seconds for context generation
- **Throughput**: Handle 10 concurrent brainstorm sessions
- **Memory Usage**: < 100MB for markdown processing
- **Database Queries**: Optimized with pagination
- **Caching Strategy**: Cache processed markdown content for 1 hour

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
- [ ] Test file: `backend/tests/unit/BrainstormCopilotWorkflow.test.js` (auto-detected based on category and component type)
- [ ] Test cases: Workflow orchestration, markdown reading, context generation
- [ ] Mock requirements: File system, chat repository, markdown parser

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/BrainstormCopilotHandler.test.js` (auto-detected for API/database components)
- [ ] Test scenarios: API endpoints, database interactions, workflow execution
- [ ] Test data: Sample markdown files, chat history fixtures

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/BrainstormSession.test.jsx` (auto-detected for frontend flows)
- [ ] User flows: Complete brainstorm session workflow
- [ ] Browser compatibility: Chrome, Firefox compatibility

#### Test Path Examples by Category:
- **Backend Service**: `backend/tests/unit/MemoryReaderService.test.js`
- **Backend Controller**: `backend/tests/unit/BrainstormCopilotHandler.test.js`
- **Backend API**: `backend/tests/integration/BrainstormAPI.test.js`
- **Frontend Component**: `frontend/tests/unit/BrainstormCopilot.test.jsx`
- **Frontend Hook**: `frontend/tests/unit/useBrainstorm.test.js`
- **Frontend Flow**: `frontend/tests/e2e/BrainstormSession.test.jsx`
- **Database Migration**: `backend/tests/integration/BrainstormMigration.test.js`
- **Security Feature**: `backend/tests/unit/BrainstormSecurity.test.js`

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
- [ ] File system access vulnerabilities - Mitigation: Implement strict path validation and access controls

#### Medium Risk:
- [ ] Performance issues with large markdown files - Mitigation: Implement streaming and caching

#### Low Risk:
- [ ] Frontend interface complexity - Mitigation: Incremental implementation with user feedback

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-implementation.md'
- **category**: 'ai'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/brainstorm-copilot",
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
# Initial Prompt: Brainstorm Copilot - AI Memory Assistant Workflow

## User Request:
Create a brainstorm copilot workflow that creates a new chat and uses a prompt to tell users what they did last time, what was discussed, updated, removed, etc. The system manages context via markdown files with memories, chats, and persons.

## Language Detection:
- **Original Language**: German/English mixed
- **Translation Status**: ✅ Converted to English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Create AI memory assistant workflow for brainstorming sessions
- **Complexity**: Medium based on requirements
- **Scope**: Workflow orchestration, markdown processing, context management
- **Dependencies**: Existing chat system, markdown file structure

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
- **Technical Documentation**: Existing chat system documentation, markdown processing capabilities
- **API References**: WebSocket API, chat endpoints
- **Design Patterns**: Workflow patterns, event-driven architecture
- **Best Practices**: AI integration patterns, memory management systems
- **Similar Implementations**: Cursor IDE chat system, GitHub Copilot memory features
- **Split Tasks**: 
  - [Backend Services](../backend/brainstorm-copilot-backend/brainstorm-copilot-backend-implementation.md)
  - [Frontend Interface](../frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-implementation.md)

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Brainstorm Copilot - AI Memory Assistant Workflow - Master Index

## 📋 Task Overview
- **Name**: Brainstorm Copilot - AI Memory Assistant Workflow
- **Category**: ai
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 6 hours
- **Created**: 2025-10-01T21:21:18.000Z
- **Last Updated**: 2025-10-01T21:21:18.000Z
- **Original Language**: German/English mixed
- **Prompt Sanitized**: ✅ Yes

## 📁 File Structure
```
docs/09_roadmap/pending/high/ai/brainstorm-copilot/
├── brainstorm-copilot-index.md (this file)
├── brainstorm-copilot-implementation.md
├── brainstorm-copilot-phase-1.md
├── brainstorm-copilot-phase-2.md
└── brainstorm-copilot-phase-3.md
```

## 🎯 Main Implementation
- **[Brainstorm Copilot Implementation](./brainstorm-copilot-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./brainstorm-copilot-phase-1.md) | Planning | 2h | 0% |
| 2 | [Phase 2](./brainstorm-copilot-phase-2.md) | Planning | 2h | 0% |
| 3 | [Phase 3](./brainstorm-copilot-phase-3.md) | Planning | 1h | 0% |
| 4 | [Phase 4](./brainstorm-copilot-phase-4.md) | Planning | 1h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Workflow Foundation](./brainstorm-copilot-phase-1.md) - Planning - 0%
- [ ] [Memory Reader](./brainstorm-copilot-phase-2.md) - Planning - 0%
- [ ] [Context Summarizer](./brainstorm-copilot-phase-3.md) - Planning - 0%
- [ ] [Integration & Testing](./brainstorm-copilot-phase-4.md) - Planning - 0%

### Completed Subtasks
- [x] None yet

### Pending Subtasks
- [ ] [Workflow Foundation](./brainstorm-copilot-phase-1.md) - ⏳ Waiting
- [ ] [Memory Reader](./brainstorm-copilot-phase-2.md) - ⏳ Waiting
- [ ] [Context Summarizer](./brainstorm-copilot-phase-3.md) - ⏳ Waiting
- [ ] [Integration & Testing](./brainstorm-copilot-phase-4.md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Phase 1
- **Next Milestone**: Workflow Foundation Setup
- **Estimated Completion**: TBD

## 🔗 Related Tasks
- **Dependencies**: Existing chat system, markdown file structure
- **Dependents**: None
- **Related**: None

## 📝 Notes & Updates
### 2025-10-01 - Initial Creation
- Created comprehensive implementation plan
- Defined 4 phases with clear deliverables
- Set up testing strategy and success criteria

## 🚀 Quick Actions
- [View Implementation Plan](./brainstorm-copilot-implementation.md)
- [Start Phase 1](./brainstorm-copilot-phase-1.md)
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
  'Brainstorm Copilot - AI Memory Assistant Workflow', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Task type
  'ai', -- Category
  'high', -- Priority
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '6' -- Estimated Time in hours
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
│   │   │   ├── user-authentication/
│   │   │   │   ├── user-authentication-index.md
│   │   │   │   ├── user-authentication-implementation.md
│   │   │   │   ├── user-authentication-phase-1.md
│   │   │   │   ├── user-authentication-phase-2.md
│   │   │   │   └── user-authentication-phase-3.md
│   │   │   └── database-migration/
│   │   │       ├── database-migration-index.md
│   │   │       ├── database-migration-implementation.md
│   │   │       └── database-migration-phase-1.md
│   │   └── frontend/
│   │       └── ui-redesign/
│   │           ├── ui-redesign-index.md
│   │           ├── ui-redesign-implementation.md
│   │           └── ui-redesign-phase-1.md
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

> Create a comprehensive development plan for implementing a brainstorm copilot workflow that creates new chats and uses prompts to provide context from markdown files. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

## Validation Results - 2025-01-27

### ✅ File Structure Validation Complete
- [x] Index: `docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-index.md` - Status: Created
- [x] Implementation: `docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-implementation.md` - Status: Found
- [x] Phase 1: `docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-phase-1.md` - Status: Created
- [x] Phase 2: `docs/09_roadmap/pending/high/ai/brainstorm-copilot/brainstorm-copilot-phase-2.md` - Status: Created

### ✅ Codebase Analysis Complete
- **Existing Chat System**: ✅ Found WebChatController with endpoints `/api/chat`, `/api/chat/history`, `/api/chat/sessions`
- **Database Schema**: ✅ Found chat_sessions table with session_type field (lines 160 SQLite, 163 PostgreSQL)
- **Frontend Structure**: ✅ Found React components in `frontend/src/presentation/components/`
- **Workflow Patterns**: ✅ Found workflow system in `backend/domain/workflows/` and handlers in `backend/application/handlers/`
- **ProjectContextService**: ✅ Already exists in `backend/infrastructure/dependency-injection/ProjectContextService.js`

### ⚠️ Implementation Gaps Identified
- [ ] **Database**: Need to add 'brainstorm' to session_type enum values
- [ ] **Backend Services**: All brainstorm-specific services need to be created
- [ ] **Frontend Components**: All brainstorm UI components need to be created
- [ ] **API Endpoints**: Need to add `/api/chat/brainstorm` endpoint
- [ ] **Prompt Template**: Need to create brainstorm-copilot-prompt.md
- [ ] **Integration**: Need to integrate with existing chat system

### 🔧 Task Splitting Assessment
- **Current Task Size**: 7 hours (within 8-hour limit) ✅
- **File Count**: 15 files to modify/create (within 10-file limit) ⚠️
- **Phase Count**: 2 phases (within 5-phase limit) ✅
- **Complexity**: Medium - manageable with proper splitting ✅
- **Dependencies**: Clear separation between backend and frontend ✅
- **Recommendation**: ✅ Task properly split into backend (4h) and frontend (3h) components

### 📊 Code Quality Validation
- **Architecture Pattern**: ✅ Follows existing DDD patterns
- **File Structure**: ✅ Matches existing project conventions
- **Naming Conventions**: ✅ Consistent with project standards
- **Error Handling**: ✅ Follows existing patterns
- **Testing Strategy**: ✅ Comprehensive test coverage planned

### 🚀 Next Steps
1. **Backend Implementation**: Start with Phase 1 (Database & Services)
2. **Frontend Implementation**: Follow with Phase 2 (UI Components)
3. **Integration Testing**: Ensure seamless integration with existing chat system
4. **Documentation**: Update API documentation and user guides

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
