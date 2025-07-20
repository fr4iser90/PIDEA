# Analysis Orchestrator Refactor - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: Analysis Orchestrator Refactor
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 6 hours
- **Dependencies**: None
- **Related Issues**: System startup failure due to missing analyzer services

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express, Dependency Injection Container
- **Architecture Pattern**: Clean Architecture, Orchestrator Pattern
- **Database Changes**: None
- **API Changes**: None (internal refactor)
- **Frontend Changes**: None
- **Backend Changes**: Service refactoring, dependency injection updates

## 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/Application.js` - Remove analyzer service references, add AnalysisOrchestrator
- [ ] `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Update service registrations
- [ ] `backend/domain/services/TaskAnalysisService.js` - Remove OLD7 import, use AnalysisOrchestrator
- [ ] `backend/domain/services/TaskService.js` - Update projectAnalyzer dependency
- [ ] `backend/presentation/api/WorkflowController.js` - Update analyzer references

#### Files to Create:
- [ ] `backend/infrastructure/external/AnalysisOrchestrator.js` - Implement orchestrator logic
- [ ] `backend/domain/steps/categories/analysis/project_analysis_step.js` - Refactor to own logic
- [ ] `backend/domain/steps/categories/analysis/code_quality_analysis_step.js` - Refactor to own logic
- [ ] `backend/domain/steps/categories/analysis/security_analysis_step.js` - Refactor to own logic
- [ ] `backend/domain/steps/categories/analysis/performance_analysis_step.js` - Refactor to own logic
- [ ] `backend/domain/steps/categories/analysis/architecture_analysis_step.js` - Refactor to own logic
- [ ] `backend/domain/steps/categories/analysis/tech_stack_analysis_step.js` - Refactor to own logic

#### Files to Delete:
- [ ] `backend/infrastructure/external/OLD1.js` - Legacy ArchitectureAnalyzer
- [ ] `backend/infrastructure/external/OLD2.js` - Legacy CodeQualityAnalyzer
- [ ] `backend/infrastructure/external/OLD3.js` - Legacy CoverageAnalyzer
- [ ] `backend/infrastructure/external/OLD4.js` - Legacy SecurityAnalyzer
- [ ] `backend/infrastructure/external/OLD5.js` - Legacy PerformanceAnalyzer
- [ ] `backend/infrastructure/external/OLD7.js` - Legacy ProjectAnalyzer
- [ ] `backend/infrastructure/external/OLD8.js` - Legacy TechStackAnalyzer

## 4. Implementation Phases

#### Phase 1: System Startup Fix (2 hours)
- [ ] Comment out analyzer service references in Application.js
- [ ] Create stub AnalysisOrchestrator implementation
- [ ] Update ServiceRegistry to register AnalysisOrchestrator
- [ ] Fix TaskAnalysisService OLD7 import
- [ ] Test system startup

#### Phase 2: Analysis Orchestrator Implementation (3 hours)
- [ ] Implement full AnalysisOrchestrator with step delegation
- [ ] Refactor 6 analysis steps to have own logic
- [ ] Migrate functionality from OLD files to steps
- [ ] Update all service dependencies
- [ ] Test analysis functionality

#### Phase 3: Legacy Cleanup (1 hour)
- [ ] Remove all OLD files
- [ ] Update remaining references
- [ ] Final testing and validation
- [ ] Documentation updates

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging
- **Testing**: Jest framework, maintain existing coverage
- **Documentation**: JSDoc for all public methods

## 6. Security Considerations
- [ ] Maintain existing security analysis functionality
- [ ] Ensure no security vulnerabilities in refactored code
- [ ] Preserve input validation and sanitization
- [ ] Maintain audit logging for analysis operations

## 7. Performance Requirements
- **Response Time**: Maintain existing performance
- **Throughput**: No degradation in analysis operations
- **Memory Usage**: Optimize memory usage in orchestrator
- **Database Queries**: No database changes required
- **Caching Strategy**: Maintain existing caching if any

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/AnalysisOrchestrator.test.js`
- [ ] Test cases: Orchestrator delegation, error handling, step coordination
- [ ] Mock requirements: StepRegistry, logger

