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
- **Feature/Component Name**: Framework Loading System Fixes
- **Priority**: High
- **Category**: backend
- **Status**: pending (default - tasks are created in pending status)
- **Estimated Time**: 8 hours
- **Dependencies**: None - critical infrastructure fix
- **Related Issues**: Framework loading failures, step registry integration issues
- **Created**: 2025-01-27T10:30:00.000Z

### 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript, JSON
- **Architecture Pattern**: Domain-Driven Design (DDD)
- **Database Changes**: None - framework configuration fixes
- **API Changes**: None - internal framework loading
- **Frontend Changes**: None
- **Backend Changes**: FrameworkRegistry, FrameworkLoader, FrameworkStepRegistry classes

### 3. File Impact Analysis
#### Files to Modify:
- [x] `backend/domain/frameworks/FrameworkRegistry.js` - Add missing unregisterFramework method (VALIDATED: Method missing, removeFramework exists at line 169)
- [x] `backend/domain/frameworks/FrameworkRegistry.js` - Fix validateFrameworkConfig method for steps object format (VALIDATED: Line 215 expects array, frameworks use object)
- [x] `backend/infrastructure/framework/FrameworkStepRegistry.js` - Fix step registry integration (VALIDATED: Integration issues confirmed in logs)
- [x] `backend/framework/workflows/task-creation-workflows.json` - Fix JSON structure issues (VALIDATED: File exists and loads correctly)

#### Files to Create:
- [x] `backend/framework/documentation_pidea_numeric/steps/` - Create missing steps directory (VALIDATED: Directory missing, framework.json has empty steps object)
- [x] `backend/framework/refactor_ddd_pattern/steps/` - Create missing steps directory (VALIDATED: Directory missing, framework.json has empty steps object)
- [x] `backend/framework/refactor_mvc_pattern/steps/` - Create missing steps directory (VALIDATED: Directory missing, framework.json has empty steps object)
- [x] `backend/framework/workflows/steps/` - Create missing steps directory (VALIDATED: Directory missing, framework.json exists)

#### Files to Delete:
- [ ] None

### 4. Implementation Phases

#### Phase 1: Framework Registry Fixes (2 hours)
- [ ] Add missing unregisterFramework method to FrameworkRegistry
- [ ] Fix validateFrameworkConfig to handle steps as object instead of array
- [ ] Update method signatures and error handling
- [ ] Add comprehensive unit tests for new methods

#### Phase 2: Step Registry Integration (2 hours)
- [ ] Fix FrameworkStepRegistry step registration process
- [ ] Ensure proper stepRegistry.register method availability
- [ ] Implement proper error handling for missing step registry
- [ ] Add validation for step module structure

#### Phase 3: Framework Configuration Fixes (2 hours)
- [ ] Fix task-creation-workflows.json structure issues
- [ ] Create missing steps directories for frameworks
- [ ] Add default step configurations for empty frameworks
- [ ] Validate all framework.json files

#### Phase 4: Testing & Validation (1.5 hours)
- [ ] Write comprehensive unit tests for all fixes
- [ ] Test framework loading process end-to-end
- [ ] Validate step registration works correctly
- [ ] Test error handling and fallback mechanisms

#### Phase 5: Documentation & Cleanup (0.5 hours)
- [ ] Update documentation for framework loading process
- [ ] Add error handling documentation
- [ ] Clean up any temporary files
- [ ] Verify all frameworks load successfully

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

### 6. Security Considerations
- [ ] Input validation for framework configurations
- [ ] Sanitization of framework names and paths
- [ ] Protection against path traversal in framework loading
- [ ] Validation of JSON configuration files
- [ ] Error message sanitization to prevent information leakage

