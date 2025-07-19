# Phase 5: Core Integration & Testing

## 📋 Phase Overview
- **Phase**: 5 of 5
- **Duration**: 4 hours
- **Status**: ⏳ Waiting
- **Progress**: 0%

## 🎯 Phase Objectives
1. Integrate framework system with StepRegistry and Application.js
2. Test framework activation/deactivation
3. Test fallback mechanisms when frameworks unavailable
4. Performance testing of framework loading
5. Update documentation and create user guides

## 🔧 Task 1: Core System Integration

### 1.1 Update StepRegistry Integration

```javascript
// Update: backend/domain/steps/StepRegistry.js
// Add framework step registration support

const Logger = require('@logging/Logger');
const logger = new Logger('StepRegistry');

class StepRegistry {
    constructor() {
        this.steps = new Map();
        this.frameworkSteps = new Map(); // New: Framework steps
        this.frameworkServices = new Map(); // New: Framework services
        this.categories = new Set();
    }

    // New: Register framework steps
    registerFrameworkSteps(frameworkName, steps) {
        if (!this.frameworkSteps.has(frameworkName)) {
            this.frameworkSteps.set(frameworkName, new Map());
        }
        
        const frameworkStepMap = this.frameworkSteps.get(frameworkName);
        for (const [stepName, step] of steps) {
            frameworkStepMap.set(stepName, step);
            this.categories.add(step.category);
            logger.info(`📝 Registered framework step: ${frameworkName}.${stepName}`);
        }
    }

    // New: Unregister framework steps
    unregisterFrameworkSteps(frameworkName) {
        if (this.frameworkSteps.has(frameworkName)) {
            this.frameworkSteps.delete(frameworkName);
            logger.info(`🗑️ Unregistered framework steps: ${frameworkName}`);
        }
    }

    // Updated: Get step with framework support
    getStep(stepName) {
        // First check core steps
        if (this.steps.has(stepName)) {
            return this.steps.get(stepName);
        }
        
        // Then check framework steps
        for (const [frameworkName, frameworkSteps] of this.frameworkSteps) {
            if (frameworkSteps.has(stepName)) {
                return frameworkSteps.get(stepName);
            }
        }
        
        throw new Error(`Step "${stepName}" not found in core or frameworks`);
    }

    // New: Get all framework steps
    getFrameworkSteps(frameworkName) {
        const frameworkSteps = this.frameworkSteps.get(frameworkName);
        return frameworkSteps ? Array.from(frameworkSteps.values()) : [];
    }

    // New: Get all available frameworks
    getAvailableFrameworks() {
        return Array.from(this.frameworkSteps.keys());
    }

    // Updated: Get all steps (core + framework)
    getAllSteps() {
        const allSteps = new Map();
        
        // Add core steps
        for (const [name, step] of this.steps) {
            allSteps.set(name, step);
        }
        
        // Add framework steps
        for (const [frameworkName, frameworkSteps] of this.frameworkSteps) {
            for (const [stepName, step] of frameworkSteps) {
                allSteps.set(stepName, step);
            }
        }
        
        return allSteps;
    }

    // Updated: Get steps by category (core + framework)
    getStepsByCategory(category) {
        const steps = [];
        
        // Get core steps
        for (const [name, step] of this.steps) {
            if (step.category === category) {
                steps.push({ name, step, source: 'core' });
            }
        }
        
        // Get framework steps
        for (const [frameworkName, frameworkSteps] of this.frameworkSteps) {
            for (const [stepName, step] of frameworkSteps) {
                if (step.category === category) {
                    steps.push({ name: stepName, step, source: 'framework', framework: frameworkName });
                }
            }
        }
        
        return steps;
    }

    // Existing methods remain unchanged
    registerStep(stepName, stepInstance) {
        this.steps.set(stepName, stepInstance);
        this.categories.add(stepInstance.category);
        logger.info(`📝 Registered core step: ${stepName}`);
    }

    unregisterStep(stepName) {
        this.steps.delete(stepName);
        logger.info(`🗑️ Unregistered core step: ${stepName}`);
    }

    getCategories() {
        return Array.from(this.categories);
    }

    hasStep(stepName) {
        // Check core steps
        if (this.steps.has(stepName)) {
            return true;
        }
        
        // Check framework steps
        for (const [frameworkName, frameworkSteps] of this.frameworkSteps) {
            if (frameworkSteps.has(stepName)) {
                return true;
            }
        }
        
        return false;
    }

    getRegistryStatus() {
        const coreSteps = Array.from(this.steps.keys());
        const frameworkSteps = [];
        
        for (const [frameworkName, steps] of this.frameworkSteps) {
            frameworkSteps.push({
                framework: frameworkName,
                steps: Array.from(steps.keys())
            });
        }
        
        return {
            totalCoreSteps: this.steps.size,
            totalFrameworkSteps: frameworkSteps.reduce((sum, fw) => sum + fw.steps.length, 0),
            categories: this.getCategories(),
            coreSteps,
            frameworkSteps
        };
    }
}

module.exports = StepRegistry;
```

