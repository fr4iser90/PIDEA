
/**
 * Frameworks Module - Domain Layer
 * Exports framework system components
 */

const FrameworkRegistry = require('./FrameworkRegistry');
const FrameworkBuilder = require('./FrameworkBuilder');
const { logger } = require('@infrastructure/logging/Logger');

// Create singleton instances
const frameworkRegistry = new FrameworkRegistry();
const frameworkBuilder = new FrameworkBuilder(frameworkRegistry);

/**
 * Initialize the framework system
 */
async function initializeFrameworks() {
  try {
    logger.log('🚀 Initializing framework system...');
    
    // Load framework configurations
    await frameworkRegistry.loadFrameworkConfigs();
    
    logger.log('✅ Framework system initialized successfully');
    return {
      registry: frameworkRegistry,
      builder: frameworkBuilder
    };
  } catch (error) {
    logger.error('❌ Failed to initialize framework system:', error.message);
    throw error;
  }
}

/**
 * Get framework registry instance
 */
function getFrameworkRegistry() {
  return frameworkRegistry;
}

/**
 * Get framework builder instance
 */
function getFrameworkBuilder() {
  return frameworkBuilder;
}

/**
 * Register a framework
 * @param {string} name - Framework name
 * @param {Object} config - Framework configuration
 * @param {string} category - Framework category
 */
async function registerFramework(name, config, category = 'general') {
  return await frameworkRegistry.registerFramework(name, config, category);
}

/**
 * Build a framework
 * @param {string} frameworkName - Framework name
 * @param {Object} options - Build options
 */
async function buildFramework(frameworkName, options = {}) {
  return await frameworkBuilder.buildFramework(frameworkName, options);
}

/**
 * Get all frameworks
 */
function getAllFrameworks() {
  return frameworkRegistry.getAllFrameworks();
}

/**
 * Get frameworks by category
 * @param {string} category - Framework category
 */
function getFrameworksByCategory(category) {
  return frameworkRegistry.getFrameworksByCategory(category);
}

/**
 * Get framework statistics
 */
function getFrameworkStats() {
  return {
    registry: frameworkRegistry.getStats(),
    cache: frameworkBuilder.getCacheStats()
  };
}

module.exports = {
  // Core components
  FrameworkRegistry,
  FrameworkBuilder,
  
  // Singleton instances
  frameworkRegistry,
  frameworkBuilder,
  
  // Initialization
  initializeFrameworks,
  
  // Registry functions
  getFrameworkRegistry,
  registerFramework,
  getAllFrameworks,
  getFrameworksByCategory,
  
  // Builder functions
  getFrameworkBuilder,
  buildFramework,
  
  // Statistics
  getFrameworkStats
}; 