# Prompt: Project-Wide Gap Analysis & Missing Components

## Goal
Generate a analysis of what's missing, incomplete, or needs improvement across the frontend store architecture. Create actionable insights for project-wide improvements that can be parsed into database tasks for AI auto-implementation, tracking, and execution.

**Note**: This prompt focuses on frontend store architecture analysis, not individual task validation. For task-specific validation, use `task-review.md`.

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
- **Analysis Name**: Frontend Store Architecture Analysis
- **Analysis Type**: Architecture Review
- **Priority**: High
- **Estimated Analysis Time**: 8 hours
- **Scope**: Frontend state management architecture, Zustand stores, layer separation
- **Related Components**: ProjectStore, IDEStore, AuthStore, NotificationStore, selectors, hooks
- **Analysis Date**: 2024-12-19T10:30:00.000Z

### 2. Current State Assessment
- **Codebase Health**: Mixed - some stores well structured, others need refactoring
- **Architecture Status**: Partially implemented - basic stores exist but layer separation incomplete
- **Test Coverage**: Low - store tests missing
- **Documentation Status**: Incomplete - store architecture not documented
- **Performance Metrics**: Unknown - no performance monitoring for stores
- **Security Posture**: Basic - auth store exists but no security analysis

### 3. Gap Analysis Results

#### Critical Gaps (High Priority):
- [ ] **Missing Component**: MetaLayerStore - Global project overview and meta tasks
  - **Location**: `frontend/src/infrastructure/stores/MetaLayerStore.jsx`
  - **Required Functionality**: Global project list, meta chat, meta tasks, global queue
  - **Dependencies**: ProjectStore, AuthStore
  - **Estimated Effort**: 6 hours

- [ ] **Missing Component**: ProjectLayerStore - Project-specific data management
  - **Location**: `frontend/src/infrastructure/stores/ProjectLayerStore.jsx`
  - **Required Functionality**: Project data, project chat, project tasks, project queue
  - **Dependencies**: MetaLayerStore, IDEStore
  - **Estimated Effort**: 8 hours

- [ ] **Missing Component**: WebLayerStore - Web chat and task management
  - **Location**: `frontend/src/infrastructure/stores/WebLayerStore.jsx`
  - **Required Functionality**: Web providers, web chat sessions, web queue, web tasks
  - **Dependencies**: ProjectLayerStore
  - **Estimated Effort**: 6 hours

- [ ] **Missing Component**: APILayerStore - API chat and task management
  - **Location**: `frontend/src/infrastructure/stores/APILayerStore.jsx`
  - **Required Functionality**: API endpoints, API chat, API queue, API tasks
  - **Dependencies**: ProjectLayerStore
  - **Estimated Effort**: 6 hours

- [ ] **Missing Component**: TaskOrchestrator - Task distribution between layers
  - **Location**: `frontend/src/infrastructure/services/TaskOrchestrator.js`
  - **Required Functionality**: Task distribution, layer coordination, status synchronization
  - **Dependencies**: All layer stores
  - **Estimated Effort**: 8 hours

#### Medium Priority Gaps:
- [ ] **Improvement Needed**: IDEStore cleanup - Remove project data duplication
  - **Current Issues**: Contains project data that should be in ProjectLayerStore
  - **Proposed Solution**: Remove projectData and categoryAnalysisData, keep only IDE-specific data
  - **Files to Modify**: `frontend/src/infrastructure/stores/IDEStore.jsx`
  - **Estimated Effort**: 4 hours

- [ ] **Improvement Needed**: ProjectStore cleanup - Remove layer-specific data
  - **Current Issues**: Contains layer-specific data that should be in respective layer stores
  - **Proposed Solution**: Remove projectData, categoryAnalysisData, projectMetadata
  - **Files to Modify**: `frontend/src/infrastructure/stores/ProjectStore.jsx`
  - **Estimated Effort**: 4 hours

- [ ] **Improvement Needed**: Selectors refactoring - Update for new store structure
  - **Current Issues**: Selectors reference old store structure
  - **Proposed Solution**: Update selectors to use new layer stores
  - **Files to Modify**: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx`
  - **Estimated Effort**: 6 hours

#### Low Priority Gaps:
- [ ] **Optimization Opportunity**: Store performance monitoring - Add performance tracking
  - **Current Performance**: No performance monitoring
  - **Optimization Target**: Track store operations, memory usage, render performance
  - **Files to Optimize**: All store files
  - **Estimated Effort**: 4 hours

### 4. File Impact Analysis

#### Files Missing:
- [ ] `frontend/src/infrastructure/stores/MetaLayerStore.jsx` - Global project overview and meta tasks
- [ ] `frontend/src/infrastructure/stores/ProjectLayerStore.jsx` - Project-specific data management
- [ ] `frontend/src/infrastructure/stores/WebLayerStore.jsx` - Web chat and task management
- [ ] `frontend/src/infrastructure/stores/APILayerStore.jsx` - API chat and task management
- [ ] `frontend/src/infrastructure/services/TaskOrchestrator.js` - Task distribution service
- [ ] `frontend/src/infrastructure/stores/selectors/MetaLayerSelectors.jsx` - Meta layer selectors
- [ ] `frontend/src/infrastructure/stores/selectors/ProjectLayerSelectors.jsx` - Project layer selectors
- [ ] `frontend/src/infrastructure/stores/selectors/WebLayerSelectors.jsx` - Web layer selectors
- [ ] `frontend/src/infrastructure/stores/selectors/APILayerSelectors.jsx` - API layer selectors
- [ ] `frontend/src/infrastructure/stores/hooks/useMetaLayerStore.js` - Meta layer hooks
- [ ] `frontend/src/infrastructure/stores/hooks/useProjectLayerStore.js` - Project layer hooks
- [ ] `frontend/src/infrastructure/stores/hooks/useWebLayerStore.js` - Web layer hooks
- [ ] `frontend/src/infrastructure/stores/hooks/useAPILayerStore.js` - API layer hooks

#### Files Incomplete:
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Remove project data duplication
- [ ] `frontend/src/infrastructure/stores/ProjectStore.jsx` - Remove layer-specific data
- [ ] `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Update for new structure
- [ ] `frontend/src/infrastructure/stores/hooks/useProjectStore.js` - Update for new structure