### 1.2 Update Application.js Integration

```javascript
// Update: backend/Application.js
// Add framework manager integration

const FrameworkManager = require('./infrastructure/framework/FrameworkManager');
const Logger = require('@logging/Logger');
const logger = new Logger('Application');

class Application {
    constructor() {
        // ... existing initialization ...
        
        // Initialize framework manager
        this.frameworkManager = new FrameworkManager();
        
        // Framework integration state
        this.frameworkIntegration = {
            enabled: true,
            autoLoad: true,
            fallbackEnabled: true
        };
    }
    
    async initialize() {
        try {
            logger.info('🚀 Initializing PIDEA Application...');
            
            // Initialize core services first
            await this.initializeCoreServices();
            
            // Initialize framework manager
            await this.initializeFrameworkManager();
            
            // Load required frameworks
            await this.loadRequiredFrameworks();
            
            // Initialize remaining services
            await this.initializeRemainingServices();
            
            logger.info('✅ PIDEA Application initialized successfully');
            
        } catch (error) {
            logger.error('❌ Failed to initialize application:', error.message);
            throw error;
        }
    }
    
    async initializeFrameworkManager() {
        try {
            await this.frameworkManager.initialize();
            logger.info('✅ Framework manager initialized');
        } catch (error) {
            logger.error('❌ Failed to initialize framework manager:', error.message);
            throw error;
        }
    }
    
    async loadRequiredFrameworks() {
        try {
            const requiredFrameworks = this.frameworkManager.config.getRequiredFrameworks();
            
            for (const frameworkName of requiredFrameworks) {
                try {
                    await this.frameworkManager.activateFramework(frameworkName);
                    logger.info(`✅ Framework "${frameworkName}" loaded`);
                } catch (error) {
                    logger.error(`❌ Failed to load framework "${frameworkName}":`, error.message);
                    
                    // If fallback is enabled, continue without the framework
                    if (this.frameworkIntegration.fallbackEnabled) {
                        logger.warn(`⚠️ Continuing without framework "${frameworkName}" (fallback enabled)`);
                    } else {
                        throw error;
                    }
                }
            }
        } catch (error) {
            logger.error('❌ Failed to load required frameworks:', error.message);
        }
    }
    
    async activateFramework(frameworkName) {
        try {
            const framework = await this.frameworkManager.activateFramework(frameworkName);
            
            // Register framework steps with StepRegistry
            const steps = framework.steps;
            this.stepRegistry.registerFrameworkSteps(frameworkName, steps);
            
            logger.info(`✅ Framework "${frameworkName}" activated and steps registered`);
            return framework;
            
        } catch (error) {
            logger.error(`❌ Failed to activate framework "${frameworkName}":`, error.message);
            throw error;
        }
    }
    
    async deactivateFramework(frameworkName) {
        try {
            // Unregister framework steps from StepRegistry
            this.stepRegistry.unregisterFrameworkSteps(frameworkName);
            
            // Deactivate framework
            await this.frameworkManager.deactivateFramework(frameworkName);
            
            logger.info(`✅ Framework "${frameworkName}" deactivated and steps unregistered`);
            
        } catch (error) {
            logger.error(`❌ Failed to deactivate framework "${frameworkName}":`, error.message);
            throw error;
        }
    }
    
    getActiveFrameworks() {
        return this.frameworkManager.getActiveFrameworks();
    }
    
    getAvailableFrameworks() {
        return this.frameworkManager.getAvailableFrameworks();
    }
    
    getFrameworkInfo(frameworkName) {
        return this.frameworkManager.getFrameworkInfo(frameworkName);
    }
    
    async reloadFramework(frameworkName) {
        try {
            await this.deactivateFramework(frameworkName);
            await this.activateFramework(frameworkName);
            logger.info(`✅ Framework "${frameworkName}" reloaded successfully`);
        } catch (error) {
            logger.error(`❌ Failed to reload framework "${frameworkName}":`, error.message);
            throw error;
        }
    }
    
    async cleanup() {
        try {
            logger.info('🧹 Cleaning up PIDEA Application...');
            
            // Cleanup framework manager
            if (this.frameworkManager) {
                await this.frameworkManager.cleanup();
            }
            
            // ... existing cleanup ...
            
            logger.info('✅ PIDEA Application cleaned up successfully');
            
        } catch (error) {
            logger.error('❌ Failed to cleanup application:', error.message);
            throw error;
        }
    }
}

module.exports = Application;
```

