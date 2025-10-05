# Prompt: Create Comprehensive Development Task Plan (Database-First)

## Goal
Generate a complete, actionable development plan that will be parsed into a database task with all necessary details for AI auto-implementation, tracking, and execution.

## Phase
Check Plan against codebase, collect all data u need!
Create new Plan/Implementation [Name]-implementation.md in docs/09_roadmap/pending/[priority]/[category]/[name]/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Status (default: pending) → Priority → Category → Task Name → Implementation files

## Language Requirements - MANDATORY

### FORBIDDEN TERMS (Never Use):
- unified, comprehensive, advanced, intelligent, smart, enhanced, optimized, streamlined, consolidated, sophisticated, robust, scalable, efficient, dynamic, flexible, modular, extensible, maintainable, performant

### REQUIRED TERMS (Always Use):
- one, single, main, basic, simple, direct, clear, standard, normal, regular

### EXAMPLES:
- ❌ "UnifiedCacheService" → ✅ "CacheService"
- ❌ "Comprehensive Analysis" → ✅ "Analysis"
- ❌ "Advanced Integration" → ✅ "Integration"
- ❌ "Smart Detection" → ✅ "Detection"
- ❌ "Enhanced Performance" → ✅ "Performance"
- ❌ "Optimized Configuration" → ✅ "Configuration"

### VALIDATION RULE:
Before saving any content, scan for forbidden terms and replace with simple alternatives.

## Template Structure

> **File Pattern Requirement:**  
> All Index, Implementation and Phase files must always be created using this pattern:
> - **Index**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-index.md  
> If a file is missing, it must be created automatically. This pattern is required for orchestration and grouping in the system.  
> - **Implementation**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-implementation.md  
> - **Phase**: docs/09_roadmap/pending/[priority]/[category]/[name]/[name]-phase-[number].md  


### 1. Project Overview
- **Feature/Component Name**: Playwright Test Runner System
- **Priority**: High
- **Category**: testing
- **Status**: completed
- **Completed**: 2025-10-05T12:57:05.000Z
- **Estimated Time**: 25 hours (adjusted for comprehensive API endpoints)
- **Dependencies**: None
- **Related Issues**: Frontend Test Framework Migration, Existing Jest/Vitest Infrastructure
- **Created**: 2025-10-05T07:39:29.000Z
- **Started**: 2025-10-05T12:57:05.000Z

### 2. Technical Requirements
- **Tech Stack**: Playwright, Node.js, JavaScript, Jest, Vitest, React Testing Library
- **Architecture Pattern**: Command Pattern, Factory Pattern, Strategy Pattern
- **Database Changes**: Add Playwright test configuration tables and settings
- **API Changes**: New test execution endpoints
- **Frontend Changes**: Test runner UI components, test result visualization
- **Backend Changes**: Test execution service, test management, configuration handling

### 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/package.json` - Add @playwright/test dependency (only has playwright core v1.44.0)
- [ ] `tests/playwright/setup.js` - Add Playwright configuration
- [ ] `frontend/src/presentation/components/Header.jsx` - Add Tests button to navigation
- [ ] `frontend/src/App.jsx` - Add tests case to renderView function
- [ ] `backend/presentation/api/controllers/TestManagementController.js` - Extend with Playwright endpoints

