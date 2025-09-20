# Analysis Steps Standardization – Phase 1: Remove Legacy Fields from Orchestrators

## Overview
Remove legacy fields from all analysis orchestrators and keep only the standardized data structure. The orchestrators already handle both legacy and standardized formats - we just need to remove the legacy fields.

## Objectives
- [ ] Update CodeQualityAnalysisOrchestrator to remove legacy fields
- [ ] Update SecurityAnalysisOrchestrator to remove legacy fields
- [ ] Update PerformanceAnalysisOrchestrator to remove legacy fields
- [ ] Update ArchitectureAnalysisOrchestrator to remove legacy fields
- [ ] Update DependencyAnalysisOrchestrator to remove legacy fields
- [ ] Update ManifestAnalysisOrchestrator to remove legacy fields
- [ ] Update TechStackAnalysisOrchestrator to remove legacy fields
- [ ] Keep only standardized fields: issues, recommendations, tasks, documentation
- [ ] Remove legacy aggregation logic (lintingIssues, vulnerabilities, etc.)
- [ ] Update metrics calculation to use standardized data

## Deliverables
- File: `backend/domain/steps/categories/analysis/CodeQualityAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/SecurityAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/PerformanceAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/ArchitectureAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/DependencyAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/ManifestAnalysisOrchestrator.js` - Updated orchestrator
- File: `backend/domain/steps/categories/analysis/TechStackAnalysisOrchestrator.js` - Updated orchestrator
- Validation: All orchestrators return only standardized data structure

## Dependencies
- Requires: None (foundation phase)
- Blocks: Phase 2 (Individual step updates)

## Estimated Time
3 hours

## Success Criteria
- [ ] All 7 orchestrators updated to remove legacy fields
- [ ] Only standardized fields remain: issues, recommendations, tasks, documentation
- [ ] Legacy aggregation logic completely removed
- [ ] Metrics calculation updated to use standardized data
- [ ] All tests pass with standardized data structure
- [ ] Performance maintained (< 500ms response time)

## Implementation Details

### Current State Analysis
The orchestrators currently return a **mixed structure** with both legacy and standardized fields:

```javascript
// CURRENT STATE - CodeQualityAnalysisOrchestrator.js
const results = {
  summary: {
    // ❌ LEGACY FIELDS (to be removed)
    lintingIssues: [],
    complexityIssues: [],
    coverageIssues: [],
    documentationIssues: [],
    bestPractices: [],
    codeStyleIssues: []
  },
  // ✅ STANDARDIZED FIELDS (to keep)
  issues: [],
  recommendations: [],
  tasks: [],
  documentation: []
};
```

### Target State
```javascript
// TARGET STATE - CodeQualityAnalysisOrchestrator.js
const results = {
  summary: {
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: 0
    // ❌ REMOVED: All legacy fields
  },
  details: {},
  // ✅ KEEP ONLY STANDARDIZED FIELDS
  issues: [],
  recommendations: [],
  tasks: [],
  documentation: []
};
```

### Orchestrators to Update
1. **CodeQualityAnalysisOrchestrator.js** - Remove: lintingIssues, complexityIssues, coverageIssues, documentationIssues, bestPractices, codeStyleIssues
2. **SecurityAnalysisOrchestrator.js** - Remove: vulnerabilities, bestPractices, dependencies, secrets, permissions
3. **PerformanceAnalysisOrchestrator.js** - Remove: performanceIssues, memoryIssues, cpuIssues, networkIssues
4. **ArchitectureAnalysisOrchestrator.js** - Remove: architectureIssues, layerViolations, designIssues, couplingIssues
5. **DependencyAnalysisOrchestrator.js** - Remove: dependencyIssues, outdatedPackages, vulnerablePackages, unusedPackages
6. **ManifestAnalysisOrchestrator.js** - Remove: manifestIssues, packageJsonIssues, dockerfileIssues, ciConfigIssues
7. **TechStackAnalysisOrchestrator.js** - Remove: techStackIssues, frameworkIssues, libraryIssues, toolIssues

### Key Changes Required
- Remove legacy field declarations from results object
- Remove legacy field aggregation logic in step execution loop
- Update metrics calculation methods to use standardized data only
- Ensure error handling works with standardized structure
- Update logging to reflect standardized structure

### Aggregation Logic Changes
```javascript
// BEFORE: Legacy aggregation
if (stepResult.lintingIssues) {
  results.summary.lintingIssues.push(...stepResult.lintingIssues);
}
if (stepResult.complexityIssues) {
  results.summary.complexityIssues.push(...stepResult.complexityIssues);
}

// AFTER: Standardized aggregation only
if (stepResult.issues) {
  results.issues.push(...stepResult.issues);
}
if (stepResult.recommendations) {
  results.recommendations.push(...stepResult.recommendations);
}
if (stepResult.tasks) {
  results.tasks.push(...stepResult.tasks);
}
if (stepResult.documentation) {
  results.documentation.push(...stepResult.documentation);
}
```

### Metrics Calculation Updates
- Update score calculation methods to use standardized data
- Remove references to legacy fields in metrics
- Ensure all metrics are calculated from standardized fields only

### Error Handling
- Handle step execution failures gracefully
- Maintain partial results when some steps fail
- Log detailed error information for debugging
- Return standardized error structure

### Performance Optimization
- Execute steps sequentially to avoid resource conflicts
- Aggregate data efficiently without memory leaks
- Use streaming for large datasets
- Implement early termination for critical failures

### Testing Strategy
- Test each orchestrator with standardized step results only
- Verify legacy field removal works correctly
- Test error handling with failed steps
- Validate performance with large datasets
- Ensure backward compatibility during transition 