# Refactor Structure Analysis – Phase 4: Split Architecture Analysis

## Overview
**Status:** Pending ⏳  
**Duration:** 4 hours  
**Priority:** High

This phase focuses on splitting the monolithic `architecture_analysis_step.js` into specialized architecture analysis components. Each component will handle a specific architecture analysis concern, following the single responsibility principle.

## Objectives
- [ ] Extract layer analysis logic into LayerAnalysisStep.js
- [ ] Extract pattern analysis logic into PatternAnalysisStep.js
- [ ] Extract coupling analysis logic into CouplingAnalysisStep.js
- [ ] Extract dependency analysis logic into DependencyAnalysisStep.js
- [ ] Update architecture category index.js with all exports
- [ ] Create ArchitectureAnalysisService.js orchestrator
- [ ] Update all import references

## Deliverables
- File: `backend/domain/steps/categories/analysis/architecture/LayerAnalysisStep.js` - Architecture layer analysis
- File: `backend/domain/steps/categories/analysis/architecture/PatternAnalysisStep.js` - Design pattern analysis
- File: `backend/domain/steps/categories/analysis/architecture/CouplingAnalysisStep.js` - Coupling analysis
- File: `backend/domain/steps/categories/analysis/architecture/DependencyAnalysisStep.js` - Dependency analysis
- File: `backend/domain/steps/categories/analysis/architecture/index.js` - Updated with all architecture step exports
- File: `backend/application/services/categories/analysis/architecture/ArchitectureAnalysisService.js` - Architecture orchestration service
- File: `backend/application/services/categories/analysis/architecture/index.js` - Architecture services export
- File: `backend/infrastructure/external/categories/analysis/architecture/LayerAnalysisService.js` - Layer detection API
- File: `backend/infrastructure/external/categories/analysis/architecture/PatternAnalysisService.js` - Pattern detection API
- File: `backend/infrastructure/external/categories/analysis/architecture/CouplingAnalysisService.js` - Coupling analysis API
- File: `backend/infrastructure/external/categories/analysis/architecture/DependencyAnalysisService.js` - Dependency analysis API
- File: `backend/infrastructure/external/categories/analysis/architecture/index.js` - Architecture infrastructure export
- File: `backend/presentation/api/categories/analysis/architecture/ArchitectureAnalysisController.js` - Main architecture API
- File: `backend/presentation/api/categories/analysis/architecture/LayerAnalysisController.js` - Layer API endpoints
- File: `backend/presentation/api/categories/analysis/architecture/PatternAnalysisController.js` - Pattern API endpoints
- File: `backend/presentation/api/categories/analysis/architecture/CouplingAnalysisController.js` - Coupling API endpoints
- File: `backend/presentation/api/categories/analysis/architecture/DependencyAnalysisController.js` - Dependency API endpoints
- File: `backend/presentation/api/categories/analysis/architecture/index.js` - Architecture controllers export

## Dependencies
- Requires: Phase 1 completion (category structure)
- Blocks: None (final phase)

## Estimated Time
4 hours

## Detailed Tasks

### 4.1 Domain Layer Architecture Steps Extraction (1.5 hours)
- [ ] Analyze `architecture_analysis_step.js` (812 lines) for extraction points
- [ ] Extract layer analysis logic into `LayerAnalysisStep.js`
- [ ] Extract pattern analysis logic into `PatternAnalysisStep.js`
- [ ] Extract coupling analysis logic into `CouplingAnalysisStep.js`
- [ ] Extract dependency analysis logic into `DependencyAnalysisStep.js`
- [ ] Update `backend/domain/steps/categories/analysis/architecture/index.js` with all exports

### 4.2 Application Layer Architecture Services Creation (1 hour)
- [ ] Create `ArchitectureAnalysisService.js` orchestrator service
- [ ] Implement orchestration logic for all architecture steps
- [ ] Create individual service files for each architecture concern
- [ ] Update `backend/application/services/categories/analysis/architecture/index.js`
- [ ] Update dependency injection configurations

### 4.3 Infrastructure Layer Architecture Services Creation (1 hour)
- [ ] Create `LayerAnalysisService.js` for layer detection APIs
- [ ] Create `PatternAnalysisService.js` for pattern detection APIs
- [ ] Create `CouplingAnalysisService.js` for coupling analysis APIs
- [ ] Create `DependencyAnalysisService.js` for dependency analysis APIs
- [ ] Update `backend/infrastructure/external/categories/analysis/architecture/index.js`

### 4.4 Presentation Layer Architecture Controllers Creation (0.5 hours)
- [ ] Create `ArchitectureAnalysisController.js` main architecture API
- [ ] Create individual controller files for each architecture concern
- [ ] Update `backend/presentation/api/categories/analysis/architecture/index.js`
- [ ] Update API routing configurations

## Implementation Details