#### Files to Create:
- [ ] `tests/playwright/playwright.config.js` - Main Playwright configuration
- [ ] `tests/playwright/tests/login.test.js` - Login test
- [ ] `tests/playwright/tests/dashboard.test.js` - Dashboard test
- [ ] `tests/playwright/tests/form-submission.test.js` - Form submission test
- [ ] `tests/playwright/utils/test-runner.js` - Test runner utility
- [ ] `tests/playwright/utils/test-manager.js` - Test management
- [ ] `tests/playwright/config/project-config.js` - Project-specific configuration
- [ ] `tests/playwright/fixtures/test-data.json` - Test data fixtures
- [ ] `tests/playwright/screenshots/` - Screenshot storage directory
- [ ] `tests/playwright/reports/` - Test report storage directory
- [ ] `backend/application/services/PlaywrightTestApplicationService.js` - Backend test service (follows ApplicationService pattern with workspace detection)
- [ ] `backend/application/handlers/categories/testing/PlaywrightTestHandler.js` - Test execution handler (follows HandlerRegistry pattern)
- [ ] `frontend/src/presentation/components/tests/main/TestRunnerComponent.jsx` - Test management UI (follows component pattern with workspace integration)
- [ ] `frontend/src/presentation/components/tests/main/TestResultsViewer.jsx` - Test results display (follows component pattern)
- [ ] `frontend/src/presentation/components/tests/main/TestConfiguration.jsx` - Test configuration UI (follows component pattern)
- [ ] `frontend/src/presentation/components/tests/common/TestStatusBadge.jsx` - Test status indicator (follows component pattern)
- [ ] `frontend/src/hooks/useTestRunner.js` - Test management hook (follows existing hook pattern)
- [ ] `frontend/src/infrastructure/services/TestRunnerService.js` - Frontend API service (follows infrastructure pattern)

#### Files to Delete:
- None

### 4. Implementation Phases

#### Phase 1: Foundation Setup (5 hours)
- [ ] Add @playwright/test to backend package.json (only has playwright core v1.44.0)
- [ ] Create basic Playwright configuration
- [ ] Set up test directory structure (tests/playwright/ exists but empty)
- [ ] Create initial test runner utility
- [ ] Configure Playwright settings through database (follows project pattern)

#### Phase 2: Core Implementation (8 hours)
- [ ] Implement test management system
- [ ] Create project-specific configuration handler
- [ ] Build PlaywrightTestApplicationService (follows ApplicationService pattern with dependency injection and workspace detection)
- [ ] Implement workspace path detection using existing patterns (IDE Manager, Project Mapping Service, fallback)
- [ ] Create PlaywrightTestHandler in categories/testing/ (follows HandlerRegistry pattern)
- [ ] Implement login detection and handling
- [ ] Add error handling and logging (follows existing ServiceLogger pattern)

#### Phase 3: Integration (8 hours)
- [ ] Connect with existing Jest/Vitest infrastructure and TestManagementService
- [ ] Extend TestManagementController with Playwright-specific endpoints (follows existing controller pattern)
  - [ ] POST /api/projects/:projectId/tests/playwright/execute - Execute Playwright tests
  - [ ] GET /api/projects/:projectId/tests/playwright/results - Get Playwright test results
  - [ ] POST /api/projects/:projectId/tests/playwright/config - Playwright configuration management
  - [ ] GET /api/projects/:projectId/tests/playwright/config - Get Playwright test configuration
  - [ ] PUT /api/projects/:projectId/tests/playwright/config - Update Playwright test configuration
  - [ ] POST /api/projects/:projectId/tests/playwright/config/validate - Validate Playwright configuration
  - [ ] GET /api/projects/:projectId/tests/playwright/projects - List available Playwright test projects
  - [ ] POST /api/projects/:projectId/tests/playwright/projects - Create new Playwright test project
  - [ ] GET /api/projects/:projectId/tests/playwright/projects/{id}/config - Get project-specific Playwright config
  - [ ] PUT /api/projects/:projectId/tests/playwright/projects/{id}/config - Update project-specific Playwright config
  - [ ] POST /api/projects/:projectId/tests/playwright/login/validate - Validate login credentials for Playwright tests
  - [ ] GET /api/projects/:projectId/tests/playwright/status - Get Playwright test runner status
  - [ ] POST /api/projects/:projectId/tests/playwright/stop - Stop running Playwright tests
  - [ ] GET /api/projects/:projectId/tests/playwright/logs - Get Playwright test execution logs
- [ ] Build frontend test management UI components (follows IDEMirrorComponent/ChatComponent patterns)
- [ ] Integrate with existing IDEStore and useIDEStore patterns for workspace detection
- [ ] Add workspace path integration to TestRunnerComponent (follows existing component patterns)
- [ ] Add test result visualization (follows AnalysisDataViewer pattern)

#### Phase 4: Testing & Documentation (4 hours)
- [ ] Write unit tests for test runner
- [ ] Write integration tests
- [ ] Create user documentation
- [ ] Add CI/CD integration
- [ ] Performance optimization

