/**
 * Generate Workflow Steps - Module Exports
 * 
 * This module provides all generate workflow step implementations and related components.
 * It includes step classes, factory, registry, adapters, and utility services.
 */

// Core Step Classes
const GenerateScriptStep = require('./GenerateScriptStep');
const GenerateScriptsStep = require('./GenerateScriptsStep');
const GenerateDocumentationStep = require('./GenerateDocumentationStep');
const GenerateTestsStep = require('./GenerateTestsStep');
const GenerateConfigsStep = require('./GenerateConfigsStep');

// Factory and Registry
const GenerateStepFactory = require('./GenerateStepFactory');
const GenerateStepRegistry = require('./GenerateStepRegistry');

// Service Adapters and Managers
const GenerateServiceAdapter = require('./GenerateServiceAdapter');
const GenerateComplexityManager = require('./GenerateComplexityManager');
const GenerateValidationService = require('./GenerateValidationService');
const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');

// Module exports
module.exports = {
  // Core Step Classes
  GenerateScriptStep,
  GenerateScriptsStep,
  GenerateDocumentationStep,
  GenerateTestsStep,
  GenerateConfigsStep,

  // Factory and Registry
  GenerateStepFactory,
  GenerateStepRegistry,

  // Service Adapters and Managers
  GenerateServiceAdapter,
  GenerateComplexityManager,
  GenerateValidationService,
  GeneratePerformanceOptimizer,

  // Convenience exports
  steps: {
    GenerateScriptStep,
    GenerateScriptsStep,
    GenerateDocumentationStep,
    GenerateTestsStep,
    GenerateConfigsStep
  },

  factory: GenerateStepFactory,
  registry: GenerateStepRegistry,

  services: {
    GenerateServiceAdapter,
    GenerateComplexityManager,
    GenerateValidationService,
    GeneratePerformanceOptimizer
  },

  // Factory functions for easy instantiation
  createFactory: (options = {}) => {
    return new GenerateStepFactory(options);
  },

  createRegistry: (options = {}) => {
    return new GenerateStepRegistry(options);
  },

  createServiceAdapter: (options = {}) => {
    return new GenerateServiceAdapter(options);
  },

  createComplexityManager: (options = {}) => {
    return new GenerateComplexityManager(options);
  },

  createValidationService: (options = {}) => {
    return new GenerateValidationService(options);
  },

  createPerformanceOptimizer: (options = {}) => {
    return new GeneratePerformanceOptimizer(options);
  },

  // Step creation helpers
  createScriptStep: (options = {}) => {
    const factory = new GenerateStepFactory();
    return factory.createScriptStep(options);
  },

  createScriptsStep: (options = {}) => {
    const factory = new GenerateStepFactory();
    return factory.createScriptsStep(options);
  },

  createDocumentationStep: (options = {}) => {
    const factory = new GenerateStepFactory();
    return factory.createDocumentationStep(options);
  },

  createTestsStep: (options = {}) => {
    const factory = new GenerateStepFactory();
    return factory.createTestsStep(options);
  },

  createConfigsStep: (options = {}) => {
    const factory = new GenerateStepFactory();
    return factory.createConfigsStep(options);
  },

  // Enhanced step creation helpers
  createEnhancedScriptStep: (options = {}) => {
    const factory = new GenerateStepFactory({
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableComplexityManagement: true
    });
    return factory.createEnhancedStep('script', options);
  },

  createEnhancedScriptsStep: (options = {}) => {
    const factory = new GenerateStepFactory({
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableComplexityManagement: true
    });
    return factory.createEnhancedStep('scripts', options);
  },

  createEnhancedDocumentationStep: (options = {}) => {
    const factory = new GenerateStepFactory({
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableComplexityManagement: true
    });
    return factory.createEnhancedStep('documentation', options);
  },

  createEnhancedTestsStep: (options = {}) => {
    const factory = new GenerateStepFactory({
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableComplexityManagement: true
    });
    return factory.createEnhancedStep('tests', options);
  },

  createEnhancedConfigsStep: (options = {}) => {
    const factory = new GenerateStepFactory({
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableComplexityManagement: true
    });
    return factory.createEnhancedStep('configs', options);
  },

  // Utility functions
  utils: {
    /**
     * Create a complete generate step system with default configuration
     * @param {Object} options - System options
     * @returns {Object} Configured generate step system
     */
    createGenerateStepSystem: (options = {}) => {
      const factory = new GenerateStepFactory(options.factory || {});
      const registry = new GenerateStepRegistry(options.registry || {});
      const serviceAdapter = new GenerateServiceAdapter(options.serviceAdapter || {});
      const complexityManager = new GenerateComplexityManager(options.complexityManager || {});
      const validationService = new GenerateValidationService(options.validationService || {});
      const performanceOptimizer = new GeneratePerformanceOptimizer(options.performanceOptimizer || {});

      return {
        factory,
        registry,
        serviceAdapter,
        complexityManager,
        validationService,
        performanceOptimizer,
        
        // Convenience methods
        createScriptStep: (stepOptions = {}) => factory.createScriptStep(stepOptions),
        createScriptsStep: (stepOptions = {}) => factory.createScriptsStep(stepOptions),
        createDocumentationStep: (stepOptions = {}) => factory.createDocumentationStep(stepOptions),
        
        // Enhanced creation methods
        createEnhancedScriptStep: (stepOptions = {}) => factory.createEnhancedStep('script', stepOptions),
        createEnhancedScriptsStep: (stepOptions = {}) => factory.createEnhancedStep('scripts', stepOptions),
        createEnhancedDocumentationStep: (stepOptions = {}) => factory.createEnhancedStep('documentation', stepOptions),
        
        // Registry methods
        registerStep: (type, stepClass, metadata) => registry.registerStep(type, stepClass, metadata),
        getStepClass: (type) => registry.getStepClass(type),
        createStep: (type, options) => registry.createStep(type, options),
        
        // Service methods
        adaptScriptService: (context, options) => serviceAdapter.adaptScriptService(context, options),
        adaptScriptsService: (context, options) => serviceAdapter.adaptScriptsService(context, options),
        adaptDocumentationService: (context, options) => serviceAdapter.adaptDocumentationService(context, options),
        
        // Validation methods
        validateScriptRequest: (context, options) => validationService.validateScriptRequest(context, options),
        validateScriptsRequest: (context, options) => validationService.validateScriptsRequest(context, options),
        validateDocumentationRequest: (context, options) => validationService.validateDocumentationRequest(context, options),
        
        // Performance optimization methods
        optimizeScriptGeneration: (context, options, generationFunction) => 
          performanceOptimizer.optimizeScriptGeneration(context, options, generationFunction),
        optimizeScriptsGeneration: (context, options, generationFunction) => 
          performanceOptimizer.optimizeScriptsGeneration(context, options, generationFunction),
        optimizeDocumentationGeneration: (context, options, generationFunction) => 
          performanceOptimizer.optimizeDocumentationGeneration(context, options, generationFunction)
      };
    },

    /**
     * Validate generate step system configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfiguration: (config) => {
      const errors = [];
      const warnings = [];

      if (!config) {
        errors.push('Configuration is required');
        return { isValid: false, errors, warnings };
      }

      // Validate factory configuration
      if (config.factory) {
        if (config.factory.cacheSize && config.factory.cacheSize < 1) {
          errors.push('Factory cacheSize must be at least 1');
        }
      }

      // Validate registry configuration
      if (config.registry) {
        if (config.registry.maxSteps && config.registry.maxSteps < 1) {
          errors.push('Registry maxSteps must be at least 1');
        }
      }

      // Validate performance optimizer configuration
      if (config.performanceOptimizer) {
        if (config.performanceOptimizer.cacheSize && config.performanceOptimizer.cacheSize < 1) {
          errors.push('Performance optimizer cacheSize must be at least 1');
        }
        if (config.performanceOptimizer.maxConcurrentOperations && config.performanceOptimizer.maxConcurrentOperations < 1) {
          errors.push('Performance optimizer maxConcurrentOperations must be at least 1');
        }
      }

      // Validate validation service configuration
      if (config.validationService) {
        if (config.validationService.maxScriptTypes && config.validationService.maxScriptTypes < 1) {
          errors.push('Validation service maxScriptTypes must be at least 1');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },

    /**
     * Get generate step system metadata
     * @param {Object} system - Generate step system
     * @returns {Object} System metadata
     */
    getSystemMetadata: (system) => {
      return {
        factory: system.factory.getMetadata(),
        registry: system.registry.getMetadata(),
        serviceAdapter: system.serviceAdapter.getMetadata(),
        complexityManager: system.complexityManager.getMetadata(),
        validationService: system.validationService.getMetadata(),
        performanceOptimizer: system.performanceOptimizer.getMetadata()
      };
    }
  }
}; 