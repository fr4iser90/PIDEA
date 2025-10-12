# Prompt: Project-Wide Gap Analysis & Missing Components

## Goal
Generate a analysis of what's missing, incomplete, or needs improvement across the backend architecture to support the multi-layer frontend store architecture. Create actionable insights for project-wide improvements that can be parsed into database tasks for AI auto-implementation, tracking, and execution.

**Note**: This prompt focuses on backend architecture analysis to support frontend store layers, not individual task validation. For task-specific validation, use `task-review.md`.

Create new [Name]-analysis.md in docs/09_roadmap/pending/[priority]/[category]/[name]/ with the following structure:
**Note**: The system automatically creates a hierarchical folder structure: Status (default: pending) → Priority → Category → Task Name → Analysis files

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

### 1. Analysis Overview
- **Analysis Name**: Backend Architecture Analysis for Multi-Layer Support
- **Analysis Type**: Architecture Review
- **Priority**: High
- **Estimated Analysis Time**: 12 hours
- **Scope**: Backend API architecture, database design, service layer, task management, layer coordination
- **Related Components**: Application.js, ServiceRegistry, TaskService, IDEManager, ChatRepository, API controllers
- **Analysis Date**: 2024-12-19T10:30:00.000Z

### 2. Current State Assessment
- **Codebase Health**: Good - well structured but needs layer support
- **Architecture Status**: Partially implemented - basic services exist but no layer coordination
- **Test Coverage**: Medium - some tests exist but layer-specific tests missing
- **Documentation Status**: Incomplete - layer architecture not documented
- **Performance Metrics**: Unknown - no performance monitoring for layer operations
- **Security Posture**: Basic - auth exists but no layer-specific security

### 3. Gap Analysis Results

#### Critical Gaps (High Priority):
- [ ] **Missing Component**: LayerService - Central layer coordination service
  - **Location**: `backend/application/services/LayerService.js`
  - **Required Functionality**: Layer registration, task distribution, status coordination
  - **Dependencies**: TaskService, IDEManager, ChatRepository
  - **Estimated Effort**: 8 hours

- [ ] **Missing Component**: TaskOrchestrationService - Task distribution and coordination
  - **Location**: `backend/application/services/TaskOrchestrationService.js`
  - **Required Functionality**: Task distribution logic, layer availability checking, status synchronization
  - **Dependencies**: LayerService, TaskService
  - **Estimated Effort**: 10 hours

- [ ] **Missing Component**: LayerStatusController - Layer status management API
  - **Location**: `backend/presentation/api/layer/LayerStatusController.js`
  - **Required Functionality**: Layer status endpoints, health checks, availability reporting
  - **Dependencies**: LayerService
  - **Estimated Effort**: 6 hours

- [ ] **Missing Component**: TaskDistributionController - Task distribution API
  - **Location**: `backend/presentation/api/task/TaskDistributionController.js`
  - **Required Functionality**: Task distribution endpoints, layer assignment, progress tracking
  - **Dependencies**: TaskOrchestrationService
  - **Estimated Effort**: 8 hours

- [ ] **Missing Component**: LayerQueueService - Queue management for each layer
  - **Location**: `backend/application/services/LayerQueueService.js`
  - **Required Functionality**: Queue management, task queuing, priority handling
  - **Dependencies**: TaskService, LayerService
  - **Estimated Effort**: 8 hours

#### Medium Priority Gaps:
- [ ] **Improvement Needed**: TaskService enhancement - Add layer-specific task management
  - **Current Issues**: TaskService doesn't support layer-specific operations
  - **Proposed Solution**: Add layer assignment, status tracking, coordination methods
  - **Files to Modify**: `backend/domain/services/task/TaskService.js`
  - **Estimated Effort**: 6 hours

- [ ] **Improvement Needed**: IDEManager enhancement - Add layer coordination
  - **Current Issues**: IDEManager doesn't coordinate with other layers
  - **Proposed Solution**: Add layer status reporting, task coordination methods
  - **Files to Modify**: `backend/infrastructure/external/ide/IDEManager.js`
  - **Estimated Effort**: 4 hours