#### Files Needing Refactoring:
- [ ] `frontend/src/presentation/components/project/ProjectListComponent.jsx` - Update for new store structure
- [ ] `frontend/src/presentation/components/interfaces/InterfaceItemComponent.jsx` - Update for new store structure
- [ ] `frontend/src/presentation/contexts/ProjectStoreContext.jsx` - Update for new store structure

### 5. Technical Debt Assessment

#### Code Quality Issues:
- [ ] **Complexity**: ProjectStore has high cyclomatic complexity due to mixed responsibilities
- [ ] **Duplication**: Project data duplicated between ProjectStore and IDEStore
- [ ] **Dead Code**: Unused functions in ProjectStore related to layer-specific operations
- [ ] **Inconsistent Patterns**: Different naming conventions across stores

#### Architecture Issues:
- [ ] **Tight Coupling**: Stores directly reference each other without proper abstraction
- [ ] **Missing Abstractions**: No clear interface between stores
- [ ] **Violation of Principles**: Single Responsibility Principle violated in ProjectStore

#### Performance Issues:
- [ ] **Slow Queries**: No optimization for store operations
- [ ] **Memory Leaks**: Potential memory leaks in store subscriptions
- [ ] **Inefficient Algorithms**: No optimization for store updates

### 6. Missing Features Analysis

#### Core Features Missing:
- [ ] **Feature Name**: Multi-layer store architecture
  - **Business Impact**: Enables proper task orchestration and layer separation
  - **Technical Requirements**: 5 separate stores with clear responsibilities
  - **Estimated Effort**: 32 hours
  - **Dependencies**: Task orchestrator service

- [ ] **Feature Name**: Task orchestration system
  - **Business Impact**: Enables automatic task distribution between layers
  - **Technical Requirements**: Task distribution logic and status synchronization
  - **Estimated Effort**: 8 hours
  - **Dependencies**: All layer stores

#### Enhancement Features Missing:
- [ ] **Enhancement Name**: Store performance monitoring
  - **User Value**: Better performance and debugging capabilities
  - **Implementation Details**: Add performance tracking to all stores
  - **Estimated Effort**: 4 hours

### 7. Testing Gaps

#### Missing Unit Tests:
- [ ] **Component**: MetaLayerStore - Test store operations and state management
  - **Test File**: `tests/unit/stores/MetaLayerStore.test.js`
  - **Test Cases**: Store creation, state updates, persistence, error handling
  - **Coverage Target**: 90% coverage needed

- [ ] **Component**: ProjectLayerStore - Test project data management
  - **Test File**: `tests/unit/stores/ProjectLayerStore.test.js`
  - **Test Cases**: Project CRUD operations, task management, layer coordination
  - **Coverage Target**: 90% coverage needed

- [ ] **Component**: TaskOrchestrator - Test task distribution logic
  - **Test File**: `tests/unit/services/TaskOrchestrator.test.js`
  - **Test Cases**: Task distribution, layer availability, status synchronization
  - **Coverage Target**: 95% coverage needed

#### Missing Integration Tests:
- [ ] **Integration**: Store integration - Test store interactions
  - **Test File**: `tests/integration/stores/StoreIntegration.test.js`
  - **Test Scenarios**: Store communication, data flow, error handling

#### Missing E2E Tests:
- [ ] **User Flow**: Task management flow - Test complete task workflow
  - **Test File**: `tests/e2e/TaskManagement.test.js`
  - **User Journeys**: Create task, distribute to layers, track progress, complete task

### 8. Documentation Gaps

#### Missing Code Documentation:
- [ ] **Component**: Store architecture - Document store structure and responsibilities
  - **JSDoc Comments**: All store functions and state properties
  - **README Updates**: Store architecture documentation
  - **API Documentation**: Store interface documentation

#### Missing User Documentation:
- [ ] **Feature**: Task orchestration - Document task distribution workflow
  - **User Guide**: How tasks are distributed and managed
  - **Troubleshooting**: Common issues with task distribution
  - **Migration Guide**: How to migrate from old to new store structure

