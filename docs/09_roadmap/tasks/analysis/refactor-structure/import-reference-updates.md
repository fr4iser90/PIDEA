# Import Reference Updates - Refactor Structure Analysis

## 📋 Task Overview
- **Name**: Import Reference Updates
- **Category**: analysis
- **Priority**: Critical
- **Status**: Pending
- **Estimated Time**: 2 hours
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Dependencies**: All layers implementation completion

## 🎯 Objective
Update all existing files to use the new specialized analysis steps and services instead of the monolithic files, ensuring the refactored structure is properly integrated.

## 📊 Files Requiring Updates

### Core Application Files
- [ ] `backend/domain/workflows/WorkflowComposer.js` - References monolithic step classes
- [ ] `backend/application/services/AnalysisApplicationService.js` - References monolithic step names
- [ ] `backend/presentation/api/WorkflowController.js` - References monolithic step names
- [ ] `backend/config/cache-config.js` - References monolithic step names

### Configuration Files
- [ ] `backend/config/centralized-config.js` - Analysis step configurations
- [ ] `backend/config/analysis-excludes.js` - Analysis exclusions
- [ ] `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Service registrations

### Test Files
- [ ] `backend/tests/unit/analysis/` - Unit test imports
- [ ] `backend/tests/integration/analysis/` - Integration test imports
- [ ] `backend/tests/e2e/analysis/` - E2E test imports

### Documentation Files
- [ ] `docs/08_reference/api/analysis.md` - API documentation
- [ ] `docs/06_development/setup.md` - Development setup guide
- [ ] `docs/03_features/analysis.md` - Analysis feature documentation

## 🔧 Update Patterns

### Domain Layer Updates
```javascript
// OLD: Monolithic imports
const SecurityAnalysisStep = require('../steps/categories/analysis/security_analysis_step');
const PerformanceAnalysisStep = require('../steps/categories/analysis/performance_analysis_step');
const ArchitectureAnalysisStep = require('../steps/categories/analysis/architecture_analysis_step');

// NEW: Specialized imports
const { 
  TrivySecurityStep, 
  SnykSecurityStep, 
  SemgrepSecurityStep,
  ZapSecurityStep,
  SecretScanningStep,
  ComplianceSecurityStep 
} = require('../steps/categories/analysis/security');

const {
  MemoryAnalysisStep,
  CpuAnalysisStep,
  NetworkAnalysisStep,
  DatabaseAnalysisStep
} = require('../steps/categories/analysis/performance');

const {
  StructureAnalysisStep,
  PatternAnalysisStep,
  CouplingAnalysisStep,
  LayerAnalysisStep
} = require('../steps/categories/analysis/architecture');
```

### Application Layer Updates
```javascript
// OLD: Monolithic service
const AnalysisApplicationService = require('../services/AnalysisApplicationService');

// NEW: Specialized services
const { SecurityAnalysisService } = require('../services/categories/analysis/security');
const { PerformanceAnalysisService } = require('../services/categories/analysis/performance');
const { ArchitectureAnalysisService } = require('../services/categories/analysis/architecture');
```

### Infrastructure Layer Updates
```javascript
// OLD: Monolithic infrastructure
const AIService = require('../external/AIService');

// NEW: Specialized infrastructure
const { TrivyService } = require('../external/categories/analysis/security');
const { MemoryService } = require('../external/categories/analysis/performance');
const { StructureAnalysisService } = require('../external/categories/analysis/architecture');
```

### Presentation Layer Updates
```javascript
// OLD: Monolithic controller
const AnalysisController = require('../api/AnalysisController');

// NEW: Specialized controllers
const { SecurityAnalysisController } = require('../api/categories/analysis/security');
const { PerformanceAnalysisController } = require('../api/categories/analysis/performance');
const { ArchitectureAnalysisController } = require('../api/categories/analysis/architecture');
```

## 📈 Success Criteria
- [ ] All monolithic imports replaced with specialized imports
- [ ] No references to old monolithic files remain
- [ ] All services properly registered in dependency injection
- [ ] All tests updated to use new structure
- [ ] Configuration files updated with new step names
- [ ] Documentation updated to reflect new structure
- [ ] No import errors or missing dependencies

## 🚀 Implementation Steps

### Step 1: Core Application Updates (45 minutes)
1. Update WorkflowComposer.js to use specialized steps
2. Update AnalysisApplicationService.js to use specialized services
3. Update WorkflowController.js to use specialized controllers
4. Update cache-config.js with new step names

### Step 2: Configuration Updates (30 minutes)
1. Update centralized-config.js with new analysis configurations
2. Update analysis-excludes.js with new step names
3. Update ServiceRegistry.js with new service registrations

### Step 3: Test Updates (30 minutes)
1. Update unit test imports
2. Update integration test imports
3. Update E2E test imports
4. Update test configurations

### Step 4: Documentation Updates (15 minutes)
1. Update API documentation
2. Update development setup guide
3. Update analysis feature documentation

## 🔍 Files to Search and Replace

### Search Patterns
```bash
# Search for monolithic step references
grep -r "security_analysis_step" backend/
grep -r "performance_analysis_step" backend/
grep -r "architecture_analysis_step" backend/

# Search for monolithic service references
grep -r "AnalysisApplicationService" backend/
grep -r "AnalysisController" backend/

# Search for old import paths
grep -r "require.*analysis.*step" backend/
grep -r "import.*analysis.*step" backend/
```

### Replacement Patterns
```bash
# Replace monolithic step imports
sed -i 's/security_analysis_step/security/g' **/*.js
sed -i 's/performance_analysis_step/performance/g' **/*.js
sed -i 's/architecture_analysis_step/architecture/g' **/*.js

# Replace monolithic service imports
sed -i 's/AnalysisApplicationService/SecurityAnalysisService/g' **/*.js
sed -i 's/AnalysisController/SecurityAnalysisController/g' **/*.js
```

## ⚠️ Critical Considerations

### Dependency Order
1. Update domain layer references first
2. Update application layer references
3. Update infrastructure layer references
4. Update presentation layer references
5. Update configuration files last

### Testing Strategy
- Run tests after each file update
- Use incremental updates to catch issues early
- Maintain backward compatibility during transition
- Have rollback plan ready

### Validation Steps
1. Check for import errors
2. Verify service registrations
3. Test API endpoints
4. Run full test suite
5. Validate configuration loading

## 🔗 Dependencies
- Domain layer specialized steps (✅ Complete)
- Application layer services (✅ Complete)
- Infrastructure layer services (⏳ Pending)
- Presentation layer controllers (⏳ Pending)

## 📝 Notes
- This is a critical task that must be done carefully
- Use version control to track all changes
- Test thoroughly after each update
- Consider using a feature flag for gradual rollout
- Document all changes for team reference

---

**Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
**Status**: Pending Implementation 