# Phase 4: Framework Migration

## 📋 Phase Overview
- **Phase**: 4 of 5
- **Duration**: 8 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Objectives
1. Migrate refactoring steps to refactoring_management framework
2. Migrate testing steps to testing_management framework
3. Migrate documentation steps to documentation_management framework
4. Migrate deployment steps to deployment_management framework
5. Update all framework step implementations

## 🔄 Task 1: Refactoring Framework Migration

### 3.1 Migrate Refactoring Steps

```javascript
// backend/framework/refactoring_management/steps/refactor_code.js
class RefactorCodeStep {
    constructor() {
        this.category = 'refactoring';
        this.dependencies = ['GitService', 'BrowserManager'];
    }
    
    async execute(context) {
        try {
            const { filePath, refactoringType, parameters } = context;
            
            // Get refactoring service from framework
            const refactoringService = global.application.frameworkManager
                .getService('refactoring_management.RefactoringService');
            
            // Perform refactoring
            const result = await refactoringService.refactorCode(filePath, refactoringType, parameters);
            
            return {
                success: true,
                result: result,
                message: `Code refactored successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { filePath, refactoringType } = context;
        
        if (!filePath) {
            throw new Error('File path is required');
        }
        
        if (!refactoringType) {
            throw new Error('Refactoring type is required');
        }
    }
}

module.exports = RefactorCodeStep;
```

## 🔄 Task 4: Testing Framework Migration

### 4.1 Migrate Testing Steps

```javascript
// backend/framework/testing_management/steps/run_tests.js
class RunTestsStep {
    constructor() {
        this.category = 'testing';
        this.dependencies = ['GitService', 'TerminalService'];
    }
    