### 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging using existing Logger patterns
- **Logging**: Winston logger with structured logging, different levels for operations (follows existing ServiceLogger pattern)
- **Testing**: Jest framework, 90% coverage requirement (integrates with existing test infrastructure and TestManagementService)
- **Documentation**: JSDoc for all public methods, README updates
- **Architecture Patterns**: Follow existing Application Service patterns (TaskApplicationService, AnalysisApplicationService, WorkflowApplicationService)
- **Handler Structure**: Use existing HandlerRegistry.buildFromCategory pattern and categories/testing/ organization
- **Frontend Patterns**: Follow existing component structure (IDEMirrorComponent, ChatComponent, AnalysisDataViewer) and store patterns (IDEStore, AuthStore)
- **Service Dependencies**: Use dependency injection pattern found in existing ApplicationServices
- **Module Aliases**: Use existing @application, @domain, @infrastructure, @presentation aliases
- **File Organization**: Follow existing directory structure patterns (application/services/, application/handlers/categories/, presentation/components/)

### 6. Security Considerations
- [ ] Input validation and sanitization for test data
- [ ] Secure storage of test credentials
- [ ] Protection against malicious test scripts
- [ ] Rate limiting for test execution
- [ ] Audit logging for all test operations
- [ ] Sandboxed test execution environment

### 7. Performance Requirements
- **Response Time**: < 2 seconds for test execution start
- **Throughput**: Support 10 concurrent test runs
- **Memory Usage**: < 512MB per test session
- **Database Queries**: Minimal (file-based configuration)
- **Caching Strategy**: Cache test results for 1 hour

### 8.1 Comprehensive API Specification

#### Playwright Test Execution Endpoints (Extended TestManagementController)
- **POST /api/projects/:projectId/tests/playwright/execute**
  - Body: `{ testName: string, options: object, workspacePath?: string }`
  - Response: `{ success: boolean, result: object }`
  - Purpose: Execute specific Playwright test with project configuration and workspace detection

- **GET /api/projects/:projectId/tests/playwright/results/{testId}**
  - Response: `{ success: boolean, results: object }`
  - Purpose: Retrieve Playwright test execution results

#### Playwright Configuration Management Endpoints
- **GET /api/projects/:projectId/tests/playwright/config**
  - Response: `{ success: boolean, config: object }`
  - Purpose: Get Playwright test configuration for project

- **PUT /api/projects/:projectId/tests/playwright/config**
  - Body: `{ config: object }`
  - Response: `{ success: boolean, result: object }`
  - Purpose: Update Playwright test configuration

- **POST /api/projects/:projectId/tests/playwright/config/validate**
  - Body: `{ config: object }`
  - Response: `{ success: boolean, validation: object }`
  - Purpose: Validate Playwright test configuration before saving

#### Playwright Project Management Endpoints
- **GET /api/projects/:projectId/tests/playwright/projects**
  - Response: `{ success: boolean, projects: array }`
  - Purpose: List all available Playwright test projects for this project

- **POST /api/projects/:projectId/tests/playwright/projects**
  - Body: `{ name: string, config: object }`
  - Response: `{ success: boolean, project: object }`
  - Purpose: Create new Playwright test project

- **GET /api/projects/:projectId/tests/playwright/projects/{id}/config**
  - Response: `{ success: boolean, config: object }`
  - Purpose: Get project-specific Playwright configuration

- **PUT /api/projects/:projectId/tests/playwright/projects/{id}/config**
  - Body: `{ config: object }`
  - Response: `{ success: boolean, result: object }`
  - Purpose: Update project-specific Playwright configuration

#### Playwright Login Management Endpoints
- **POST /api/projects/:projectId/tests/playwright/login/validate**
  - Body: `{ credentials: { username: string, password: string } }`
  - Response: `{ success: boolean, validation: object }`
  - Purpose: Validate login credentials for Playwright test project

#### Playwright Test Control Endpoints
- **GET /api/projects/:projectId/tests/playwright/status**
  - Response: `{ success: boolean, status: object }`
  - Purpose: Get current Playwright test runner status