## 🔧 Task 2: Framework Testing

### 2.1 Framework Integration Tests

```javascript
// tests/integration/FrameworkIntegration.test.js
const Application = require('@Application');
const FrameworkManager = require('@infrastructure/framework/FrameworkManager');
const StepRegistry = require('@domain/steps/StepRegistry');

describe('Framework Integration', () => {
    let application;
    let frameworkManager;
    let stepRegistry;

    beforeEach(async () => {
        application = new Application();
        frameworkManager = application.frameworkManager;
        stepRegistry = application.stepRegistry;
        
        // Initialize application
        await application.initialize();
    });

    afterEach(async () => {
        // Cleanup
        await application.cleanup();
    });

    test('should integrate framework with StepRegistry', async () => {
        // Activate refactoring framework
        await application.activateFramework('refactoring_management');
        
        // Verify steps are registered
        const refactoringSteps = stepRegistry.getFrameworkSteps('refactoring_management');
        expect(refactoringSteps.length).toBeGreaterThan(0);
        
        // Verify steps are accessible via getStep
        const removeDeadCodeStep = stepRegistry.getStep('REFACTOR_REMOVE_DEAD_CODE');
        expect(removeDeadCodeStep).toBeDefined();
        expect(removeDeadCodeStep.category).toBe('refactoring');
    });

    test('should handle framework deactivation', async () => {
        // Activate framework
        await application.activateFramework('refactoring_management');
        
        // Verify steps are available
        const refactoringSteps = stepRegistry.getFrameworkSteps('refactoring_management');
        expect(refactoringSteps.length).toBeGreaterThan(0);
        
        // Deactivate framework
        await application.deactivateFramework('refactoring_management');
        
        // Verify steps are removed
        const stepsAfterDeactivation = stepRegistry.getFrameworkSteps('refactoring_management');
        expect(stepsAfterDeactivation.length).toBe(0);
    });

    test('should execute framework steps correctly', async () => {
        // Activate refactoring framework
        await application.activateFramework('refactoring_management');
        
        // Execute a framework step
        const removeDeadCodeStep = stepRegistry.getStep('REFACTOR_REMOVE_DEAD_CODE');
        const result = await removeDeadCodeStep.execute({
            filePath: 'test-file.js',
            removeUnusedVariables: true
        });
        
        expect(result.success).toBe(true);
        expect(result.filePath).toBe('test-file.js');
    });

    test('should handle framework reload', async () => {
        // Activate framework
        await application.activateFramework('refactoring_management');
        
        // Get initial step count
        const initialSteps = stepRegistry.getFrameworkSteps('refactoring_management').length;
        
        // Reload framework
        await application.reloadFramework('refactoring_management');
        
        // Verify steps are still available
        const reloadedSteps = stepRegistry.getFrameworkSteps('refactoring_management').length;
        expect(reloadedSteps).toBe(initialSteps);
    });

    test('should provide fallback when framework unavailable', async () => {
        // Try to activate non-existent framework
        try {
            await application.activateFramework('non_existent_framework');
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).toContain('not found');
        }
        
        // Verify core system still works
        const coreSteps = stepRegistry.getAllSteps();
        expect(coreSteps.size).toBeGreaterThan(0);
    });

    test('should get registry status with framework information', async () => {
        // Activate a framework
        await application.activateFramework('refactoring_management');
        
        // Get registry status
        const status = stepRegistry.getRegistryStatus();
        
        expect(status).toHaveProperty('totalCoreSteps');
        expect(status).toHaveProperty('totalFrameworkSteps');
        expect(status).toHaveProperty('frameworkSteps');
        expect(status.frameworkSteps.length).toBeGreaterThan(0);
    });
});
```