    async execute(context) {
        try {
            const { testType, testPath, options } = context;
            
            // Get testing service from framework
            const testingService = global.application.frameworkManager
                .getService('testing_management.TestingService');
            
            // Run tests
            const result = await testingService.runTests(testType, testPath, options);
            
            return {
                success: true,
                result: result,
                message: `Tests executed successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { testType } = context;
        
        if (!testType) {
            throw new Error('Test type is required');
        }
    }
}

module.exports = RunTestsStep;
```

## 🔄 Task 5: Documentation Framework Migration

### 5.1 Migrate Documentation Steps

```javascript
// backend/framework/documentation_management/steps/generate_docs.js
class GenerateDocsStep {
    constructor() {
        this.category = 'documentation';
        this.dependencies = ['FileSystemService'];
    }
    
    async execute(context) {
        try {
            const { docType, sourcePath, outputPath, options } = context;
            
            // Get documentation service from framework
            const documentationService = global.application.frameworkManager
                .getService('documentation_management.DocumentationService');
            
            // Generate documentation
            const result = await documentationService.generateDocs(docType, sourcePath, outputPath, options);
            
            return {
                success: true,
                result: result,
                message: `Documentation generated successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { docType, sourcePath } = context;
        
        if (!docType) {
            throw new Error('Documentation type is required');
        }
        
        if (!sourcePath) {
            throw new Error('Source path is required');
        }
    }
}

module.exports = GenerateDocsStep;
```

## 🔄 Task 6: Deployment Framework Migration

### 6.1 Migrate Deployment Steps

```javascript
// backend/framework/deployment_management/steps/deploy_application.js
class DeployApplicationStep {
    constructor() {
        this.category = 'deployment';
        this.dependencies = ['GitService', 'TerminalService'];
    }
    
    async execute(context) {
        try {
            const { deploymentType, target, options } = context;
            
            // Get deployment service from framework
            const deploymentService = global.application.frameworkManager
                .getService('deployment_management.DeploymentService');
            
            // Deploy application
            const result = await deploymentService.deploy(deploymentType, target, options);
            
            return {
                success: true,
                result: result,
                message: `Application deployed successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async validate(context) {
        const { deploymentType, target } = context;
        
        if (!deploymentType) {
            throw new Error('Deployment type is required');
        }
        
        if (!target) {
            throw new Error('Deployment target is required');
        }
    }
}

module.exports = DeployApplicationStep;
```

## 🔄 Task 7: Update Core System Integration

### 7.1 Update Application.js for Framework Integration

```javascript
// backend/Application.js
// Add framework manager integration
const FrameworkManager = require('./infrastructure/framework/FrameworkManager');

class Application {
    constructor() {
        // ... existing initialization ...
        
        // Initialize framework manager
        this.frameworkManager = new FrameworkManager();
    }
    
    async initialize() {
        // ... existing initialization ...
        
        // Initialize framework manager
        await this.frameworkManager.initialize();
        
        // Load required frameworks
        await this.loadRequiredFrameworks();
    }
    
    async loadRequiredFrameworks() {
        const requiredFrameworks = this.frameworkManager.config.getRequiredFrameworks();
        
        for (const frameworkName of requiredFrameworks) {
            try {
                await this.frameworkManager.activateFramework(frameworkName);
                console.log(`✅ Required framework '${frameworkName}' loaded`);
            } catch (error) {
                console.error(`❌ Failed to load required framework '${frameworkName}':`, error.message);
            }
        }
    }
    
    async cleanup() {
        // ... existing cleanup ...
        
        // Cleanup framework manager
        if (this.frameworkManager) {
            await this.frameworkManager.cleanup();
        }
    }
    
    // Add framework manager access
    getFrameworkManager() {
        return this.frameworkManager;
    }
}
```

### 7.2 Update StepRegistry for Framework Steps

```javascript
// backend/domain/steps/StepRegistry.js
// Add framework step support
class StepRegistry {
    constructor() {
        this.steps = new Map();
        this.categories = new Set();
        this.frameworkSteps = new Map();
    }
    
    registerStep(stepName, stepInstance) {
        // Check if it's a framework step
        if (stepName.includes('.')) {
            const [frameworkName, actualStepName] = stepName.split('.');
            this.frameworkSteps.set(stepName, {
                framework: frameworkName,
                step: actualStepName,
                instance: stepInstance
            });
        } else {
            this.steps.set(stepName, stepInstance);
        }
        
        this.categories.add(stepInstance.category);
    }
    
    unregisterStep(stepName) {
        if (stepName.includes('.')) {
            this.frameworkSteps.delete(stepName);
        } else {
            this.steps.delete(stepName);
        }
    }
    
    getStep(stepName) {
        // Check framework steps first
        if (this.frameworkSteps.has(stepName)) {
            return this.frameworkSteps.get(stepName).instance;
        }
        
        // Check core steps
        return this.steps.get(stepName);
    }
    
    getAllSteps() {
        const allSteps = new Map();
        
        // Add core steps
        for (const [name, step] of this.steps) {
            allSteps.set(name, step);
        }
        
        // Add framework steps
        for (const [name, stepInfo] of this.frameworkSteps) {
            allSteps.set(name, stepInfo.instance);
        }
        
        return allSteps;
    }
    
    getStepsByCategory(category) {
        const steps = [];
        
        // Get core steps
        for (const [name, step] of this.steps) {
            if (step.category === category) {
                steps.push({ name, step });
            }
        }
        
        // Get framework steps
        for (const [name, stepInfo] of this.frameworkSteps) {
            if (stepInfo.instance.category === category) {
                steps.push({ name, step: stepInfo.instance });
            }
        }
        
        return steps;
    }
}
```

## 📊 Phase 4 Deliverables

### **✅ Refactoring Framework Migration:**
- [ ] refactoring_management framework created
- [ ] Refactoring steps migrated
- [ ] RefactoringService implemented

### **✅ Testing Framework Migration:**
- [ ] testing_management framework created
- [ ] Testing steps migrated
- [ ] TestingService implemented

### **✅ Documentation Framework Migration:**
- [ ] documentation_management framework created
- [ ] Documentation steps migrated
- [ ] DocumentationService implemented

### **✅ Deployment Framework Migration:**
- [ ] deployment_management framework created
- [ ] Deployment steps migrated
- [ ] DeploymentService implemented

### **✅ Core System Integration:**
- [ ] Application.js updated for framework integration
- [ ] StepRegistry updated for framework steps
- [ ] Framework manager integration complete

## 🚀 Success Criteria

### **Phase 4 Success Indicators:**
- [ ] Refactoring and testing steps migrated to frameworks
- [ ] All framework steps implemented and working
- [ ] Core system integration complete
- [ ] Framework activation/deactivation working
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] Documentation updated

## 🔄 Next Steps

### **After Phase 4 Completion:**
1. **Phase 5**: Integration & Testing
   - Integrate framework system with existing application
   - Test framework activation/deactivation
   - Test fallback to core when framework unavailable
   - Performance testing of framework loading

## 📝 Notes & Updates

### **2024-12-19 - Phase 4 Planning:**
- Planned migration of refactoring and testing steps to frameworks
- Designed framework step implementations
- Planned core system integration updates
- Created comprehensive migration strategy

### **Key Migration Decisions:**
- TaskService and WorkflowExecutionService remain in CORE (essential functionality)
- Only refactoring and testing steps move to frameworks (optional features)
- Core system remains focused on essential infrastructure
- Framework integration provides dynamic loading for optional features
- Backward compatibility maintained during migration 