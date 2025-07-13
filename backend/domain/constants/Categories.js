/**
 * Standard Categories for PIDEA Backend
 * Centralized category definitions for consistent naming across all components
 */

const STANDARD_CATEGORIES = {
  // Core Development Categories
  ANALYSIS: 'analysis',
  TESTING: 'testing',
  REFACTORING: 'refactoring',
  DEPLOYMENT: 'deployment',
  GENERATE: 'generate',
  MANAGEMENT: 'management',
  
  // Quality & Security Categories
  SECURITY: 'security',
  VALIDATION: 'validation',
  OPTIMIZATION: 'optimization',
  DOCUMENTATION: 'documentation',
  
  // Specialized Categories
  TASK: 'task',
  APPLICATION: 'application',
  ANALYZE: 'analyze', // Legacy support
  
  // IDE Categories
  IDE: 'ide'
};

/**
 * Category descriptions for documentation
 */
const CATEGORY_DESCRIPTIONS = {
  [STANDARD_CATEGORIES.ANALYSIS]: 'Code analysis, architecture review, dependency analysis',
  [STANDARD_CATEGORIES.TESTING]: 'Test execution, test generation, test validation',
  [STANDARD_CATEGORIES.REFACTORING]: 'Code refactoring, module organization, architecture restructuring',
  [STANDARD_CATEGORIES.DEPLOYMENT]: 'Application deployment, container management, infrastructure',
  [STANDARD_CATEGORIES.GENERATE]: 'Code generation, documentation generation, script generation',
  [STANDARD_CATEGORIES.MANAGEMENT]: 'Task management, project management, workflow management',
  [STANDARD_CATEGORIES.SECURITY]: 'Security analysis, vulnerability scanning, security validation',
  [STANDARD_CATEGORIES.VALIDATION]: 'Input validation, configuration validation, data validation',
  [STANDARD_CATEGORIES.OPTIMIZATION]: 'Performance optimization, code optimization, resource optimization',
  [STANDARD_CATEGORIES.DOCUMENTATION]: 'Documentation generation, API documentation, user guides',
  [STANDARD_CATEGORIES.TASK]: 'Task execution, task management, task automation',
  [STANDARD_CATEGORIES.APPLICATION]: 'Application-specific operations, business logic',
  [STANDARD_CATEGORIES.ANALYZE]: 'Legacy analysis operations (deprecated, use ANALYSIS)',
  [STANDARD_CATEGORIES.IDE]: 'IDE integration, chat commands, session management'
};

/**
 * Validate if a category is valid
 * @param {string} category - Category to validate
 * @returns {boolean} True if valid
 */
function isValidCategory(category) {
  return Object.values(STANDARD_CATEGORIES).includes(category);
}

/**
 * Get category description
 * @param {string} category - Category name
 * @returns {string} Category description
 */
function getCategoryDescription(category) {
  return CATEGORY_DESCRIPTIONS[category] || 'Unknown category';
}

/**
 * Get all categories
 * @returns {Array} All available categories
 */
function getAllCategories() {
  return Object.values(STANDARD_CATEGORIES);
}

/**
 * Get categories by type (core, quality, specialized)
 * @returns {Object} Categories grouped by type
 */
function getCategoriesByType() {
  return {
    core: [
      STANDARD_CATEGORIES.ANALYSIS,
      STANDARD_CATEGORIES.TESTING,
      STANDARD_CATEGORIES.REFACTORING,
      STANDARD_CATEGORIES.DEPLOYMENT,
      STANDARD_CATEGORIES.GENERATE,
      STANDARD_CATEGORIES.MANAGEMENT
    ],
    quality: [
      STANDARD_CATEGORIES.SECURITY,
      STANDARD_CATEGORIES.VALIDATION,
      STANDARD_CATEGORIES.OPTIMIZATION,
      STANDARD_CATEGORIES.DOCUMENTATION
    ],
    specialized: [
      STANDARD_CATEGORIES.TASK,
      STANDARD_CATEGORIES.APPLICATION,
      STANDARD_CATEGORIES.ANALYZE
    ],
    ide: [
      STANDARD_CATEGORIES.IDE
    ]
  };
}

/**
 * Get default category for a component type
 * @param {string} componentType - Type of component (framework, step, command, handler)
 * @returns {string} Default category
 */
function getDefaultCategory(componentType) {
  const defaultCategories = {
    framework: STANDARD_CATEGORIES.APPLICATION,
    step: STANDARD_CATEGORIES.TASK,
    command: STANDARD_CATEGORIES.MANAGEMENT,
    handler: STANDARD_CATEGORIES.MANAGEMENT
  };
  
  return defaultCategories[componentType] || STANDARD_CATEGORIES.APPLICATION;
}

module.exports = {
  STANDARD_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  isValidCategory,
  getCategoryDescription,
  getAllCategories,
  getCategoriesByType,
  getDefaultCategory
}; 