### 2.2 Framework Performance Tests

```javascript
// tests/performance/FrameworkPerformance.test.js
const Application = require('@Application');

describe('Framework Performance', () => {
    let application;

    beforeEach(async () => {
        application = new Application();
    });

    afterEach(async () => {
        await application.cleanup();
    });

    test('should load framework within 2 seconds', async () => {
        const startTime = Date.now();
        
        await application.initialize();
        await application.activateFramework('refactoring_management');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(2000); // 2 seconds
    });

    test('should handle multiple frameworks efficiently', async () => {
        await application.initialize();
        
        const frameworks = ['refactoring_management', 'testing_management'];
        const startTime = Date.now();
        
        for (const framework of frameworks) {
            await application.activateFramework(framework);
        }
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(3000); // 3 seconds for multiple frameworks
        
        // Verify all frameworks are active
        const activeFrameworks = application.getActiveFrameworks();
        expect(activeFrameworks).toContain('refactoring_management');
        expect(activeFrameworks).toContain('testing_management');
    });

    test('should maintain performance with framework steps', async () => {
        await application.initialize();
        await application.activateFramework('refactoring_management');
        
        const stepRegistry = application.stepRegistry;
        const startTime = Date.now();
        
        // Get all steps (core + framework)
        const allSteps = stepRegistry.getAllSteps();
        
        const queryTime = Date.now() - startTime;
        expect(queryTime).toBeLessThan(100); // 100ms for step query
        
        expect(allSteps.size).toBeGreaterThan(0);
    });

    test('should handle framework deactivation efficiently', async () => {
        await application.initialize();
        await application.activateFramework('refactoring_management');
        
        const startTime = Date.now();
        
        await application.deactivateFramework('refactoring_management');
        
        const deactivationTime = Date.now() - startTime;
        expect(deactivationTime).toBeLessThan(1000); // 1 second for deactivation
    });
});
```

### 2.3 Framework Fallback Tests

