# Prompt: Project-Wide Gap Analysis & Missing Components

## Goal
Generate a comprehensive analysis of what's missing, incomplete, or needs improvement across the entire project. Create actionable insights for project-wide improvements that can be parsed into database tasks for AI auto-implementation, tracking, and execution.

**Note**: This prompt focuses on project-wide analysis, not individual task validation. For task-specific validation, use `task-review.md`.

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
- **Analysis Name**: Cache Consolidation Gap Analysis
- **Analysis Type**: Gap Analysis/Architecture Review/Performance Audit
- **Priority**: High
- **Estimated Analysis Time**: 8 hours
- **Scope**: Frontend cache architecture consolidation and migration
- **Related Components**: CacheService, CacheManager, RequestDeduplicationService, IDEStore, useAnalysisCache, RefreshService, APIChatRepository
- **Analysis Date**: 2025-01-27T12:45:00.000Z - Reference `@timestamp-utility.md`

### 2. Current State Assessment
- **Codebase Health**: Mixed - 60% consolidated, 40% still using old systems
- **Architecture Status**: Hybrid system with parallel cache implementations
- **Test Coverage**: 45% - Missing tests for new CacheService integration
- **Documentation Status**: 70% - New system documented, migration guide incomplete
- **Performance Metrics**: Cache hit rate unknown due to fragmented systems
- **Security Posture**: Good - No security issues identified in cache implementation

### 3. Gap Analysis Results

#### Critical Gaps (High Priority):
- [ ] **Incomplete Migration**: IDEStore still uses RequestDeduplicationService
  - **Location**: `frontend/src/infrastructure/stores/IDEStore.jsx`
  - **Required Functionality**: Replace RequestDeduplicationService with CacheService
  - **Dependencies**: CacheService must be fully initialized
  - **Estimated Effort**: 4 hours

- [ ] **Incomplete Migration**: useAnalysisCache still uses CacheManager
  - **Location**: `frontend/src/hooks/useAnalysisCache.js`
  - **Required Functionality**: Replace refreshService.cacheManager with cacheService
  - **Dependencies**: CacheService integration
  - **Estimated Effort**: 3 hours

- [ ] **Parallel Cache Systems**: Multiple cache implementations running simultaneously
  - **Current State**: CacheService, CacheManager, RequestDeduplicationService all active
  - **Missing Parts**: Removal of old cache systems
  - **Files Affected**: `frontend/src/infrastructure/services/CacheManager.js`, `frontend/src/infrastructure/services/RequestDeduplicationService.js`
  - **Estimated Effort**: 2 hours

#### Medium Priority Gaps:
- [ ] **Missing Cache Integration Tests**: No tests for CacheService integration
  - **Current Issues**: Integration tests only cover individual services
  - **Proposed Solution**: Add integration tests for complete cache flow
  - **Files to Modify**: `frontend/tests/integration/CacheIntegration.test.jsx`
  - **Estimated Effort**: 3 hours

- [ ] **Incomplete RefreshService Migration**: Still references CacheManager
  - **Current Issues**: RefreshService uses both CacheService and CacheManager
  - **Proposed Solution**: Complete migration to CacheService only
  - **Files to Modify**: `frontend/src/infrastructure/services/RefreshService.js`
  - **Estimated Effort**: 2 hours

#### Low Priority Gaps:
- [ ] **Cache Performance Monitoring**: Limited analytics integration
  - **Current Performance**: Basic stats collection
  - **Optimization Target**: Full analytics integration with alerts
  - **Files to Optimize**: `frontend/src/infrastructure/services/CacheAnalytics.js`
  - **Estimated Effort**: 2 hours

### 4. File Impact Analysis

#### Files Missing:
- [ ] `frontend/tests/integration/CacheIntegration.test.jsx` - Integration tests for complete cache flow
- [ ] `frontend/src/infrastructure/services/CacheMigrationService.js` - Service to handle migration from old to new cache

#### Files Incomplete:
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Still imports and uses RequestDeduplicationService
- [ ] `frontend/src/hooks/useAnalysisCache.js` - Still uses refreshService.cacheManager instead of cacheService
- [ ] `frontend/src/infrastructure/services/RefreshService.js` - Mixed usage of CacheService and CacheManager

#### Files Needing Refactoring:
- [ ] `frontend/src/infrastructure/services/CacheManager.js` - Should be removed after migration
- [ ] `frontend/src/infrastructure/services/RequestDeduplicationService.js` - Should be removed after migration