### 7. Performance Requirements
- **Response Time**: Framework loading < 5 seconds
- **Throughput**: Support loading of 50+ frameworks simultaneously
- **Memory Usage**: < 100MB for framework loading process
- **Database Queries**: None - in-memory framework management
- **Caching Strategy**: Cache loaded framework configurations

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
// resolveTestPath('backend', 'FrameworkRegistry', 'service') → 'backend/tests/unit/FrameworkRegistry.test.js'
// resolveTestPath('backend', 'FrameworkLoader', 'service') → 'backend/tests/unit/FrameworkLoader.test.js'
// resolveTestPath('backend', 'FrameworkStepRegistry', 'service') → 'backend/tests/unit/FrameworkStepRegistry.test.js'
```

#### Unit Tests:
- [ ] Test file: `backend/tests/unit/FrameworkRegistry.test.js`
- [ ] Test cases: unregisterFramework method, validateFrameworkConfig with steps object
- [ ] Mock requirements: File system operations, logger

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/FrameworkLoading.test.js`
- [ ] Test scenarios: Complete framework loading process, step registration
- [ ] Test data: Sample framework configurations, mock step modules

#### E2E Tests:
- [ ] Test file: `backend/tests/integration/FrameworkSystem.test.js`
- [ ] User flows: Application startup with framework loading
- [ ] Browser compatibility: N/A - backend only

#### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for unregisterFramework method
- [ ] JSDoc comments for updated validateFrameworkConfig method
- [ ] README updates with framework loading process
- [ ] Architecture diagrams for framework loading flow

#### User Documentation:
- [ ] Framework loading troubleshooting guide
- [ ] Framework configuration format documentation
- [ ] Error handling guide for framework issues
- [ ] Migration guide for framework updates

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration)
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
- [ ] Monitor logs for framework loading errors
- [ ] Verify all frameworks load successfully
- [ ] Performance monitoring active
- [ ] Error tracking enabled

### 11. Rollback Plan
- [ ] Git revert to previous working state
- [ ] No database rollback required
- [ ] Configuration rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] All 10 frameworks load successfully without errors (VALIDATED: Currently all failing due to validation issues)
- [ ] All tests pass (unit, integration)
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Framework step registration works correctly (VALIDATED: Currently failing due to step registry integration issues)
- [ ] Application startup completes without framework errors (VALIDATED: Currently showing multiple framework loading failures)

### 13. Risk Assessment

#### High Risk:
- [ ] Breaking existing framework functionality - Mitigation: Comprehensive testing before deployment

#### Medium Risk:
- [ ] Performance impact during framework loading - Mitigation: Implement caching and optimize loading process

#### Low Risk:
- [ ] Documentation updates - Mitigation: Automated documentation generation

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-implementation.md'
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
  "git_branch_name": "feature/framework-loading-fixes",
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
- [ ] All frameworks load successfully

### 15. References & Resources
- **Technical Documentation**: Framework loading architecture docs
- **API References**: Node.js fs.promises API
- **Design Patterns**: Domain-Driven Design patterns
- **Best Practices**: Error handling and logging standards
- **Similar Implementations**: Existing registry patterns in codebase

### 16. Validation Results - 2025-01-27

#### ✅ File Structure Validation
- **All Required Files**: Present and properly structured
- **Directory Structure**: Correct hierarchical organization
- **Naming Conventions**: Follows established patterns
- **File References**: All internal links working correctly

#### ⚠️ Current Issues Identified
1. **FrameworkRegistry Missing Method**: `unregisterFramework` method not found (line 169 has `removeFramework`)
2. **Steps Validation Mismatch**: Line 215 expects array, frameworks use object format
3. **Missing Steps Directories**: 4 frameworks missing steps directories
4. **Step Registry Integration**: FrameworkStepRegistry cannot register steps
5. **Framework Loading Failures**: All 10 frameworks failing to load

#### 🔧 Implementation Plan Validation
- **Phase Breakdown**: Correctly addresses all identified issues
- **Time Estimates**: Appropriate for scope of work
- **File Impact**: Accurately identifies files needing modification
- **Dependencies**: Properly sequenced phases
- **Success Criteria**: Measurable and achievable

#### 📊 Code Quality Assessment
- **Architecture**: Good separation of concerns between domain and infrastructure
- **Error Handling**: Needs improvement in framework loading process
- **Logging**: Comprehensive logging present but needs enhancement
- **Testing**: Requires comprehensive test coverage for fixes

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Framework Loading System Fixes - Master Index