```javascript
// tests/integration/FrameworkFallback.test.js
const Application = require('@Application');

describe('Framework Fallback', () => {
    let application;

    beforeEach(async () => {
        application = new Application();
    });

    afterEach(async () => {
        await application.cleanup();
    });

    test('should continue without optional frameworks', async () => {
        // Disable auto-load for testing
        application.frameworkIntegration.autoLoad = false;
        
        await application.initialize();
        
        // Verify core system works without frameworks
        const stepRegistry = application.stepRegistry;
        const coreSteps = stepRegistry.getAllSteps();
        
        expect(coreSteps.size).toBeGreaterThan(0);
        
        // Verify core categories are available
        const categories = stepRegistry.getCategories();
        expect(categories).toContain('git');
        expect(categories).toContain('ide');
        expect(categories).toContain('cursor');
        expect(categories).toContain('analysis');
    });

    test('should handle framework loading errors gracefully', async () => {
        await application.initialize();
        
        // Try to activate a framework with invalid configuration
        try {
            await application.activateFramework('invalid_framework');
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).toContain('not found');
        }
        
        // Verify core system still works
        const stepRegistry = application.stepRegistry;
        const coreSteps = stepRegistry.getAllSteps();
        expect(coreSteps.size).toBeGreaterThan(0);
    });

    test('should provide fallback steps when framework unavailable', async () => {
        await application.initialize();
        
        // Try to get a step that might be in a framework
        try {
            const step = application.stepRegistry.getStep('REFACTOR_REMOVE_DEAD_CODE');
            // If step exists, it should work
            expect(step).toBeDefined();
        } catch (error) {
            // If step doesn't exist, that's also acceptable
            expect(error.message).toContain('not found');
        }
        
        // Core steps should always be available
        const gitStep = application.stepRegistry.getStep('GIT_CREATE_BRANCH');
        expect(gitStep).toBeDefined();
    });
});
```

## 🔧 Task 3: Documentation Updates

### 3.1 Framework User Guide

```markdown
# Framework System User Guide

## Overview
The PIDEA Framework System provides modular, optional functionality that can be activated or deactivated as needed. Core functionality remains always available, while advanced features are provided through frameworks.

## Core vs Framework
- **Core**: Essential services and steps (TaskService, WorkflowExecutionService, GitService, etc.)
- **Frameworks**: Optional features (refactoring, testing, documentation, deployment, etc.)

## Available Frameworks

### Refactoring Management
- **Purpose**: Advanced code refactoring operations
- **Steps**: Extract method, inline method, remove dead code, etc.
- **Activation**: `await application.activateFramework('refactoring_management')`

### Testing Management
- **Purpose**: Advanced testing features
- **Steps**: Generate tests, run tests, coverage analysis, etc.
- **Activation**: `await application.activateFramework('testing_management')`

### Documentation Management
- **Purpose**: Advanced documentation generation
- **Steps**: Generate README, update API docs, create diagrams, etc.
- **Activation**: `await application.activateFramework('documentation_management')`

### Deployment Management
- **Purpose**: Advanced deployment features
- **Steps**: Build, deploy, monitor, rollback, etc.
- **Activation**: `await application.activateFramework('deployment_management')`

### Security Management
- **Purpose**: Security scanning and testing
- **Steps**: Security scan, vulnerability test, penetration test, etc.
- **Activation**: `await application.activateFramework('security_management')`

### Performance Management
- **Purpose**: Performance optimization and monitoring
- **Steps**: Performance analyze, optimize, benchmark, etc.
- **Activation**: `await application.activateFramework('performance_management')`

## Framework Management

### Activating Frameworks
```javascript
// Activate a single framework
await application.activateFramework('refactoring_management');

// Activate multiple frameworks
await application.activateFramework('refactoring_management');
await application.activateFramework('testing_management');
```

### Deactivating Frameworks
```javascript
// Deactivate a framework
await application.deactivateFramework('refactoring_management');
```

### Checking Framework Status
```javascript
// Get active frameworks
const activeFrameworks = application.getActiveFrameworks();

// Get available frameworks
const availableFrameworks = application.getAvailableFrameworks();

// Get framework information
const info = application.getFrameworkInfo('refactoring_management');
```

### Reloading Frameworks
```javascript
// Reload a framework (deactivate and reactivate)
await application.reloadFramework('refactoring_management');
```

## Using Framework Steps

### Accessing Framework Steps
```javascript
// Get a framework step
const step = application.stepRegistry.getStep('REFACTOR_REMOVE_DEAD_CODE');

// Execute the step
const result = await step.execute({
    filePath: 'src/app.js',
    removeUnusedVariables: true
});
```

### Getting Steps by Category
```javascript
// Get all refactoring steps (core + framework)
const refactoringSteps = application.stepRegistry.getStepsByCategory('refactoring');

