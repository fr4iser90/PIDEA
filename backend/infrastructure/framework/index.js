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
    
    // Initialize components in order
    await frameworkConfig.initialize();
    await frameworkValidator.initialize();
    await frameworkLoader.initialize();
    await frameworkManager.initialize();
    
    // Initialize framework step registry if step registry is provided
    if (stepRegistry) {
      const frameworkBasePath = path.join(__dirname, '../../framework');
      await frameworkStepRegistry.initialize(frameworkBasePath, stepRegistry);
    }
    
    console.log('✅ Framework Infrastructure initialized successfully');
    return {
      loader: frameworkLoader,
      manager: frameworkManager,
      validator: frameworkValidator,
      config: frameworkConfig,
      stepRegistry: frameworkStepRegistry
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