- **POST /api/projects/:projectId/tests/playwright/stop**
  - Body: `{ testId: string }`
  - Response: `{ success: boolean, result: object }`
  - Purpose: Stop running Playwright test execution

- **GET /api/projects/:projectId/tests/playwright/logs**
  - Query: `?testId=string&lines=number`
  - Response: `{ success: boolean, logs: array }`
  - Purpose: Get Playwright test execution logs

### 8.2 Configuration Data Structure
```javascript
// Test Configuration Schema
const testConfigSchema = {
  projectId: 'string',
  baseURL: 'string',
  timeout: 'number',
  retries: 'number',
  browsers: ['chromium', 'firefox', 'webkit'],
  login: {
    required: 'boolean',
    selector: 'string',
    username: 'string',
    password: 'string',
    additionalFields: 'object'
  },
  tests: {
    directory: 'string',
    pattern: 'string',
    exclude: 'array'
  },
  screenshots: {
    enabled: 'boolean',
    path: 'string',
    onFailure: 'boolean'
  },
  videos: {
    enabled: 'boolean',
    path: 'string',
    onFailure: 'boolean'
  },
  reports: {
    enabled: 'boolean',
    path: 'string',
    format: 'html|json|junit'
  }
};
```

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
    'test': 'integration',
    
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
// resolveTestPath('backend', 'PlaywrightTestService', 'service') → 'backend/tests/unit/PlaywrightTestService.test.js'
// resolveTestPath('frontend', 'TestRunner', 'component') → 'frontend/tests/unit/TestRunner.test.jsx'
// resolveTestPath('backend', 'PlaywrightTestController', 'api') → 'backend/tests/integration/PlaywrightTestController.test.js'
// resolveTestPath('frontend', 'TestExecution', 'flow') → 'frontend/tests/e2e/TestExecution.test.jsx'
```

#### Unit Tests:
- [ ] Test file: `backend/tests/unit/PlaywrightTestService.test.js` (auto-detected)
- [ ] Test cases: Service initialization, test execution, error handling
- [ ] Mock requirements: Playwright browser, file system operations

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/PlaywrightTestController.test.js` (auto-detected)
- [ ] Test scenarios: API endpoints, test execution flow
- [ ] Test data: Mock test configurations, sample tests

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/TestRunnerIntegration.test.jsx` (auto-detected)
- [ ] User flows: Complete test execution process
- [ ] Browser compatibility: Chrome, Firefox, Safari

#### Test Path Examples by Category:
- **Backend Service**: `backend/tests/unit/PlaywrightTestService.test.js`
- **Backend Controller**: `backend/tests/unit/PlaywrightTestController.test.js`
- **Backend API**: `backend/tests/integration/PlaywrightTestAPI.test.js`
- **Frontend Component**: `frontend/tests/unit/TestRunnerComponent.test.jsx`
- **Frontend Hook**: `frontend/tests/unit/useTestRunner.test.js`
- **Frontend Flow**: `frontend/tests/e2e/TestExecution.test.jsx`
- **Playwright Tests**: `tests/playwright/tests/login.test.js`

#### Test Configuration:
- **Backend Tests**: Jest with Node.js environment
- **Frontend Tests**: Jest with jsdom environment
- **Playwright Tests**: Playwright with browser environment
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **File Extensions**: `.test.js` for backend, `.test.jsx` for frontend

### 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all functions and classes
- [ ] README updates with new functionality
- [ ] API documentation for new endpoints
- [ ] Architecture diagrams for test runner system

#### User Documentation:
- [ ] User guide for creating custom tests
- [ ] Developer documentation for test runner integration
- [ ] Troubleshooting guide for common issues
- [ ] Migration guide from existing test frameworks

### 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Environment variables configured
- [ ] Configuration files deployed
- [ ] Service restarts if needed
- [ ] Health checks configured

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify functionality in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

### 11. Rollback Plan
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

### 12. Success Criteria
- [ ] Test runner works with project-specific configurations
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### 13. Risk Assessment

#### High Risk:
- [ ] Browser compatibility issues - Mitigation: Test on multiple browsers, fallback strategies
- [ ] Performance impact on CI/CD - Mitigation: Parallel execution, resource limits

#### Medium Risk:
- [ ] Configuration complexity - Mitigation: Simple configuration format, validation
- [ ] Integration with existing tests - Mitigation: Gradual migration, compatibility layer

#### Low Risk:
- [ ] Documentation maintenance - Mitigation: Automated documentation updates
- [ ] User adoption - Mitigation: Training materials, gradual rollout

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/testing/playwright-test-runner-system/playwright-test-runner-system-implementation.md'
- **category**: 'testing' - Automatically set from Category field above
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3 (default)
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/playwright-test-runner-system",
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
# Initial Prompt: Playwright Test Runner System

## User Request:
Create a project-specific Playwright Test Runner system that can be integrated into any project. The system should provide simple tests that automatically check for login requirements, perform login if needed, execute tests, and verify results. Each project should get its own test directory structure with test files.

## Language Detection:
- **Original Language**: German/English Mixed
- **Translation Status**: ✅ Converted to English
- **Sanitization Status**: ✅ Credentials and personal data removed

## Prompt Analysis:
- **Intent**: Create a reusable Playwright test runner system for project-specific testing
- **Complexity**: High based on requirements
- **Scope**: Complete test runner system with test management
- **Dependencies**: Existing Playwright installation, Jest/Vitest infrastructure

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

### 16. Validation Results & Codebase Analysis

#### ✅ File Structure Validation
- **All Required Files**: ✅ Present (index, implementation, phase files)
- **Directory Structure**: ✅ Correct (pending/high/testing/playwright-test-runner-system/)
- **File Naming**: ✅ Follows required pattern

#### ✅ Codebase Analysis Findings
- **Playwright Installation**: ⚠️ Backend has playwright core (v1.44.0) but missing @playwright/test
- **Root Package**: ✅ Has both playwright (v1.54.1) and @playwright/test (v1.54.1)
- **Frontend Dependencies**: ✅ NO Playwright needed (only management UI)
- **Test Infrastructure**: ✅ Extensive Jest-based testing in backend/tests/ and frontend/tests/
- **Application Patterns**: ✅ Well-established service and handler patterns
- **Frontend Patterns**: ✅ Consistent component and store structure
- **Existing Test Structure**: ✅ Both backend/tests/playwright/ and tests/playwright/ directories exist
- **Test Management**: ✅ Advanced test management system with TestManagementService
- **Existing Controllers**: ✅ TestManagementController, AutoTestFixController, TestCorrectionController already exist
- **Handler Categories**: ✅ categories/testing/ directory exists but empty
- **Frontend Navigation**: ✅ Header.jsx has navigation buttons, missing Tests button

#### ⚠️ Implementation Adjustments Made
1. **Adjusted Phase 1 Time**: 6h → 5h (backend missing @playwright/test dependency)
2. **Updated File Paths**: Follow existing application service naming patterns
3. **Handler Structure**: Use categories/testing/ directory structure
4. **Frontend Integration**: Align with existing IDEStore and component patterns
5. **Total Time**: 24h → 25h (accounting for comprehensive API endpoints and integration)
6. **Service Naming**: Follow existing pattern: PlaywrightTestApplicationService (not PlaywrightTestService)
7. **Handler Location**: Use backend/application/handlers/categories/testing/ structure
8. **Frontend Service**: Use frontend/src/infrastructure/services/ pattern (not frontend/src/services/)
9. **Controller Integration**: Integrate with existing TestManagementController rather than creating separate controller
10. **Frontend Navigation**: Add Tests button to Header.jsx navigation
11. **Frontend Architecture**: Frontend only provides management UI, no Playwright dependencies needed
12. **API Endpoints**: Use /api/projects/:projectId/tests/playwright/* pattern for better organization

#### 🔧 Integration Strategy
- **Backend**: Integrate with existing TaskApplicationService and HandlerRegistry patterns
- **Frontend**: Follow IDEMirrorComponent and ChatComponent patterns
- **Testing**: Leverage existing Jest infrastructure and test management system
- **Configuration**: Use database-driven configuration (follows project pattern)
- **Service Architecture**: Follow existing ApplicationService pattern with dependency injection
- **Handler Registry**: Use existing HandlerRegistry.buildFromCategory pattern
- **Frontend Components**: Follow existing component structure with eventBus and activePort props

### 17. Gap Analysis Report

#### Missing Components
1. **Backend Services**
   - PlaywrightTestApplicationService (planned but not implemented)
   - PlaywrightTestHandler in categories/testing/ (referenced but missing)

2. **Frontend Components**
   - TestRunnerComponent (planned but not created) - Management UI only
   - TestResultsViewer (planned but not created) - Results display only
   - TestConfiguration (planned but not created) - Configuration UI only
   - TestStatusBadge (planned but not created) - Status indicator only

3. **Test Infrastructure**
   - tests/playwright/playwright.config.js (planned but not implemented)
   - tests/playwright/utils/test-runner.js (planned but not implemented)
   - tests/playwright/utils/test-manager.js (planned but not implemented)

4. **API Endpoints**
   - POST /api/projects/:projectId/tests/playwright/execute (planned but not implemented)
   - GET /api/projects/:projectId/tests/playwright/results (planned but not implemented)
   - **MISSING**: GET /api/projects/:projectId/tests/playwright/config - Get Playwright test configuration
   - **MISSING**: PUT /api/projects/:projectId/tests/playwright/config - Update Playwright test configuration
   - **MISSING**: POST /api/projects/:projectId/tests/playwright/config/validate - Validate Playwright configuration
   - **MISSING**: GET /api/projects/:projectId/tests/playwright/projects - List available Playwright test projects
   - **MISSING**: POST /api/projects/:projectId/tests/playwright/projects - Create new Playwright test project
   - **MISSING**: GET /api/projects/:projectId/tests/playwright/projects/{id}/config - Get project-specific Playwright config
   - **MISSING**: PUT /api/projects/:projectId/tests/playwright/projects/{id}/config - Update project-specific Playwright config
   - **MISSING**: POST /api/projects/:projectId/tests/playwright/login/validate - Validate login credentials for Playwright tests
   - **MISSING**: GET /api/projects/:projectId/tests/playwright/status - Get Playwright test runner status
   - **MISSING**: POST /api/projects/:projectId/tests/playwright/stop - Stop running Playwright tests
   - **MISSING**: GET /api/projects/:projectId/tests/playwright/logs - Get Playwright test execution logs

#### Incomplete Implementations
1. **Playwright Dependencies**
   - Backend missing @playwright/test (only has playwright core v1.44.0)
   - Frontend correctly has NO Playwright dependencies (management UI only)
   - Root package has correct versions (playwright v1.54.1, @playwright/test v1.54.1)

2. **Test Directory Structure**
   - tests/playwright/ directory exists but mostly empty
   - backend/tests/playwright/ directory exists but mostly empty
   - Missing test files and utilities

3. **Frontend Integration**
   - Header.jsx missing Tests button
   - App.jsx missing tests case in renderView function
   - No test-related components exist

#### Existing Infrastructure That Can Be Leveraged
1. **Test Management System**
   - TestManagementService already exists and is integrated
   - Advanced test reporting and tracking capabilities
   - Test lifecycle management hooks
   - TestManagementController with comprehensive API endpoints

2. **Application Service Patterns**
   - Well-established ApplicationService pattern with dependency injection
   - ServiceLogger for consistent logging
   - HandlerRegistry.buildFromCategory pattern
   - Categories/testing/ directory structure exists

3. **Frontend Patterns**
   - Consistent component structure with eventBus and activePort props
   - Store patterns (IDEStore, AuthStore) for state management
   - Hook patterns for service integration
   - Navigation system in Header.jsx ready for Tests button

4. **Test Infrastructure**
   - Extensive Jest-based testing in backend/tests/ and frontend/tests/
   - Test setup files with proper configuration
   - Integration and E2E test patterns
   - Test management scripts and automation

#### Task Splitting Analysis
1. **Current Task Size**: 25 hours (exceeds 8-hour limit)
2. **File Count**: 15+ files to create (exceeds 10-file limit)
3. **Phase Count**: 4 phases (within 5-phase limit)
4. **Recommended Split**: 3 subtasks of 8-9 hours each
5. **Independent Components**: Backend Services, Frontend Components, Test Infrastructure

### 18. References & Resources
- **Technical Documentation**: Playwright Documentation, Jest Documentation
- **API References**: Playwright API Reference
- **Design Patterns**: Command Pattern, Factory Pattern, Strategy Pattern
- **Best Practices**: Testing best practices, CI/CD integration
- **Similar Implementations**: Existing Jest/Vitest infrastructure in project
- **Project Patterns**: TaskApplicationService, IDEApplicationService, HandlerRegistry

---

## Master Index File Creation

### Automatic Index File Generation
When creating a task, automatically generate a master index file:

**File Path**: `docs/09_roadmap/pending/high/testing/playwright-test-runner-system/playwright-test-runner-system-index.md`

**Purpose**: Central overview and navigation hub for all task-related files

### Index File Template
```markdown
# Playwright Test Runner System - Master Index

