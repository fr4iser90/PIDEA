# Phase 2: Step Registry Integration

## 📋 Phase Overview
- **Phase**: 2 of 5
- **Name**: Step Registry Integration
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Fix FrameworkStepRegistry integration issues that prevent step registration:
1. Fix step registry registration process
2. Ensure proper stepRegistry.register method availability
3. Implement proper error handling for missing step registry
4. Add validation for step module structure

## 📝 Tasks

### Task 2.1: Fix Step Registry Registration Process (45 minutes)
- [ ] Investigate why stepRegistry.register method is not available
- [ ] Ensure stepRegistry is properly injected into FrameworkStepRegistry
- [ ] Fix the registration process to use correct method signature
- [ ] Add proper error handling for registration failures
- [ ] Implement retry mechanism for failed registrations

**Implementation Details:**
```javascript
/**
 * Register a specific framework step with improved validation
 */
async registerFrameworkStep(stepKey, stepInfo) {
  const { framework, name, config, module } = stepInfo;
  
  try {
    // Validate step registry availability
    if (!this.stepRegistry) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step registry not available for ${stepKey}`);
      return false;
    }

    // Check if register method exists and is callable
    if (typeof this.stepRegistry.register !== 'function') {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step registry register method not available for ${stepKey}`);
      return false;
    }

    // Create step wrapper that provides framework context
    const stepWrapper = {
      name: name,
      type: config.type || 'framework',
      category: config.category || 'framework',
      description: config.description || `Framework step: ${name}`,
      framework: framework,
      dependencies: config.dependencies || [],
      version: config.version || '1.0.0',
      
      async execute(context, options = {}) {
        try {
          // Add framework context
          const frameworkContext = {
            ...context,
            framework: framework,
            frameworkStep: name,
            frameworkConfig: config
          };

          // Execute the actual step module
          if (module && typeof module.execute === 'function') {
            return await module.execute(frameworkContext, options);
          } else {
            throw new Error(`Step module for ${stepKey} does not have execute method`);
          }
        } catch (error) {
          this.logger.error(`❌ [FrameworkStepRegistry] Error executing step ${stepKey}:`, error.message);
          throw error;
        }
      }
    };

    // Register with main step registry
    await this.stepRegistry.register(stepWrapper.name, stepWrapper, stepWrapper.category);
    
    this.logger.info(`✅ [FrameworkStepRegistry] Successfully registered step ${stepKey}`);
    return true;
  } catch (error) {
    this.logger.error(`❌ [FrameworkStepRegistry] Failed to register step ${stepKey}:`, error.message);
    return false;
  }
}
```

### Task 2.2: Ensure Step Registry Availability (30 minutes)
- [ ] Verify stepRegistry is properly injected in constructor
- [ ] Add null checks and proper error handling
- [ ] Implement fallback mechanism when step registry is unavailable
- [ ] Add logging for step registry status
- [ ] Ensure graceful degradation when step registry fails

**Implementation Details:**
```javascript
/**
 * Initialize framework step registry with proper step registry injection
 */
async initialize(frameworkBasePath, stepRegistry) {
  try {
    this.logger.info('🔧 [FrameworkStepRegistry] Initializing framework step registry...');
    
    // Validate step registry injection
    if (!stepRegistry) {
      this.logger.warn('⚠️ [FrameworkStepRegistry] No step registry provided, framework steps will not be registered');
      this.stepRegistry = null;
    } else {
      this.stepRegistry = stepRegistry;
      this.logger.info('✅ [FrameworkStepRegistry] Step registry injected successfully');
    }

    this.frameworkBasePath = frameworkBasePath;
    this.frameworkSteps = new Map();
    
    // Discover and load framework steps
    await this.discoverFrameworkSteps();
    await this.loadFrameworkSteps();
    
    // Register steps if step registry is available
    if (this.stepRegistry) {
      await this.registerFrameworkSteps();
    } else {
      this.logger.warn('⚠️ [FrameworkStepRegistry] Step registry not available, skipping step registration');
    }
    
    this.logger.info(`✅ [FrameworkStepRegistry] Initialized with ${this.frameworkSteps.size} framework steps`);
  } catch (error) {
    this.logger.error('❌ [FrameworkStepRegistry] Failed to initialize:', error.message);
    throw error;
  }
}
```

### Task 2.3: Implement Proper Error Handling (30 minutes)
- [ ] Add comprehensive error handling for step loading failures
- [ ] Implement graceful error recovery
- [ ] Add detailed error logging with context
- [ ] Handle missing step files gracefully
- [ ] Add validation for step module structure

**Implementation Details:**
```javascript
/**
 * Load a specific framework step with improved error handling
 */
async loadFrameworkStep(frameworkName, stepName, stepConfig, stepsPath) {
  try {
    // Validate step configuration
    if (!stepConfig.file) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step ${stepName} in ${frameworkName} has no file specified`);
      return false;
    }

    // Fix: Remove 'steps/' prefix if it exists in the file path
    const fileName = stepConfig.file.replace(/^steps\//, '');
    const stepFilePath = path.join(stepsPath, fileName);
    
    // Check if step file exists with better error handling
    let fileExists = false;
    try {
      await fs.access(stepFilePath);
      fileExists = true;
    } catch (error) {
      fileExists = false;
    }
    
    if (!fileExists) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step file not found: ${stepFilePath}`);
      this.logger.debug(`📁 Expected path: ${stepFilePath}`);
      this.logger.debug(`📁 Steps directory: ${stepsPath}`);
      this.logger.debug(`📁 Step config: ${JSON.stringify(stepConfig)}`);
      return false;
    }

    // Load the step module with validation
    let stepModule;
    try {
      stepModule = require(stepFilePath);
    } catch (requireError) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to require step file ${stepFilePath}:`, requireError.message);
      return false;
    }
    
    // Validate step module structure
    if (!stepModule) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step module is null/undefined: ${stepFilePath}`);
      return false;
    }

    // Validate that module has required methods
    if (typeof stepModule.execute !== 'function') {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step module ${stepFilePath} does not have execute method`);
      return false;
    }

    // Store step information
    const stepKey = `${frameworkName}.${stepName}`;
    this.frameworkSteps.set(stepKey, {
      framework: frameworkName,
      name: stepName,
      config: stepConfig,
      module: stepModule,
      filePath: stepFilePath
    });

    this.logger.info(`✅ [FrameworkStepRegistry] Loaded step ${stepKey} from ${stepFilePath}`);
    return true;
  } catch (error) {
    this.logger.error(`❌ [FrameworkStepRegistry] Failed to load step ${frameworkName}.${stepName}:`, error.message);
    return false;
  }
}
```

### Task 2.4: Add Validation for Step Module Structure (15 minutes)
- [ ] Validate step modules have required methods
- [ ] Check for proper module exports
- [ ] Validate step configuration structure
- [ ] Add comprehensive logging for validation failures
- [ ] Implement step module health checks

## 🔍 Success Criteria
- [ ] All framework steps register successfully with main step registry
- [ ] Step registry integration works without errors
- [ ] Proper error handling for missing or invalid step modules
- [ ] Graceful degradation when step registry is unavailable
- [ ] All step registration warnings are resolved

## 🚨 Risk Mitigation
- **Risk**: Breaking existing step functionality
- **Mitigation**: Comprehensive testing, gradual rollout
- **Rollback**: Git revert to previous working state

## 📊 Progress Tracking
- **Start Time**: TBD
- **End Time**: TBD
- **Actual Duration**: TBD
- **Status**: Planning
- **Blockers**: None identified

## 🔗 Dependencies
- **Prerequisites**: Phase 1 (Framework Registry Fixes)
- **Blocks**: Phase 3 (Framework Configuration Fixes)

## 📝 Notes
- This phase focuses on the integration between FrameworkStepRegistry and the main StepRegistry
- All changes maintain backward compatibility
- Comprehensive error handling ensures system stability