#### Integration Tests:
- [ ] Test file: `tests/integration/AnalysisOrchestrator.test.js`
- [ ] Test scenarios: Full analysis workflow, service integration
- [ ] Test data: Sample project structures

#### E2E Tests:
- [ ] Test file: `tests/e2e/analysis-workflow.test.js`
- [ ] User flows: Complete analysis workflow from API to results
- [ ] Browser compatibility: N/A (backend only)

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for AnalysisOrchestrator methods
- [ ] Update README with new architecture
- [ ] Document step delegation pattern
- [ ] Architecture diagrams for orchestrator pattern

#### User Documentation:
- [ ] Update developer documentation
- [ ] Document analysis workflow changes
- [ ] Migration guide for affected services

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] System starts without errors
- [ ] Analysis functionality works
- [ ] No performance degradation
- [ ] Documentation updated

#### Deployment:
- [ ] No database migrations required
- [ ] Environment variables unchanged
- [ ] Configuration updates applied
- [ ] Service restarts required
- [ ] Health checks pass

#### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify analysis functionality
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 11. Rollback Plan
- [ ] Keep OLD files until validation complete
- [ ] Configuration rollback procedure
- [ ] Service rollback procedure documented
- [ ] Communication plan for stakeholders

## 12. Success Criteria
- [ ] System starts without errors
- [ ] All analysis functionality works
- [ ] No performance degradation
- [ ] Clean architecture achieved
- [ ] All OLD files removed
- [ ] Tests pass
- [ ] Documentation complete

## 13. Risk Assessment

#### High Risk:
- [ ] System startup failure - Mitigation: Gradual migration with fallbacks
- [ ] Analysis functionality broken - Mitigation: Comprehensive testing

#### Medium Risk:
- [ ] Performance degradation - Mitigation: Performance testing
- [ ] Integration issues - Mitigation: Integration testing

#### Low Risk:
- [ ] Documentation gaps - Mitigation: Thorough documentation review

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-implementation.md'
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
  "git_branch_name": "feature/analysis-orchestrator-refactor",
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
- [ ] System starts successfully
- [ ] Analysis functionality works
- [ ] All OLD files removed

## 15. References & Resources
- **Technical Documentation**: CORRECT.md analysis
- **API References**: Existing analysis API endpoints
- **Design Patterns**: Orchestrator Pattern, Clean Architecture
- **Best Practices**: Dependency Injection, Service Layer Pattern
- **Similar Implementations**: GitService orchestrator pattern

## Current State Analysis

### Critical Issues Identified:
1. **Application.js** tries to load `projectAnalyzer`, `codeQualityAnalyzer`, etc. services that are commented out in ServiceRegistry
2. **TaskAnalysisService** directly imports `OLD7.js` (ProjectAnalyzer)
3. **AnalysisOrchestrator.js** exists but is empty
4. **6 Analysis Steps** are just wrappers around OLD files
5. **System crashes** on startup due to missing services

### Current Architecture Problems:
- **Double Wrapping**: Steps wrap analyzers that are already wrappers
- **Legacy Dependencies**: Everything depends on OLD files
- **No Orchestration**: No central coordination for analysis
- **Service Registry Mismatch**: Services registered but not available

### Target Architecture:
```
AnalysisOrchestrator (externals/)
├── project_analysis_step (own logic)
├── code_quality_analysis_step (own logic)
├── security_analysis_step (own logic)
├── performance_analysis_step (own logic)
├── architecture_analysis_step (own logic)
└── tech_stack_analysis_step (own logic)

WorkflowOrchestrationService
├── AnalysisOrchestrator
├── GitService
└── [other orchestrators]
```

### Migration Strategy:
1. **Phase 1**: Fix immediate startup issues
2. **Phase 2**: Implement proper orchestrator with step delegation
3. **Phase 3**: Remove legacy files and clean up

This refactor will achieve a clean, modular architecture with proper separation of concerns and eliminate the legacy dependency hell.

## Validation Results - 2024-12-19