## 📋 Task Overview
- **Name**: Playwright Test Runner System
- **Category**: testing
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 24 hours
- **Created**: 2025-10-05T07:39:29.000Z
- **Last Updated**: 2025-10-05T07:39:29.000Z
- **Original Language**: German/English Mixed
- **Prompt Sanitized**: ✅ Yes

## 📁 File Structure
```
docs/09_roadmap/pending/high/testing/playwright-test-runner-system/
├── playwright-test-runner-system-index.md (this file)
├── playwright-test-runner-system-implementation.md
├── playwright-test-runner-system-phase-1.md
├── playwright-test-runner-system-phase-2.md
├── playwright-test-runner-system-phase-3.md
└── playwright-test-runner-system-phase-4.md
```

## 🎯 Main Implementation
- **[Playwright Test Runner System Implementation](./playwright-test-runner-system-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1](./playwright-test-runner-system-phase-1.md) | Planning | 6h | 0% |
| 2 | [Phase 2](./playwright-test-runner-system-phase-2.md) | Planning | 8h | 0% |
| 3 | [Phase 3](./playwright-test-runner-system-phase-3.md) | Planning | 6h | 0% |
| 4 | [Phase 4](./playwright-test-runner-system-phase-4.md) | Planning | 4h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] Core Test Runner Setup - Planning - 0%
- [ ] Project-Specific Configuration - Planning - 0%
- [ ] Test Management System - Planning - 0%
- [ ] Integration with Existing Test Framework - Planning - 0%

