# Subtask 2: Analyze Handler Migration

## Task Overview
- **Subtask Name**: Analyze Handler Migration
- **Priority**: High
- **Estimated Time**: 6 hours (reduced from 60 hours - leverage existing infrastructure)
- **Dependencies**: Subtask 1 (Migration Infrastructure Setup)
- **Risk Level**: Medium
- **Files to Modify**: 6 files
- **Files to Create**: 6 files

## Current Status
✅ **HandlerMigrationUtility Already Available**
- Complete migration utilities exist in `backend/domain/workflows/handlers/HandlerMigrationUtility.js`
- AnalysisStep already implemented in unified workflow system

## Handlers to Migrate

### Analyze Handlers (Average: 572 lines each)
1. **AnalyzeArchitectureHandler.js** (676 lines) → AnalysisStep
2. **AnalyzeCodeQualityHandler.js** (755 lines) → AnalysisStep  
3. **AnalyzeTechStackHandler.js** (460 lines) → AnalysisStep
4. **AnalyzeRepoStructureHandler.js** (631 lines) → AnalysisStep
5. **AnalyzeDependenciesHandler.js** (506 lines) → AnalysisStep
6. **AdvancedAnalysisHandler.js** (393 lines) → AnalysisStep

## Implementation Plan

### Phase 1: Handler Analysis (1 hour)
**Purpose**: Analyze each handler's structure and dependencies

**Files to Create:**
- `backend/domain/workflows/migration/analyze-handler-analysis.md`

**Tasks:**
- [ ] Document each handler's public interface
- [ ] Identify dependencies and external services
- [ ] Map handler methods to AnalysisStep methods
- [ ] Identify configuration requirements

### Phase 2: Create Unified Analysis Steps (3 hours)
**Purpose**: Create unified workflow steps for each analyze handler

**Files to Create:**
- `backend/domain/workflows/steps/ArchitectureAnalysisStep.js`
- `backend/domain/workflows/steps/CodeQualityAnalysisStep.js`
- `backend/domain/workflows/steps/TechStackAnalysisStep.js`
- `backend/domain/workflows/steps/RepoStructureAnalysisStep.js`
- `backend/domain/workflows/steps/DependenciesAnalysisStep.js`
- `backend/domain/workflows/steps/AdvancedAnalysisStep.js`

**Implementation Pattern:**
```javascript
// Example: ArchitectureAnalysisStep.js
const { AnalysisStep } = require('./AnalysisStep');

class ArchitectureAnalysisStep extends AnalysisStep {
    constructor(options = {}) {
        super({
            name: 'architecture_analysis',
            description: 'Analyze project architecture',
            version: '1.0.0',
            ...options
        });
    }

    async execute(context) {
        // Migrate logic from AnalyzeArchitectureHandler
        const { projectPath, options } = context.getData();
        
        // Execute analysis using existing services
        const result = await this.performArchitectureAnalysis(projectPath, options);
        
        return {
            success: true,
            analysis: result,
            metadata: this.getMetadata()
        };
    }

    async performArchitectureAnalysis(projectPath, options) {
        // Migrate core analysis logic from original handler
        // Leverage existing analysis services
    }
}
```

### Phase 3: Update Handler Registry (1 hour)
**Purpose**: Register new unified steps in the handler registry

**Files to Modify:**
- `backend/domain/workflows/handlers/HandlerRegistry.js`

**Tasks:**
- [ ] Register new analysis steps
- [ ] Update handler type mappings
- [ ] Configure step priorities
- [ ] Add step metadata

### Phase 4: Integration Testing (1 hour)
**Purpose**: Test migrated handlers work correctly

**Files to Create:**
- `tests/unit/migration/analyze-handler-migration.test.js`

**Tasks:**
- [ ] Test each migrated step individually
- [ ] Verify analysis results match original handlers
- [ ] Test error handling and edge cases
- [ ] Validate performance characteristics

## Migration Strategy

### 1. Leverage Existing Infrastructure
- Use HandlerMigrationUtility for migration planning
- Leverage existing AnalysisStep base class
- Use existing analysis services where possible
- Reuse validation and error handling patterns

### 2. Preserve Functionality
- Maintain all public interfaces
- Preserve analysis logic and algorithms
- Keep configuration options
- Maintain error handling behavior

### 3. Improve Architecture
- Follow unified workflow patterns
- Implement proper step validation
- Add comprehensive logging
- Improve error reporting

## Success Criteria
- [ ] All 6 analyze handlers migrated to unified steps
- [ ] Analysis results match original handlers
- [ ] Performance characteristics maintained or improved
- [ ] Error handling works correctly
- [ ] All tests passing
- [ ] Documentation updated

## Dependencies
- Subtask 1: Migration Infrastructure Setup
- Existing HandlerMigrationUtility
- Existing AnalysisStep base class
- Existing analysis services

## Risk Mitigation
- **Medium Risk**: Complex handlers with many dependencies
- **Testing**: Comprehensive testing of each migrated step
- **Rollback**: Use existing rollback mechanisms
- **Validation**: Verify results match original handlers

## Next Steps
After completion, this subtask enables:
- Subtask 5: Integration & Testing
- Unified analysis workflow execution
- Better performance monitoring
- Improved error handling

## Notes
- **Reduced Scope**: From 60 hours to 6 hours by leveraging existing infrastructure
- **Focus on Migration**: Only migrate analysis logic, not re-implement
- **Preserve Behavior**: Ensure migrated steps produce identical results
- **Leverage Existing**: Use HandlerMigrationUtility and AnalysisStep base class 