### ✅ Completed Items
- [x] File: `docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-implementation.md` - Status: Implementation plan created
- [x] File: `docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-phase-1.md` - Status: Phase 1 plan created
- [x] File: `docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-phase-2.md` - Status: Phase 2 plan created
- [x] File: `docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-phase-3.md` - Status: Phase 3 plan created
- [x] File: `docs/09_roadmap/features/backend/analysis-orchestrator-refactor/analysis-orchestrator-refactor-index.md` - Status: Index file created

### ⚠️ Issues Found
- [ ] File: `backend/Application.js` - Status: Tries to load removed analyzer services (lines 290-295)
- [ ] File: `backend/infrastructure/external/AnalysisOrchestrator.js` - Status: File exists but is empty (0 bytes)
- [ ] File: `backend/domain/services/TaskAnalysisService.js` - Status: Still imports OLD7.js (line 9)
- [ ] Service: `projectAnalyzer` - Status: Referenced but not registered in ServiceRegistry
- [ ] Service: `codeQualityAnalyzer` - Status: Referenced but not registered in ServiceRegistry
- [ ] Service: `securityAnalyzer` - Status: Referenced but not registered in ServiceRegistry
- [ ] Service: `performanceAnalyzer` - Status: Referenced but not registered in ServiceRegistry
- [ ] Service: `architectureAnalyzer` - Status: Referenced but not registered in ServiceRegistry
- [ ] Service: `techStackAnalyzer` - Status: Referenced but not registered in ServiceRegistry

### 🔧 Improvements Made
- Updated implementation plan with current state analysis
- Added validation results section
- Corrected file paths to match actual project structure
- Added critical issues identification
- Enhanced migration strategy details

### 📊 Code Quality Metrics
- **Coverage**: 0% (AnalysisOrchestrator not implemented)
- **Security Issues**: 0 (no implementation yet)
- **Performance**: N/A (system doesn't start)
- **Maintainability**: Poor (legacy dependencies everywhere)

### 🚀 Next Steps
1. **IMMEDIATE**: Comment out analyzer service references in Application.js (lines 290-295)
2. **IMMEDIATE**: Implement stub AnalysisOrchestrator in `backend/infrastructure/external/AnalysisOrchestrator.js`
3. **IMMEDIATE**: Register AnalysisOrchestrator in ServiceRegistry
4. **IMMEDIATE**: Remove OLD7 import from TaskAnalysisService
5. **TEST**: Verify system starts without errors

### 📋 Task Splitting Recommendations
- **Main Task**: Analysis Orchestrator Refactor (6 hours) → Already split into 3 phases
- **Phase 1**: System Startup Fix (2 hours) - Critical path, must be completed first
- **Phase 2**: Analysis Orchestrator Implementation (3 hours) - Core functionality
- **Phase 3**: Legacy Cleanup (1 hour) - Final cleanup

### 🎯 Critical Action Items
1. **Fix Application.js** - Comment out analyzer service loading (5 minutes)
2. **Create AnalysisOrchestrator stub** - Basic implementation (15 minutes)
3. **Update ServiceRegistry** - Register AnalysisOrchestrator (5 minutes)
4. **Fix TaskAnalysisService** - Remove OLD7 import (5 minutes)
5. **Test system startup** - Verify no crashes (5 minutes)

### 📈 Success Metrics
- ✅ System starts without errors
- ✅ AnalysisOrchestrator loads successfully
- ✅ No "Service not found" errors
- ✅ All analysis functionality works
- ✅ Clean architecture achieved
- ✅ All OLD files removed

### 🔍 Validation Status
- **File Existence**: ✅ All planned files exist
- **File Paths**: ✅ All paths match actual project structure
- **Dependencies**: ❌ Missing AnalysisOrchestrator implementation
- **Service Registration**: ❌ Analyzer services not registered
- **System Startup**: ❌ System crashes due to missing services
- **Legacy Cleanup**: ❌ OLD files still present

### 📝 Notes
- **Current Status**: Planning complete, implementation not started
- **Critical Issue**: System cannot start due to missing analyzer services
- **Priority**: Phase 1 must be completed immediately
- **Risk Level**: High (system startup failure)
- **Estimated Fix Time**: 30 minutes for immediate startup fix 