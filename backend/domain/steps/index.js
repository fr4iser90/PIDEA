/**
 * Steps Module - Domain Layer
 * Exports step system components
 */

const StepRegistry = require('./StepRegistry');
const StepBuilder = require('./StepBuilder');

// Create singleton instances
const stepRegistry = new StepRegistry();
const stepBuilder = new StepBuilder(stepRegistry);

/**
 * Initialize the step system
 */
async function initializeSteps() {
  try {
    console.log('🚀 Initializing step system...');
    
    // Load steps from categories
    await stepRegistry.loadStepsFromCategories();
    
    console.log('✅ Step system initialized successfully');
    return {
      registry: stepRegistry,
      builder: stepBuilder
    };
  } catch (error) {
    console.error('❌ Failed to initialize step system:', error.message);
    throw error;
  }
}

/**
 * Get step registry instance
 */
function getStepRegistry() {
  return stepRegistry;
}

/**
 * Get step builder instance
 */
function getStepBuilder() {
  return stepBuilder;
}

/**
 * Register a step
 * @param {string} name - Step name
 * @param {Object} config - Step configuration
 * @param {string} category - Step category
 * @param {Function} executor - Step execution function
 */
async function registerStep(name, config, category = 'general', executor = null) {
  return await stepRegistry.registerStep(name, config, category, executor);
}

/**
 * Build a step
 * @param {string} stepName - Step name
 * @param {Object} options - Build options
 */
async function buildStep(stepName, options = {}) {
  return await stepBuilder.buildStep(stepName, options);
}

/**
 * Execute a step
 * @param {string} name - Step name
 * @param {Object} context - Execution context
 * @param {Object} options - Execution options
 */
async function executeStep(name, context = {}, options = {}) {
  return await stepRegistry.executeStep(name, context, options);
}

/**
 * Execute multiple steps
 * @param {Array} stepNames - Array of step names
 * @param {Object} context - Execution context
 * @param {Object} options - Execution options
 */
async function executeSteps(stepNames, context = {}, options = {}) {
  return await stepRegistry.executeSteps(stepNames, context, options);
}

/**
 * Get all steps
 */
function getAllSteps() {
  return stepRegistry.getAllSteps();
}

/**
 * Get steps by category
 * @param {string} category - Step category
 */
function getStepsByCategory(category) {
  return stepRegistry.getStepsByCategory(category);
}

/**
 * Build steps by category
 * @param {string} category - Step category
 * @param {Object} options - Build options
 */
async function buildStepsByCategory(category, options = {}) {
  return await stepBuilder.buildStepsByCategory(category, options);
}

/**
 * Create step chain
 * @param {Array} stepNames - Array of step names
 * @param {Object} options - Build options
 */
async function createStepChain(stepNames, options = {}) {
  return await stepBuilder.createStepChain(stepNames, options);
}

/**
 * Get step statistics
 * @param {string} name - Step name
 */
function getStepStats(name) {
  return stepRegistry.getStepStats(name);
}

/**
 * Get step system statistics
 */
function getStepSystemStats() {
  return {
    registry: stepRegistry.getStats(),
    cache: stepBuilder.getCacheStats()
  };
}

module.exports = {
  // Core components
  StepRegistry,
  StepBuilder,
  
  // Singleton instances
  stepRegistry,
  stepBuilder,
  
  // Initialization
  initializeSteps,
  
  // Registry functions
  getStepRegistry,
  registerStep,
  getAllSteps,
  getStepsByCategory,
  executeStep,
  executeSteps,
  getStepStats,
  
  // Builder functions
  getStepBuilder,
  buildStep,
  buildStepsByCategory,
  createStepChain,
  
  // Statistics
  getStepSystemStats
}; 