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
- **Feature/Component Name**: Brainstorm Copilot Frontend Interface
- **Priority**: High
- **Category**: frontend
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 3 hours
- **Dependencies**: Brainstorm Copilot Backend Services, existing chat system, React components
- **Related Issues**: Part of brainstorm copilot feature split
- **Created**: 2025-01-27T21:35:00.000Z
- **Last Updated**: 2025-10-03T19:34:55.000Z

## Current Status - Last Updated: 2025-10-03T19:34:55.000Z

### ✅ Completed Items
- [x] Task planning and documentation structure created
- [x] Implementation plan defined with 3 phases
- [x] File structure and patterns established
- [x] Testing strategy defined
- [x] Language optimization completed (already in English)

### 🔄 In Progress
- [~] None currently in progress

### ❌ Missing Items
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormCopilot.jsx` - Main brainstorm interface component
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormSettings.jsx` - Settings panel component
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormHistory.jsx` - Session history component
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormContext.jsx` - Context display component
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormControls.jsx` - Control buttons component
- [ ] `frontend/src/css/brainstorm/brainstorm-copilot.css` - Main styles
- [ ] `frontend/src/css/brainstorm/brainstorm-settings.css` - Settings styles
- [ ] `frontend/src/css/brainstorm/brainstorm-history.css` - History styles
- [ ] `frontend/src/hooks/useBrainstorm.js` - Custom hook
- [ ] `frontend/src/infrastructure/repositories/BrainstormRepository.js` - Repository layer

### ⚠️ Issues Found
- [ ] No brainstorm navigation button in Header.jsx
- [ ] No brainstorm tab in SidebarRight.jsx
- [ ] No brainstorm view case in App.jsx renderView() method
- [ ] No brainstorm state management in IDEStore.jsx

### 🌐 Language Optimization
- [x] Task description already in English for AI processing
- [x] Technical terms properly defined
- [x] Code comments in English
- [x] Documentation language verified

### 📊 Current Metrics
- **Files Implemented**: 0/11 (0%)
- **Features Working**: 0/5 (0%)
- **Test Coverage**: 0%
- **Documentation**: 100% complete
- **Language Optimization**: 100% (English)

## Progress Tracking

### Phase Completion
- **Phase 1**: UI Components & Navigation - ❌ Not Started (0%)
- **Phase 2**: Settings & Configuration - ❌ Not Started (0%)
- **Phase 3**: Integration & Polish - ❌ Not Started (0%)

### Time Tracking
- **Estimated Total**: 3 hours
- **Time Spent**: 0 hours
- **Time Remaining**: 3 hours
- **Velocity**: Not started

### Blockers & Issues
- **Current Blocker**: No implementation has been started
- **Risk**: Backend services dependency not yet implemented
- **Mitigation**: Frontend can be developed with mock data initially

### Language Processing
- **Original Language**: English
- **Translation Status**: ✅ Complete
- **AI Processing**: ✅ Optimized
- **Technical Accuracy**: ✅ Verified

### 2. Technical Requirements
- **Tech Stack**: React, JSX, CSS, WebSocket, EventBus
- **Architecture Pattern**: Component-based, Event-driven, State management
- **Database Changes**: None (handled by backend task)
- **API Changes**: None (handled by backend task)
- **Frontend Changes**: New UI components, header navigation, sidebar integration, settings panel
- **Backend Changes**: None (handled by backend task)

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `frontend/src/presentation/components/Header.jsx` - Add brainstorm navigation button to existing mode-btn pattern
- [ ] `frontend/src/presentation/components/SidebarRight.jsx` - Add brainstorm tab to existing tab structure
- [ ] `frontend/src/App.jsx` - Add brainstorm view to existing renderView() pattern
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Add brainstorm state to existing store pattern

#### Files to Create:
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormCopilot.jsx` - Main brainstorm interface (follows ChatComponent pattern)
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormSettings.jsx` - Settings panel (follows existing panel pattern)
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormHistory.jsx` - Session history (follows ChatPanelComponent pattern)
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormContext.jsx` - Context display component
- [ ] `frontend/src/presentation/components/brainstorm/BrainstormControls.jsx` - Control buttons (follows existing button patterns)
- [ ] `frontend/src/css/brainstorm/brainstorm-copilot.css` - Main styles (uses existing CSS variables)
- [ ] `frontend/src/css/brainstorm/brainstorm-settings.css` - Settings styles (follows existing panel styles)
- [ ] `frontend/src/css/brainstorm/brainstorm-history.css` - History styles (follows existing chat styles)
- [ ] `frontend/src/hooks/useBrainstorm.js` - Custom hook (follows existing hook patterns)
- [ ] `frontend/src/infrastructure/repositories/BrainstormRepository.js` - Repository layer (follows APIChatRepository pattern)

#### Files to Delete:
- [ ] None identified

### 4. Implementation Phases

#### Phase 1: UI Components & Navigation (1.5 hours)
- [ ] Create BrainstormCopilot.jsx main component (follows ChatComponent pattern)
- [ ] Add brainstorm button to Header.jsx navigation (follows existing mode-btn pattern)
- [ ] Add brainstorm tab to SidebarRight.jsx (follows existing tab structure)
- [ ] Create basic CSS styling using existing CSS variables and patterns
- [ ] Implement brainstorm view in App.jsx renderView() pattern

#### Phase 2: Settings & Configuration (1 hour)
- [ ] Create BrainstormSettings.jsx component (follows existing panel patterns)
- [ ] Implement settings panel in right sidebar (integrates with existing tab system)
- [ ] Add configuration options using existing state management patterns
- [ ] Create settings persistence using existing store patterns
- [ ] Add settings validation following existing error handling patterns

#### Phase 3: Integration & Polish (0.5 hours)
- [ ] Integrate with existing chat system using EventBus patterns
- [ ] Add WebSocket support using existing WebSocketService
- [ ] Implement error handling following existing patterns
- [ ] Add responsive design using existing CSS architecture
- [ ] Test integration with backend services using existing API patterns

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Console logger with structured logging, different levels for operations
- **Testing**: Jest framework with React Testing Library, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation and sanitization for user inputs
- [ ] XSS protection for dynamic content
- [ ] CSRF protection for API calls
- [ ] Secure WebSocket connections
- [ ] User session validation
- [ ] Content Security Policy compliance

### 7. Performance Requirements
- **Response Time**: < 500ms for UI interactions
- **Throughput**: Handle 10 concurrent brainstorm sessions
- **Memory Usage**: < 50MB for React components
- **Bundle Size**: < 100KB additional bundle size
- **Caching Strategy**: Cache UI state and settings locally

### 8. Testing Strategy

#### Intelligent Test Path Resolution:
```javascript
// Smart test path detection based on category, component type, and project structure
const resolveTestPath = (category, componentName, componentType = 'component') => {
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
// resolveTestPath('frontend', 'BrainstormCopilot', 'component') → 'frontend/tests/unit/BrainstormCopilot.test.jsx'
// resolveTestPath('frontend', 'useBrainstorm', 'hook') → 'frontend/tests/unit/useBrainstorm.test.js'
// resolveTestPath('frontend', 'BrainstormService', 'service') → 'frontend/tests/unit/BrainstormService.test.js'
// resolveTestPath('frontend', 'BrainstormFlow', 'flow') → 'frontend/tests/e2e/BrainstormFlow.test.jsx'
```

#### Unit Tests:
- [ ] Test file: `frontend/tests/unit/BrainstormCopilot.test.jsx` (auto-detected based on category and component type)
- [ ] Test cases: Component rendering, user interactions, state management
- [ ] Mock requirements: EventBus, WebSocket, API services

#### Integration Tests:
- [ ] Test file: `frontend/tests/integration/BrainstormIntegration.test.jsx` (auto-detected for integration components)
- [ ] Test scenarios: Component integration, API communication, WebSocket handling
- [ ] Test data: Mock brainstorm sessions, settings data

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/BrainstormFlow.test.jsx` (auto-detected for frontend flows)
- [ ] User flows: Complete brainstorm session workflow
- [ ] Browser compatibility: Chrome, Firefox compatibility

#### Test Path Examples by Category:
- **Frontend Component**: `frontend/tests/unit/BrainstormCopilot.test.jsx`
- **Frontend Hook**: `frontend/tests/unit/useBrainstorm.test.js`
- **Frontend Service**: `frontend/tests/unit/BrainstormService.test.js`
- **Frontend Flow**: `frontend/tests/e2e/BrainstormFlow.test.jsx`
- **Frontend Integration**: `frontend/tests/integration/BrainstormIntegration.test.jsx`

#### Test Configuration:
- **Frontend Tests**: Jest with jsdom environment, React Testing Library
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.jsx` for components, `.test.js` for hooks/services
- **Mock Requirements**: EventBus, WebSocket, API services, localStorage

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and components
- [ ] README updates with new functionality
- [ ] Component documentation with examples
- [ ] Architecture diagrams for UI components

#### User Documentation:
- [ ] User guide for brainstorm features
- [ ] Feature documentation for developers
- [ ] Troubleshooting guide for common issues
- [ ] Integration guide for backend services

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Build process completed successfully
- [ ] Static assets generated
- [ ] Environment variables configured
- [ ] CDN deployment if applicable
- [ ] Health checks configured

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify functionality in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

### 11. Rollback Plan
- [ ] Previous version deployment procedure
- [ ] Configuration rollback procedure
- [ ] Static asset rollback procedure
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
- [ ] WebSocket connection failures - Mitigation: Implement robust reconnection logic and fallbacks
- [ ] State management complexity - Mitigation: Use proven patterns and thorough testing

#### Medium Risk:
- [ ] Performance issues with large datasets - Mitigation: Implement virtualization and pagination
- [ ] Browser compatibility issues - Mitigation: Test across major browsers and implement polyfills

#### Low Risk:
- [ ] UI/UX inconsistencies - Mitigation: Follow existing design patterns and user testing

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-implementation.md'
- **category**: 'frontend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/brainstorm-copilot-frontend",
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
# Initial Prompt: Brainstorm Copilot Frontend Interface

## User Request:
Create frontend interface for brainstorm copilot workflow including UI components, navigation integration, settings panel, and user experience features. This is the frontend component of the brainstorm copilot feature split.

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Already in English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Create frontend interface for AI memory assistant workflow
- **Complexity**: Medium based on requirements
- **Scope**: UI components, navigation, settings, user experience
- **Dependencies**: Brainstorm Copilot Backend Services, existing chat system

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
- **Technical Documentation**: Existing frontend components, React patterns, CSS architecture
- **API References**: WebSocket API, chat endpoints, EventBus patterns
- **Design Patterns**: Component patterns, state management, event-driven architecture
- **Best Practices**: React best practices, accessibility guidelines, performance optimization
- **Similar Implementations**: Existing chat components, sidebar panels, settings interfaces

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Brainstorm Copilot Frontend Interface - Master Index

## 📋 Task Overview
- **Name**: Brainstorm Copilot Frontend Interface
- **Category**: frontend
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 3 hours
- **Created**: 2025-01-27T21:35:00.000Z
- **Last Updated**: 2025-01-27T21:35:00.000Z
- **Original Language**: English
- **Prompt Sanitized**: ✅ Yes

## 📁 File Structure
```
docs/09_roadmap/pending/high/frontend/brainstorm-copilot-frontend/
├── brainstorm-copilot-frontend-index.md (this file)
├── brainstorm-copilot-frontend-implementation.md
├── brainstorm-copilot-frontend-phase-1.md
├── brainstorm-copilot-frontend-phase-2.md
└── brainstorm-copilot-frontend-phase-3.md
```

## 🎯 Main Implementation
- **[Brainstorm Copilot Frontend Implementation](./brainstorm-copilot-frontend-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./brainstorm-copilot-frontend-phase-1.md) | Planning | 1.5h | 0% |
| 2 | [Phase 2](./brainstorm-copilot-frontend-phase-2.md) | Planning | 1h | 0% |
| 3 | [Phase 3](./brainstorm-copilot-frontend-phase-3.md) | Planning | 0.5h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [UI Components & Navigation](./brainstorm-copilot-frontend-phase-1.md) - Planning - 0%
- [ ] [Settings & Configuration](./brainstorm-copilot-frontend-phase-2.md) - Planning - 0%
- [ ] [Integration & Polish](./brainstorm-copilot-frontend-phase-3.md) - Planning - 0%

### Completed Subtasks
- [x] None yet

### Pending Subtasks
- [ ] [UI Components & Navigation](./brainstorm-copilot-frontend-phase-1.md) - ⏳ Waiting
- [ ] [Settings & Configuration](./brainstorm-copilot-frontend-phase-2.md) - ⏳ Waiting
- [ ] [Integration & Polish](./brainstorm-copilot-frontend-phase-3.md) - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Phase 1
- **Next Milestone**: UI Components & Navigation
- **Estimated Completion**: TBD

## 🔗 Related Tasks
- **Dependencies**: Brainstorm Copilot Backend Services
- **Dependents**: None
- **Related**: Brainstorm Copilot Backend Services

## 📝 Notes & Updates
### 2025-01-27 - Initial Creation
- Created comprehensive frontend implementation plan
- Defined 3 phases with clear deliverables
- Set up testing strategy and success criteria
- Split from original brainstorm copilot task

## 🚀 Quick Actions
- [View Implementation Plan](./brainstorm-copilot-frontend-implementation.md)
- [Start Phase 1](./brainstorm-copilot-frontend-phase-1.md)
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
  'Brainstorm Copilot Frontend Interface', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Task type
  'frontend', -- Category
  'high', -- Priority
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/frontend/brainstorm-copilot-frontend/brainstorm-copilot-frontend-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  '3' -- Estimated Time in hours
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
│   │   │   └── brainstorm-copilot-backend/
│   │   │       ├── brainstorm-copilot-backend-index.md
│   │   │       ├── brainstorm-copilot-backend-implementation.md
│   │   │       ├── brainstorm-copilot-backend-phase-1.md
│   │   │       ├── brainstorm-copilot-backend-phase-2.md
│   │   │       └── brainstorm-copilot-backend-phase-3.md
│   │   └── frontend/
│   │       └── brainstorm-copilot-frontend/
│   │           ├── brainstorm-copilot-frontend-index.md
│   │           ├── brainstorm-copilot-frontend-implementation.md
│   │           ├── brainstorm-copilot-frontend-phase-1.md
│   │           ├── brainstorm-copilot-frontend-phase-2.md
│   │           └── brainstorm-copilot-frontend-phase-3.md
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for implementing frontend interface for brainstorm copilot workflow. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