#### Files to Delete:
- [ ] `frontend/src/infrastructure/services/CacheManager.js` - Replaced by CacheService
- [ ] `frontend/src/infrastructure/services/RequestDeduplicationService.js` - Replaced by CacheService

### 5. Technical Debt Assessment

#### Code Quality Issues:
- [ ] **Duplication**: Multiple cache implementations with similar functionality
- [ ] **Inconsistent Patterns**: Different cache access patterns across components
- [ ] **Dead Code**: Old cache services still imported but not fully utilized

#### Architecture Issues:
- [ ] **Tight Coupling**: Components tightly coupled to specific cache implementations
- [ ] **Missing Abstractions**: No single cache interface for all components
- [ ] **Violation of Principles**: DRY principle violated with multiple cache systems

#### Performance Issues:
- [ ] **Memory Overhead**: Multiple cache instances consuming memory
- [ ] **Cache Conflicts**: Potential conflicts between different cache systems
- [ ] **Inefficient Lookups**: Components checking multiple cache systems

### 6. Missing Features Analysis

#### Core Features Missing:
- [ ] **Cache Migration Service**: Service to handle migration from old to new cache systems
  - **Business Impact**: Enables smooth transition without data loss
  - **Technical Requirements**: Migration logic, data transfer, validation
  - **Estimated Effort**: 4 hours
  - **Dependencies**: CacheService must be fully implemented

#### Enhancement Features Missing:
- [ ] **Cache Performance Dashboard**: Real-time monitoring of cache performance
  - **User Value**: Developers can monitor cache effectiveness
  - **Implementation Details**: Dashboard component with metrics display
  - **Estimated Effort**: 6 hours

### 7. Testing Gaps

#### Missing Unit Tests:
- [ ] **Component**: CacheService - Cache operations and TTL management
  - **Test File**: `frontend/tests/unit/CacheService.test.jsx`
  - **Test Cases**: set, get, delete, TTL expiration, memory management
  - **Coverage Target**: 90% coverage needed

#### Missing Integration Tests:
- [ ] **Integration**: CacheService with APIChatRepository - API caching flow
  - **Test File**: `frontend/tests/integration/CacheAPIIntegration.test.jsx`
  - **Test Scenarios**: API calls with cache hits/misses, invalidation

#### Missing E2E Tests:
- [ ] **User Flow**: IDE switching with cache - Complete IDE switch flow
  - **Test File**: `frontend/tests/e2e/IDESwitchCache.test.jsx`
  - **User Journeys**: IDE switch → cache hit → performance validation

### 8. Documentation Gaps

#### Missing Code Documentation:
- [ ] **Component**: CacheService - JSDoc comments for all methods
  - **JSDoc Comments**: All public methods need documentation
  - **README Updates**: Cache architecture section needs updates
  - **API Documentation**: Cache invalidation patterns need documentation

#### Missing User Documentation:
- [ ] **Feature**: Cache Migration - Migration guide for developers
  - **User Guide**: Step-by-step migration instructions
  - **Troubleshooting**: Common migration issues and solutions
  - **Migration Guide**: Complete migration checklist

### 9. Security Analysis

#### Security Vulnerabilities:
- [ ] **No Critical Issues Found**: Cache implementation follows security best practices
  - **Location**: All cache services
  - **Risk Level**: Low
  - **Mitigation**: Current implementation is secure
  - **Estimated Effort**: 0 hours

#### Missing Security Features:
- [ ] **Cache Data Encryption**: Sensitive data encryption in cache
  - **Implementation**: Add encryption for sensitive cache data
  - **Files to Modify**: `frontend/src/infrastructure/services/CacheService.js`
  - **Estimated Effort**: 3 hours

### 10. Performance Analysis

#### Performance Bottlenecks:
- [ ] **Multiple Cache Systems**: Memory overhead from parallel cache systems
  - **Location**: All cache service files
  - **Current Performance**: Unknown due to fragmented monitoring
  - **Target Performance**: Single cache system with <50MB memory usage
  - **Optimization Strategy**: Complete migration to single CacheService
  - **Estimated Effort**: 8 hours

#### Missing Performance Features:
- [ ] **Cache Warming**: Predictive cache loading
  - **Implementation**: Implement cache warming strategies
  - **Files to Modify**: `frontend/src/infrastructure/services/CacheService.js`
  - **Estimated Effort**: 4 hours

### 11. Recommended Action Plan