### Completed Subtasks
- [x] Requirements Analysis - ✅ Done

### Pending Subtasks
- [ ] Documentation and User Guides - ⏳ Waiting
- [ ] CI/CD Integration - ⏳ Waiting

## 📈 Progress Tracking
- **Overall Progress**: 5% Complete
- **Current Phase**: Planning
- **Next Milestone**: Core Test Runner Setup
- **Estimated Completion**: 2025-10-12

## 🔗 Related Tasks
- **Dependencies**: None
- **Dependents**: Frontend Test Framework Migration
- **Related**: Existing Jest/Vitest Testing Infrastructure

## 📝 Notes & Updates
### 2025-10-05 - Initial Planning
- Requirements analysis completed
- Playwright already installed in backend
- Existing test infrastructure identified
- Project-specific configuration approach defined

## 🚀 Quick Actions
- [View Implementation Plan](./playwright-test-runner-system-implementation.md)
- [Start Phase 1](./playwright-test-runner-system-phase-1.md)
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
  'Playwright Test Runner System', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'testing', -- From section 1 Category field
  'High', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/testing/playwright-test-runner-system/playwright-test-runner-system-implementation.md', -- Main implementation file
  'docs/09_roadmap/pending/high/testing/playwright-test-runner-system/playwright-test-runner-system-phase-[number].md', -- Individual phase files
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  24 -- From section 1
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

> Create a comprehensive development plan for implementing user authentication with JWT tokens. Include all database fields, AI execution context, file impacts, and success criteria. Follow the template structure above and ensure every section is completed with specific details for database-first task architecture.

---

**Note**: This template is optimized for database-first task architecture where markdown docs serve as specifications that get parsed into trackable, executable database tasks with full AI auto-implementation support.