### 9. Security Analysis

#### Security Vulnerabilities:
- [ ] **Vulnerability Type**: Store state exposure - Store state might be exposed in browser
  - **Location**: All store files
  - **Risk Level**: Medium
  - **Mitigation**: Implement state sanitization and access controls
  - **Estimated Effort**: 4 hours

#### Missing Security Features:
- [ ] **Security Feature**: Store access control - Control access to store data
  - **Implementation**: Add role-based access control to stores
  - **Files to Modify**: All store files
  - **Estimated Effort**: 6 hours

### 10. Performance Analysis

#### Performance Bottlenecks:
- [ ] **Bottleneck**: Store re-renders - Excessive re-renders due to store updates
  - **Location**: All store files
  - **Current Performance**: Unknown
  - **Target Performance**: Minimize re-renders, optimize store updates
  - **Optimization Strategy**: Implement selective subscriptions and memoization
  - **Estimated Effort**: 6 hours

#### Missing Performance Features:
- [ ] **Performance Feature**: Store performance monitoring - Track store performance
  - **Implementation**: Add performance tracking to store operations
  - **Files to Modify**: All store files
  - **Estimated Effort**: 4 hours

### 11. Recommended Action Plan

#### Immediate Actions (Next Sprint):
- [ ] **Action**: Create MetaLayerStore and ProjectLayerStore
  - **Priority**: High
  - **Effort**: 14 hours
  - **Dependencies**: None

- [ ] **Action**: Create WebLayerStore and APILayerStore
  - **Priority**: High
  - **Effort**: 12 hours
  - **Dependencies**: MetaLayerStore, ProjectLayerStore

- [ ] **Action**: Create TaskOrchestrator service
  - **Priority**: High
  - **Effort**: 8 hours
  - **Dependencies**: All layer stores

#### Short-term Actions (Next 2-3 Sprints):
- [ ] **Action**: Clean up existing stores (IDEStore, ProjectStore)
  - **Priority**: Medium
  - **Effort**: 8 hours
  - **Dependencies**: New layer stores

- [ ] **Action**: Update selectors and hooks
  - **Priority**: Medium
  - **Effort**: 6 hours
  - **Dependencies**: Store cleanup

- [ ] **Action**: Update UI components
  - **Priority**: Medium
  - **Effort**: 6 hours
  - **Dependencies**: Selectors update

#### Long-term Actions (Next Quarter):
- [ ] **Action**: Add comprehensive testing
  - **Priority**: Medium
  - **Effort**: 16 hours
  - **Dependencies**: Store implementation

- [ ] **Action**: Add performance monitoring
  - **Priority**: Low
  - **Effort**: 8 hours
  - **Dependencies**: Store implementation

### 12. Success Criteria for Analysis
- [ ] All gaps identified and documented
- [ ] Priority levels assigned to each gap
- [ ] Effort estimates provided for each gap
- [ ] Action plan created with clear next steps
- [ ] Stakeholders informed of findings
- [ ] Database tasks created for high priority gaps

### 13. Risk Assessment

#### High Risk Gaps:
- [ ] **Risk**: Store architecture complexity - Mitigation: Implement step by step with proper testing

#### Medium Risk Gaps:
- [ ] **Risk**: Data migration issues - Mitigation: Implement data migration scripts and rollback plans

#### Low Risk Gaps:
- [ ] **Risk**: Performance impact - Mitigation: Monitor performance during implementation

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/frontend/store-architecture-analysis.md'
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
  "git_branch_name": "analysis/frontend-store-architecture",
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
- **Codebase Analysis Tools**: Zustand documentation, React state management best practices
- **Best Practices**: Single Responsibility Principle, separation of concerns
- **Similar Projects**: Modern React applications with complex state management
- **Technical Documentation**: Zustand store patterns, React hooks patterns
- **Performance Benchmarks**: Store operation performance standards

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
  'Frontend Store Architecture Analysis', -- From section 1
  '[Full markdown content]', -- Complete description
  'analysis', -- Task type
  'frontend', -- 'frontend'|'backend'|'database'|'security'|'performance'
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/frontend/store-architecture-analysis.md', -- Source path with category
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All analysis details
  '8' -- From section 1
);
```

## Usage Instructions

1. **Analyze thoroughly** - Examine all aspects of the frontend store architecture
2. **Be specific with gaps** - Provide exact file paths and descriptions
3. **Include effort estimates** - Critical for prioritization
4. **Prioritize gaps** - Help stakeholders understand what to tackle first
5. **Provide actionable insights** - Each gap should have clear next steps
6. **Include success criteria** - Enable progress tracking
7. **Consider all dimensions** - Code quality, architecture, security, performance

## Example Usage

> Analyze the current frontend store architecture and identify all gaps, missing components, and areas for improvement. Create a analysis following the template structure above. Focus on critical gaps that need immediate attention and provide specific file paths, effort estimates, and action plans for each identified issue.

---

**Note**: This template is optimized for database-first analysis architecture where markdown docs serve as analysis specifications that get parsed into trackable, actionable database tasks with full AI auto-implementation support.
