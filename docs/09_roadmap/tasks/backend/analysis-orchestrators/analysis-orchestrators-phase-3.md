# Analysis Orchestrators Implementation – Phase 3: Integration

## Overview
Integrate the new orchestrators into the existing system by registering them in the StepRegistry, updating the WorkflowComposer, and ensuring all category-based routes work correctly following the SecurityAnalysisOrchestrator integration pattern.

## Objectives
- [ ] Register new orchestrators in StepRegistry
- [ ] Update WorkflowComposer to include new orchestrators
- [ ] Update route mapping in AnalysisController
- [ ] Test integration with existing workflow system
- [ ] Verify category-based routes return proper data
- [ ] Ensure all 5 standard endpoints work: recommendations, issues, metrics, summary, results

## Deliverables
- File: `backend/domain/steps/StepRegistry.js` - Updated with new orchestrators
- File: `backend/domain/workflows/WorkflowComposer.js` - Updated with new orchestrators
- File: `backend/presentation/api/routes/analysis.js` - Updated with missing category routes
- File: `backend/presentation/api/AnalysisController.js` - Verified category methods work
- File: `backend/application/services/AnalysisApplicationService.js` - Updated category mapping
- Integration tests for all new orchestrators
- Route validation tests for all category endpoints

## Dependencies
- Requires: Phase 2 completion (Core Implementation)
- Blocks: Phase 4 (Testing & Documentation)

## Estimated Time
2 hours

## Success Criteria
- [ ] All 4 new orchestrators registered in StepRegistry
- [ ] WorkflowComposer includes new orchestrators in workflow options
- [ ] All category-based routes work correctly:
  - `/api/projects/:projectId/analysis/code-quality/*` - All 5 endpoints
  - `/api/projects/:projectId/analysis/dependencies/*` - All 5 endpoints
  - `/api/projects/:projectId/analysis/manifest/*` - All 5 endpoints
  - `/api/projects/:projectId/analysis/tech-stack/*` - All 5 endpoints
- [ ] AnalysisController category methods return proper data
- [ ] Integration with existing workflow system works
- [ ] No conflicts with existing orchestrators
- [ ] All routes follow established SecurityAnalysisOrchestrator pattern
- [ ] Category mapping works correctly in AnalysisApplicationService
- [ ] No build errors
- [ ] All integration tests pass 