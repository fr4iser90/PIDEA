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
- **Feature/Component Name**: Brainstorm Copilot Backend Services
- **Priority**: High
- **Category**: backend
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 4 hours
- **Dependencies**: Existing chat system, markdown file structure, database schema
- **Related Issues**: Part of brainstorm copilot feature split
- **Created**: 2025-01-27T21:30:00.000Z
- **Last Updated**: 2025-10-03T19:42:01.000Z

## Current Status - Last Updated: 2025-10-03T19:42:01.000Z

### 2. Technical Requirements
- **Tech Stack**: Node.js, Express, WebSocket, SQLite/PostgreSQL, Markdown processing
- **Architecture Pattern**: Service-oriented, Workflow-based, Event-driven (follows existing patterns)
- **Database Changes**: Utilize existing 'brainstorm' session_type in chat_sessions table
- **API Changes**: New endpoint `/api/chat/brainstorm` following existing WebChatController pattern
- **Frontend Changes**: None (handled by separate frontend task)
- **Backend Changes**: Service integration, workflow orchestration, context summarization

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/domain/entities/ChatSession.js` - Add brainstorm session support (utilize existing session_type)
- [ ] `backend/presentation/api/WebChatController.js` - Add brainstorm endpoint following existing pattern
- [ ] `backend/domain/services/chat/ChatService.js` - Add brainstorm session handling
- [ ] `backend/application/handlers/HandlerRegistry.js` - Register BrainstormCopilotHandler

#### Files to Create:
- [ ] `backend/domain/services/brainstorm/MemoryReaderService.js` - Read markdown files (follows existing service patterns)
- [ ] `backend/domain/services/brainstorm/ContextSummarizerService.js` - Generate project summaries
- [ ] `backend/domain/services/brainstorm/ProjectContextService.js` - Project context analysis
- [ ] `backend/domain/services/brainstorm/ChatHistoryService.js` - Chat history analysis
- [ ] `backend/application/handlers/categories/chat/BrainstormCopilotHandler.js` - Handle brainstorm sessions (follows HandlerRegistry pattern)
- [ ] `backend/domain/workflows/BrainstormCopilotWorkflow.js` - Main workflow (uses WorkflowBuilder pattern)
- [ ] `content-library/prompts/brainstorm/brainstorm-copilot-prompt.md` - AI prompt template

#### Files to Delete:
- [ ] None identified

### 4. Implementation Phases

#### Phase 1: Database & Entity Setup (1 hour)
- [ ] Update ChatSession entity to support brainstorm sessions (utilize existing session_type field)
- [ ] Add brainstorm session validation following existing entity patterns
- [ ] Test session creation and validation

#### Phase 2: Core Services Implementation (2 hours)
- [ ] Implement MemoryReaderService.js (follows existing service patterns)
- [ ] Implement ContextSummarizerService.js (integrates with existing AI services)
- [ ] Implement ProjectContextService.js (uses existing project analysis patterns)
- [ ] Implement ChatHistoryService.js (follows existing chat service patterns)
- [ ] Add markdown file scanning using existing FileSystemService
- [ ] Implement context generation logic

#### Phase 3: Workflow & API Integration (1 hour)
- [ ] Create BrainstormCopilotWorkflow.js using WorkflowBuilder pattern
- [ ] Implement BrainstormCopilotHandler.js following HandlerRegistry pattern
- [ ] Add brainstorm endpoint to WebChatController following existing patterns
- [ ] Integrate with existing chat system using ServiceRegistry
- [ ] Add WebSocket support using existing WebSocketManager

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation and sanitization for markdown file paths
- [ ] User authentication and authorization for brainstorm sessions
- [ ] Data privacy and protection for chat history
- [ ] Rate limiting for brainstorm operations
- [ ] Audit logging for all brainstorm actions
- [ ] Protection against malicious markdown content

### 7. Performance Requirements
- **Response Time**: < 2 seconds for context generation
- **Throughput**: Handle 10 concurrent brainstorm sessions
- **Memory Usage**: < 100MB for markdown processing
- **Database Queries**: Optimized with pagination and indexing
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
- [ ] Test file: `backend/tests/integration/BrainstormAPI.test.js` (auto-detected for API components)
- [ ] Test scenarios: Complete brainstorm session workflow
- [ ] Database compatibility: SQLite and PostgreSQL

#### Test Path Examples by Category:
- **Backend Service**: `backend/tests/unit/MemoryReaderService.test.js`
- **Backend Controller**: `backend/tests/unit/BrainstormCopilotHandler.test.js`
- **Backend API**: `backend/tests/integration/BrainstormAPI.test.js`
- **Backend Workflow**: `backend/tests/integration/BrainstormCopilotWorkflow.test.js`
- **Database Migration**: `backend/tests/integration/BrainstormMigration.test.js`
- **Security Feature**: `backend/tests/unit/BrainstormSecurity.test.js`

#### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend
- **Mock Requirements**: File system, database, external services

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for workflow components

#### User Documentation:
- [ ] Developer guide for brainstorm services
- [ ] API reference for brainstorm endpoints
- [ ] Troubleshooting guide for common issues
- [ ] Integration guide for frontend components

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Configuration updates applied
- [ ] Service restarts if needed
- [ ] Health checks configured

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify functionality in production
- [ ] Performance monitoring active
- [ ] API endpoint monitoring enabled

### 11. Rollback Plan
- [ ] Database rollback script prepared
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] All brainstorm services work as specified
- [ ] All tests pass (unit, integration)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] API endpoints functional and tested

### 13. Risk Assessment

#### High Risk:
- [ ] File system access vulnerabilities - Mitigation: Implement strict path validation and access controls
- [ ] Database migration failures - Mitigation: Test migrations on staging environment first

#### Medium Risk:
- [ ] Performance issues with large markdown files - Mitigation: Implement streaming and caching
- [ ] Memory leaks in markdown processing - Mitigation: Implement proper cleanup and monitoring

#### Low Risk:
- [ ] API endpoint conflicts - Mitigation: Use unique endpoint paths and versioning

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/backend/brainstorm-copilot-backend/brainstorm-copilot-backend-implementation.md'
- **category**: 'backend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/brainstorm-copilot-backend",
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
# Initial Prompt: Brainstorm Copilot Backend Services

## User Request:
Create backend services for brainstorm copilot workflow that handles markdown file reading, context summarization, and chat session management. This is the backend component of the brainstorm copilot feature split.

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Already in English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Create backend services for AI memory assistant workflow
- **Complexity**: Medium based on requirements
- **Scope**: Backend services, API endpoints, database changes
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
- **API References**: WebSocket API, chat endpoints, database schema
- **Design Patterns**: Workflow patterns, event-driven architecture, service-oriented design
- **Best Practices**: AI integration patterns, memory management systems, backend service design
- **Similar Implementations**: Cursor IDE chat system, GitHub Copilot memory features

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/backend/brainstorm-copilot-backend/brainstorm-copilot-backend-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Brainstorm Copilot Backend Services - Master Index

## 📋 Task Overview
- **Name**: Brainstorm Copilot Backend Services
- **Category**: backend
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 4 hours
- **Created**: 2025-01-27T21:30:00.000Z
- **Last Updated**: 2025-01-27T21:30:00.000Z
- **Original Language**: English
- **Prompt Sanitized**: ✅ Yes

## 📁 File Structure
```
docs/09_roadmap/pending/high/backend/brainstorm-copilot-backend/
├── brainstorm-copilot-backend-index.md (this file)
├── brainstorm-copilot-backend-implementation.md
├── brainstorm-copilot-backend-phase-1.md
├── brainstorm-copilot-backend-phase-2.md
└── brainstorm-copilot-backend-phase-3.md
```

## 🎯 Main Implementation
- **[Brainstorm Copilot Backend Implementation](./brainstorm-copilot-backend-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./brainstorm-copilot-backend-phase-1.md) | Planning | 1h | 0% |
| 2 | [Phase 2](./brainstorm-copilot-backend-phase-2.md) | Planning | 2h | 0% |
| 3 | [Phase 3](./brainstorm-copilot-backend-phase-3.md) | Planning | 1h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Database & Entity Setup](./brainstorm-copilot-backend-phase-1.md) - Planning - 0%
- [ ] [Core Services Implementation](./brainstorm-copilot-backend-phase-2.md) - Planning - 0%
- [ ] [Workflow & API Integration](./brainstorm-copilot-backend-phase-3.md) - Planning - 0%

### Completed Subtasks
- [x] None yet

### Pending Subtasks
- [ ] [Database & Entity Setup](./brainstorm-copilot-backend-phase-1.md) - ⏳ Waiting
- [ ] [Core Services Implementation](./brainstorm-copilot-backend-phase-2.md) - ⏳ Waiting
- [ ] [Workflow & API Integration](./brainstorm-copilot-backend-phase-3.md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Phase 1
- **Next Milestone**: Database & Entity Setup
- **Estimated Completion**: TBD

## 🔗 Related Tasks
- **Dependencies**: Existing chat system, markdown file structure
- **Dependents**: Brainstorm Copilot Frontend Interface
- **Related**: Brainstorm Copilot Frontend Interface

## 📝 Notes & Updates
### 2025-01-27 - Initial Creation
- Created comprehensive backend implementation plan
- Defined 3 phases with clear deliverables
- Set up testing strategy and success criteria
- Split from original brainstorm copilot task

## 🚀 Quick Actions
- [View Implementation Plan](./brainstorm-copilot-backend-implementation.md)
- [Start Phase 1](./brainstorm-copilot-backend-phase-1.md)
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
  'Brainstorm Copilot Backend Services', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Task type
  'backend', -- Category
  'high', -- Priority
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/backend/brainstorm-copilot-backend/brainstorm-copilot-backend-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/backend/brainstorm-copilot-backend/brainstorm-copilot-backend-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '4' -- Estimated Time in hours
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
│   │   │   ├── brainstorm-copilot-backend/
│   │   │   │   ├── brainstorm-copilot-backend-index.md
│   │   │   │   ├── brainstorm-copilot-backend-implementation.md
│   │   │   │   ├── brainstorm-copilot-backend-phase-1.md
│   │   │   │   ├── brainstorm-copilot-backend-phase-2.md
│   │   │   │   └── brainstorm-copilot-backend-phase-3.md
│   │   │   └── user-authentication/
│   │   │       ├── user-authentication-index.md
│   │   │       ├── user-authentication-implementation.md
│   │   │       └── user-authentication-phase-1.md
│   │   └── frontend/
│   │       └── brainstorm-copilot-frontend/
│   │           ├── brainstorm-copilot-frontend-index.md
│   │           ├── brainstorm-copilot-frontend-implementation.md
│   │           └── brainstorm-copilot-frontend-phase-1.md
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for implementing backend services for brainstorm copilot workflow. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