- [ ] **Improvement Needed**: ChatRepository enhancement - Add layer-specific chat management
  - **Current Issues**: ChatRepository doesn't support layer-specific chat sessions
  - **Proposed Solution**: Add layer chat methods, session management
  - **Files to Modify**: `backend/domain/repositories/ChatRepository.js`
  - **Estimated Effort**: 4 hours

#### Low Priority Gaps:
- [ ] **Optimization Opportunity**: Service performance monitoring - Add layer operation tracking
  - **Current Performance**: No performance monitoring for layer operations
  - **Optimization Target**: Track layer operations, response times, resource usage
  - **Files to Optimize**: All service files
  - **Estimated Effort**: 6 hours

### 4. File Impact Analysis

#### Files Missing:
- [ ] `backend/application/services/LayerService.js` - Central layer coordination service
- [ ] `backend/application/services/TaskOrchestrationService.js` - Task distribution and coordination
- [ ] `backend/application/services/LayerQueueService.js` - Queue management for each layer
- [ ] `backend/presentation/api/layer/LayerStatusController.js` - Layer status management API
- [ ] `backend/presentation/api/task/TaskDistributionController.js` - Task distribution API
- [ ] `backend/domain/services/layer/LayerService.js` - Layer domain service
- [ ] `backend/domain/services/task/TaskOrchestrationService.js` - Task orchestration domain service
- [ ] `backend/infrastructure/repositories/LayerRepository.js` - Layer data repository
- [ ] `backend/infrastructure/repositories/TaskDistributionRepository.js` - Task distribution repository
- [ ] `backend/application/handlers/LayerHandler.js` - Layer event handlers
- [ ] `backend/application/handlers/TaskDistributionHandler.js` - Task distribution handlers
- [ ] `backend/application/commands/LayerCommands.js` - Layer management commands