// Filter by source
const frameworkRefactoringSteps = refactoringSteps.filter(s => s.source === 'framework');
```

## Configuration

### Framework Configuration
```json
{
    "activeFrameworks": [
        "refactoring_management",
        "testing_management"
    ],
    "requiredFrameworks": [
        "refactoring_management"
    ],
    "frameworkSettings": {
        "refactoring_management": {
            "autoBackup": true,
            "backupLocation": "./backups"
        }
    },
    "autoLoad": true
}
```

### Application Integration Settings
```javascript
application.frameworkIntegration = {
    enabled: true,
    autoLoad: true,
    fallbackEnabled: true
};
```

## Troubleshooting

### Framework Not Found
- Check if framework directory exists in `backend/framework/`
- Verify framework has valid `config.json`
- Check framework dependencies

### Framework Loading Errors
- Check framework configuration
- Verify all required files exist
- Check dependency resolution

### Performance Issues
- Monitor framework loading times
- Check memory usage
- Consider deactivating unused frameworks

## Best Practices

1. **Start with Core**: Always ensure core functionality works before adding frameworks
2. **Activate as Needed**: Only activate frameworks when you need their functionality
3. **Monitor Performance**: Keep track of framework loading times and memory usage
4. **Test Fallbacks**: Ensure your application works without optional frameworks
5. **Document Dependencies**: Clearly document which frameworks your workflows depend on
```

### 3.2 Framework Developer Guide

```markdown
# Framework Development Guide

## Creating a New Framework

### 1. Framework Structure
```
backend/framework/your_framework/
├── config.json
├── README.md
├── steps/
│   ├── your_step.js
│   └── another_step.js
├── services/
│   ├── YourService.js
│   └── AnotherService.js
├── workflows/
│   └── your_workflow.json
└── templates/
    └── your_template.json