### LayerAnalysisStep.js Template
```javascript
/**
 * LayerAnalysisStep - Domain Layer
 * Specialized step for architecture layer analysis
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');

class LayerAnalysisStep {
  constructor() {
    this.name = 'LayerAnalysisStep';
    this.description = 'Architecture layer analysis';
    this.category = 'architecture';
  }

  async execute(context = {}) {
    // Extract layer-specific logic from architecture_analysis_step.js
    // Focus only on layer analysis
  }

  async analyzeLayerOrganization(projectPath) {
    // Layer organization analysis
  }

  async detectLayerViolations(projectPath) {
    // Layer violation detection
  }
}

module.exports = LayerAnalysisStep;
```

### ArchitectureAnalysisService.js Template
```javascript
/**
 * ArchitectureAnalysisService - Application Layer
 * Orchestrates all architecture analysis steps
 */

class ArchitectureAnalysisService {
  constructor({
    layerStep,
    patternStep,
    couplingStep,
    dependencyStep
  }) {
    this.layerStep = layerStep;
    this.patternStep = patternStep;
    this.couplingStep = couplingStep;
    this.dependencyStep = dependencyStep;
  }

  async executeArchitectureAnalysis(projectId) {
    // Orchestrate all architecture steps
    const results = await Promise.all([
      this.layerStep.execute({ projectId }),
      this.patternStep.execute({ projectId }),
      this.couplingStep.execute({ projectId }),
      this.dependencyStep.execute({ projectId })
    ]);

    return this.combineResults(results);
  }
}

module.exports = ArchitectureAnalysisService;
```

### Architecture Analysis Logic Extraction Points
From `architecture_analysis_step.js` (812 lines):
- **Lines 120-180**: `analyzeProjectStructure()` → LayerAnalysisStep.js
- **Lines 181-250**: `analyzeArchitecturalPatterns()` → PatternAnalysisStep.js
- **Lines 251-320**: `analyzeLayerOrganization()` → LayerAnalysisStep.js
- **Lines 321-400**: `analyzeCoupling()` → CouplingAnalysisStep.js
- **Lines 401-480**: `calculateArchitectureScore()` → ArchitectureAnalysisService.js
- **Lines 481-560**: `detectArchitecturalPatterns()` → PatternAnalysisStep.js
- **Lines 561-640**: `analyzeDependencies()` → DependencyAnalysisStep.js
- **Lines 641-720**: `generateArchitectureRecommendations()` → ArchitectureAnalysisService.js

### Layer Analysis Components
- **Project Structure Analysis**: Directory structure and organization
- **Layer Organization**: DDD layer separation and boundaries
- **Layer Violation Detection**: Cross-layer dependency violations
- **Architecture Consistency**: Layer adherence to DDD principles

### Pattern Analysis Components
- **Design Pattern Detection**: MVC, Repository, Factory patterns
- **Architectural Pattern Recognition**: Layered, Microservices, Monorepo
- **Anti-Pattern Detection**: God objects, tight coupling
- **Pattern Recommendations**: Suggested pattern improvements

### Coupling Analysis Components
- **Module Coupling**: Inter-module dependencies
- **Class Coupling**: Inter-class dependencies
- **Interface Coupling**: Interface dependencies
- **Coupling Metrics**: Cyclomatic complexity and coupling scores

### Dependency Analysis Components
- **Package Dependencies**: npm/yarn dependency analysis
- **Import Dependencies**: ES6 import/require analysis
- **Circular Dependencies**: Circular dependency detection
- **Dependency Health**: Outdated and vulnerable dependencies

## Success Criteria
- [ ] All architecture analysis logic extracted into specialized steps
- [ ] Each step follows single responsibility principle
- [ ] All imports and exports properly configured
- [ ] Architecture orchestration service working correctly
- [ ] No functionality lost during extraction
- [ ] All tests passing for architecture analysis
- [ ] API endpoints accessible and functional

## Risk Mitigation
- **Medium Risk**: Complex logic extraction from monolithic file
- **Mitigation**: Extract incrementally, test each step individually
- **Rollback**: Keep original file as backup until validation complete

## Validation Checklist
- [ ] All architecture steps execute independently
- [ ] Architecture orchestration service combines results correctly
- [ ] No circular dependencies introduced
- [ ] All architecture API endpoints respond correctly
- [ ] Architecture analysis accuracy maintained or improved
- [ ] Error handling preserved in all steps
- [ ] Logging and monitoring still functional

## Final Integration Tasks
- [ ] Update all workflow definitions to use new categorized steps
- [ ] Update service registry configurations
- [ ] Update cache configuration references
- [ ] Update API documentation
- [ ] Remove original monolithic files
- [ ] Update import statements across entire codebase
- [ ] Comprehensive integration testing
- [ ] Performance validation
- [ ] Documentation updates

## Post-Refactoring Benefits
- **Maintainability**: Small, focused files easier to maintain
- **Testability**: Isolated components easier to test
- **Extensibility**: New analysis types can be added easily
- **Performance**: Specialized components can be optimized independently
- **Team Collaboration**: Multiple developers can work on different analysis types
- **Code Reuse**: Components can be reused in different contexts 