#### Files Incomplete:
- [ ] `backend/domain/services/task/TaskService.js` - Add layer-specific task management
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Add layer coordination
- [ ] `backend/domain/repositories/ChatRepository.js` - Add layer-specific chat management
- [ ] `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Register new services
- [ ] `backend/Application.js` - Initialize new services

#### Files Needing Refactoring:
- [ ] `backend/presentation/api/ide/IDEMirrorController.js` - Update for layer coordination
- [ ] `backend/presentation/api/chat/ChatController.js` - Update for layer-specific chat
- [ ] `backend/presentation/api/task/TaskController.js` - Update for task distribution

### 5. Technical Debt Assessment

#### Code Quality Issues:
- [ ] **Complexity**: TaskService has high cyclomatic complexity due to mixed responsibilities
- [ ] **Duplication**: Task management logic duplicated across services
- [ ] **Dead Code**: Unused methods in TaskService related to single-layer operations
- [ ] **Inconsistent Patterns**: Different error handling patterns across services

#### Architecture Issues:
- [ ] **Tight Coupling**: Services directly reference each other without proper abstraction
- [ ] **Missing Abstractions**: No clear interface between layers
- [ ] **Violation of Principles**: Single Responsibility Principle violated in TaskService

#### Performance Issues:
- [ ] **Slow Queries**: No optimization for layer-specific queries
- [ ] **Memory Leaks**: Potential memory leaks in service subscriptions
- [ ] **Inefficient Algorithms**: No optimization for task distribution algorithms

### 6. Missing Features Analysis

#### Core Features Missing:
- [ ] **Feature Name**: Multi-layer backend architecture
  - **Business Impact**: Enables proper task orchestration and layer coordination
  - **Technical Requirements**: Layer services, task distribution, status coordination
  - **Estimated Effort**: 40 hours
  - **Dependencies**: Database schema updates

- [ ] **Feature Name**: Task orchestration backend
  - **Business Impact**: Enables automatic task distribution between layers
  - **Technical Requirements**: Task distribution logic, layer availability, status sync
  - **Estimated Effort**: 18 hours
  - **Dependencies**: Layer services

- [ ] **Feature Name**: Layer queue management
  - **Business Impact**: Enables proper task queuing and priority handling
  - **Technical Requirements**: Queue management, priority handling, task scheduling
  - **Estimated Effort**: 8 hours
  - **Dependencies**: Task orchestration

#### Enhancement Features Missing:
- [ ] **Enhancement Name**: Layer performance monitoring
  - **User Value**: Better performance and debugging capabilities
  - **Implementation Details**: Add performance tracking to all layer operations
  - **Estimated Effort**: 6 hours

- [ ] **Enhancement Name**: Layer health monitoring
  - **User Value**: Better reliability and error handling
  - **Implementation Details**: Add health checks and error reporting for layers
  - **Estimated Effort**: 4 hours

### 7. Testing Gaps

#### Missing Unit Tests:
- [ ] **Component**: LayerService - Test layer coordination and management
  - **Test File**: `backend/tests/unit/services/LayerService.test.js`
  - **Test Cases**: Layer registration, status management, coordination logic
  - **Coverage Target**: 90% coverage needed

- [ ] **Component**: TaskOrchestrationService - Test task distribution logic
  - **Test File**: `backend/tests/unit/services/TaskOrchestrationService.test.js`
  - **Test Cases**: Task distribution, layer availability, status synchronization
  - **Coverage Target**: 95% coverage needed

- [ ] **Component**: LayerQueueService - Test queue management
  - **Test File**: `backend/tests/unit/services/LayerQueueService.test.js`
  - **Test Cases**: Queue operations, priority handling, task scheduling
  - **Coverage Target**: 90% coverage needed

#### Missing Integration Tests:
- [ ] **Integration**: Layer integration - Test layer interactions
  - **Test File**: `backend/tests/integration/services/LayerIntegration.test.js`
  - **Test Scenarios**: Layer communication, task distribution, status coordination

- [ ] **Integration**: Task orchestration - Test complete task workflow
  - **Test File**: `backend/tests/integration/services/TaskOrchestration.test.js`
  - **Test Scenarios**: Task creation, distribution, execution, completion

#### Missing E2E Tests:
- [ ] **User Flow**: Task management flow - Test complete task workflow
  - **Test File**: `backend/tests/e2e/TaskManagement.test.js`
  - **User Journeys**: Create task, distribute to layers, track progress, complete task

### 8. Documentation Gaps

#### Missing Code Documentation:
- [ ] **Component**: Layer architecture - Document layer structure and responsibilities
  - **JSDoc Comments**: All layer service functions and methods
  - **README Updates**: Layer architecture documentation
  - **API Documentation**: Layer API endpoints documentation

#### Missing User Documentation:
- [ ] **Feature**: Task orchestration - Document task distribution workflow
  - **User Guide**: How tasks are distributed and managed
  - **Troubleshooting**: Common issues with task distribution
  - **Migration Guide**: How to migrate from single to multi-layer architecture

### 9. Security Analysis

#### Security Vulnerabilities:
- [ ] **Vulnerability Type**: Layer access control - Layers might access unauthorized data
  - **Location**: All layer service files
  - **Risk Level**: High
  - **Mitigation**: Implement layer-specific access controls and data isolation
  - **Estimated Effort**: 8 hours

#### Missing Security Features:
- [ ] **Security Feature**: Layer authentication - Authenticate layer operations
  - **Implementation**: Add layer-specific authentication and authorization
  - **Files to Modify**: All layer service files
  - **Estimated Effort**: 6 hours

- [ ] **Security Feature**: Task data isolation - Isolate task data between layers
  - **Implementation**: Implement data isolation and access controls
  - **Files to Modify**: TaskService, LayerService
  - **Estimated Effort**: 8 hours

### 10. Performance Analysis

#### Performance Bottlenecks:
- [ ] **Bottleneck**: Task distribution performance - Slow task distribution between layers
  - **Location**: TaskOrchestrationService
  - **Current Performance**: Unknown
  - **Target Performance**: < 100ms for task distribution
  - **Optimization Strategy**: Implement async task distribution and caching
  - **Estimated Effort**: 6 hours

#### Missing Performance Features:
- [ ] **Performance Feature**: Layer performance monitoring - Track layer performance
  - **Implementation**: Add performance tracking to layer operations
  - **Files to Modify**: All layer service files
  - **Estimated Effort**: 6 hours

- [ ] **Performance Feature**: Task queue optimization - Optimize task queuing
  - **Implementation**: Implement priority queues and task scheduling
  - **Files to Modify**: LayerQueueService
  - **Estimated Effort**: 4 hours

### 11. Recommended Action Plan

#### Immediate Actions (Next Sprint):
- [ ] **Action**: Create LayerService and TaskOrchestrationService
  - **Priority**: High
  - **Effort**: 18 hours
  - **Dependencies**: None

- [ ] **Action**: Create LayerStatusController and TaskDistributionController
  - **Priority**: High
  - **Effort**: 14 hours
  - **Dependencies**: LayerService, TaskOrchestrationService

- [ ] **Action**: Create LayerQueueService
  - **Priority**: High
  - **Effort**: 8 hours
  - **Dependencies**: TaskService, LayerService

#### Short-term Actions (Next 2-3 Sprints):
- [ ] **Action**: Enhance existing services (TaskService, IDEManager, ChatRepository)
  - **Priority**: Medium
  - **Effort**: 14 hours
  - **Dependencies**: New layer services

- [ ] **Action**: Update ServiceRegistry and Application.js
  - **Priority**: Medium
  - **Effort**: 4 hours
  - **Dependencies**: New services

- [ ] **Action**: Update API controllers
  - **Priority**: Medium
  - **Effort**: 6 hours
  - **Dependencies**: Service enhancements

#### Long-term Actions (Next Quarter):
- [ ] **Action**: Add comprehensive testing
  - **Priority**: Medium
  - **Effort**: 20 hours
  - **Dependencies**: Service implementation

- [ ] **Action**: Add performance monitoring
  - **Priority**: Low
  - **Effort**: 12 hours
  - **Dependencies**: Service implementation

- [ ] **Action**: Add security enhancements
  - **Priority**: Medium
  - **Effort**: 16 hours
  - **Dependencies**: Service implementation

### 12. Success Criteria for Analysis
- [ ] All gaps identified and documented
- [ ] Priority levels assigned to each gap
- [ ] Effort estimates provided for each gap
- [ ] Action plan created with clear next steps
- [ ] Stakeholders informed of findings
- [ ] Database tasks created for high priority gaps

### 13. Risk Assessment

#### High Risk Gaps:
- [ ] **Risk**: Layer coordination complexity - Mitigation: Implement step by step with proper testing

#### Medium Risk Gaps:
- [ ] **Risk**: Task distribution failures - Mitigation: Implement fallback mechanisms and error handling

#### Low Risk Gaps:
- [ ] **Risk**: Performance impact - Mitigation: Monitor performance during implementation

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/backend/backend-architecture-analysis.md'
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
  "git_branch_name": "analysis/backend-architecture",
  "confirmation_keywords": ["fertig", "done", "complete", "analysis_complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

#### Success Indicators:
- [ ] All gaps identified and documented
- [ ] Priority levels assigned
- [ ] Effort estimates provided
- [ ] Action plan created
- [ ] Database tasks generated for high priority items

### 15. References & Resources
- **Codebase Analysis Tools**: Node.js best practices, Express.js patterns
- **Best Practices**: Service-oriented architecture, domain-driven design
- **Similar Projects**: Modern Node.js applications with complex service architecture
- **Technical Documentation**: Express.js patterns, Node.js service patterns
- **Performance Benchmarks**: API response time standards, service operation benchmarks

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
  'Backend Architecture Analysis for Multi-Layer Support', -- From section 1
  '[Full markdown content]', -- Complete description
  'analysis', -- Task type
  'backend', -- 'frontend'|'backend'|'database'|'security'|'performance'
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/backend/backend-architecture-analysis.md', -- Source path with category
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All analysis details
  '12' -- From section 1
);
```

## Usage Instructions

1. **Analyze thoroughly** - Examine all aspects of the backend architecture
2. **Be specific with gaps** - Provide exact file paths and descriptions
3. **Include effort estimates** - Critical for prioritization
4. **Prioritize gaps** - Help stakeholders understand what to tackle first
5. **Provide actionable insights** - Each gap should have clear next steps
6. **Include success criteria** - Enable progress tracking
7. **Consider all dimensions** - Code quality, architecture, security, performance

## Example Usage

> Analyze the current backend architecture and identify all gaps, missing components, and areas for improvement to support multi-layer frontend architecture. Create a analysis following the template structure above. Focus on critical gaps that need immediate attention and provide specific file paths, effort estimates, and action plans for each identified issue.

---

**Note**: This template is optimized for database-first analysis architecture where markdown docs serve as analysis specifications that get parsed into trackable, actionable database tasks with full AI auto-implementation support.