```

### 2. Framework Configuration
```json
{
    "name": "your_framework",
    "version": "1.0.0",
    "description": "Your framework description",
    "category": "your_category",
    "author": "Your Name",
    "dependencies": ["core"],
    "steps": {
        "your_step": {
            "file": "steps/your_step.js",
            "category": "your_category",
            "description": "Step description",
            "dependencies": ["CoreService"]
        }
    },
    "services": {
        "YourService": {
            "file": "services/YourService.js",
            "description": "Service description",
            "dependencies": ["CoreService"]
        }
    },
    "activation": {
        "auto_load": false,
        "requires_confirmation": true,
        "fallback_to_core": true
    }
}
```

### 3. Step Implementation
```javascript
const StepBuilder = require('@domain/steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('YourStep');

class YourStep {
    constructor() {
        this.name = 'YOUR_STEP';
        this.category = 'your_category';
        this.description = 'Your step description';
        this.dependencies = ['CoreService'];
    }

    static getConfig() {
        return {
            name: 'YOUR_STEP',
            category: 'your_category',
            description: 'Your step description',
            dependencies: ['CoreService'],
            required: false,
            framework: 'your_framework'
        };
    }

    async execute(context = {}) {
        try {
            logger.info(`🔧 Executing ${this.name}...`);
            
            // Your step implementation here
            
            return {
                success: true,
                result: 'Your result',
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error(`${this.name} step failed:`, error.message);
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    validateContext(context) {
        // Validate required context parameters
        if (!context.requiredParam) {
            throw new Error('requiredParam is required in context');
        }
    }
}

module.exports = YourStep;
```

### 4. Service Implementation
```javascript
const Logger = require('@logging/Logger');
const logger = new Logger('YourService');

class YourService {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Initialize your service
        this.initialized = true;
        logger.info('✅ YourService initialized successfully');
    }

    async cleanup() {
        // Cleanup your service
        this.initialized = false;
        logger.info('🧹 YourService cleaned up');
    }

    // Your service methods here
    async yourMethod(params) {
        // Implementation
    }
}

module.exports = YourService;
```

## Framework Validation

### Required Files
- `config.json` - Framework configuration
- `README.md` - Framework documentation
- `steps/` - Step implementations
- `services/` - Service implementations

### Required Configuration Fields
- `name` - Framework name (lowercase with underscores)
- `version` - Semantic versioning format
- `description` - Framework description
- `dependencies` - Framework dependencies
- `steps` - Step definitions
- `services` - Service definitions

### Step Requirements
- Must be a class
- Must have `execute()` method
- Must have `validateContext()` method
- Must have `category` property
- Must have `dependencies` property

### Service Requirements
- Must be a class
- Must have `initialize()` method
- Must have `cleanup()` method
- Must have `dependencies` property

## Testing Your Framework

### Unit Tests
```javascript
// tests/unit/frameworks/your_framework.test.js
const YourStep = require('@framework/your_framework/steps/your_step');

describe('Your Framework', () => {
    test('should execute step correctly', async () => {
        const step = new YourStep();
        const result = await step.execute({
            requiredParam: 'test'
        });
        
        expect(result.success).toBe(true);
    });
});
```

### Integration Tests
```javascript
// tests/integration/frameworks/your_framework.test.js
const Application = require('@Application');

describe('Your Framework Integration', () => {
    test('should integrate with application', async () => {
        const application = new Application();
        await application.initialize();
        
        await application.activateFramework('your_framework');
        
        const step = application.stepRegistry.getStep('YOUR_STEP');
        expect(step).toBeDefined();
        
        await application.cleanup();
    });
});
```

## Best Practices

1. **Follow Naming Conventions**: Use lowercase with underscores for framework names
2. **Document Everything**: Provide clear documentation for your framework
3. **Handle Errors Gracefully**: Always provide meaningful error messages
4. **Test Thoroughly**: Write comprehensive tests for your framework
5. **Keep Dependencies Minimal**: Only depend on what you actually need
6. **Provide Fallbacks**: Ensure your framework can work without optional dependencies
7. **Version Properly**: Use semantic versioning for your framework
8. **Log Appropriately**: Use the logging system for debugging and monitoring
```

## 📊 Phase 5 Deliverables

### **✅ Core Integration:**
- [ ] StepRegistry updated with framework support
- [ ] Application.js integrated with framework manager
- [ ] Framework activation/deactivation working
- [ ] Step registration and unregistration working

### **✅ Testing Suite:**
- [ ] Framework integration tests implemented
- [ ] Framework performance tests implemented
- [ ] Framework fallback tests implemented
- [ ] All tests passing

### **✅ Documentation:**
- [ ] Framework user guide created
- [ ] Framework developer guide created
- [ ] API documentation updated
- [ ] Architecture diagrams updated

### **✅ Performance Validation:**
- [ ] Framework loading under 2 seconds
- [ ] Multiple frameworks load efficiently
- [ ] Memory usage within limits
- [ ] Step query performance acceptable

## 🚀 Success Criteria

### **Phase 5 Success Indicators:**
- [ ] Framework system fully integrated with core
- [ ] All framework tests passing
- [ ] Performance requirements met
- [ ] Fallback mechanisms working
- [ ] Documentation complete and accurate
- [ ] User guides provide clear instructions
- [ ] Developer guides enable framework creation

## 🔄 Next Steps

### **After Phase 5 Completion:**
1. **Production Deployment**: Deploy framework system to production
2. **User Training**: Train users on framework system
3. **Framework Development**: Start developing additional frameworks
4. **Monitoring**: Set up monitoring for framework system

## 📝 Notes & Updates

### **2024-12-19 - Phase 5 Planning:**
- Designed comprehensive integration strategy
- Created extensive testing suite
- Planned documentation updates
- Designed performance validation approach

### **Key Technical Decisions:**
- Framework system integrates seamlessly with core
- Comprehensive testing ensures reliability
- Performance requirements are strictly enforced
- Fallback mechanisms ensure system stability
- Documentation enables user adoption and developer contribution 
- Comprehensive error handling and logging 