#### Immediate Actions (Next Sprint):
- [ ] **Action**: Complete IDEStore migration to CacheService
  - **Priority**: High
  - **Effort**: 4 hours
  - **Dependencies**: CacheService must be fully tested

- [ ] **Action**: Complete useAnalysisCache migration to CacheService
  - **Priority**: High
  - **Effort**: 3 hours
  - **Dependencies**: IDEStore migration completed

#### Short-term Actions (Next 2-3 Sprints):
- [ ] **Action**: Remove old cache systems (CacheManager, RequestDeduplicationService)
  - **Priority**: High
  - **Effort**: 2 hours
  - **Dependencies**: All migrations completed

- [ ] **Action**: Add comprehensive integration tests
  - **Priority**: Medium
  - **Effort**: 3 hours
  - **Dependencies**: Migration completed

#### Long-term Actions (Next Quarter):
- [ ] **Action**: Implement cache performance dashboard
  - **Priority**: Medium
  - **Effort**: 6 hours
  - **Dependencies**: Analytics service completed

- [ ] **Action**: Add cache warming strategies
  - **Priority**: Low
  - **Effort**: 4 hours
  - **Dependencies**: Performance monitoring in place

### 12. Success Criteria for Analysis
- [x] All gaps identified and documented
- [x] Priority levels assigned to each gap
- [x] Effort estimates provided for each gap
- [x] Action plan created with clear next steps
- [x] Stakeholders informed of findings
- [ ] Database tasks created for high priority gaps

### 13. Risk Assessment

#### High Risk Gaps:
- [ ] **Risk**: Data loss during cache migration - Mitigation: Implement migration service with validation

#### Medium Risk Gaps:
- [ ] **Risk**: Performance degradation during transition - Mitigation: Gradual migration with monitoring

#### Low Risk Gaps:
- [ ] **Risk**: Temporary increase in memory usage - Mitigation: Monitor memory usage during migration

### 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/performance/cache-architecture/cache-consolidation-analysis.md'
- **category**: 'performance'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "analysis/cache-consolidation",
  "confirmation_keywords": ["fertig", "done", "complete", "analysis_complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

#### Success Indicators:
- [x] All gaps identified and documented
- [x] Priority levels assigned
- [x] Effort estimates provided
- [x] Action plan created
- [ ] Database tasks generated for high priority items

### 15. References & Resources
- **Codebase Analysis Tools**: Codebase search, grep analysis, file structure analysis
- **Best Practices**: Single responsibility principle, DRY principle, cache invalidation patterns
- **Similar Projects**: React Query patterns, Apollo Client cache strategies
- **Technical Documentation**: Cache invalidation patterns, TTL best practices, Memory management
- **Performance Benchmarks**: 80% cache hit rate target, <100ms response time, <50MB memory usage

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
  'Cache Consolidation Gap Analysis', -- From section 1
  '[Full markdown content]', -- Complete description
  'analysis', -- Task type
  'performance', -- Derived from scope
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/pending/high/performance/cache-architecture/cache-consolidation-analysis.md', -- Source path with category
  '[Full markdown content]', -- For reference
  '{"codebase_health": "Mixed - 60% consolidated, 40% still using old systems", "architecture_status": "Hybrid system with parallel cache implementations", "test_coverage": "45%", "documentation_status": "70%", "performance_metrics": "Cache hit rate unknown due to fragmented systems", "security_posture": "Good - No security issues identified", "scope": "Frontend cache architecture consolidation and migration", "estimated_hours": 8}', -- All analysis details
  8 -- From section 1
);
```

## Usage Instructions

1. **Analyze thoroughly** - Examine all aspects of the codebase
2. **Be specific with gaps** - Provide exact file paths and descriptions
3. **Include effort estimates** - Critical for prioritization
4. **Prioritize gaps** - Help stakeholders understand what to tackle first
5. **Provide actionable insights** - Each gap should have clear next steps
6. **Include success criteria** - Enable progress tracking
7. **Consider all dimensions** - Code quality, architecture, security, performance

## Example Usage

> Analyze the current project state and identify all gaps, missing components, and areas for improvement. Create a comprehensive analysis following the template structure above. Focus on critical gaps that need immediate attention and provide specific file paths, effort estimates, and action plans for each identified issue.

---

**Note**: This template is optimized for database-first analysis architecture where markdown docs serve as comprehensive gap analysis specifications that get parsed into trackable, actionable database tasks with full AI auto-implementation support.