## 📋 Task Overview
- **Name**: Framework Loading System Fixes
- **Category**: backend
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 8 hours
- **Created**: 2025-01-27T10:30:00.000Z
- **Last Updated**: 2025-01-27T10:30:00.000Z

## 📁 File Structure
```
docs/09_roadmap/pending/high/backend/framework-loading-fixes/
├── framework-loading-fixes-index.md (this file)
├── framework-loading-fixes-implementation.md
├── framework-loading-fixes-phase-1.md
├── framework-loading-fixes-phase-2.md
├── framework-loading-fixes-phase-3.md
├── framework-loading-fixes-phase-4.md
└── framework-loading-fixes-phase-5.md
```

## 🎯 Main Implementation
- **[Framework Loading System Fixes Implementation](./framework-loading-fixes-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./framework-loading-fixes-phase-1.md) | Planning | 2h | 0% |
| 2 | [Phase 2](./framework-loading-fixes-phase-2.md) | Planning | 2h | 0% |
| 3 | [Phase 3](./framework-loading-fixes-phase-3.md) | Planning | 2h | 0% |
| 4 | [Phase 4](./framework-loading-fixes-phase-4.md) | Planning | 1.5h | 0% |
| 5 | [Phase 5](./framework-loading-fixes-phase-5.md) | Planning | 0.5h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] Framework Registry Fixes - Planning - 0%
- [ ] Step Registry Integration - Planning - 0%
- [ ] Framework Configuration Fixes - Planning - 0%

### Completed Subtasks
- None yet

### Pending Subtasks
- [ ] Testing & Validation - ⏳ Waiting
- [ ] Documentation & Cleanup - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Planning
- **Next Milestone**: Framework Registry Fixes
- **Estimated Completion**: 2025-01-27T18:30:00.000Z

## 🔗 Related Tasks
- **Dependencies**: None
- **Dependents**: All framework-dependent features
- **Related**: Framework infrastructure tasks

## 📝 Notes & Updates
### 2025-01-27 - Task Creation
- Created comprehensive implementation plan
- Identified 5 main phases for fixes
- Estimated 8 hours total development time

## 🚀 Quick Actions
- [View Implementation Plan](./framework-loading-fixes-implementation.md)
- [Start Phase 1](./framework-loading-fixes-phase-1.md)
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
  'PIDEA', -- From context
  'Framework Loading System Fixes', -- From section 1
  '[Full markdown content]', -- Complete description
  'bug', -- Derived from Technical Requirements
  'backend', -- From section 1 Category field
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '{"tech_stack":["Node.js","JavaScript","JSON"],"architecture":"DDD","database_changes":"None","api_changes":"None","frontend_changes":"None","backend_changes":"FrameworkRegistry, FrameworkLoader, FrameworkStepRegistry classes"}', -- All technical details
  8 -- From section 1
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
2. **Creates priority folder** if it doesn't exist: `docs/09_roadmap/pending/high/`
3. **Creates category folder** if it doesn't exist: `docs/09_roadmap/pending/high/backend/`
4. **Creates task folder** for each task: `docs/09_roadmap/pending/high/backend/framework-loading-fixes/`
5. **Places main implementation file**: `docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-implementation.md`
6. **Creates phase files** for subtasks: `docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-phase-[number].md`
7. **Creates master index file**: `docs/09_roadmap/pending/high/backend/framework-loading-fixes/framework-loading-fixes-index.md`
8. **Sets database category** field to the specified category
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
- **general** - tasks that don't fit other categories

### Example Folder Structure:
```
docs/09_roadmap/
├── pending/
│   ├── high/
│   │   ├── backend/
│   │   │   └── framework-loading-fixes/
│   │   │       ├── framework-loading-fixes-index.md
│   │   │       ├── framework-loading-fixes-implementation.md
│   │   │       ├── framework-loading-fixes-phase-1.md
│   │   │       ├── framework-loading-fixes-phase-2.md
│   │   │       ├── framework-loading-fixes-phase-3.md
│   │   │       ├── framework-loading-fixes-phase-4.md
│   │   │       └── framework-loading-fixes-phase-5.md
├── in-progress/
├── completed/
└── failed/
```

## Example Usage

> Create a comprehensive development plan for implementing framework loading system fixes. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
