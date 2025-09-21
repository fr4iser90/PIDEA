# Phase 1: Framework Registry Fixes

## 📋 Phase Overview
- **Phase**: 1 of 5
- **Name**: Framework Registry Fixes
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Fix critical issues in FrameworkRegistry class that prevent framework loading:
1. Add missing `unregisterFramework` method
2. Fix `validateFrameworkConfig` to handle steps as object instead of array
3. Update method signatures and error handling
4. Add comprehensive unit tests

## 📝 Tasks

### Task 1.1: Add unregisterFramework Method (30 minutes)
- [ ] Add `unregisterFramework(frameworkName)` method to FrameworkRegistry class
- [ ] Method should remove framework from frameworks Map
- [ ] Method should remove framework from categories Map
- [ ] Method should remove config file reference
- [ ] Add proper error handling and logging
- [ ] Return boolean indicating success/failure

**Implementation Details:**
```javascript
/**
 * Unregister a framework
 * @param {string} frameworkName - Framework name to unregister
 * @returns {boolean} Success status
 */
unregisterFramework(frameworkName) {
  try {
    if (!this.frameworks.has(frameworkName)) {
      logger.warn(`⚠️ Framework "${frameworkName}" not registered`);
      return false;
    }

    const framework = this.frameworks.get(frameworkName);
    
    // Remove from frameworks map
    this.frameworks.delete(frameworkName);
    
    // Remove from category
    const category = framework.category;
    if (this.categories.has(category)) {
      this.categories.get(category).delete(frameworkName);
      
      // Remove empty category
      if (this.categories.get(category).size === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remove config file reference
    this.configs.delete(frameworkName);
    
    logger.info(`🗑️ Framework "${frameworkName}" unregistered successfully`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to unregister framework "${frameworkName}":`, error.message);
    return false;
  }
}
```

### Task 1.2: Fix validateFrameworkConfig Method (45 minutes)
- [ ] Update validation to expect steps as object instead of array
- [ ] Validate steps object structure
- [ ] Check for required step properties (name, type, category, description, file)
- [ ] Add validation for step dependencies
- [ ] Update error messages to be more descriptive

**Implementation Details:**
```javascript
/**
 * Validate framework configuration
 * @param {Object} config - Framework configuration
 */
validateFrameworkConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Framework configuration must be an object');
  }

  if (!config.name) {
    throw new Error('Framework configuration must have a "name" property');
  }

  if (!config.version) {
    throw new Error('Framework configuration must have a "version" property');
  }

  if (!config.description) {
    throw new Error('Framework configuration must have a "description" property');
  }

  // Updated: Validate steps as object instead of array
  if (!config.steps || typeof config.steps !== 'object') {
    throw new Error('Framework configuration must have a "steps" object');
  }

  // Validate each step in the steps object
  for (const [stepName, stepConfig] of Object.entries(config.steps)) {
    this.validateStepConfig(stepName, stepConfig);
  }

  return true;
}

/**
 * Validate individual step configuration
 * @param {string} stepName - Step name
 * @param {Object} stepConfig - Step configuration
 */
validateStepConfig(stepName, stepConfig) {
  if (!stepConfig || typeof stepConfig !== 'object') {
    throw new Error(`Step "${stepName}" configuration must be an object`);
  }

  const requiredFields = ['name', 'type', 'category', 'description', 'file'];
  
  for (const field of requiredFields) {
    if (!stepConfig[field]) {
      throw new Error(`Step "${stepName}" missing required field: ${field}`);
    }
  }

  if (stepConfig.dependencies && !Array.isArray(stepConfig.dependencies)) {
    throw new Error(`Step "${stepName}" dependencies must be an array`);
  }
}
```

### Task 1.3: Update Method Signatures and Error Handling (30 minutes)
- [ ] Update all method signatures to be consistent
- [ ] Add proper JSDoc comments
- [ ] Improve error messages with more context
- [ ] Add input validation for all public methods
- [ ] Ensure all methods return consistent data types

### Task 1.4: Add Comprehensive Unit Tests (15 minutes)
- [ ] Test unregisterFramework method with various scenarios
- [ ] Test validateFrameworkConfig with steps object format
- [ ] Test error handling for invalid configurations
- [ ] Test edge cases (empty frameworks, missing categories)
- [ ] Ensure 90%+ test coverage

**Test File**: `backend/tests/unit/FrameworkRegistry.test.js`

## 🔍 Success Criteria
- [ ] All frameworks can be unregistered without errors
- [ ] Framework configurations with steps objects validate correctly
- [ ] Error messages are descriptive and helpful
- [ ] All unit tests pass with 90%+ coverage
- [ ] No breaking changes to existing functionality

## 🚨 Risk Mitigation
- **Risk**: Breaking existing framework functionality
- **Mitigation**: Comprehensive testing before deployment, gradual rollout
- **Rollback**: Git revert to previous working state

## 📊 Progress Tracking
- **Start Time**: TBD
- **End Time**: TBD
- **Actual Duration**: TBD
- **Status**: Planning
- **Blockers**: None identified

## 🔗 Dependencies
- **Prerequisites**: None
- **Blocks**: Phase 2 (Step Registry Integration)

## 📝 Notes
- This phase addresses the most critical issues preventing framework loading
- Changes are backward compatible with existing framework configurations
- All changes include comprehensive error handling and logging
