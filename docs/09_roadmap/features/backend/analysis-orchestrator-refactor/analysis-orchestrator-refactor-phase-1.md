# Analysis Orchestrator Refactor - Phase 1: System Startup Fix

## 📋 Phase Overview
- **Phase**: 1
- **Title**: System Startup Fix
- **Estimated Time**: 2 hours
- **Priority**: Critical
- **Status**: Planning
- **Dependencies**: None

## 🎯 Phase Goals
1. Fix immediate system startup failure
2. Create stub AnalysisOrchestrator implementation
3. Update service registrations
4. Remove direct OLD file imports
5. Ensure system starts without errors

## 📊 Current Issues
- Application.js tries to load removed analyzer services
- TaskAnalysisService imports OLD7.js directly
- ServiceRegistry has analyzer registrations commented out
- System crashes on startup due to missing services

## 🔧 Implementation Steps

### Step 1.1: Comment Out Analyzer Service References in Application.js
**File**: `backend/Application.js`
**Lines**: 290-295
**Time**: 15 minutes

**Action**: Comment out analyzer service loading in initializeDomainServices method
```javascript
// Comment out these lines:
// this.projectAnalyzer = this.serviceRegistry.getService('projectAnalyzer');
// this.codeQualityAnalyzer = this.serviceRegistry.getService('codeQualityAnalyzer');
// this.securityAnalyzer = this.serviceRegistry.getService('securityAnalyzer');
// this.performanceAnalyzer = this.serviceRegistry.getService('performanceAnalyzer');
// this.architectureAnalyzer = this.serviceRegistry.getService('architectureAnalyzer');
// this.techStackAnalyzer = this.serviceRegistry.getService('techStackAnalyzer');
```

**Success Criteria**: Application.js no longer tries to load missing services

### Step 1.2: Create Stub AnalysisOrchestrator Implementation
**File**: `backend/infrastructure/external/AnalysisOrchestrator.js`
**Time**: 30 minutes

**Action**: Implement basic orchestrator with stub methods
```javascript
class AnalysisOrchestrator {
  constructor(stepRegistry, logger) {
    this.stepRegistry = stepRegistry;
    this.logger = logger;
  }

  async analyzeProject(projectPath, options = {}) {
    // Stub implementation
    return { projectPath, analysis: 'stub' };
  }

  async analyzeCodeQuality(projectPath, options = {}) {
    // Stub implementation
    return { projectPath, quality: 'stub' };
  }

  // Add other stub methods...
}
```

**Success Criteria**: AnalysisOrchestrator exists with basic structure

### Step 1.3: Update ServiceRegistry to Register AnalysisOrchestrator
**File**: `backend/infrastructure/dependency-injection/ServiceRegistry.js`
**Time**: 15 minutes

**Action**: Add AnalysisOrchestrator registration in registerExternalServices method
```javascript
// Analysis Orchestrator
this.container.register('analysisOrchestrator', (stepRegistry, logger) => {
  const AnalysisOrchestrator = require('../external/AnalysisOrchestrator');
  return new AnalysisOrchestrator(stepRegistry, logger);
}, { singleton: true, dependencies: ['stepRegistry', 'logger'] });
```

**Success Criteria**: AnalysisOrchestrator registered in DI container

### Step 1.4: Fix TaskAnalysisService OLD7 Import
**File**: `backend/domain/services/TaskAnalysisService.js`
**Time**: 15 minutes

**Action**: Remove OLD7 import and update constructor
```javascript
// Remove this line:
// const ProjectAnalyzer = require('@infrastructure/external/OLD7');

// Update constructor to use analysisOrchestrator instead of projectAnalyzer
constructor(cursorIDEService, eventBus, logger, aiService, analysisOrchestrator) {
  // ... existing code ...
  this.analysisOrchestrator = analysisOrchestrator || {
    analyzeProject: async () => ({}),
    // ... other stub methods
  };
}
```

**Success Criteria**: TaskAnalysisService no longer imports OLD7

### Step 1.5: Update Service Dependencies
**File**: `backend/infrastructure/dependency-injection/ServiceRegistry.js`
**Time**: 15 minutes

**Action**: Update service registrations to use analysisOrchestrator
```javascript
// Update taskAnalysisService registration
this.container.register('taskAnalysisService', (cursorIDEService, eventBus, logger, aiService, analysisOrchestrator) => {
  const TaskAnalysisService = require('@domain/services/TaskAnalysisService');
  return new TaskAnalysisService(cursorIDEService, eventBus, logger, aiService, analysisOrchestrator);
}, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'analysisOrchestrator'] });

// Update other services that depend on analyzers
```

**Success Criteria**: All services use analysisOrchestrator instead of individual analyzers

### Step 1.6: Update Application.js to Use AnalysisOrchestrator
**File**: `backend/Application.js`
**Time**: 15 minutes

**Action**: Add AnalysisOrchestrator loading in initializeDomainServices
```javascript
// Add this line:
this.analysisOrchestrator = this.serviceRegistry.getService('analysisOrchestrator');

// Update services that need analyzer functionality to use analysisOrchestrator
```

**Success Criteria**: Application.js loads AnalysisOrchestrator successfully

### Step 1.7: Test System Startup
**Time**: 15 minutes

**Action**: Run system startup test
```bash
npm run dev
```

**Expected Output**:
```
[StepRegistry] 📦 Loaded 52 steps from categories
[Application] ✅ Infrastructure initialized with DI
[Application] ✅ Domain services initialized with DI
[Server] ✅ Server started on port 3000
```

**Success Criteria**: System starts without errors

## 🧪 Testing Checklist
- [ ] System starts without crashes
- [ ] No "Service not found" errors
- [ ] AnalysisOrchestrator loads successfully
- [ ] All services register without errors
- [ ] Basic API endpoints respond
- [ ] No OLD file imports in logs

## 🔍 Validation Steps
1. **Start System**: `npm run dev`
2. **Check Logs**: Verify no analyzer-related errors
3. **Test API**: Basic health check endpoint
4. **Verify Services**: Check service registry logs
5. **Confirm Architecture**: AnalysisOrchestrator in place

## ⚠️ Rollback Plan
If issues occur:
1. Revert Application.js changes
2. Remove AnalysisOrchestrator registration
3. Restore original service dependencies
4. Keep OLD files for fallback

## 📈 Success Metrics
- ✅ System starts successfully
- ✅ No missing service errors
- ✅ AnalysisOrchestrator registered
- ✅ Clean startup logs
- ✅ Ready for Phase 2

## 🔗 Next Phase
**Phase 2**: Analysis Orchestrator Implementation
- Implement full orchestrator functionality
- Refactor analysis steps
- Migrate OLD file functionality

## 📝 Notes
- This phase focuses on immediate startup fix
- Stub implementations allow system to start
- Full functionality will be implemented in Phase 2
- OLD files remain until Phase 3 cleanup 