/**
 * Framework Infrastructure - Index
 * Exports all framework infrastructure components
 */

const path = require('path');
const FrameworkLoader = require('./FrameworkLoader');
const FrameworkManager = require('./FrameworkManager');
const FrameworkValidator = require('./FrameworkValidator');
const FrameworkConfig = require('./FrameworkConfig');
const FrameworkStepRegistry = require('./FrameworkStepRegistry');

// Create singleton instances
const frameworkLoader = new FrameworkLoader();
const frameworkManager = new FrameworkManager();
const frameworkValidator = new FrameworkValidator();
const frameworkConfig = new FrameworkConfig();
const frameworkStepRegistry = new FrameworkStepRegistry();

/**
 * Initialize the framework infrastructure system
 */
async function initializeFrameworkInfrastructure(stepRegistry = null) {
  try {
    console.log('🚀 Initializing Framework Infrastructure...');
    
    const initializationResults = {
      config: false,
      validator: false,
      loader: false,
      manager: false,
      stepRegistry: false
    };
    
    // Initialize components in order with error handling
    try {
      await frameworkConfig.initialize();
      initializationResults.config = true;
      console.log('✅ Framework Config initialized');
    } catch (error) {
      console.warn('⚠️ Framework Config initialization failed:', error.message);
    }
    
    try {
      await frameworkValidator.initialize();
      initializationResults.validator = true;
      console.log('✅ Framework Validator initialized');
    } catch (error) {
      console.warn('⚠️ Framework Validator initialization failed:', error.message);
    }
    
    try {
      await frameworkLoader.initialize();
      initializationResults.loader = true;
      console.log('✅ Framework Loader initialized');
    } catch (error) {
      console.warn('⚠️ Framework Loader initialization failed:', error.message);
    }
    
    try {
      await frameworkManager.initialize();
      initializationResults.manager = true;
      console.log('✅ Framework Manager initialized');
    } catch (error) {
      console.warn('⚠️ Framework Manager initialization failed:', error.message);
    }
    
    // Initialize framework step registry if step registry is provided
    if (stepRegistry) {
      try {
        const frameworkBasePath = path.join(__dirname, '../../framework');
        await frameworkStepRegistry.initialize(frameworkBasePath, stepRegistry);
        initializationResults.stepRegistry = true;
        console.log('✅ Framework Step Registry initialized');
      } catch (error) {
        console.warn('⚠️ Framework Step Registry initialization failed:', error.message);
      }
    }
    
    // Check if critical components initialized successfully
    const criticalComponents = ['loader'];
    const criticalSuccess = criticalComponents.every(component => initializationResults[component]);
    
    if (!criticalSuccess) {
      throw new Error(`Critical framework components failed to initialize: ${criticalComponents.filter(c => !initializationResults[c]).join(', ')}`);
    }
    
    console.log('✅ Framework Infrastructure initialized successfully');
    console.log('📊 Initialization results:', initializationResults);
    
    return {
      loader: frameworkLoader,
      manager: frameworkManager,
      validator: frameworkValidator,
      config: frameworkConfig,
      stepRegistry: frameworkStepRegistry,
      initializationResults
    };
  } catch (error) {
    console.error('❌ Failed to initialize Framework Infrastructure:', error.message);
    throw error;
  }
}

/**
 * Get framework loader instance
 */
function getFrameworkLoader() {
  return frameworkLoader;
}

/**
 * Get framework manager instance
 */
function getFrameworkManager() {
  return frameworkManager;
}

/**
 * Get framework validator instance
 */
function getFrameworkValidator() {
  return frameworkValidator;
}

/**
 * Get framework config instance
 */
function getFrameworkConfig() {
  return frameworkConfig;
}

/**
 * Get framework step registry instance
 */
function getFrameworkStepRegistry() {
  return frameworkStepRegistry;
}

/**
 * Get all framework infrastructure components
 */
function getAllFrameworkComponents() {
  return {
    loader: frameworkLoader,
    manager: frameworkManager,
    validator: frameworkValidator,
    config: frameworkConfig,
    stepRegistry: frameworkStepRegistry
  };
}

/**
 * Get framework infrastructure statistics
 */
function getFrameworkInfrastructureStats() {
  return {
    loader: frameworkLoader.getStats(),
    manager: frameworkManager.getStats(),
    config: frameworkConfig.getConfigStats(),
    stepRegistry: frameworkStepRegistry.getLoadedFrameworks(),
    initialized: {
      loader: frameworkLoader.isInitialized,
      manager: frameworkManager.isInitialized,
      validator: frameworkValidator.isInitialized,
      config: frameworkConfig.isInitialized,
      stepRegistry: frameworkStepRegistry.loadedFrameworks.size > 0
    }
  };
}

module.exports = {
  // Core components
  FrameworkLoader,
  FrameworkManager,
  FrameworkValidator,
  FrameworkConfig,
  FrameworkStepRegistry,
  
  // Singleton instances
  frameworkLoader,
  frameworkManager,
  frameworkValidator,
  frameworkConfig,
  frameworkStepRegistry,
  
  // Initialization
  initializeFrameworkInfrastructure,
  
  // Getter functions
  getFrameworkLoader,
  getFrameworkManager,
  getFrameworkValidator,
  getFrameworkConfig,
  getFrameworkStepRegistry,
  getAllFrameworkComponents,
  
  // Statistics
  getFrameworkInfrastructureStats
}; 