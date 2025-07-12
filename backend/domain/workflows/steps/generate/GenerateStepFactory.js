/**
 * GenerateStepFactory - Factory for creating generate workflow steps
 * 
 * This factory provides methods to create different types of generate steps
 * including script generation, multiple scripts generation, and documentation generation.
 * It follows the factory pattern and integrates with the unified workflow system.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * Generate workflow step factory
 */
class GenerateStepFactory {
  /**
   * Create a new generate step factory
   * @param {Object} options - Factory options
   */
  constructor(options = {}) {
    this.options = {
      enableValidation: options.enableValidation !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableComplexityManagement: options.enableComplexityManagement !== false,
      ...options
    };
  }

  /**
   * Create script generation step
   * @param {Object} options - Step options
   * @returns {GenerateScriptStep} Script generation step
   */
  createScriptStep(options = {}) {
    const GenerateScriptStep = require('./GenerateScriptStep');
    return new GenerateScriptStep(options);
  }

  /**
   * Create multiple scripts generation step
   * @param {Object} options - Step options
   * @returns {GenerateScriptsStep} Multiple scripts generation step
   */
  createScriptsStep(options = {}) {
    const GenerateScriptsStep = require('./GenerateScriptsStep');
    return new GenerateScriptsStep(options);
  }

  /**
   * Create documentation generation step
   * @param {Object} options - Step options
   * @returns {GenerateDocumentationStep} Documentation generation step
   */
  createDocumentationStep(options = {}) {
    const GenerateDocumentationStep = require('./GenerateDocumentationStep');
    return new GenerateDocumentationStep(options);
  }

  /**
   * Create test generation step
   * @param {Object} options - Step options
   * @returns {GenerateTestsStep} Test generation step
   */
  createTestsStep(options = {}) {
    const GenerateTestsStep = require('./GenerateTestsStep');
    return new GenerateTestsStep(options);
  }

  /**
   * Create configuration generation step
   * @param {Object} options - Step options
   * @returns {GenerateConfigsStep} Configuration generation step
   */
  createConfigsStep(options = {}) {
    const GenerateConfigsStep = require('./GenerateConfigsStep');
    return new GenerateConfigsStep(options);
  }

  /**
   * Create generate step by type
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Generate step instance
   */
  createStep(type, options = {}) {
    switch (type) {
      case 'script':
        return this.createScriptStep(options);
      case 'scripts':
        return this.createScriptsStep(options);
      case 'documentation':
        return this.createDocumentationStep(options);
      case 'tests':
        return this.createTestsStep(options);
      case 'configs':
        return this.createConfigsStep(options);
      default:
        throw new Error(`Unknown generate step type: ${type}`);
    }
  }

  /**
   * Create comprehensive generate workflow
   * @param {Object} options - Workflow options
   * @returns {Array<BaseWorkflowStep>} Array of generate steps
   */
  createComprehensiveWorkflow(options = {}) {
    const steps = [];

    // Add script generation step
    if (options.includeScripts !== false) {
      steps.push(this.createScriptStep(options.scriptOptions || {}));
    }

    // Add multiple scripts generation step
    if (options.includeMultipleScripts !== false) {
      steps.push(this.createScriptsStep(options.scriptsOptions || {}));
    }

    // Add documentation generation step
    if (options.includeDocumentation !== false) {
      steps.push(this.createDocumentationStep(options.documentationOptions || {}));
    }

    // Add test generation step
    if (options.includeTests !== false) {
      steps.push(this.createTestsStep(options.testsOptions || {}));
    }

    // Add configuration generation step
    if (options.includeConfigs !== false) {
      steps.push(this.createConfigsStep(options.configsOptions || {}));
    }

    return steps;
  }

  /**
   * Create generate step with complexity management
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Generate step with complexity management
   */
  createComplexStep(type, options = {}) {
    const step = this.createStep(type, options);
    
    if (this.options.enableComplexityManagement) {
      const GenerateComplexityManager = require('./GenerateComplexityManager');
      const complexityManager = new GenerateComplexityManager();
      step.setComplexityManager(complexityManager);
    }

    return step;
  }

  /**
   * Create generate step with performance optimization
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Generate step with performance optimization
   */
  createOptimizedStep(type, options = {}) {
    const step = this.createStep(type, options);
    
    if (this.options.enablePerformanceMonitoring) {
      const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');
      const performanceOptimizer = new GeneratePerformanceOptimizer();
      step.setPerformanceOptimizer(performanceOptimizer);
    }

    return step;
  }

  /**
   * Create generate step with validation
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Generate step with validation
   */
  createValidatedStep(type, options = {}) {
    const step = this.createStep(type, options);
    
    if (this.options.enableValidation) {
      const GenerateValidationService = require('./GenerateValidationService');
      const validationService = new GenerateValidationService();
      step.setValidationService(validationService);
    }

    return step;
  }

  /**
   * Create generate step with all enhancements
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {BaseWorkflowStep} Enhanced generate step
   */
  createEnhancedStep(type, options = {}) {
    const step = this.createStep(type, options);
    
    // Add complexity management
    if (this.options.enableComplexityManagement) {
      const GenerateComplexityManager = require('./GenerateComplexityManager');
      const complexityManager = new GenerateComplexityManager();
      step.setComplexityManager(complexityManager);
    }

    // Add performance optimization
    if (this.options.enablePerformanceMonitoring) {
      const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');
      const performanceOptimizer = new GeneratePerformanceOptimizer();
      step.setPerformanceOptimizer(performanceOptimizer);
    }

    // Add validation
    if (this.options.enableValidation) {
      const GenerateValidationService = require('./GenerateValidationService');
      const validationService = new GenerateValidationService();
      step.setValidationService(validationService);
    }

    return step;
  }

  /**
   * Get available generate step types
   * @returns {Array<string>} Available step types
   */
  getAvailableTypes() {
    return ['script', 'scripts', 'documentation', 'tests', 'configs'];
  }

  /**
   * Validate generate step options
   * @param {string} type - Generate step type
   * @param {Object} options - Step options
   * @returns {Object} Validation result
   */
  validateOptions(type, options = {}) {
    const errors = [];
    const warnings = [];

    // Validate type
    if (!this.getAvailableTypes().includes(type)) {
      errors.push(`Invalid generate step type: ${type}`);
    }

    // Validate options based on type
    switch (type) {
      case 'script':
        if (options.scriptType && typeof options.scriptType !== 'string') {
          errors.push('Script type must be a string');
        }
        break;
      case 'scripts':
        if (options.scriptTypes && !Array.isArray(options.scriptTypes)) {
          errors.push('Script types must be an array');
        }
        break;
      case 'documentation':
        if (options.docType && typeof options.docType !== 'string') {
          errors.push('Documentation type must be a string');
        }
        break;
    }

    // Validate common options
    if (options.timeout && (typeof options.timeout !== 'number' || options.timeout <= 0)) {
      errors.push('Timeout must be a positive number');
    }

    if (options.maxRetries && (typeof options.maxRetries !== 'number' || options.maxRetries < 0)) {
      errors.push('Max retries must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get factory metadata
   * @returns {Object} Factory metadata
   */
  getMetadata() {
    return {
      name: 'GenerateStepFactory',
      description: 'Factory for creating generate workflow steps',
      version: '1.0.0',
      availableTypes: this.getAvailableTypes(),
      options: this.options
    };
  }

  /**
   * Set factory options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clone factory
   * @returns {GenerateStepFactory} Cloned factory
   */
  clone() {
    return new GenerateStepFactory(this.options);
  }
}

module.exports = GenerateStepFactory; 